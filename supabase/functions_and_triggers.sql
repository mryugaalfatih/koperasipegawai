-- Function for Posting Savings Transaction & Automatic Journaling
create or replace function public.post_savings_transaction_atomic(
  p_account_id uuid,
  p_direction transaction_direction,
  p_amount numeric,
  p_description text,
  p_reference_no text,
  p_transaction_date date,
  p_created_by uuid,
  p_branch_id uuid
) returns uuid
language plpgsql
security definer
as $func$
declare
  curr_balance numeric;
  next_balance numeric;
  trans_id uuid;
  cash_acc_id uuid;
  sav_acc_id uuid;
  jour_id uuid;
  entry_num text;
begin
  -- 1. Check account balance
  select balance into curr_balance
  from public.savings_accounts
  where id = p_account_id
  for update;

  if not found then
    raise exception 'Account not found';
  end if;

  if p_direction = 'in' then
    next_balance := curr_balance + p_amount;
  else
    next_balance := curr_balance - p_amount;
    if next_balance < 0 then
      raise exception 'Insufficient savings balance';
    end if;
  end if;

  -- 2. Insert transaction
  insert into public.savings_transactions (
    account_id, direction, amount, description, reference_no, transaction_date, created_by
  ) values (
    p_account_id, p_direction, p_amount, p_description, p_reference_no, p_transaction_date, p_created_by
  ) returning id into trans_id;

  -- 3. Update account balance
  update public.savings_accounts
  set balance = next_balance
  where id = p_account_id;

  -- 4. Automatic Journal Posting
  select id into cash_acc_id from public.accounts where code = '1001' limit 1;
  select id into sav_acc_id from public.accounts where code = '2101' limit 1;

  if cash_acc_id is not null and sav_acc_id is not null and p_branch_id is not null then
    entry_num := (case when p_direction = 'in' then 'KM-SIMP-' else 'KK-SIMP-' end) || to_char(now(), 'YYYYMMDD-HH24MISS');
    
    insert into public.journal_entries (
      branch_id, entry_no, entry_date, memo, source_type, source_id, created_by
    ) values (
      p_branch_id, entry_num, p_transaction_date, coalesce(p_description, 'Transaksi Simpanan'), 'savings_transactions', trans_id, p_created_by
    ) returning id into jour_id;

    if p_direction = 'in' then
      -- Debet Kas (1001), Kredit Simpanan (2101)
      insert into public.journal_lines (journal_entry_id, account_id, debit, credit)
      values
        (jour_id, cash_acc_id, p_amount, 0),
        (jour_id, sav_acc_id, 0, p_amount);
    else
      -- Debet Simpanan (2101), Kredit Kas (1001)
      insert into public.journal_lines (journal_entry_id, account_id, debit, credit)
      values
        (jour_id, sav_acc_id, p_amount, 0),
        (jour_id, cash_acc_id, 0, p_amount);
    end if;
  end if;

  return trans_id;
end;
$func$;

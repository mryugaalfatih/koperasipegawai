"use client";

import { useState } from "react";
import Link from "next/link";
import {
  UsersRound,
  CheckCircle2,
  ShieldCheck,
  UserRound,
  Phone,
  Pencil,
  ChevronRight,
  CreditCard,
  Building2,
  HeartHandshake,
} from "lucide-react";
import { CrudHeader } from "@/components/CrudHeader";
import { CrudModal } from "@/components/CrudModal";
import { CustomSelect } from "@/components/CustomSelect";
import { SubmitButton } from "@/components/SubmitButton";
import { createMember, updateMember } from "./actions";


type MemberRow = {
  id: string;
  member_no: string;
  full_name: string;
  nik: string | null;
  phone: string | null;
  address: string | null;
  joined_at: string;
  status: "active" | "inactive" | "resigned";
  photo_url?: string | null;
  ktp_url?: string | null;
  email?: string | null;
  gender?: string | null;
  birth_place?: string | null;
  birth_date?: string | null;
  department?: string | null;
  employee_no?: string | null;
  bank_name?: string | null;
  bank_account_no?: string | null;
  bank_account_name?: string | null;
  heir_name?: string | null;
  heir_relation?: string | null;
  heir_phone?: string | null;
};

type AnggotaClientManagerProps = {
  memberRows: MemberRow[];
  totalCount: number;
  activeCount: number;
  defaultBranchId: string;
};

const statusLabels = {
  active: "Aktif",
  inactive: "Nonaktif",
  resigned: "Keluar",
};

export function AnggotaClientManager({
  memberRows,
  totalCount,
  activeCount,
  defaultBranchId,
}: AnggotaClientManagerProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedEditMember, setSelectedEditMember] = useState<MemberRow | null>(null);

  const filteredMembers = memberRows.filter((m) => {
    const matchesSearch =
      !search ||
      m.full_name.toLowerCase().includes(search.toLowerCase()) ||
      m.member_no.toLowerCase().includes(search.toLowerCase()) ||
      (m.nik && m.nik.includes(search)) ||
      (m.department && m.department.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = !statusFilter || m.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* CRUD Header Component */}
      <CrudHeader
        title="Data Anggota Koperasi"
        subtitle="Kelola identitas, nomor anggota, NIK, pekerjaan, dan rekening bank anggota."
        countBadge={`${totalCount} Total`}
        addButtonLabel="Tambah Anggota"
        onAddClick={() => setIsAddModalOpen(true)}
        searchValue={search}
        onSearchChange={setSearch}
        statusFilterValue={statusFilter}
        onStatusFilterChange={setStatusFilter}
        statusOptions={[
          { value: "active", label: "Aktif" },
          { value: "inactive", label: "Nonaktif" },
          { value: "resigned", label: "Keluar" },
        ]}
      />

      {/* KPI Cards */}
      <section className="grid gap-3 sm:grid-cols-3">
        <article className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1]">
          <UsersRound className="size-5 text-[#2563eb]" />
          <p className="mt-3 text-xs font-bold text-[#64748b]">Total Anggota</p>
          <p className="mt-0.5 text-xl font-bold text-[#0b1220]">{totalCount}</p>
        </article>

        <article className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1]">
          <CheckCircle2 className="size-5 text-[#16a34a]" />
          <p className="mt-3 text-xs font-bold text-[#64748b]">Anggota Aktif</p>
          <p className="mt-0.5 text-xl font-bold text-[#0b1220]">{activeCount}</p>
        </article>

        <article className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1]">
          <ShieldCheck className="size-5 text-[#2563eb]" />
          <p className="mt-3 text-xs font-bold text-[#64748b]">Data Ditampilkan</p>
          <p className="mt-0.5 text-xl font-bold text-[#0b1220]">{filteredMembers.length} Orang</p>
        </article>
      </section>

      {/* Member List Table / Cards */}
      <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1]">
        <div className="overflow-hidden rounded-xl border border-[#dbe5f1]">
          {filteredMembers.length ? (
            filteredMembers.map((member) => (
              <div
                key={member.id}
                className="flex flex-col gap-3 border-b border-[#f1f5f9] p-4 transition-colors last:border-b-0 hover:bg-[#f8fbff] sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  {member.photo_url ? (
                    <img
                      src={member.photo_url}
                      alt={member.full_name}
                      className="size-11 shrink-0 rounded-2xl object-cover ring-1 ring-[#dbe5f1]"
                    />
                  ) : (
                    <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#eaf2ff] text-[#2563eb]">
                      <UserRound className="size-5" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/anggota/${member.id}`}
                        className="truncate font-bold text-sm text-[#0b1220] hover:text-[#2563eb]"
                      >
                        {member.full_name}
                      </Link>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                          member.status === "active"
                            ? "bg-[#eff6ff] text-[#2563eb]"
                            : "bg-[#f1f5f9] text-[#64748b]"
                        }`}
                      >
                        {statusLabels[member.status]}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-[#64748b]">
                      No: {member.member_no} {member.nik ? `· NIK: ${member.nik}` : ""}{" "}
                      {member.department ? `· ${member.department}` : ""}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 text-right">
                  <div className="text-left sm:text-right">
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-[#475569]">
                      <Phone className="size-3.5 text-[#2563eb]" />
                      <span>{member.phone ?? "-"}</span>
                    </p>
                    <p className="mt-0.5 text-[11px] font-medium text-[#94a3b8]">
                      Joined: {member.joined_at}
                    </p>
                  </div>

                  {/* Inline Action Buttons */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSelectedEditMember(member)}
                      className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#f1f5f9] px-3 text-xs font-bold text-[#0b1220] hover:bg-[#e2e8f0] active:scale-95 transition-all"
                    >
                      <Pencil className="size-3.5 text-[#2563eb]" />
                      <span>Edit</span>
                    </button>

                    <Link
                      href={`/anggota/${member.id}`}
                      className="grid size-9 place-items-center rounded-xl bg-[#f1f5f9] text-[#64748b] hover:bg-[#e2e8f0] hover:text-[#0b1220] transition-all"
                      title="Lihat Detail Anggota"
                    >
                      <ChevronRight className="size-4" />
                    </Link>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-10 text-center">
              <UsersRound className="mx-auto size-10 text-[#94a3b8]" />
              <p className="mt-3 font-bold text-[#0b1220]">Data Anggota Tidak Ditemukan</p>
              <p className="mt-1 text-xs font-medium text-[#64748b]">
                Coba ubah kata kunci pencarian atau kata saringan filter status Anda.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Add Member Modal */}
      <CrudModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Registrasi Anggota Baru"
        subtitle="Masukkan identitas lengkap, pekerjaan, rekening bank, & foto anggota."
        maxWidth="max-w-2xl"
      >
        <form action={createMember} encType="multipart/form-data" className="space-y-4">
          <input type="hidden" name="branch_id" value={defaultBranchId} />

          {/* Section 1: Dokumen Foto */}
          <div className="rounded-2xl bg-[#f8fbff] p-3.5 border border-[#dbe5f1] space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[#2563eb]">1. Dokumen Foto Identitas</span>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-bold uppercase text-[#475569]">Pas Foto Profil</span>
                <input
                  type="file"
                  accept="image/*"
                  name="photo"
                  className="mt-1.5 w-full rounded-xl border border-[#dbe5f1] bg-white px-3 py-1.5 text-xs font-semibold"
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase text-[#475569]">Foto Kartu KTP</span>
                <input
                  type="file"
                  accept="image/*"
                  name="ktp_file"
                  className="mt-1.5 w-full rounded-xl border border-[#dbe5f1] bg-white px-3 py-1.5 text-xs font-semibold"
                />
              </label>
            </div>
          </div>

          {/* Section 2: Data Pribadi */}
          <div className="space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[#2563eb]">2. Data Identitas Pribadi</span>
            
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-bold uppercase text-[#475569]">Nomor Anggota</span>
                <input
                  className="mt-1.5 h-10 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-xs font-bold outline-none focus:border-[#2563eb]"
                  name="member_no"
                  placeholder="Kosongkan untuk otomatis"
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase text-[#475569]">Nama Lengkap *</span>
                <input
                  className="mt-1.5 h-10 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-xs font-bold outline-none focus:border-[#2563eb]"
                  name="full_name"
                  placeholder="Nama sesuai KTP"
                  required
                />
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block">
                <span className="text-xs font-bold uppercase text-[#475569]">NIK (No KTP)</span>
                <input
                  className="mt-1.5 h-10 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-xs font-bold outline-none focus:border-[#2563eb]"
                  name="nik"
                  placeholder="16 digit NIK"
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase text-[#475569]">Nomor HP / WA</span>
                <input
                  className="mt-1.5 h-10 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-xs font-bold outline-none focus:border-[#2563eb]"
                  name="phone"
                  placeholder="+628..."
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase text-[#475569]">Jenis Kelamin</span>
                <CustomSelect
                  name="gender"
                  defaultValue="L"
                  className="mt-1.5 h-10"
                >
                  <option value="L">Laki-Laki (L)</option>
                  <option value="P">Perempuan (P)</option>
                </CustomSelect>
              </label>

            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block">
                <span className="text-xs font-bold uppercase text-[#475569]">Email</span>
                <input
                  className="mt-1.5 h-10 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-xs font-bold outline-none focus:border-[#2563eb]"
                  name="email"
                  type="email"
                  placeholder="email@domain.com"
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase text-[#475569]">Tempat Lahir</span>
                <input
                  className="mt-1.5 h-10 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-xs font-bold outline-none focus:border-[#2563eb]"
                  name="birth_place"
                  placeholder="Kota Lahir"
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase text-[#475569]">Tanggal Lahir</span>
                <input
                  className="mt-1.5 h-10 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-xs font-bold outline-none focus:border-[#2563eb]"
                  name="birth_date"
                  type="date"
                />
              </label>
            </div>
          </div>

          {/* Section 3: Instansi & Pekerjaan */}
          <div className="rounded-2xl bg-[#f8fbff] p-3.5 border border-[#dbe5f1] space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[#2563eb]">3. Instansi & Rekening Bank</span>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-bold uppercase text-[#475569]">Departemen / Divisi</span>
                <input
                  className="mt-1.5 h-10 w-full rounded-xl border border-[#dbe5f1] bg-white px-4 text-xs font-bold outline-none focus:border-[#2563eb]"
                  name="department"
                  placeholder="Contoh: Operasional / HRD"
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase text-[#475569]">NIP / No Pegawai</span>
                <input
                  className="mt-1.5 h-10 w-full rounded-xl border border-[#dbe5f1] bg-white px-4 text-xs font-bold outline-none focus:border-[#2563eb]"
                  name="employee_no"
                  placeholder="No Induk Karyawan"
                />
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block">
                <span className="text-xs font-bold uppercase text-[#475569]">Nama Bank</span>
                <input
                  className="mt-1.5 h-10 w-full rounded-xl border border-[#dbe5f1] bg-white px-4 text-xs font-bold outline-none focus:border-[#2563eb]"
                  name="bank_name"
                  placeholder="BCA / Mandiri / BRI"
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase text-[#475569]">Nomor Rekening</span>
                <input
                  className="mt-1.5 h-10 w-full rounded-xl border border-[#dbe5f1] bg-white px-4 text-xs font-bold outline-none focus:border-[#2563eb]"
                  name="bank_account_no"
                  placeholder="No Rekening"
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase text-[#475569]">Atas Nama Rekening</span>
                <input
                  className="mt-1.5 h-10 w-full rounded-xl border border-[#dbe5f1] bg-white px-4 text-xs font-bold outline-none focus:border-[#2563eb]"
                  name="bank_account_name"
                  placeholder="Nama di buku tabungan"
                />
              </label>
            </div>
          </div>

          {/* Section 4: Kontak Ahli Waris */}
          <div className="space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[#2563eb]">4. Kontak Ahli Waris / Darurat</span>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block">
                <span className="text-xs font-bold uppercase text-[#475569]">Nama Ahli Waris</span>
                <input
                  className="mt-1.5 h-10 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-xs font-bold outline-none focus:border-[#2563eb]"
                  name="heir_name"
                  placeholder="Nama lengkap ahli waris"
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase text-[#475569]">Hubungan</span>
                <input
                  className="mt-1.5 h-10 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-xs font-bold outline-none focus:border-[#2563eb]"
                  name="heir_relation"
                  placeholder="Suami / Istri / Anak"
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase text-[#475569]">HP Ahli Waris</span>
                <input
                  className="mt-1.5 h-10 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-xs font-bold outline-none focus:border-[#2563eb]"
                  name="heir_phone"
                  placeholder="+628..."
                />
              </label>
            </div>
          </div>

          <label className="block">
            <span className="text-xs font-bold uppercase text-[#475569]">Alamat Lengkap Domisili</span>
            <textarea
              className="mt-1.5 min-h-16 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 py-2.5 text-xs font-semibold outline-none focus:border-[#2563eb]"
              name="address"
              placeholder="Alamat tempat tinggal anggota..."
            />
          </label>

          <div className="pt-2">
            <SubmitButton className="h-11 w-full rounded-2xl bg-[#2563eb] text-xs font-bold text-white hover:bg-[#1d4ed8]">
              Simpan Registrasi Anggota
            </SubmitButton>
          </div>
        </form>
      </CrudModal>

      {/* Edit Member Modal */}
      <CrudModal
        isOpen={Boolean(selectedEditMember)}
        onClose={() => setSelectedEditMember(null)}
        title="Edit Data Anggota"
        subtitle={`Perbarui data anggota: ${selectedEditMember?.full_name ?? ""}`}
        maxWidth="max-w-2xl"
      >
        {selectedEditMember ? (
          <form
            action={async (formData) => {
              await updateMember(selectedEditMember.id, formData);
            }}
            encType="multipart/form-data"
            className="space-y-4"
          >
            <input type="hidden" name="existing_photo_url" value={selectedEditMember.photo_url ?? ""} />
            <input type="hidden" name="existing_ktp_url" value={selectedEditMember.ktp_url ?? ""} />

            {/* Section 1: Dokumen Foto */}
            <div className="rounded-2xl bg-[#f8fbff] p-3.5 border border-[#dbe5f1] space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[#2563eb]">1. Dokumen Foto Identitas</span>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-bold uppercase text-[#475569]">Ganti Pas Foto</span>
                  <input
                    type="file"
                    accept="image/*"
                    name="photo"
                    className="mt-1.5 w-full rounded-xl border border-[#dbe5f1] bg-white px-3 py-1.5 text-xs font-semibold"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-bold uppercase text-[#475569]">Ganti Foto KTP</span>
                  <input
                    type="file"
                    accept="image/*"
                    name="ktp_file"
                    className="mt-1.5 w-full rounded-xl border border-[#dbe5f1] bg-white px-3 py-1.5 text-xs font-semibold"
                  />
                </label>
              </div>
            </div>

            {/* Section 2: Data Pribadi */}
            <div className="space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[#2563eb]">2. Data Identitas Pribadi</span>
              
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="block">
                  <span className="text-xs font-bold uppercase text-[#475569]">Nomor Anggota</span>
                  <input
                    className="mt-1.5 h-10 w-full rounded-2xl border border-[#dbe5f1] bg-[#f1f5f9] px-4 text-xs font-bold text-[#64748b] outline-none"
                    defaultValue={selectedEditMember.member_no}
                    disabled
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-bold uppercase text-[#475569]">Nama Lengkap *</span>
                  <input
                    className="mt-1.5 h-10 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-xs font-bold outline-none focus:border-[#2563eb]"
                    defaultValue={selectedEditMember.full_name}
                    name="full_name"
                    required
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-bold uppercase text-[#475569]">Status Keanggotaan</span>
                  <CustomSelect
                    defaultValue={selectedEditMember.status}
                    name="status"
                    className="mt-1.5 h-10"
                  >
                    <option value="active">Aktif</option>
                    <option value="inactive">Nonaktif</option>
                    <option value="resigned">Keluar</option>
                  </CustomSelect>
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <label className="block">
                  <span className="text-xs font-bold uppercase text-[#475569]">NIK (No KTP)</span>
                  <input
                    className="mt-1.5 h-10 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-xs font-bold outline-none focus:border-[#2563eb]"
                    defaultValue={selectedEditMember.nik ?? ""}
                    name="nik"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-bold uppercase text-[#475569]">Nomor HP / WA</span>
                  <input
                    className="mt-1.5 h-10 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-xs font-bold outline-none focus:border-[#2563eb]"
                    defaultValue={selectedEditMember.phone ?? ""}
                    name="phone"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-bold uppercase text-[#475569]">Jenis Kelamin</span>
                  <CustomSelect
                    defaultValue={selectedEditMember.gender ?? "L"}
                    name="gender"
                    className="mt-1.5 h-10"
                  >
                    <option value="L">Laki-Laki (L)</option>
                    <option value="P">Perempuan (P)</option>
                  </CustomSelect>
                </label>
              </div>


              <div className="grid gap-3 sm:grid-cols-3">
                <label className="block">
                  <span className="text-xs font-bold uppercase text-[#475569]">Email</span>
                  <input
                    className="mt-1.5 h-10 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-xs font-bold outline-none focus:border-[#2563eb]"
                    defaultValue={selectedEditMember.email ?? ""}
                    name="email"
                    type="email"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-bold uppercase text-[#475569]">Tempat Lahir</span>
                  <input
                    className="mt-1.5 h-10 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-xs font-bold outline-none focus:border-[#2563eb]"
                    defaultValue={selectedEditMember.birth_place ?? ""}
                    name="birth_place"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-bold uppercase text-[#475569]">Tanggal Lahir</span>
                  <input
                    className="mt-1.5 h-10 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-xs font-bold outline-none focus:border-[#2563eb]"
                    defaultValue={selectedEditMember.birth_date ?? ""}
                    name="birth_date"
                    type="date"
                  />
                </label>
              </div>
            </div>

            {/* Section 3: Instansi & Rekening Bank */}
            <div className="rounded-2xl bg-[#f8fbff] p-3.5 border border-[#dbe5f1] space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[#2563eb]">3. Instansi & Rekening Bank</span>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-bold uppercase text-[#475569]">Departemen / Divisi</span>
                  <input
                    className="mt-1.5 h-10 w-full rounded-xl border border-[#dbe5f1] bg-white px-4 text-xs font-bold outline-none focus:border-[#2563eb]"
                    defaultValue={selectedEditMember.department ?? ""}
                    name="department"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-bold uppercase text-[#475569]">NIP / No Pegawai</span>
                  <input
                    className="mt-1.5 h-10 w-full rounded-xl border border-[#dbe5f1] bg-white px-4 text-xs font-bold outline-none focus:border-[#2563eb]"
                    defaultValue={selectedEditMember.employee_no ?? ""}
                    name="employee_no"
                  />
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <label className="block">
                  <span className="text-xs font-bold uppercase text-[#475569]">Nama Bank</span>
                  <input
                    className="mt-1.5 h-10 w-full rounded-xl border border-[#dbe5f1] bg-white px-4 text-xs font-bold outline-none focus:border-[#2563eb]"
                    defaultValue={selectedEditMember.bank_name ?? ""}
                    name="bank_name"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-bold uppercase text-[#475569]">Nomor Rekening</span>
                  <input
                    className="mt-1.5 h-10 w-full rounded-xl border border-[#dbe5f1] bg-white px-4 text-xs font-bold outline-none focus:border-[#2563eb]"
                    defaultValue={selectedEditMember.bank_account_no ?? ""}
                    name="bank_account_no"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-bold uppercase text-[#475569]">Atas Nama Rekening</span>
                  <input
                    className="mt-1.5 h-10 w-full rounded-xl border border-[#dbe5f1] bg-white px-4 text-xs font-bold outline-none focus:border-[#2563eb]"
                    defaultValue={selectedEditMember.bank_account_name ?? ""}
                    name="bank_account_name"
                  />
                </label>
              </div>
            </div>

            {/* Section 4: Kontak Ahli Waris */}
            <div className="space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[#2563eb]">4. Kontak Ahli Waris / Darurat</span>
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="block">
                  <span className="text-xs font-bold uppercase text-[#475569]">Nama Ahli Waris</span>
                  <input
                    className="mt-1.5 h-10 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-xs font-bold outline-none focus:border-[#2563eb]"
                    defaultValue={selectedEditMember.heir_name ?? ""}
                    name="heir_name"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-bold uppercase text-[#475569]">Hubungan</span>
                  <input
                    className="mt-1.5 h-10 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-xs font-bold outline-none focus:border-[#2563eb]"
                    defaultValue={selectedEditMember.heir_relation ?? ""}
                    name="heir_relation"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-bold uppercase text-[#475569]">HP Ahli Waris</span>
                  <input
                    className="mt-1.5 h-10 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-xs font-bold outline-none focus:border-[#2563eb]"
                    defaultValue={selectedEditMember.heir_phone ?? ""}
                    name="heir_phone"
                  />
                </label>
              </div>
            </div>

            <label className="block">
              <span className="text-xs font-bold uppercase text-[#475569]">Alamat Lengkap Domisili</span>
              <textarea
                className="mt-1.5 min-h-16 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 py-2.5 text-xs font-semibold outline-none focus:border-[#2563eb]"
                defaultValue={selectedEditMember.address ?? ""}
                name="address"
              />
            </label>

            <div className="pt-2">
              <SubmitButton className="h-11 w-full rounded-2xl bg-[#2563eb] text-xs font-bold text-white hover:bg-[#1d4ed8]">
                Perbarui Data Anggota
              </SubmitButton>
            </div>
          </form>
        ) : null}
      </CrudModal>
    </div>
  );
}

export type TokoPromo = {
  id: string;
  title: string;
  code: string;
  type: "bundling" | "discount_percent" | "discount_flat";
  value: number;
  min_spend: number;
  start_date: string;
  end_date: string;
  is_member_only: boolean;
  is_active: boolean;
  description: string;
};

export const defaultTokoPromos: TokoPromo[] = [
  {
    id: "promo_1",
    title: "Voucher Belanja Sembako Rp 10.000",
    code: "SEMBAKO10",
    type: "discount_flat",
    value: 10000,
    min_spend: 150000,
    start_date: "2026-08-01",
    end_date: "2026-12-31",
    is_member_only: false,
    is_active: true,
    description: "Potongan langsung Rp 10.000 dengan minimal belanja sembako Rp 150.000.",
  },
  {
    id: "promo_2",
    title: "Diskon Khusus Anggota Koperasi 5%",
    code: "MEMBER5",
    type: "discount_percent",
    value: 5,
    min_spend: 50000,
    start_date: "2026-08-01",
    end_date: "2026-12-31",
    is_member_only: true,
    is_active: true,
    description: "Diskon ekstra 5% khusus anggota koperasi dengan minimal belanja Rp 50.000.",
  },
  {
    id: "promo_3",
    title: "Voucher Belanja Hemat Rp 5.000",
    code: "BERKAH5",
    type: "discount_flat",
    value: 5000,
    min_spend: 50000,
    start_date: "2026-08-01",
    end_date: "2026-12-31",
    is_member_only: false,
    is_active: true,
    description: "Potongan hemat Rp 5.000 untuk pembelian kasir minimal Rp 50.000.",
  },
  {
    id: "promo_4",
    title: "Diskon Jumat Berkah Rp 7.500",
    code: "JUMATBERKAH",
    type: "discount_flat",
    value: 7500,
    min_spend: 100000,
    start_date: "2026-08-01",
    end_date: "2026-12-31",
    is_member_only: false,
    is_active: true,
    description: "Potongan spesial Jumat Berkah Rp 7.500 dengan minimal transaksi Rp 100.000.",
  },
];

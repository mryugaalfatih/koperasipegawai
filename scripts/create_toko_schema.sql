-- SQL Schema untuk Waserda / Toko Sembako Koperasi

-- 1. Tabel Produk Toko / Sembako
CREATE TABLE IF NOT EXISTS public.toko_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID REFERENCES public.branches(id),
    barcode VARCHAR(100),
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) DEFAULT 'Sembako',
    unit_name VARCHAR(50) DEFAULT 'Pcs',
    buy_price NUMERIC(15,2) DEFAULT 0,
    sell_price_general NUMERIC(15,2) DEFAULT 0,
    sell_price_member NUMERIC(15,2) DEFAULT 0,
    stock_qty NUMERIC(15,2) DEFAULT 0,
    min_stock NUMERIC(15,2) DEFAULT 5,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabel Penjualan Kasir POS Toko (Header)
CREATE TABLE IF NOT EXISTS public.toko_sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID REFERENCES public.branches(id),
    invoice_no VARCHAR(100) NOT NULL UNIQUE,
    sale_date DATE DEFAULT CURRENT_DATE,
    member_id UUID REFERENCES public.members(id),
    payment_method VARCHAR(50) DEFAULT 'cash', -- 'cash', 'bank', 'credit' (potong gaji)
    total_amount NUMERIC(15,2) DEFAULT 0,
    discount_amount NUMERIC(15,2) DEFAULT 0,
    grand_total NUMERIC(15,2) DEFAULT 0,
    paid_amount NUMERIC(15,2) DEFAULT 0,
    change_amount NUMERIC(15,2) DEFAULT 0,
    notes TEXT,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabel Detail Item Penjualan Kasir Toko
CREATE TABLE IF NOT EXISTS public.toko_sale_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID REFERENCES public.toko_sales(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.toko_products(id),
    product_name VARCHAR(255) NOT NULL,
    qty NUMERIC(15,2) DEFAULT 1,
    unit_name VARCHAR(50) DEFAULT 'Pcs',
    buy_price NUMERIC(15,2) DEFAULT 0,
    sell_price NUMERIC(15,2) DEFAULT 0,
    subtotal NUMERIC(15,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabel Mutasi Kartu Stok Barang Sembako
CREATE TABLE IF NOT EXISTS public.toko_stock_mutations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES public.toko_products(id) ON DELETE CASCADE,
    mutation_date TIMESTAMPTZ DEFAULT NOW(),
    mutation_type VARCHAR(50) DEFAULT 'in', -- 'in', 'out', 'opname'
    qty_in NUMERIC(15,2) DEFAULT 0,
    qty_out NUMERIC(15,2) DEFAULT 0,
    stock_after NUMERIC(15,2) DEFAULT 0,
    ref_no VARCHAR(100),
    notes TEXT,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS and create open policy for development
ALTER TABLE public.toko_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.toko_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.toko_sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.toko_stock_mutations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all for authenticated users" ON public.toko_products FOR ALL USING (true);
CREATE POLICY "Enable all for authenticated users" ON public.toko_sales FOR ALL USING (true);
CREATE POLICY "Enable all for authenticated users" ON public.toko_sale_items FOR ALL USING (true);
CREATE POLICY "Enable all for authenticated users" ON public.toko_stock_mutations FOR ALL USING (true);

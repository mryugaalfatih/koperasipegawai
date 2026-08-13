-- SQL Schema untuk Unit Jasa Refill APAR & Equipment Damkar Koperasi

CREATE TABLE IF NOT EXISTS public.apar_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID REFERENCES public.branches(id),
    code VARCHAR(50),
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) DEFAULT 'Tabung APAR', -- 'Tabung APAR', 'Media Refill', 'Sparepart', 'APD Damkar'
    media_type VARCHAR(50) DEFAULT 'Powder', -- 'Powder', 'CO2', 'Foam', 'Halotron'
    capacity_kg NUMERIC(10,2) DEFAULT 3.0,
    buy_price NUMERIC(15,2) DEFAULT 0,
    sell_price NUMERIC(15,2) DEFAULT 0,
    refill_price NUMERIC(15,2) DEFAULT 0,
    stock_qty NUMERIC(15,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.apar_refill_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID REFERENCES public.branches(id),
    order_no VARCHAR(100) NOT NULL UNIQUE,
    order_date DATE DEFAULT CURRENT_DATE,
    client_name VARCHAR(255) NOT NULL, -- Nama PT / Kantor / Gedung Klien
    client_phone VARCHAR(50),
    client_address TEXT,
    total_cylinders INT DEFAULT 1,
    total_amount NUMERIC(15,2) DEFAULT 0,
    payment_status VARCHAR(50) DEFAULT 'unpaid', -- 'unpaid', 'paid'
    status VARCHAR(50) DEFAULT 'process', -- 'process', 'completed', 'delivered'
    notes TEXT,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.apar_refill_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.apar_refill_orders(id) ON DELETE CASCADE,
    serial_no VARCHAR(100),
    media_type VARCHAR(50) DEFAULT 'Powder',
    capacity_kg NUMERIC(10,2) DEFAULT 3.0,
    location_tag VARCHAR(100), -- Contoh: 'Gedung A Lantai 2'
    expired_date DATE,
    price NUMERIC(15,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.apar_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apar_refill_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apar_refill_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.apar_products;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.apar_refill_orders;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.apar_refill_items;

CREATE POLICY "Enable all for authenticated users" ON public.apar_products FOR ALL USING (true);
CREATE POLICY "Enable all for authenticated users" ON public.apar_refill_orders FOR ALL USING (true);
CREATE POLICY "Enable all for authenticated users" ON public.apar_refill_items FOR ALL USING (true);

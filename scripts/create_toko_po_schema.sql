-- SQL Schema untuk Modul Order Barang (Purchase Order / Supplier) Waserda

CREATE TABLE IF NOT EXISTS public.toko_suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50),
    phone VARCHAR(50),
    address TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.toko_purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID REFERENCES public.branches(id),
    po_no VARCHAR(100) NOT NULL UNIQUE,
    order_date DATE DEFAULT CURRENT_DATE,
    supplier_name VARCHAR(255) NOT NULL,
    supplier_phone VARCHAR(50),
    status VARCHAR(50) DEFAULT 'ordered', -- 'ordered', 'received', 'cancelled'
    total_amount NUMERIC(15,2) DEFAULT 0,
    payment_type VARCHAR(50) DEFAULT 'cash', -- 'cash', 'tempo'
    due_date DATE,
    notes TEXT,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.toko_purchase_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    po_id UUID REFERENCES public.toko_purchase_orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.toko_products(id),
    product_name VARCHAR(255) NOT NULL,
    qty_ordered NUMERIC(15,2) DEFAULT 1,
    qty_received NUMERIC(15,2) DEFAULT 0,
    unit_name VARCHAR(50) DEFAULT 'Pcs',
    buy_price NUMERIC(15,2) DEFAULT 0,
    subtotal NUMERIC(15,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.toko_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.toko_purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.toko_purchase_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all for authenticated users" ON public.toko_suppliers FOR ALL USING (true);
CREATE POLICY "Enable all for authenticated users" ON public.toko_purchase_orders FOR ALL USING (true);
CREATE POLICY "Enable all for authenticated users" ON public.toko_purchase_order_items FOR ALL USING (true);

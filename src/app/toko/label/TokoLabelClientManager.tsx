"use client";

import { useState, useEffect, useRef } from "react";
import {
  Printer,
  Barcode as BarcodeIcon,
  QrCode,
  Tag,
  Check,
  Layers,
  Store,
  Sparkles,
  Search,
  RotateCcw,
  SlidersHorizontal,
  Copy,
  Info,
  CheckCircle2,
} from "lucide-react";
import { CrudHeader } from "@/components/CrudHeader";
import { TokoProductRow } from "../produk/TokoProdukClientManager";
import JsBarcode from "jsbarcode";
import QRCode from "qrcode";

type TokoLabelClientManagerProps = {
  products: TokoProductRow[];
  cooperativeProfile?: {
    name: string;
    address: string | null;
    phone: string | null;
  } | null;
};

const formatRupiah = (val: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);

// Subcomponent for Dynamic Barcode / QR Code rendering
function CodeRenderer({
  code,
  codeType,
  width = 1.4,
  height = 36,
  qrSize = 64,
}: {
  code: string;
  codeType: "barcode" | "qrcode" | "both";
  width?: number;
  height?: number;
  qrSize?: number;
}) {
  const barcodeRef = useRef<SVGSVGElement | null>(null);
  const [qrUrl, setQrUrl] = useState<string>("");

  useEffect(() => {
    const validCode = code && code.trim() ? code.trim() : "8991001001";

    // Generate Barcode
    if ((codeType === "barcode" || codeType === "both") && barcodeRef.current) {
      try {
        JsBarcode(barcodeRef.current, validCode, {
          format: "CODE128",
          width: width,
          height: height,
          displayValue: true,
          fontSize: 10,
          margin: 2,
          textMargin: 1,
        });
      } catch (err) {
        console.error("Barcode generation error:", err);
      }
    }

    // Generate QR Code
    if (codeType === "qrcode" || codeType === "both") {
      QRCode.toDataURL(validCode, {
        width: qrSize * 2,
        margin: 1,
        color: { dark: "#000000", light: "#ffffff" },
      })
        .then((url) => setQrUrl(url))
        .catch((err) => console.error("QR Code generation error:", err));
    }
  }, [code, codeType, width, height, qrSize]);

  if (codeType === "qrcode") {
    return (
      <div className="flex flex-col items-center justify-center">
        {qrUrl ? (
          <img src={qrUrl} alt="QR Code" style={{ width: qrSize, height: qrSize }} className="mx-auto" />
        ) : (
          <div style={{ width: qrSize, height: qrSize }} className="bg-slate-100 animate-pulse rounded" />
        )}
        <span className="font-mono text-[9px] font-bold text-[#475569] mt-0.5 tracking-wider">{code}</span>
      </div>
    );
  }

  if (codeType === "both") {
    return (
      <div className="flex items-center justify-center gap-2">
        <svg ref={barcodeRef} className="max-w-[120px]" />
        {qrUrl ? (
          <img src={qrUrl} alt="QR Code" style={{ width: qrSize * 0.85, height: qrSize * 0.85 }} />
        ) : null}
      </div>
    );
  }

  // Default: Barcode 1D
  return (
    <div className="flex justify-center">
      <svg ref={barcodeRef} className="mx-auto" />
    </div>
  );
}

export function TokoLabelClientManager({
  products,
  cooperativeProfile,
}: TokoLabelClientManagerProps) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [copiesMap, setCopiesMap] = useState<Record<string, number>>({});

  // Label Customization State
  const [codeType, setCodeType] = useState<"barcode" | "qrcode" | "both">("barcode");
  const [printFormat, setPrintFormat] = useState<"pricetag" | "thermal" | "a4">("pricetag");
  const [showMemberPrice, setShowMemberPrice] = useState(true);
  const [showCoopHeader, setShowCoopHeader] = useState(true);
  const [showPrintDate, setShowPrintDate] = useState(true);

  const todayStr = new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const coopName = cooperativeProfile?.name || "KOPKAR MANUNGGAL PERKASA";

  const toggleSelectProduct = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
    if (!copiesMap[id]) {
      setCopiesMap((prev) => ({ ...prev, [id]: 1 }));
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredProducts.length) {
      setSelectedIds([]);
    } else {
      const allIds = filteredProducts.map((p) => p.id);
      setSelectedIds(allIds);
      const newCopies: Record<string, number> = {};
      allIds.forEach((id) => (newCopies[id] = copiesMap[id] || 1));
      setCopiesMap(newCopies);
    }
  };

  const handleCopiesChange = (id: string, delta: number) => {
    setCopiesMap((prev) => ({
      ...prev,
      [id]: Math.max(1, (prev[id] || 1) + delta),
    }));
  };

  const categories = Array.from(new Set(products.map((p) => p.category || "Umum")));

  const filteredProducts = products.filter((p) => {
    if (categoryFilter !== "all" && p.category !== categoryFilter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.barcode && p.barcode.toLowerCase().includes(q)) ||
      (p.category && p.category.toLowerCase().includes(q))
    );
  });

  const selectedProducts = products.filter((p) => selectedIds.includes(p.id));

  // Expand selected products with their copies count for printing
  const printItems = selectedProducts.flatMap((p) => {
    const count = copiesMap[p.id] || 1;
    return Array.from({ length: count }, (_, idx) => ({ ...p, copyIndex: idx }));
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1] print:hidden">
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-2xl bg-[#2563eb] text-white shadow-sm">
            <BarcodeIcon className="size-6" />
          </div>
          <div>
            <h1 className="text-base font-black text-[#0b1220]">Cetak Label Barcode, QR Code & Price Tag Rak</h1>
            <p className="text-xs font-bold text-[#64748b]">
              Pilihan cetak Barcode 1D & QR Code 2D · Dual Harga (Umum vs Anggota) · Format Rak Toko & Stiker Thermal
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={!selectedIds.length}
          onClick={() => window.print()}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#2563eb] px-5 text-xs font-black text-white hover:bg-[#1d4ed8] shadow-sm disabled:opacity-50 transition-all cursor-pointer"
        >
          <Printer className="size-4" />
          <span>CETAK SEKARANG ({printItems.length} LABEL)</span>
        </button>
      </div>

      {/* Control & Customization Panel */}
      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1] space-y-4 print:hidden">
        <div className="grid gap-4 md:grid-cols-3 pb-3 border-b border-[#e2e8f0]">
          {/* 1. Format Cetak */}
          <div>
            <label className="text-[11px] font-bold uppercase text-[#475569] block mb-1.5">
              1. Format Kertas / Layout Cetak
            </label>
            <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-[#f8fbff] p-1 border border-[#cbd5e1] text-xs font-bold">
              <button
                type="button"
                onClick={() => setPrintFormat("pricetag")}
                className={`rounded-lg py-2 text-center transition-all cursor-pointer ${
                  printFormat === "pricetag" ? "bg-[#2563eb] text-white shadow-xs" : "text-[#64748b] hover:bg-slate-100"
                }`}
              >
                🏷️ Price Tag Rak
              </button>
              <button
                type="button"
                onClick={() => setPrintFormat("thermal")}
                className={`rounded-lg py-2 text-center transition-all cursor-pointer ${
                  printFormat === "thermal" ? "bg-[#2563eb] text-white shadow-xs" : "text-[#64748b] hover:bg-slate-100"
                }`}
              >
                🖨️ Stiker Thermal
              </button>
              <button
                type="button"
                onClick={() => setPrintFormat("a4")}
                className={`rounded-lg py-2 text-center transition-all cursor-pointer ${
                  printFormat === "a4" ? "bg-[#2563eb] text-white shadow-xs" : "text-[#64748b] hover:bg-slate-100"
                }`}
              >
                📄 Kertas Lembar A4
              </button>
            </div>
          </div>

          {/* 2. Pilihan Jenis Kode (Barcode vs QR Code vs Both) */}
          <div>
            <label className="text-[11px] font-bold uppercase text-[#475569] block mb-1.5">
              2. Jenis Kode Scan Barcode / QR Code
            </label>
            <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-[#f8fbff] p-1 border border-[#cbd5e1] text-xs font-bold">
              <button
                type="button"
                onClick={() => setCodeType("barcode")}
                className={`flex items-center justify-center gap-1 rounded-lg py-2 text-center transition-all cursor-pointer ${
                  codeType === "barcode" ? "bg-[#2563eb] text-white shadow-xs" : "text-[#64748b] hover:bg-slate-100"
                }`}
              >
                <BarcodeIcon className="size-3.5" />
                <span>Barcode 1D</span>
              </button>
              <button
                type="button"
                onClick={() => setCodeType("qrcode")}
                className={`flex items-center justify-center gap-1 rounded-lg py-2 text-center transition-all cursor-pointer ${
                  codeType === "qrcode" ? "bg-[#2563eb] text-white shadow-xs" : "text-[#64748b] hover:bg-slate-100"
                }`}
              >
                <QrCode className="size-3.5" />
                <span>QR Code 2D</span>
              </button>
              <button
                type="button"
                onClick={() => setCodeType("both")}
                className={`flex items-center justify-center gap-1 rounded-lg py-2 text-center transition-all cursor-pointer ${
                  codeType === "both" ? "bg-[#2563eb] text-white shadow-xs" : "text-[#64748b] hover:bg-slate-100"
                }`}
              >
                <Sparkles className="size-3.5" />
                <span>Keduanya</span>
              </button>
            </div>
          </div>

          {/* 3. Toggle Atribut */}
          <div>
            <label className="text-[11px] font-bold uppercase text-[#475569] block mb-1.5">
              3. Opsi Elemen Label
            </label>
            <div className="flex flex-wrap gap-2 text-xs">
              <label className="flex items-center gap-1.5 rounded-xl bg-[#f8fbff] px-2.5 py-1.5 border border-[#dbe5f1] cursor-pointer">
                <input
                  type="checkbox"
                  checked={showMemberPrice}
                  onChange={(e) => setShowMemberPrice(e.target.checked)}
                  className="size-3.5 rounded text-[#2563eb]"
                />
                <span className="font-bold text-[#0b1220]">🌟 Harga Anggota</span>
              </label>

              <label className="flex items-center gap-1.5 rounded-xl bg-[#f8fbff] px-2.5 py-1.5 border border-[#dbe5f1] cursor-pointer">
                <input
                  type="checkbox"
                  checked={showCoopHeader}
                  onChange={(e) => setShowCoopHeader(e.target.checked)}
                  className="size-3.5 rounded text-[#2563eb]"
                />
                <span className="font-bold text-[#0b1220]">Kop Koperasi</span>
              </label>

              <label className="flex items-center gap-1.5 rounded-xl bg-[#f8fbff] px-2.5 py-1.5 border border-[#dbe5f1] cursor-pointer">
                <input
                  type="checkbox"
                  checked={showPrintDate}
                  onChange={(e) => setShowPrintDate(e.target.checked)}
                  className="size-3.5 rounded text-[#2563eb]"
                />
                <span className="font-bold text-[#0b1220]">Tgl Cetak</span>
              </label>
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Category Filter */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setCategoryFilter("all")}
              className={`h-7.5 rounded-xl px-2.5 text-xs font-bold transition-all cursor-pointer ${
                categoryFilter === "all"
                  ? "bg-[#2563eb] text-white shadow-xs"
                  : "bg-[#f8fbff] text-[#64748b] ring-1 ring-[#dbe5f1] hover:bg-slate-100"
              }`}
            >
              Semua ({products.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`h-7.5 rounded-xl px-2.5 text-xs font-bold transition-all cursor-pointer ${
                  categoryFilter === cat
                    ? "bg-[#2563eb] text-white shadow-xs"
                    : "bg-[#f8fbff] text-[#64748b] ring-1 ring-[#dbe5f1] hover:bg-slate-100"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative min-w-[240px]">
            <Search className="absolute left-3 top-2.5 size-3.5 text-[#94a3b8]" />
            <input
              type="text"
              placeholder="Cari nama barang atau barcode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8.5 w-full rounded-xl border border-[#dbe5f1] bg-[#f8fbff] pl-8 pr-3 text-xs font-bold text-[#0b1220] outline-none focus:border-[#2563eb]"
            />
          </div>
        </div>

        {/* Product Selection Table */}
        <div className="overflow-x-auto rounded-xl border border-[#dbe5f1]">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#f8fbff] text-[#475569] border-b border-[#dbe5f1]">
              <tr>
                <th className="px-3 py-2 font-bold text-center w-10">
                  <input
                    type="checkbox"
                    checked={selectedIds.length > 0 && selectedIds.length === filteredProducts.length}
                    onChange={toggleSelectAll}
                    className="size-4 rounded accent-[#2563eb] cursor-pointer"
                  />
                </th>
                <th className="px-3 py-2 font-bold">Nama Barang Sembako</th>
                <th className="px-3 py-2 font-bold">Kategori</th>
                <th className="px-3 py-2 font-bold">Barcode / SKU</th>
                <th className="px-3 py-2 font-bold text-right">Harga Umum</th>
                <th className="px-3 py-2 font-bold text-right text-[#2563eb]">Harga Anggota</th>
                <th className="px-3 py-2 font-bold text-center w-32">Jml Cetak (Copies)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e8f0]">
              {filteredProducts.length ? (
                filteredProducts.map((product) => {
                  const isSelected = selectedIds.includes(product.id);
                  const copies = copiesMap[product.id] || 1;

                  return (
                    <tr
                      key={product.id}
                      className={`transition-colors ${isSelected ? "bg-[#eff6ff]" : "hover:bg-[#f8fbff]"}`}
                    >
                      <td className="px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectProduct(product.id)}
                          className="size-4 rounded accent-[#2563eb] cursor-pointer"
                        />
                      </td>
                      <td
                        onClick={() => toggleSelectProduct(product.id)}
                        className="px-3 py-2 font-bold text-[#0b1220] cursor-pointer"
                      >
                        {product.name}
                      </td>
                      <td className="px-3 py-2 text-[#64748b]">{product.category ?? "Sembako"}</td>
                      <td className="px-3 py-2 font-mono font-bold text-[#2563eb]">
                        {product.barcode ?? "8991001001"}
                      </td>
                      <td className="px-3 py-2 font-semibold text-right text-[#0b1220]">
                        {formatRupiah(product.sell_price_general)}
                      </td>
                      <td className="px-3 py-2 font-black text-right text-emerald-600">
                        {formatRupiah(product.sell_price_member)}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <div className="inline-flex items-center rounded-lg bg-white border border-[#dbe5f1] p-0.5">
                          <button
                            type="button"
                            onClick={() => handleCopiesChange(product.id, -1)}
                            className="grid size-6 place-items-center text-slate-500 hover:bg-slate-100 rounded cursor-pointer"
                          >
                            -
                          </button>
                          <span className="w-8 text-center font-bold">{copies}</span>
                          <button
                            type="button"
                            onClick={() => handleCopiesChange(product.id, 1)}
                            className="grid size-6 place-items-center text-slate-500 hover:bg-slate-100 rounded cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-[#64748b] font-bold">
                    Tidak ada produk yang cocok dengan pencarian.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Live Preview & Printable Sheet */}
      {selectedProducts.length ? (
        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-[#dbe5f1] space-y-4 print:p-0 print:ring-0 print:shadow-none print:bg-white">
          <div className="flex items-center justify-between border-b border-[#e2e8f0] pb-3 print:hidden">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#0b1220] flex items-center gap-2">
              <span>Preview Tampilan Label ({printItems.length} Label Total)</span>
              <span className="rounded-full bg-[#eff6ff] px-2 py-0.5 text-[10px] font-bold text-[#2563eb]">
                Format: {printFormat === "pricetag" ? "Price Tag Rak" : printFormat === "thermal" ? "Stiker Thermal" : "Lembaran A4"} · Kode: {codeType.toUpperCase()}
              </span>
            </h3>

            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#2563eb] px-4 text-xs font-bold text-white shadow-xs hover:bg-[#1d4ed8] cursor-pointer"
            >
              <Printer className="size-3.5" />
              <span>Print Label</span>
            </button>
          </div>

          {/* Printable Labels Container */}
          <div
            id="printable-label-area"
            className={
              printFormat === "pricetag"
                ? "grid gap-4 sm:grid-cols-2 md:grid-cols-3 print:grid-cols-3 print:gap-3"
                : printFormat === "thermal"
                ? "grid gap-3 max-w-[300px] mx-auto print:max-w-none print:grid-cols-1 print:gap-2"
                : "grid gap-3 sm:grid-cols-3 md:grid-cols-4 print:grid-cols-4 print:gap-2"
            }
          >
            {printItems.map((prod, index) => (
              <div
                key={`${prod.id}_${index}`}
                className={
                  printFormat === "pricetag"
                    ? "rounded-2xl border-2 border-[#0b1220] bg-white p-3.5 shadow-2xs space-y-2 text-center break-inside-avoid print:border-black print:rounded-xl"
                    : printFormat === "thermal"
                    ? "rounded-xl border border-black bg-white p-2.5 text-center space-y-1.5 break-inside-avoid"
                    : "rounded-xl border border-dashed border-[#0b1220] bg-white p-2.5 text-center space-y-1 break-inside-avoid print:border-solid print:border-black"
                }
              >
                {/* Header Kop */}
                {showCoopHeader ? (
                  <div className="border-b border-[#cbd5e1] pb-1">
                    <p className="text-[9px] font-black uppercase text-[#2563eb] tracking-wider truncate">
                      {coopName}
                    </p>
                    <p className="text-[8px] font-bold text-[#64748b]">UNIT TOKO WASERDA</p>
                  </div>
                ) : null}

                {/* Product Name */}
                <h4 className="font-black text-xs text-[#0b1220] leading-tight line-clamp-2 min-h-[28px] flex items-center justify-center">
                  {prod.name}
                </h4>

                {/* Price Display */}
                <div className="rounded-xl bg-[#f8fbff] p-2 border border-[#dbe5f1] space-y-1 print:bg-white print:border-black">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="font-bold text-[#64748b]">Harga Umum:</span>
                    <span className="font-black text-[#0b1220]">{formatRupiah(prod.sell_price_general)}</span>
                  </div>

                  {showMemberPrice ? (
                    <div className="flex justify-between items-center text-xs font-black text-emerald-600 pt-0.5 border-t border-[#dbe5f1] print:border-black">
                      <span className="text-[9px] uppercase tracking-tight">Anggota:</span>
                      <span className="text-sm font-black">{formatRupiah(prod.sell_price_member)}</span>
                    </div>
                  ) : null}
                </div>

                {/* Real Barcode / QR Code */}
                <div className="pt-0.5">
                  <CodeRenderer
                    code={prod.barcode || "8991001001"}
                    codeType={codeType}
                    width={printFormat === "thermal" ? 1.2 : 1.4}
                    height={printFormat === "thermal" ? 28 : 34}
                    qrSize={printFormat === "thermal" ? 54 : 64}
                  />
                </div>

                {/* Footer Info / Date */}
                {showPrintDate ? (
                  <div className="flex justify-between text-[8px] font-semibold text-[#94a3b8] pt-1 border-t border-slate-200">
                    <span>Kat: {prod.category || "Umum"}</span>
                    <span>Tgl: {todayStr}</span>
                  </div>
                ) : null}
              </div>
            ))}
          </div>

          {/* Global Print Stylesheet */}
          <style jsx global>{`
            @media print {
              body * {
                visibility: hidden;
              }
              #printable-label-area, #printable-label-area * {
                visibility: visible;
              }
              #printable-label-area {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                margin: 0;
                padding: 4mm;
                background: white !important;
              }
              @page {
                size: auto;
                margin: 6mm;
              }
            }
          `}</style>
        </section>
      ) : (
        <div className="rounded-2xl bg-white p-12 text-center shadow-sm ring-1 ring-[#dbe5f1]">
          <Tag className="mx-auto size-8 text-[#94a3b8]" />
          <p className="mt-3 text-sm font-bold text-[#0b1220]">Belum ada barang yang dipilih untuk dicetak label.</p>
          <p className="text-xs text-[#64748b] mt-1">Centang satu atau beberapa barang pada tabel di atas untuk melihat preview cetak.</p>
        </div>
      )}
    </div>
  );
}

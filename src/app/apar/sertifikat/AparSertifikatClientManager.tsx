"use client";

import { useState } from "react";
import { Printer, ShieldCheck, FileCheck2, Building2, Calendar, Award } from "lucide-react";
import { CrudHeader } from "@/components/CrudHeader";
import { CrudModal } from "@/components/CrudModal";

export type AparCertificateRow = {
  id: string;
  cert_no: string;
  client_name: string;
  serial_no: string;
  media_type: string;
  capacity_kg: number;
  test_date: string;
  expired_date: string;
  inspector_name: string;
  status: "LULUS UJI KELAYAKAN";
};

type AparSertifikatClientManagerProps = {
  certificates: AparCertificateRow[];
};

export function AparSertifikatClientManager({ certificates }: AparSertifikatClientManagerProps) {
  const [search, setSearch] = useState("");
  const [selectedCert, setSelectedCert] = useState<AparCertificateRow | null>(null);

  const filteredCerts = certificates.filter(
    (c) =>
      !search ||
      c.cert_no.toLowerCase().includes(search.toLowerCase()) ||
      c.client_name.toLowerCase().includes(search.toLowerCase()) ||
      c.serial_no.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <CrudHeader
        title="Cetak Sertifikat Hydrotest & Kelayakan Damkar"
        subtitle="Modul penerbitan & cetak surat sertifikat pengujian tekanan (Hydrotest) dan garansi masa berlaku APAR."
        countBadge={`${certificates.length} Sertifikat Terbit`}
        searchValue={search}
        onSearchChange={setSearch}
      />

      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1]">
        <div className="overflow-x-auto rounded-xl border border-[#dbe5f1]">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#f8fbff] text-[#475569] border-b border-[#dbe5f1]">
              <tr>
                <th className="px-3 py-3 font-bold">No. Sertifikat Damkar</th>
                <th className="px-3 py-3 font-bold">Gedung / Klien PT</th>
                <th className="px-3 py-3 font-bold">No. Seri Tabung APAR</th>
                <th className="px-3 py-3 font-bold">Media & Ukuran</th>
                <th className="px-3 py-3 font-bold text-center">Tanggal Hydrotest</th>
                <th className="px-3 py-3 font-bold text-center">Berlaku s/d</th>
                <th className="px-3 py-3 font-bold text-center">Aksi Cetak</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e8f0]">
              {filteredCerts.map((c) => (
                <tr key={c.id} className="hover:bg-[#f8fbff] transition-colors">
                  <td className="px-3 py-3 font-bold text-[#be123c]">{c.cert_no}</td>
                  <td className="px-3 py-3 font-bold text-[#0b1220]">{c.client_name}</td>
                  <td className="px-3 py-3 font-mono text-[#64748b]">{c.serial_no}</td>
                  <td className="px-3 py-3 font-semibold">
                    {c.media_type} {c.capacity_kg} Kg
                  </td>
                  <td className="px-3 py-3 text-center text-[#64748b]">{c.test_date}</td>
                  <td className="px-3 py-3 text-center font-bold text-emerald-600">{c.expired_date}</td>
                  <td className="px-3 py-3 text-center">
                    <button
                      type="button"
                      onClick={() => setSelectedCert(c)}
                      className="inline-flex h-8 items-center gap-1.5 rounded-xl bg-[#be123c] px-3 text-xs font-bold text-white hover:bg-[#9f1239]"
                    >
                      <Printer className="size-3.5" />
                      <span>Cetak Sertifikat</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal Preview & Print Sertifikat Damkar */}
      {selectedCert ? (
        <CrudModal
          isOpen={true}
          maxWidth="max-w-2xl"
          title={`Sertifikat Kelayakan Damkar: ${selectedCert.cert_no}`}
          onClose={() => setSelectedCert(null)}
        >
          <div className="space-y-4 text-xs">
            {/* Certificate Frame */}
            <div className="rounded-2xl border-4 border-double border-[#0b1220] bg-white p-6 text-center space-y-4 text-[#0b1220] shadow-sm">
              <div className="space-y-1 border-b border-black pb-3">
                <p className="text-xs font-black uppercase tracking-widest text-[#be123c]">
                  KOPERASI DINAS PEMADAM KEBAKARAN & PENYELAMATAN
                </p>
                <h2 className="text-lg font-black tracking-wide">SERTIFIKAT KELAYAKAN & UJI HYDROTEST APAR</h2>
                <p className="text-[11px] font-mono text-[#475569]">No. Sertifikat: {selectedCert.cert_no}</p>
              </div>

              <p className="text-xs italic text-[#475569]">
                Dengan ini menerangkan bahwa Alat Pemadam Api Ringan (APAR) dengan rincian teknis di bawah ini telah melalui pengujian tekanan (*Hydrotest*) dan pengisian ulang media pemadam dengan hasil:
              </p>

              <div className="inline-block rounded-xl bg-emerald-100 px-4 py-1 text-xs font-black text-emerald-800 border border-emerald-300">
                ✓ LULUS UJI KELAYAKAN KESELAMATAN (PASSED)
              </div>

              <div className="rounded-xl bg-[#f8fbff] p-4 border border-[#cbd5e1] text-left grid gap-2 sm:grid-cols-2 text-xs">
                <div>
                  <p className="text-[#64748b] font-semibold">Nama Pemilik / Gedung:</p>
                  <p className="font-black text-[#0b1220]">{selectedCert.client_name}</p>
                </div>
                <div>
                  <p className="text-[#64748b] font-semibold">No. Seri Tabung APAR:</p>
                  <p className="font-mono font-bold text-[#be123c]">{selectedCert.serial_no}</p>
                </div>
                <div>
                  <p className="text-[#64748b] font-semibold">Media Pemadam & Kapasitas:</p>
                  <p className="font-bold">{selectedCert.media_type} ({selectedCert.capacity_kg} Kg)</p>
                </div>
                <div>
                  <p className="text-[#64748b] font-semibold">Masa Berlaku s/d:</p>
                  <p className="font-black text-emerald-600">{selectedCert.expired_date}</p>
                </div>
              </div>

              <div className="flex justify-between items-end pt-6 text-[11px]">
                <div className="text-left">
                  <p className="font-semibold text-[#64748b]">Petugas Inspeksi Teknis:</p>
                  <p className="font-bold text-[#0b1220] mt-8">{selectedCert.inspector_name}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-[#64748b]">Kepala Uji Teknis Koperasi Damkar:</p>
                  <p className="font-black text-[#0b1220] mt-8">H. Bambang S., S.STP, M.Si</p>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#be123c] text-xs font-black text-white hover:bg-[#9f1239] shadow-sm"
              >
                <Printer className="size-4" />
                <span>CETAK SERTIFIKAT KELAYAKAN DAMKAR</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedCert(null)}
                className="h-11 rounded-xl bg-[#f1f5f9] px-4 text-xs font-bold text-[#0b1220] hover:bg-[#e2e8f0]"
              >
                Tutup
              </button>
            </div>
          </div>
        </CrudModal>
      ) : null}
    </div>
  );
}

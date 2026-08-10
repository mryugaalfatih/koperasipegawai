"use client";

import { useState } from "react";
import { Image as ImageIcon, FileText, Maximize2, X } from "lucide-react";

type MemberPhotoGalleryProps = {
  memberName: string;
  photoUrl?: string | null;
  ktpUrl?: string | null;
};

export function MemberPhotoGalleryModal({
  memberName,
  photoUrl,
  ktpUrl,
}: MemberPhotoGalleryProps) {
  const [activePhoto, setActivePhoto] = useState<{
    url: string;
    title: string;
  } | null>(null);

  if (!photoUrl && !ktpUrl) {
    return (
      <div className="rounded-3xl bg-[#f4f7fb] p-5 text-center">
        <ImageIcon className="mx-auto size-8 text-[#94a3b8]" />
        <p className="mt-2 text-xs font-bold text-[#64748b]">
          Dokumen foto profil / KTP belum diunggah.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        {/* Pas Foto Thumbnail */}
        {photoUrl ? (
          <div className="group relative overflow-hidden rounded-3xl border border-[#dbe5f1] bg-white p-3 shadow-sm transition-all hover:shadow-md">
            <div className="aspect-square w-full overflow-hidden rounded-2xl bg-[#07152f]">
              <img
                src={photoUrl}
                alt={`Pas foto ${memberName}`}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            </div>
            <div className="mt-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-[#0b1220]">Pas Foto Profil</p>
                <p className="text-[11px] font-semibold text-[#64748b]">Identitas Anggota</p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setActivePhoto({
                    url: photoUrl,
                    title: `Pas Foto Profil - ${memberName}`,
                  })
                }
                className="grid size-8 place-items-center rounded-xl bg-[#eaf2ff] text-[#2563eb] hover:bg-[#2563eb] hover:text-white transition-all active:scale-95"
                title="Perbesar Pas Foto"
              >
                <Maximize2 className="size-4" />
              </button>
            </div>
          </div>
        ) : null}

        {/* KTP Thumbnail */}
        {ktpUrl ? (
          <div className="group relative overflow-hidden rounded-3xl border border-[#dbe5f1] bg-white p-3 shadow-sm transition-all hover:shadow-md">
            <div className="aspect-video w-full overflow-hidden rounded-2xl bg-[#07152f]">
              <img
                src={ktpUrl}
                alt={`Foto KTP ${memberName}`}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            </div>
            <div className="mt-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-[#0b1220]">Foto Kartu KTP</p>
                <p className="text-[11px] font-semibold text-[#64748b]">Verifikasi Identitas</p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setActivePhoto({
                    url: ktpUrl,
                    title: `Dokumen KTP - ${memberName}`,
                  })
                }
                className="grid size-8 place-items-center rounded-xl bg-[#eaf2ff] text-[#2563eb] hover:bg-[#2563eb] hover:text-white transition-all active:scale-95"
                title="Perbesar Foto KTP"
              >
                <Maximize2 className="size-4" />
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {/* Lightbox / Fullscreen Viewer Modal */}
      {activePhoto ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-8">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-[#07152f]/80 backdrop-blur-md transition-opacity animate-in fade-in"
            onClick={() => setActivePhoto(null)}
          />

          {/* Lightbox Card */}
          <div className="relative z-[121] flex max-h-[90vh] max-w-4xl flex-col rounded-[28px] bg-white p-4 shadow-2xl ring-1 ring-[#dbe5f1] animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3">
              <h3 className="text-sm font-bold text-[#0b1220]">{activePhoto.title}</h3>
              <button
                type="button"
                onClick={() => setActivePhoto(null)}
                className="grid size-8 place-items-center rounded-xl bg-[#f1f5f9] text-[#64748b] hover:bg-[#e2e8f0] hover:text-[#0b1220] active:scale-95 transition-all"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-auto rounded-2xl bg-[#0b1220] p-2 flex items-center justify-center">
              <img
                src={activePhoto.url}
                alt={activePhoto.title}
                className="max-h-[75vh] w-auto max-w-full rounded-xl object-contain"
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

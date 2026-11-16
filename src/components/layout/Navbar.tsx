import Link from "next/link";
import Image from "next/image";

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[var(--slate-200)] shadow-xs">
      {/* Garis Aksen Emas Sesuai Bagian 9 */}
      <div className="h-1 bg-gradient-to-r from-[var(--gold-light)] via-[var(--gold-main)] to-[var(--gold-shadow)]" />
      <div className="max-w-5xl mx-auto px-4 py-2.5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--emerald-600)] to-[var(--emerald-700)] flex items-center justify-center p-2 shadow-sm">
            <Image src="/icon.svg" alt="Aksara Stok" width={28} height={28} className="w-full h-full" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-[var(--slate-900)] tracking-tight leading-tight">
              PT Aksara Riksa Perdana
            </h1>
            <p className="text-[11px] text-[var(--slate-400)] font-medium">
              Sistem Stok Opname & Inventaris
            </p>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
          <Link
            href="/"
            className="px-3 py-2 rounded-lg text-[var(--slate-700)] hover:text-[var(--emerald-700)] hover:bg-[var(--emerald-50)] transition-colors"
          >
            Beranda
          </Link>
          <Link
            href="/barang"
            className="px-3 py-2 rounded-lg text-[var(--slate-700)] hover:text-[var(--emerald-700)] hover:bg-[var(--emerald-50)] transition-colors font-semibold"
          >
            Master Barang
          </Link>
          <Link
            href="/keluar"
            className="px-3 py-2 rounded-lg text-[var(--slate-700)] hover:text-[var(--emerald-700)] hover:bg-[var(--emerald-50)] transition-colors font-semibold"
          >
            Catat Keluar
          </Link>
          <Link
            href="/masuk"
            className="px-3 py-2 rounded-lg text-[var(--slate-700)] hover:text-[var(--emerald-700)] hover:bg-[var(--emerald-50)] transition-colors font-semibold"
          >
            Catat Masuk
          </Link>
          <Link
            href="/riwayat"
            className="px-3 py-2 rounded-lg text-[var(--slate-700)] hover:text-[var(--emerald-700)] hover:bg-[var(--emerald-50)] transition-colors"
          >
            Riwayat
          </Link>
          <Link
            href="/opname"
            className="px-3 py-2 rounded-lg text-[var(--slate-700)] hover:text-[var(--emerald-700)] hover:bg-[var(--emerald-50)] transition-colors font-semibold"
          >
            Opname
          </Link>
          <Link
            href="/karyawan"
            className="px-3 py-2 rounded-lg text-[var(--slate-700)] hover:text-[var(--emerald-700)] hover:bg-[var(--emerald-50)] transition-colors"
          >
            Karyawan
          </Link>
          <span className="inline-flex items-center gap-1.5 ml-2 px-2.5 py-1 rounded-full bg-[var(--emerald-50)] border border-[var(--emerald-500)]/20 text-[var(--emerald-700)] text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-[var(--emerald-500)]" />
            Langkah 4 Aktif
          </span>
        </nav>
      </div>
    </header>
  );
}

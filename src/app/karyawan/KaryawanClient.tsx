"use client";

import { useState, useMemo } from "react";
import { Search, X, Users, ShieldAlert, CheckCircle2, UserCheck, Briefcase, Hash } from "lucide-react";
import type { Person } from "@/types/inventory";

interface KaryawanClientProps {
  initialPeople: Person[];
}

export function KaryawanClient({ initialPeople }: KaryawanClientProps) {
  const [search, setSearch] = useState("");

  const filteredPeople = useMemo(() => {
    if (!search.trim()) return initialPeople;
    const q = search.trim().toLowerCase();
    return initialPeople.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.position.toLowerCase().includes(q) ||
        p.employee_code.toLowerCase().includes(q)
    );
  }, [initialPeople, search]);

  return (
    <div className="space-y-4 pb-24 md:pb-12">
      {/* Header Card */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[var(--slate-200)] shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[var(--slate-900)] tracking-tight">
              Daftar Karyawan
            </h1>
            <p className="text-xs text-[var(--slate-400)] mt-0.5">
              13 Karyawan Lapangan & Manajemen PT Aksara Riksa Perdana
            </p>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--bg-canvas)] border border-[var(--slate-200)] text-xs font-semibold text-[var(--slate-700)] self-start sm:self-auto">
            <Users className="w-4 h-4 text-[var(--emerald-600)]" />
            <span className="num-mono font-bold text-[var(--emerald-700)]">{filteredPeople.length}</span>
            <span>Orang</span>
          </div>
        </div>

        {/* Informasi Penggunaan */}
        <div className="mt-4 p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3">
          <Users className="w-5 h-5 text-slate-600 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-600 leading-relaxed">
            Daftar karyawan digunakan sebagai pilihan penanggung jawab saat mencatat barang keluar dan pemakaian alat kerja.
          </div>
        </div>

        {/* Search Input */}
        <div className="relative mt-4">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--slate-400)] pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama, jabatan, atau nomor karyawan..."
            className="w-full pl-11 pr-10 py-3.5 rounded-xl border border-[var(--slate-200)] bg-[var(--bg-canvas)] text-sm text-[var(--slate-900)] placeholder:text-[var(--slate-400)] focus:outline-none focus:ring-2 focus:ring-[var(--emerald-600)] focus:bg-white touch-target transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-[var(--slate-400)] hover:text-[var(--slate-700)] touch-target"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Grid Card View untuk Mobile & Desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredPeople.map((person) => (
          <div
            key={person.id}
            className="bg-white rounded-2xl p-4 border border-[var(--slate-200)] shadow-xs flex flex-col justify-between gap-3 hover:border-[var(--emerald-500)]/40 transition-colors"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="w-10 h-10 rounded-xl bg-[var(--emerald-50)] text-[var(--emerald-700)] flex items-center justify-center font-bold text-sm shrink-0 border border-[var(--emerald-500)]/20">
                {person.name
                  .split(" ")
                  .slice(0, 2)
                  .map((n) => n[0])
                  .join("")}
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[var(--emerald-50)] text-[var(--emerald-700)] text-[11px] font-semibold">
                <CheckCircle2 className="w-3 h-3 text-[var(--emerald-600)]" />
                Aktif
              </span>
            </div>

            <div>
              <h2 className="text-sm font-bold text-[var(--slate-900)] leading-snug">
                {person.name}
              </h2>
              <div className="flex items-center gap-1.5 text-xs text-[var(--slate-700)] mt-1">
                <Briefcase className="w-3.5 h-3.5 text-[var(--slate-400)] shrink-0" />
                <span>{person.position}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-[var(--slate-200)]/60 flex items-center justify-between text-xs text-[var(--slate-400)]">
              <span className="flex items-center gap-1">
                <Hash className="w-3 h-3" />
                <span className="num-mono font-medium text-[var(--slate-700)]">{person.employee_code}</span>
              </span>
              <span className="text-[11px] text-[var(--slate-400)]">Tanpa Akun Login</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

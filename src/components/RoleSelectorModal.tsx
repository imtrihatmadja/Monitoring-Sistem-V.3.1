import React from 'react';
import { UserRoleType, USER_ROLES, getRolePermissions, AUTHORIZED_ADMIN_EMAILS } from '../lib/rbac';
import { Staff } from '../types';
import { ShieldCheck, Check, X, Lock, Info, UserCheck, ShieldAlert, Key } from 'lucide-react';

interface RoleSelectorModalProps {
  isOpen: boolean;
  currentRole: UserRoleType;
  isSuperAdmin?: boolean;
  staffList?: Staff[];
  activeStaffId?: string | null;
  onClose: () => void;
  onSelectRole: (role: UserRoleType) => void;
  onSelectStaff?: (staffId: string) => void;
}

export const RoleSelectorModal: React.FC<RoleSelectorModalProps> = ({
  isOpen,
  currentRole,
  isSuperAdmin = false,
  staffList = [],
  activeStaffId = null,
  onClose,
  onSelectRole,
  onSelectStaff,
}) => {
  if (!isOpen) return null;

  const currentPermissions = getRolePermissions(currentRole);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-600 flex items-center justify-center text-white font-black text-lg shadow-md">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white leading-tight">
                Hak Akses &amp; Identitas Pengguna Sistem DFW
              </h2>
              <p className="text-xs text-slate-400 font-medium">
                Sistem dibatasi khusus untuk Program Director &amp; Petugas MEL (Full Access)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800">
          
          {/* Main Policy Banner */}
          <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 text-xs text-purple-950 space-y-2">
            <div className="flex items-center gap-2 font-black text-purple-900 text-sm">
              <Key className="w-4 h-4 text-purple-700" />
              Kebijakan Hak Akses Sistem Terpusat:
            </div>
            <p className="text-xs text-purple-900 leading-relaxed">
              Sistem MONEV DFW dikonfigurasi secara langsung untuk digunakan oleh <strong>Program Director</strong> dan <strong>Petugas MEL / Admin</strong>. Hanya 2 alamat email resmi yang memiliki kewenangan penuh (Full Access/Edit) untuk mengubah data proyek, indikator, progress, dan anggaran:
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {AUTHORIZED_ADMIN_EMAILS.map((email) => (
                <span key={email} className="bg-purple-900 text-purple-100 font-mono text-[11px] font-bold px-3 py-1 rounded-xl shadow-xs border border-purple-700">
                  👑 {email}
                </span>
              ))}
            </div>
            <p className="text-[11px] text-purple-800 italic pt-1">
              * Pengguna lain dengan email terdaftar atau akun tamu secara otomatis beroperasi dalam <strong>Mode Lihat-Saja (View Only)</strong>.
            </p>
          </div>

          {/* Active User Identity & Role Status */}
          <div className={`p-4 rounded-2xl border ${currentPermissions.badgeBorder} ${currentPermissions.badgeBg} flex items-center justify-between gap-4 shadow-xs`}>
            <div className="flex items-center gap-3">
              <span className="text-2xl">{currentPermissions.badgeIcon}</span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-500">Akses Pengguna Aktif:</span>
                  <span className={`text-xs font-black py-0.5 px-2.5 rounded-lg ${currentPermissions.badgeBg} ${currentPermissions.badgeText} border ${currentPermissions.badgeBorder}`}>
                    {currentPermissions.title}
                  </span>
                </div>
                <p className="text-xs text-slate-700 font-medium mt-1">
                  {currentPermissions.description}
                </p>
              </div>
            </div>
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 bg-white/90 py-1.5 px-3 rounded-xl border border-slate-200 shrink-0">
              {currentRole === 'super_admin' ? 'FULL ACCESS' : 'VIEW ONLY'}
            </span>
          </div>

          {/* Select Account for Login/Testing */}
          {staffList.length > 0 && onSelectStaff && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-purple-600" />
                  Ganti Sesi Akun Pengguna:
                </span>
                <span className="text-[10px] text-slate-500 font-medium">
                  {staffList.length} Akun Terdaftar
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {staffList.map((st) => {
                  const isSelected = activeStaffId === st.id;
                  const isFullAdmin = AUTHORIZED_ADMIN_EMAILS.includes((st.email || '').toLowerCase());

                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => onSelectStaff(st.id)}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'bg-purple-900 text-white border-purple-900 shadow-md ring-2 ring-purple-600/30'
                          : 'bg-white text-slate-800 border-slate-200 hover:border-purple-300 hover:bg-purple-50/40'
                      }`}
                    >
                      <div className="min-w-0 space-y-0.5">
                        <p className="text-xs font-black truncate flex items-center gap-1.5">
                          {st.name}
                          {isFullAdmin && <span className="text-amber-300 text-xs">👑</span>}
                        </p>
                        <p className={`text-[10px] truncate ${isSelected ? 'text-purple-200' : 'text-slate-500'}`}>
                          {st.email}
                        </p>
                      </div>
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-lg shrink-0 ${
                        isFullAdmin
                          ? isSelected ? 'bg-amber-400 text-slate-950' : 'bg-purple-100 text-purple-800 border border-purple-300'
                          : isSelected ? 'bg-purple-800 text-purple-200' : 'bg-amber-100 text-amber-800 border border-amber-300'
                      }`}>
                        {isFullAdmin ? 'FULL ACCESS' : 'VIEW ONLY'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Access Comparison Table */}
          <div className="space-y-3 pt-1">
            <h4 className="text-xs font-extrabold uppercase tracking-widest text-slate-400">
              Ringkasan Matriks Hak Akses
            </h4>
            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-extrabold text-[10px] uppercase tracking-wider border-b border-slate-200">
                    <th className="py-2.5 px-3.5">Fungsi / Modul Sistem</th>
                    <th className="py-2.5 px-3.5 text-center text-purple-700">Full Access (Program Director &amp; MEL)</th>
                    <th className="py-2.5 px-3.5 text-center text-amber-700">View Only (Pengguna Lain)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  <tr>
                    <td className="py-2 px-3.5 font-semibold">Buat / Edit / Hapus Proyek &amp; Anggaran</td>
                    <td className="py-2 px-3.5 text-center font-extrabold text-emerald-600">✓ Ya (Penuh)</td>
                    <td className="py-2 px-3.5 text-center text-rose-500 font-bold">✗ Lihat Saja</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3.5 font-semibold">Kelola Indikator &amp; Target PIRS</td>
                    <td className="py-2 px-3.5 text-center font-extrabold text-emerald-600">✓ Ya (Penuh)</td>
                    <td className="py-2 px-3.5 text-center text-rose-500 font-bold">✗ Lihat Saja</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3.5 font-semibold">Update Progress Aktivitas &amp; Dokumen</td>
                    <td className="py-2 px-3.5 text-center font-extrabold text-emerald-600">✓ Ya (Penuh)</td>
                    <td className="py-2 px-3.5 text-center text-rose-500 font-bold">✗ Lihat Saja</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3.5 font-semibold">Lihat Dashboard, Grafik &amp; Unduh Laporan</td>
                    <td className="py-2 px-3.5 text-center font-extrabold text-emerald-600">✓ Ya (Penuh)</td>
                    <td className="py-2 px-3.5 text-center font-extrabold text-emerald-600">✓ Ya (Bisa Akses)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <Info className="w-4 h-4 text-purple-600 shrink-0" />
            <span>
              Akses ditentukan otomatis oleh email Google login terdaftar.
            </span>
          </div>
          <button
            onClick={onClose}
            className="py-2.5 px-6 bg-slate-900 hover:bg-black text-white font-extrabold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
          >
            Selesai / Tutup
          </button>
        </div>
      </div>
    </div>
  );
};

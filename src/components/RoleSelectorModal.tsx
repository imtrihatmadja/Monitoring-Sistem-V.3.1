import React from 'react';
import { UserRoleType, USER_ROLES, getRolePermissions } from '../lib/rbac';
import { ShieldCheck, Check, X, Lock, Info, Users, Crown, BarChart3, FileText, Eye } from 'lucide-react';

interface RoleSelectorModalProps {
  isOpen: boolean;
  currentRole: UserRoleType;
  isSuperAdmin?: boolean;
  onClose: () => void;
  onSelectRole: (role: UserRoleType) => void;
}

export const RoleSelectorModal: React.FC<RoleSelectorModalProps> = ({
  isOpen,
  currentRole,
  isSuperAdmin = false,
  onClose,
  onSelectRole,
}) => {
  if (!isOpen) return null;

  const currentPermissions = getRolePermissions(currentRole);

  const roleList: UserRoleType[] = ['super_admin', 'project_coordinator', 'field_officer', 'donor_viewer'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-lg">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white leading-tight">
                Role-Based Access Control (RBAC) - Simulasi Peran Pengguna
              </h2>
              <p className="text-xs text-slate-400 font-medium">
                Pilih peran pengguna di bawah ini untuk mensimulasikan wewenang &amp; batas akses portal MONEV
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
          
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 text-xs text-blue-900 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-extrabold text-blue-950">Simulasi Peran Pengguna Interaktif (RBAC)</p>
              <p className="text-[11px] text-blue-800 leading-relaxed">
                Pilih salah satu peran di bawah ini untuk mensimulasikan tampilan portal MONEV, hak akses, dan batas wewenang secara langsung. Anda dapat berganti peran kapan saja.
              </p>
            </div>
          </div>

          {/* Active Role Card Highlight */}
          <div className={`p-4 rounded-xl border ${currentPermissions.badgeBorder} ${currentPermissions.badgeBg} flex items-center justify-between gap-4`}>
            <div className="flex items-center gap-3">
              <span className="text-2xl">{currentPermissions.badgeIcon}</span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-500">Peran Aktif Saat Ini:</span>
                  <span className={`text-xs font-black py-0.5 px-2 rounded-md ${currentPermissions.badgeBg} ${currentPermissions.badgeText} border ${currentPermissions.badgeBorder}`}>
                    {currentPermissions.title}
                  </span>
                </div>
                <p className="text-xs text-slate-700 font-semibold mt-1">
                  {currentPermissions.description}
                </p>
              </div>
            </div>
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 bg-white/80 py-1.5 px-3 rounded-xl border border-slate-200/60 shrink-0">
              {currentRole}
            </span>
          </div>

          {/* Role Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {roleList.map((rKey) => {
              const rConfig = USER_ROLES[rKey];
              const isSelected = rKey === currentRole;

              return (
                <div
                  key={rKey}
                  onClick={() => onSelectRole(rKey)}
                  className={`p-4 rounded-2xl border-2 transition-all relative flex flex-col justify-between cursor-pointer hover:border-blue-400 hover:shadow-md ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50/20 shadow-md ring-2 ring-blue-600/20'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{rConfig.badgeIcon}</span>
                        <div>
                          <h3 className="font-extrabold text-sm text-slate-900 leading-tight">
                            {rConfig.title}
                          </h3>
                          <span className="text-[10px] font-bold text-slate-500">
                            {rConfig.subtitle}
                          </span>
                        </div>
                      </div>
                      {isSelected && (
                        <span className="bg-blue-600 text-white rounded-full p-1 text-xs">
                          <Check className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed font-medium">
                      {rConfig.description}
                    </p>
                  </div>

                  {/* Highlights list */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap gap-1.5">
                    {rConfig.canManageProjects && (
                      <span className="text-[10px] bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded-md">
                        + Buat/Hapus Proyek &amp; Anggaran
                      </span>
                    )}
                    {rConfig.canManageIndicators && (
                      <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-md">
                        + Kelola Indikator
                      </span>
                    )}
                    {rConfig.canApproveProgress && (
                      <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded-md">
                        + Disetujui Progress
                      </span>
                    )}
                    {rConfig.canUpdateFieldProgress && (
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-md">
                        + Update Progress &amp; Dokumen
                      </span>
                    )}
                    {rConfig.isReadOnly && (
                      <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                        <Lock className="w-3 h-3" /> Mode Read-Only (Lihat-Saja)
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Comparative Matrix Table */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-extrabold uppercase tracking-widest text-slate-400">
              Matriks Perbandingan Hak Akses &amp; Batas Wewenang (RBAC)
            </h4>
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-extrabold text-[10px] uppercase tracking-wider border-b border-slate-200">
                    <th className="py-2.5 px-3">Fitur / Modul Portal</th>
                    <th className="py-2.5 px-3 text-center text-purple-700">1. Super Admin</th>
                    <th className="py-2.5 px-3 text-center text-blue-700">2. Coordinator</th>
                    <th className="py-2.5 px-3 text-center text-emerald-700">3. Field Officer</th>
                    <th className="py-2.5 px-3 text-center text-amber-700">4. Donor/Viewer</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  <tr>
                    <td className="py-2 px-3 font-semibold">Buat / Hapus / Edit Proyek Utama</td>
                    <td className="py-2 px-3 text-center font-bold text-emerald-600">✓ Ya</td>
                    <td className="py-2 px-3 text-center text-slate-400">✗ Tidak</td>
                    <td className="py-2 px-3 text-center text-slate-400">✗ Tidak</td>
                    <td className="py-2 px-3 text-center text-slate-400">✗ Tidak</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-semibold">Pengaturan Total Anggaran Proyek</td>
                    <td className="py-2 px-3 text-center font-bold text-emerald-600">✓ Ya</td>
                    <td className="py-2 px-3 text-center text-slate-400">✗ Tidak</td>
                    <td className="py-2 px-3 text-center text-slate-400">✗ Tidak</td>
                    <td className="py-2 px-3 text-center text-slate-400">✗ Tidak</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-semibold">Kelola Akun Staff &amp; DB Supabase</td>
                    <td className="py-2 px-3 text-center font-bold text-emerald-600">✓ Ya</td>
                    <td className="py-2 px-3 text-center text-slate-400">✗ Tidak</td>
                    <td className="py-2 px-3 text-center text-slate-400">✗ Tidak</td>
                    <td className="py-2 px-3 text-center text-slate-400">✗ Tidak</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-semibold">Kelola Target Indikator (PIRS)</td>
                    <td className="py-2 px-3 text-center font-bold text-emerald-600">✓ Ya</td>
                    <td className="py-2 px-3 text-center font-bold text-emerald-600">✓ Ya</td>
                    <td className="py-2 px-3 text-center text-slate-400">✗ Tidak</td>
                    <td className="py-2 px-3 text-center text-slate-400">✗ Tidak</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-semibold">Menyetujui Progress Aktivitas Utama</td>
                    <td className="py-2 px-3 text-center font-bold text-emerald-600">✓ Ya</td>
                    <td className="py-2 px-3 text-center font-bold text-emerald-600">✓ Ya</td>
                    <td className="py-2 px-3 text-center text-slate-400">✗ Tidak</td>
                    <td className="py-2 px-3 text-center text-slate-400">✗ Tidak</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-semibold">Update % Progress, Catatan/Hambatan Lapangan</td>
                    <td className="py-2 px-3 text-center font-bold text-emerald-600">✓ Ya</td>
                    <td className="py-2 px-3 text-center font-bold text-emerald-600">✓ Ya</td>
                    <td className="py-2 px-3 text-center font-bold text-emerald-600">✓ Ya (Penugasan)</td>
                    <td className="py-2 px-3 text-center text-slate-400">✗ Tidak</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-semibold">Unggah Bukti Dokumen Lapangan</td>
                    <td className="py-2 px-3 text-center font-bold text-emerald-600">✓ Ya</td>
                    <td className="py-2 px-3 text-center font-bold text-emerald-600">✓ Ya</td>
                    <td className="py-2 px-3 text-center font-bold text-emerald-600">✓ Ya</td>
                    <td className="py-2 px-3 text-center text-slate-400">✗ Tidak</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-semibold">Melihat Dashboard &amp; Unduh Laporan Resmi</td>
                    <td className="py-2 px-3 text-center font-bold text-emerald-600">✓ Ya</td>
                    <td className="py-2 px-3 text-center font-bold text-emerald-600">✓ Ya</td>
                    <td className="py-2 px-3 text-center font-bold text-emerald-600">✓ Ya</td>
                    <td className="py-2 px-3 text-center font-bold text-emerald-600">✓ Ya (Read-Only)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <Info className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              {isSuperAdmin
                ? 'Pilih salah satu peran di atas untuk menguji tampilan MONEV.'
                : 'Role ditentukan secara konsisten oleh Super Admin DFW.'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="py-2 px-5 bg-slate-900 hover:bg-black text-white font-extrabold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
          >
            {isSuperAdmin ? 'Terapkan Peran Ini' : 'Tutup Panduan RBAC'}
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { Staff, Project, ProjectMember } from '../types';
import { UserRoleType, USER_ROLES, getRolePermissions } from '../lib/rbac';
import {
  ShieldCheck,
  UserCheck,
  Briefcase,
  Folder,
  Plus,
  Trash2,
  Lock,
  Search,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  Info,
  KeyRound,
  Users
} from 'lucide-react';

interface UserRoleManagementTabProps {
  staffList: Staff[];
  projects: Project[];
  currentRole: UserRoleType;
  onUpdateStaffList: (updatedStaff: Staff[]) => void;
  onUpdateProjects: (updatedProjects: Project[]) => void;
}

export const UserRoleManagementTab: React.FC<UserRoleManagementTabProps> = ({
  staffList,
  projects,
  currentRole,
  onUpdateStaffList,
  onUpdateProjects,
}) => {
  // Direct Assignment Form State
  const [selectedStaffId, setSelectedStaffId] = useState<string>(staffList[0]?.id || '');
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projects[0]?.id || '');
  const [selectedProjectRole, setSelectedProjectRole] = useState<UserRoleType>('project_coordinator');

  // Search and Filter States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterProject, setFilterProject] = useState<string>('all');
  const [successToast, setSuccessToast] = useState<string>('');

  const activeProjects = projects.filter(p => !p.isArchived);

  // Helper to show temporary notification
  const showNotification = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(''), 3000);
  };

  // 1. Handle System Role Change for a Staff Member
  const handleSystemRoleChange = (staffId: string, newRole: UserRoleType) => {
    const updatedStaff = staffList.map(s => {
      if (s.id === staffId) {
        return { ...s, systemRole: newRole };
      }
      return s;
    });
    onUpdateStaffList(updatedStaff);
    showNotification(`Role sistem untuk ${staffList.find(s => s.id === staffId)?.name} berhasil diubah.`);
  };

  // 2. Handle Assign Staff to Project
  const handleAssignToProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaffId || !selectedProjectId) {
      alert('Harap pilih nama staf dan proyek terlebih dahulu.');
      return;
    }

    const staffMember = staffList.find(s => s.id === selectedStaffId);
    if (!staffMember) return;

    const updatedProjects = projects.map(proj => {
      if (proj.id === selectedProjectId) {
        const currentMembers = proj.assignedMembers || [];
        // Check if member already exists in project
        const existingIdx = currentMembers.findIndex(m => m.staffId === selectedStaffId || m.staffName === staffMember.name);
        
        let newMembers: ProjectMember[];
        if (existingIdx >= 0) {
          newMembers = [...currentMembers];
          newMembers[existingIdx] = {
            staffId: staffMember.id,
            staffName: staffMember.name,
            projectRole: selectedProjectRole,
          };
        } else {
          newMembers = [
            ...currentMembers,
            {
              staffId: staffMember.id,
              staffName: staffMember.name,
              projectRole: selectedProjectRole,
            }
          ];
        }
        return { ...proj, assignedMembers: newMembers };
      }
      return proj;
    });

    onUpdateProjects(updatedProjects);
    const projName = projects.find(p => p.id === selectedProjectId)?.name || 'Proyek';
    showNotification(`Penugasan ${staffMember.name} pada proyek "${projName}" sebagai ${USER_ROLES[selectedProjectRole].title} berhasil disimpan!`);
  };

  // 3. Handle Remove Member Assignment from Project
  const handleRemoveProjectAssignment = (projectId: string, staffId: string) => {
    const updatedProjects = projects.map(proj => {
      if (proj.id === projectId && proj.assignedMembers) {
        const newMembers = proj.assignedMembers.filter(m => m.staffId !== staffId && m.staffName !== staffList.find(s => s.id === staffId)?.name);
        return { ...proj, assignedMembers: newMembers };
      }
      return proj;
    });
    onUpdateProjects(updatedProjects);
    showNotification('Penugasan anggota pada proyek berhasil dihapus.');
  };

  // 4. Handle Direct Update of Project Role in the Matrix
  const handleUpdateMemberRoleInProject = (projectId: string, staffId: string, newRole: UserRoleType) => {
    const updatedProjects = projects.map(proj => {
      if (proj.id === projectId && proj.assignedMembers) {
        const newMembers = proj.assignedMembers.map(m => {
          if (m.staffId === staffId || m.staffName === staffList.find(s => s.id === staffId)?.name) {
            return { ...m, projectRole: newRole };
          }
          return m;
        });
        return { ...proj, assignedMembers: newMembers };
      }
      return proj;
    });
    onUpdateProjects(updatedProjects);
    showNotification('Role proyek anggota berhasil diperbarui.');
  };

  // Flatten all project assignments for easy rendering in the assignment list table
  const allAssignments: {
    projectId: string;
    projectName: string;
    projectLocation: string;
    staffId: string;
    staffName: string;
    staffEmail?: string;
    staffRoleTitle: string;
    projectRole: UserRoleType;
  }[] = [];

  activeProjects.forEach(p => {
    if (p.assignedMembers && Array.isArray(p.assignedMembers)) {
      p.assignedMembers.forEach(m => {
        const st = staffList.find(s => s.id === m.staffId || s.name === m.staffName);
        allAssignments.push({
          projectId: p.id,
          projectName: p.name,
          projectLocation: p.location,
          staffId: m.staffId || st?.id || 'unknown',
          staffName: m.staffName || st?.name || 'Staf',
          staffEmail: st?.email,
          staffRoleTitle: st?.role || 'Staf Program',
          projectRole: m.projectRole,
        });
      });
    }
  });

  // Filter assignments
  const filteredAssignments = allAssignments.filter(a => {
    const matchSearch =
      a.staffName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.projectName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchProjFilter = filterProject === 'all' || a.projectId === filterProject;
    return matchSearch && matchProjFilter;
  });

  return (
    <div className="space-y-8 pb-12">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-bold">{successToast}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white p-6 rounded-3xl shadow-md border border-slate-800 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-3xl">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-400/30 flex items-center gap-1.5">
                <Crown className="w-3 h-3" /> Area Terbatas Administrator
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                RBAC Central Matrix
              </span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
              <ShieldCheck className="w-7 h-7 text-purple-400" />
              Pengaturan User Role &amp; Penugasan Proyek
            </h1>
            <p className="text-xs text-slate-300 leading-relaxed">
              Kelola kewenangan sistem secara terpusat. Anda dapat menetapkan Role Sistem Utama (System-Wide) dan mengatur penugasan role spesifik tim pada masing-masing proyek terdaftar.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/10 shrink-0 space-y-1 text-xs">
            <div className="text-[10px] uppercase font-bold text-slate-300 tracking-wider">Metode Akses RBAC</div>
            <div className="font-extrabold text-white flex items-center gap-1.5">
              <KeyRound className="w-4 h-4 text-emerald-400" />
              <span>Hierarki Role Terverifikasi</span>
            </div>
            <p className="text-[11px] text-slate-300">
              Akses proyek otomatis disesuaikan berdasarkan tabel penugasan di bawah ini.
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 1: Form Penugasan Langsung ke Proyek */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-5">
        <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-blue-600" />
              Penugasan Anggota Staf Langsung ke Proyek
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Pilih nama staf, pilih proyek terdaftar, serta tentukan tanggung jawab role-nya untuk proyek tersebut (misalnya: <em>Imam - Proyek HSP - Project Coordinator</em>).
            </p>
          </div>
        </div>

        <form onSubmit={handleAssignToProject} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end bg-slate-50 p-4 rounded-2xl border border-slate-200/60">
          {/* Dropdown 1: Staf */}
          <div className="space-y-1.5">
            <label className="text-xs font-extrabold text-slate-700 block">1. Pilih Nama Staf</label>
            <select
              value={selectedStaffId}
              onChange={(e) => setSelectedStaffId(e.target.value)}
              className="w-full text-xs py-2.5 px-3 bg-white border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none font-bold text-slate-800 cursor-pointer"
            >
              {staffList.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.name} ({st.role})
                </option>
              ))}
            </select>
          </div>

          {/* Dropdown 2: Proyek */}
          <div className="space-y-1.5">
            <label className="text-xs font-extrabold text-slate-700 block">2. Pilih Proyek Terdaftar</label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full text-xs py-2.5 px-3 bg-white border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none font-bold text-slate-800 cursor-pointer"
            >
              {activeProjects.length === 0 ? (
                <option value="">Belum ada proyek terdaftar</option>
              ) : (
                activeProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {p.location}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Dropdown 3: Role di Proyek */}
          <div className="space-y-1.5">
            <label className="text-xs font-extrabold text-slate-700 block">3. Role di Proyek Tersebut</label>
            <select
              value={selectedProjectRole}
              onChange={(e) => setSelectedProjectRole(e.target.value as UserRoleType)}
              className="w-full text-xs py-2.5 px-3 bg-white border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none font-bold text-slate-800 cursor-pointer"
            >
              <option value="project_coordinator">📊 Project Coordinator / Officer</option>
              <option value="field_officer">📑 Staf Lapangan / Field Officer (PIC)</option>
              <option value="donor_viewer">👁️ Donor / Viewer Eksternal (Read-Only)</option>
              <option value="super_admin">👑 Administrator &amp; Direktur Program</option>
            </select>
          </div>

          {/* Submit Button */}
          <div>
            <button
              type="submit"
              disabled={activeProjects.length === 0}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs py-2.5 px-4 rounded-xl cursor-pointer transition-all shadow-xs flex items-center justify-center gap-2 active:scale-98"
            >
              <Plus className="w-4 h-4" />
              <span>Simpan Penugasan Proyek</span>
            </button>
          </div>
        </form>

        {/* Matrix List of Current Project Assignments */}
        <div className="space-y-3 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">
                Daftar Penugasan Proyek Saat Ini ({filteredAssignments.length})
              </h3>
            </div>

            <div className="flex items-center gap-2">
              {/* Filter Proyek */}
              <select
                value={filterProject}
                onChange={(e) => setFilterProject(e.target.value)}
                className="text-xs py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 outline-none cursor-pointer"
              >
                <option value="all">Semua Proyek</option>
                {activeProjects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>

              {/* Search Box */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nama staf / proyek..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-500 transition-all font-medium text-slate-800 w-48 sm:w-60"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200/80 shadow-2xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/80 border-b border-slate-200 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Nama Staf Anggota</th>
                  <th className="py-3 px-4">Proyek Penugasan</th>
                  <th className="py-3 px-4">Role di Proyek Ini</th>
                  <th className="py-3 px-4">Hak Akses Efektif</th>
                  <th className="py-3 px-4 text-center">Aksi / Kontrol</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredAssignments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-slate-400 font-medium">
                      Belum ada penugasan staf pada proyek. Gunakan formulir di atas untuk menambahkan penugasan baru.
                    </td>
                  </tr>
                ) : (
                  filteredAssignments.map((a, idx) => {
                    const rPerm = getRolePermissions(a.projectRole);
                    return (
                      <tr key={`${a.projectId}-${a.staffId}-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-800">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-black text-slate-700 text-xs shrink-0">
                              {a.staffName.charAt(0)}
                            </div>
                            <div>
                              <div className="font-extrabold text-slate-900">{a.staffName}</div>
                              <div className="text-[10px] text-slate-400 font-medium">{a.staffRoleTitle} {a.staffEmail && `• ${a.staffEmail}`}</div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-800 flex items-center gap-1.5">
                            <Folder className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                            <span>{a.projectName}</span>
                          </div>
                          <div className="text-[10px] text-slate-400">{a.projectLocation}</div>
                        </td>

                        <td className="py-3.5 px-4">
                          <select
                            value={a.projectRole}
                            onChange={(e) => handleUpdateMemberRoleInProject(a.projectId, a.staffId, e.target.value as UserRoleType)}
                            className={`text-xs font-extrabold py-1 px-2.5 rounded-lg border cursor-pointer outline-none transition-all ${rPerm.badgeBg} ${rPerm.badgeText} ${rPerm.badgeBorder}`}
                          >
                            <option value="project_coordinator">📊 Project Coordinator</option>
                            <option value="field_officer">📑 Field Officer (PIC)</option>
                            <option value="donor_viewer">👁️ Donor / Viewer</option>
                            <option value="super_admin">👑 Super Admin</option>
                          </select>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="text-[11px] font-semibold text-slate-600 block">
                            {rPerm.description}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveProjectAssignment(a.projectId, a.staffId)}
                            className="p-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-all cursor-pointer inline-flex items-center gap-1 font-bold text-[11px]"
                            title="Hapus penugasan dari proyek ini"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Hapus</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* SECTION 2: Panduan Ringkasan Matriks RBAC */}
      <div className="bg-slate-900 text-slate-200 rounded-3xl p-6 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-400" />
            Matriks Penjelasan Kewenangan Role Sistem (RBAC Rules Reference)
          </h3>
          <span className="text-[10px] font-mono text-slate-400">Aturan Standard DFW Indonesia</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {(Object.keys(USER_ROLES) as UserRoleType[]).map((rKey) => {
            const rInfo = USER_ROLES[rKey];
            return (
              <div key={rKey} className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${rInfo.badgeBg} ${rInfo.badgeText} ${rInfo.badgeBorder}`}>
                    {rInfo.badgeIcon} {rInfo.title.split('/')[0]}
                  </span>
                </div>
                <p className="text-xs text-slate-300 font-medium leading-relaxed">
                  {rInfo.description}
                </p>
                <div className="pt-2 border-t border-slate-800/80 space-y-1 text-[10px]">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Kelola Proyek &amp; Anggaran:</span>
                    <span className={rInfo.canManageProjects ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                      {rInfo.canManageProjects ? 'YA' : 'TIDAK'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Kelola Indikator:</span>
                    <span className={rInfo.canManageIndicators ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                      {rInfo.canManageIndicators ? 'YA' : 'TIDAK'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Pembaruan Progress Lapangan:</span>
                    <span className={rInfo.canUpdateFieldProgress ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                      {rInfo.canUpdateFieldProgress ? 'YA' : 'TIDAK'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Mode Read-Only (Donor):</span>
                    <span className={rInfo.isReadOnly ? 'text-amber-400 font-bold' : 'text-slate-500'}>
                      {rInfo.isReadOnly ? 'YA' : 'TIDAK'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

function Crown(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M11.562 3.266a.5.5 0 0 1 .876 0L15.3 8.87a.5.5 0 0 0 .408.272l6.236.562a.5.5 0 0 1 .284.887l-4.7 4.135a.5.5 0 0 0-.154.472l1.375 6.1a.5.5 0 0 1-.749.544L12.3 18.64a.5.5 0 0 0-.5 0l-5.6 3.202a.5.5 0 0 1-.749-.544l1.375-6.1a.5.5 0 0 0-.154-.472l-4.7-4.135a.5.5 0 0 1 .284-.887l6.236-.562a.5.5 0 0 0 .408-.272l2.862-5.604z" />
    </svg>
  );
}

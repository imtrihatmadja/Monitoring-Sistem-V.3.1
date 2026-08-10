export type UserRoleType = 'super_admin' | 'project_coordinator' | 'field_officer' | 'donor_viewer';

export interface RolePermissions {
  id: UserRoleType;
  title: string;
  subtitle: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  badgeIcon: string;
  description: string;
  canManageProjects: boolean;        // Create/delete project, edit budget total
  canManageIndicators: boolean;      // Create/edit/delete indicators
  canApproveProgress: boolean;       // Approve progress / edit overall progress
  canUpdateFieldProgress: boolean;   // Update progress %, notes, challenges, upload docs
  canManageUsers: boolean;           // Manage staff accounts and database settings
  canManageIssues: boolean;          // Create & manage legal issues/findings
  canManageBeneficiaries: boolean;   // Create & manage beneficiaries
  canViewReports: boolean;           // Download official PDF/Excel reports
  isReadOnly: boolean;               // Pure read-only view
}

export const USER_ROLES: Record<UserRoleType, RolePermissions> = {
  super_admin: {
    id: 'super_admin',
    title: 'Administrator & Direktur Program',
    subtitle: 'Akses Penuh Manajemen Sistem & Anggaran',
    badgeBg: 'bg-purple-100',
    badgeText: 'text-purple-800',
    badgeBorder: 'border-purple-300',
    badgeIcon: '👑',
    description: 'Akses penuh untuk membuat/menghapus proyek, mengatur anggaran, serta mengelola akun pengguna dan sistem.',
    canManageProjects: true,
    canManageIndicators: true,
    canApproveProgress: true,
    canUpdateFieldProgress: true,
    canManageUsers: true,
    canManageIssues: true,
    canManageBeneficiaries: true,
    canViewReports: true,
    isReadOnly: false,
  },
  project_coordinator: {
    id: 'project_coordinator',
    title: 'Project Coordinator / Officer',
    subtitle: 'Manajemen Indikator, Persetujuan & Laporan Resmi',
    badgeBg: 'bg-blue-100',
    badgeText: 'text-blue-800',
    badgeBorder: 'border-blue-300',
    badgeIcon: '📊',
    description: 'Mengelola indikator, menyetujui progress aktivitas, serta mengunduh laporan resmi proyek.',
    canManageProjects: false,
    canManageIndicators: true,
    canApproveProgress: true,
    canUpdateFieldProgress: true,
    canManageUsers: false,
    canManageIssues: true,
    canManageBeneficiaries: true,
    canViewReports: true,
    isReadOnly: false,
  },
  field_officer: {
    id: 'field_officer',
    title: 'Staf Lapangan / Field Officer (PIC)',
    subtitle: 'Pembaruan Progress, Catatan Lapangan & Dokumentasi',
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-800',
    badgeBorder: 'border-emerald-300',
    badgeIcon: '📑',
    description: 'Hanya dapat mengupdate persentase progress aktivitas yang ditugaskan, menambahkan catatan/hambatan harian, serta mengunggah bukti dokumen.',
    canManageProjects: false,
    canManageIndicators: false,
    canApproveProgress: false,
    canUpdateFieldProgress: true,
    canManageUsers: false,
    canManageIssues: true,
    canManageBeneficiaries: true,
    canViewReports: true,
    isReadOnly: false,
  },
  donor_viewer: {
    id: 'donor_viewer',
    title: 'Donor / Viewer Eksternal',
    subtitle: 'Mode Lihat-Saja (Read-Only)',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-800',
    badgeBorder: 'border-amber-300',
    badgeIcon: '👁️',
    description: 'Mode Read-Only (hanya melihat dashboard kemajuan dan mengunduh laporan tanpa bisa mengubah data apapun).',
    canManageProjects: false,
    canManageIndicators: false,
    canApproveProgress: false,
    canUpdateFieldProgress: false,
    canManageUsers: false,
    canManageIssues: false,
    canManageBeneficiaries: false,
    canViewReports: true,
    isReadOnly: true,
  },
};

export const getRolePermissions = (role: UserRoleType): RolePermissions => {
  return USER_ROLES[role] || USER_ROLES.super_admin;
};

export function getProjectEffectiveRole(
  globalRole: UserRoleType,
  project?: {
    assignedMembers?: { staffId: string; staffName?: string; projectRole: UserRoleType }[];
    pic?: string;
  },
  staffId?: string,
  staffName?: string
): UserRoleType {
  // Super Admin retains super_admin access globally
  if (globalRole === 'super_admin') {
    return 'super_admin';
  }

  // Donor Viewer retains donor_viewer access globally (View Only)
  if (globalRole === 'donor_viewer') {
    return 'donor_viewer';
  }

  if (!project) return globalRole;

  const cleanStaffId = staffId ? staffId.trim().toLowerCase() : '';
  const cleanStaffName = staffName ? staffName.trim().toLowerCase() : '';

  // Check if staffId or staffName has an explicit role assigned in this project
  if (project.assignedMembers && Array.isArray(project.assignedMembers)) {
    const found = project.assignedMembers.find((m) => {
      const mId = (m.staffId || '').trim().toLowerCase();
      const mName = (m.staffName || '').trim().toLowerCase();

      const matchId = Boolean(cleanStaffId && (mId === cleanStaffId || mName === cleanStaffId));
      const matchName = Boolean(cleanStaffName && (mId === cleanStaffName || mName === cleanStaffName));

      return matchId || matchName;
    });
    if (found) {
      return found.projectRole;
    }
  }

  // Fallback to global role if not explicitly assigned in members list
  return globalRole;
}

export function isUserAssignedToProject(
  globalRole: UserRoleType,
  project: {
    assignedMembers?: { staffId: string; staffName?: string; projectRole: UserRoleType }[];
    pic?: string;
  },
  staffId?: string,
  staffName?: string
): boolean {
  // Super Admin and Donor/Viewer see ALL projects
  if (globalRole === 'super_admin' || globalRole === 'donor_viewer') {
    return true;
  }

  if (!staffId && !staffName) {
    return false;
  }

  const cleanStaffId = staffId ? staffId.trim().toLowerCase() : '';
  const cleanStaffName = staffName ? staffName.trim().toLowerCase() : '';

  // 2. Check assignedMembers list if populated
  if (project.assignedMembers && project.assignedMembers.length > 0) {
    return project.assignedMembers.some((m) => {
      const mId = (m.staffId || '').trim().toLowerCase();
      const mName = (m.staffName || '').trim().toLowerCase();

      const matchId = Boolean(cleanStaffId && (mId === cleanStaffId || mName === cleanStaffId));
      const matchName = Boolean(cleanStaffName && (mId === cleanStaffName || mName === cleanStaffName));

      return matchId || matchName;
    });
  }

  // 3. Fallback to project.pic if assignedMembers is not explicitly populated
  if (project.pic) {
    const cleanPic = project.pic.trim().toLowerCase();
    const matchPicId = Boolean(cleanStaffId && cleanPic === cleanStaffId);
    const matchPicName = Boolean(cleanStaffName && cleanPic === cleanStaffName);
    return Boolean(matchPicId || matchPicName);
  }

  // 4. Default: Unassigned projects are restricted to Super Admin only
  return false;
}

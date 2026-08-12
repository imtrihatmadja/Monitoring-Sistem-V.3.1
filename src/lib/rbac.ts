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
    assignedMembers?: { staffId: string; staffName?: string; staffEmail?: string; projectRole: UserRoleType }[];
    pic?: string;
    owner?: string;
  },
  staffId?: string,
  staffName?: string,
  staffEmail?: string
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
  const cleanStaffEmail = staffEmail ? staffEmail.trim().toLowerCase() : '';
  const emailPrefix = cleanStaffEmail.includes('@') ? cleanStaffEmail.split('@')[0] : cleanStaffEmail;

  const matchesUser = (mId: string, mName: string, mEmail: string) => {
    const cleanMId = (mId || '').trim().toLowerCase();
    const cleanMName = (mName || '').trim().toLowerCase();
    const cleanMEmail = (mEmail || '').trim().toLowerCase();
    const mEmailPrefix = cleanMEmail.includes('@') ? cleanMEmail.split('@')[0] : cleanMEmail;

    // Direct exact matches
    if (cleanStaffId && (cleanMId === cleanStaffId || cleanMName === cleanStaffId || cleanMEmail === cleanStaffId)) return true;
    if (cleanStaffName && (cleanMId === cleanStaffName || cleanMName === cleanStaffName || cleanMEmail === cleanStaffName)) return true;
    if (cleanStaffEmail && (cleanMId === cleanStaffEmail || cleanMName === cleanStaffEmail || cleanMEmail === cleanStaffEmail)) return true;

    // Substring / partial name matches
    if (cleanStaffName && cleanStaffName.length >= 3 && (cleanMName.includes(cleanStaffName) || cleanStaffName.includes(cleanMName))) return true;
    if (cleanStaffEmail && cleanStaffEmail.length >= 3 && (cleanMEmail.includes(cleanStaffEmail) || cleanStaffEmail.includes(cleanMEmail))) return true;

    // Email prefix matches (e.g. "nirmala" matches "nirmala@dfw.or.id" or staff ID "nirmala")
    if (emailPrefix && emailPrefix.length >= 3) {
      if (cleanMId.includes(emailPrefix) || cleanMName.includes(emailPrefix) || cleanMEmail.includes(emailPrefix)) return true;
    }
    if (mEmailPrefix && mEmailPrefix.length >= 3) {
      if (cleanStaffId.includes(mEmailPrefix) || cleanStaffName.includes(mEmailPrefix) || cleanStaffEmail.includes(mEmailPrefix)) return true;
    }

    return false;
  };

  // Check if staffId, staffName, or staffEmail has an explicit role assigned in this project
  if (project.assignedMembers && Array.isArray(project.assignedMembers)) {
    const found = project.assignedMembers.find((m) =>
      matchesUser(m.staffId, m.staffName || '', m.staffEmail || '')
    );

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
    id?: string;
    name?: string;
    assignedMembers?: { staffId: string; staffName?: string; staffEmail?: string; projectRole: UserRoleType }[];
    pic?: string;
    owner?: string;
  },
  staffId?: string,
  staffName?: string,
  staffEmail?: string
): boolean {
  const projLabel = project.name || project.id || 'Proyek Tanpa Nama';

  // Super Admin and Donor/Viewer see ALL projects
  if (globalRole === 'super_admin' || globalRole === 'donor_viewer') {
    console.log(`[RBACCheck] ALLOWED (Global Role override: ${globalRole}) for project "${projLabel}"`);
    return true;
  }

  if (!staffId && !staffName && !staffEmail) {
    console.warn(`[RBACCheck] DENIED (No staff identification provided: staffId=${staffId}, name=${staffName}, email=${staffEmail}) for project "${projLabel}"`);
    return false;
  }

  const cleanStaffId = staffId ? staffId.trim().toLowerCase() : '';
  const cleanStaffName = staffName ? staffName.trim().toLowerCase() : '';
  const cleanStaffEmail = staffEmail ? staffEmail.trim().toLowerCase() : '';
  const emailPrefix = cleanStaffEmail.includes('@') ? cleanStaffEmail.split('@')[0] : cleanStaffEmail;

  const matchesUser = (mId: string, mName: string, mEmail: string) => {
    const cleanMId = (mId || '').trim().toLowerCase();
    const cleanMName = (mName || '').trim().toLowerCase();
    const cleanMEmail = (mEmail || '').trim().toLowerCase();
    const mEmailPrefix = cleanMEmail.includes('@') ? cleanMEmail.split('@')[0] : cleanMEmail;

    // Direct exact matches
    if (cleanStaffId && (cleanMId === cleanStaffId || cleanMName === cleanStaffId || cleanMEmail === cleanStaffId)) return true;
    if (cleanStaffName && (cleanMId === cleanStaffName || cleanMName === cleanStaffName || cleanMEmail === cleanStaffName)) return true;
    if (cleanStaffEmail && (cleanMId === cleanStaffEmail || cleanMName === cleanStaffEmail || cleanMEmail === cleanStaffEmail)) return true;

    // Substring / partial name matches
    if (cleanStaffName && cleanStaffName.length >= 3 && (cleanMName.includes(cleanStaffName) || cleanStaffName.includes(cleanMName))) return true;
    if (cleanStaffEmail && cleanStaffEmail.length >= 3 && (cleanMEmail.includes(cleanStaffEmail) || cleanStaffEmail.includes(cleanMEmail))) return true;

    // Email prefix matches (e.g. "nirmala" matches "nirmala@dfw.or.id")
    if (emailPrefix && emailPrefix.length >= 3) {
      if (cleanMId.includes(emailPrefix) || cleanMName.includes(emailPrefix) || cleanMEmail.includes(emailPrefix)) return true;
    }
    if (mEmailPrefix && mEmailPrefix.length >= 3) {
      if (cleanStaffId.includes(mEmailPrefix) || cleanStaffName.includes(mEmailPrefix) || cleanStaffEmail.includes(mEmailPrefix)) return true;
    }

    return false;
  };

  // 1. Check assignedMembers list
  if (project.assignedMembers && Array.isArray(project.assignedMembers) && project.assignedMembers.length > 0) {
    const matchedMember = project.assignedMembers.find((m) =>
      matchesUser(m.staffId, m.staffName || '', m.staffEmail || '')
    );

    if (matchedMember) {
      console.log(`[RBACCheck] ALLOWED (Found in assignedMembers: role=${matchedMember.projectRole}, staffId=${matchedMember.staffId}, name=${matchedMember.staffName}) for project "${projLabel}"`, {
        user: { staffId, staffName, staffEmail, globalRole },
        matchedMember
      });
      return true;
    }
  }

  // 2. Check project owner or PIC field
  const picOrOwner = (project.pic || project.owner || '').trim().toLowerCase();
  if (picOrOwner) {
    if (matchesUser(picOrOwner, picOrOwner, picOrOwner)) {
      console.log(`[RBACCheck] ALLOWED (Matched PIC/Owner field: "${picOrOwner}") for project "${projLabel}"`, {
        user: { staffId, staffName, staffEmail, globalRole }
      });
      return true;
    }
  }

  // 3. Fallback: If no specific assignedMembers are configured for this project, 
  // allow access according to global role permissions.
  if (!project.assignedMembers || project.assignedMembers.length === 0) {
    console.log(`[RBACCheck] ALLOWED (No restrictive team assigned to project - fallback open) for project "${projLabel}"`);
    return true;
  }

  console.warn(`[RBACCheck] DENIED (User not in assignedMembers [count: ${project.assignedMembers.length}] nor PIC/Owner "${picOrOwner}") for project "${projLabel}"`, {
    user: { cleanStaffId, cleanStaffName, cleanStaffEmail, globalRole },
    projectAssignedMembers: project.assignedMembers,
    picOrOwner
  });

  return false;
}

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

// Authorized Admin Emails with Full Write/Edit Access
export const AUTHORIZED_ADMIN_EMAILS = [
  'admin@dfw.or.id',
  'imam.trihatmadja@dfw.or.id'
];

/**
 * Checks if the user is one of the 2 designated admin users (Program Director or MEL Officer)
 */
export function isAuthorizedAdmin(email?: string, name?: string, staffId?: string): boolean {
  if (!email && !name && !staffId) return false;
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanName = (name || '').trim().toLowerCase();
  const cleanStaffId = (staffId || '').trim().toLowerCase();

  // Check exact email
  if (cleanEmail && AUTHORIZED_ADMIN_EMAILS.includes(cleanEmail)) return true;

  // Check staff ID match (st-01: Imam, st-02: Admin DFW)
  if (cleanStaffId === 'st-01' || cleanStaffId === 'st-02' || cleanStaffId === 'admin') return true;

  // Check name match
  if (cleanName.includes('imam trihatmadja') || cleanName.includes('admin dfw')) return true;

  return false;
}

export const USER_ROLES: Record<UserRoleType, RolePermissions> = {
  super_admin: {
    id: 'super_admin',
    title: 'Administrator (Program Director & Petugas MEL)',
    subtitle: 'Akses Penuh Manajemen Sistem & Anggaran',
    badgeBg: 'bg-purple-100',
    badgeText: 'text-purple-800',
    badgeBorder: 'border-purple-300',
    badgeIcon: '👑',
    description: 'Akses penuh untuk mengelola proyek, indikator, progress, anggaran, dan data sistem.',
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
    title: 'Pengguna Eksternal (Mode Lihat-Saja)',
    subtitle: 'Mode Lihat-Saja (Read-Only)',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-800',
    badgeBorder: 'border-amber-300',
    badgeIcon: '👁️',
    description: 'Mode Read-Only (hanya melihat dashboard kemajuan dan mengunduh laporan).',
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
  field_officer: {
    id: 'field_officer',
    title: 'Pengguna Eksternal (Mode Lihat-Saja)',
    subtitle: 'Mode Lihat-Saja (Read-Only)',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-800',
    badgeBorder: 'border-amber-300',
    badgeIcon: '👁️',
    description: 'Mode Read-Only (hanya melihat dashboard kemajuan dan mengunduh laporan).',
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
  donor_viewer: {
    id: 'donor_viewer',
    title: 'Pengguna Eksternal / Tamu',
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
  if (role === 'super_admin') {
    return USER_ROLES.super_admin;
  }
  return USER_ROLES.donor_viewer;
};

export function getProjectEffectiveRole(
  globalRole: UserRoleType,
  _project?: {
    assignedMembers?: { staffId: string; staffName?: string; staffEmail?: string; projectRole: UserRoleType }[];
    pic?: string;
    owner?: string;
  },
  staffId?: string,
  staffName?: string,
  staffEmail?: string
): UserRoleType {
  if (globalRole === 'super_admin' || isAuthorizedAdmin(staffEmail, staffName, staffId)) {
    return 'super_admin';
  }
  return 'donor_viewer';
}

export interface ProjectAssignmentVerificationResult {
  isAssigned: boolean;
  reason: 'super_admin_override' | 'donor_viewer_override' | 'missing_user_identity' | 'open_fallback_no_assigned_members' | 'assigned_member_match' | 'pic_owner_match' | 'not_assigned';
  matchedMember?: { staffId: string; staffName?: string; staffEmail?: string; projectRole?: UserRoleType };
  details: {
    projectId?: string;
    projectName?: string;
    user: {
      staffId?: string;
      staffName?: string;
      staffEmail?: string;
      globalRole?: UserRoleType;
      cleanStaffId: string;
      cleanStaffName: string;
      cleanStaffEmail: string;
      emailPrefix: string;
    };
    picOrOwner?: string;
    assignedMembersCount: number;
    memberChecks: Array<{
      index: number;
      member: { staffId: string; staffName?: string; staffEmail?: string; projectRole?: UserRoleType };
      matches: {
        exactIdMatch: boolean;
        exactNameMatch: boolean;
        exactEmailMatch: boolean;
        partialNameMatch: boolean;
        partialEmailMatch: boolean;
        emailPrefixMatch: boolean;
      };
      isMatch: boolean;
    }>;
  };
}

export function verifyProjectAssignment(
  project: {
    id?: string;
    name?: string;
    assignedMembers?: { staffId: string; staffName?: string; staffEmail?: string; projectRole?: UserRoleType }[];
    pic?: string;
    owner?: string;
  },
  staffId?: string,
  staffName?: string,
  staffEmail?: string,
  globalRole?: UserRoleType
): ProjectAssignmentVerificationResult {
  const projLabel = project?.name || project?.id || 'Proyek Tanpa Nama';
  const cleanStaffId = staffId ? staffId.trim().toLowerCase() : '';
  const cleanStaffName = staffName ? staffName.trim().toLowerCase() : '';
  const cleanStaffEmail = staffEmail ? staffEmail.trim().toLowerCase() : '';
  const emailPrefix = cleanStaffEmail.includes('@') ? cleanStaffEmail.split('@')[0] : cleanStaffEmail;
  const picOrOwner = (project?.pic || project?.owner || '').trim().toLowerCase();
  const assignedMembers = Array.isArray(project?.assignedMembers) ? project.assignedMembers : [];

  console.group(`[VerifyProjectAssignment] Diagnosing membership for "${projLabel}" (${project?.id || 'no-id'})`);
  console.log('User Identity Input:', {
    staffId,
    staffName,
    staffEmail,
    globalRole,
    cleanStaffId,
    cleanStaffName,
    cleanStaffEmail,
    emailPrefix
  });
  console.log('Project Metadata Input:', {
    id: project?.id,
    name: project?.name,
    pic: project?.pic,
    owner: project?.owner,
    picOrOwner,
    assignedMembersCount: assignedMembers.length
  });

  const memberChecks: ProjectAssignmentVerificationResult['details']['memberChecks'] = [];

  // Check 1: Super Admin / Donor Viewer Override
  if (globalRole === 'super_admin') {
    console.log(`✅ [VerifyProjectAssignment] ALLOWED: User is super_admin. Global override active.`);
    console.groupEnd();
    return {
      isAssigned: true,
      reason: 'super_admin_override',
      details: {
        projectId: project?.id,
        projectName: project?.name,
        user: { staffId, staffName, staffEmail, globalRole, cleanStaffId, cleanStaffName, cleanStaffEmail, emailPrefix },
        picOrOwner,
        assignedMembersCount: assignedMembers.length,
        memberChecks
      }
    };
  }

  if (globalRole === 'donor_viewer') {
    console.log(`✅ [VerifyProjectAssignment] ALLOWED: User is donor_viewer. Read-only global override active.`);
    console.groupEnd();
    return {
      isAssigned: true,
      reason: 'donor_viewer_override',
      details: {
        projectId: project?.id,
        projectName: project?.name,
        user: { staffId, staffName, staffEmail, globalRole, cleanStaffId, cleanStaffName, cleanStaffEmail, emailPrefix },
        picOrOwner,
        assignedMembersCount: assignedMembers.length,
        memberChecks
      }
    };
  }

  // Check 2: Missing User Identity
  if (!staffId && !staffName && !staffEmail) {
    console.warn(`❌ [VerifyProjectAssignment] DENIED: All staff identification parameters (id, name, email) are empty.`);
    console.groupEnd();
    return {
      isAssigned: false,
      reason: 'missing_user_identity',
      details: {
        projectId: project?.id,
        projectName: project?.name,
        user: { staffId, staffName, staffEmail, globalRole, cleanStaffId, cleanStaffName, cleanStaffEmail, emailPrefix },
        picOrOwner,
        assignedMembersCount: assignedMembers.length,
        memberChecks
      }
    };
  }

  // Helper matching function
  const evaluateMemberMatch = (mId: string, mName: string, mEmail: string) => {
    const cleanMId = (mId || '').trim().toLowerCase();
    const cleanMName = (mName || '').trim().toLowerCase();
    const cleanMEmail = (mEmail || '').trim().toLowerCase();
    const mEmailPrefix = cleanMEmail.includes('@') ? cleanMEmail.split('@')[0] : cleanMEmail;

    const exactIdMatch = Boolean(
      cleanStaffId && (cleanMId === cleanStaffId || cleanMName === cleanStaffId || cleanMEmail === cleanStaffId)
    );
    const exactNameMatch = Boolean(
      cleanStaffName && (cleanMId === cleanStaffName || cleanMName === cleanStaffName || cleanMEmail === cleanStaffName)
    );
    const exactEmailMatch = Boolean(
      cleanStaffEmail && (cleanMId === cleanStaffEmail || cleanMName === cleanStaffEmail || cleanMEmail === cleanStaffEmail)
    );
    const partialNameMatch = Boolean(
      cleanStaffName && cleanStaffName.length >= 3 && (cleanMName.includes(cleanStaffName) || cleanStaffName.includes(cleanMName))
    );
    const partialEmailMatch = Boolean(
      cleanStaffEmail && cleanStaffEmail.length >= 3 && (cleanMEmail.includes(cleanStaffEmail) || cleanStaffEmail.includes(cleanMEmail))
    );
    const emailPrefixMatch = Boolean(
      (emailPrefix && emailPrefix.length >= 3 && (cleanMId.includes(emailPrefix) || cleanMName.includes(emailPrefix) || cleanMEmail.includes(emailPrefix))) ||
      (mEmailPrefix && mEmailPrefix.length >= 3 && (cleanStaffId.includes(mEmailPrefix) || cleanStaffName.includes(mEmailPrefix) || cleanStaffEmail.includes(mEmailPrefix)))
    );

    const isMatch = exactIdMatch || exactNameMatch || exactEmailMatch || partialNameMatch || partialEmailMatch || emailPrefixMatch;

    return {
      matches: {
        exactIdMatch,
        exactNameMatch,
        exactEmailMatch,
        partialNameMatch,
        partialEmailMatch,
        emailPrefixMatch
      },
      isMatch
    };
  };

  // Check 3: Check assignedMembers
  let matchedMemberResult: { staffId: string; staffName?: string; staffEmail?: string; projectRole?: UserRoleType } | undefined;

  if (assignedMembers.length > 0) {
    console.log(`🔍 [VerifyProjectAssignment] Checking ${assignedMembers.length} assignedMember(s)...`);
    for (let i = 0; i < assignedMembers.length; i++) {
      const m = assignedMembers[i];
      const evalRes = evaluateMemberMatch(m.staffId, m.staffName || '', m.staffEmail || '');
      memberChecks.push({
        index: i,
        member: m,
        matches: evalRes.matches,
        isMatch: evalRes.isMatch
      });

      console.log(`Member #${i + 1} [${m.staffName || m.staffId}]:`, {
        memberData: m,
        matchEvaluation: evalRes.matches,
        isMatch: evalRes.isMatch
      });

      if (evalRes.isMatch && !matchedMemberResult) {
        matchedMemberResult = m;
      }
    }

    if (matchedMemberResult) {
      console.log(`✅ [VerifyProjectAssignment] ALLOWED: Matched assignedMember:`, matchedMemberResult);
      console.groupEnd();
      return {
        isAssigned: true,
        reason: 'assigned_member_match',
        matchedMember: matchedMemberResult,
        details: {
          projectId: project?.id,
          projectName: project?.name,
          user: { staffId, staffName, staffEmail, globalRole, cleanStaffId, cleanStaffName, cleanStaffEmail, emailPrefix },
          picOrOwner,
          assignedMembersCount: assignedMembers.length,
          memberChecks
        }
      };
    }
  }

  // Check 4: Check PIC / Owner field
  if (picOrOwner) {
    const picEval = evaluateMemberMatch(picOrOwner, picOrOwner, picOrOwner);
    console.log(`🔍 [VerifyProjectAssignment] Checking PIC/Owner ("${picOrOwner}"):`, picEval);
    if (picEval.isMatch) {
      console.log(`✅ [VerifyProjectAssignment] ALLOWED: Matched PIC/Owner field.`);
      console.groupEnd();
      return {
        isAssigned: true,
        reason: 'pic_owner_match',
        details: {
          projectId: project?.id,
          projectName: project?.name,
          user: { staffId, staffName, staffEmail, globalRole, cleanStaffId, cleanStaffName, cleanStaffEmail, emailPrefix },
          picOrOwner,
          assignedMembersCount: assignedMembers.length,
          memberChecks
        }
      };
    }
  }

  // Check 5: Fallback if no assignedMembers configured
  if (assignedMembers.length === 0) {
    console.log(`✅ [VerifyProjectAssignment] ALLOWED: No restrictive team members configured for this project (assignedMembers is empty). Access open by default.`);
    console.groupEnd();
    return {
      isAssigned: true,
      reason: 'open_fallback_no_assigned_members',
      details: {
        projectId: project?.id,
        projectName: project?.name,
        user: { staffId, staffName, staffEmail, globalRole, cleanStaffId, cleanStaffName, cleanStaffEmail, emailPrefix },
        picOrOwner,
        assignedMembersCount: assignedMembers.length,
        memberChecks
      }
    };
  }

  // Final Denied
  console.warn(`❌ [VerifyProjectAssignment] DENIED: User identity did not match any assignedMember, PIC/Owner, or Global Role override.`);
  console.groupEnd();

  return {
    isAssigned: false,
    reason: 'not_assigned',
    details: {
      projectId: project?.id,
      projectName: project?.name,
      user: { staffId, staffName, staffEmail, globalRole, cleanStaffId, cleanStaffName, cleanStaffEmail, emailPrefix },
      picOrOwner,
      assignedMembersCount: assignedMembers.length,
      memberChecks
    }
  };
}

if (typeof window !== 'undefined') {
  (window as any).verifyProjectAssignment = verifyProjectAssignment;
}

export function isUserAssignedToProject(
  _globalRole: UserRoleType,
  _project: {
    id?: string;
    name?: string;
    assignedMembers?: { staffId: string; staffName?: string; staffEmail?: string; projectRole: UserRoleType }[];
    pic?: string;
    owner?: string;
  },
  _staffId?: string,
  _staffName?: string,
  _staffEmail?: string
): boolean {
  // All projects are visible to all users. Edit rights are controlled by global user role (isAuthorizedAdmin: super_admin vs donor_viewer)
  return true;
}

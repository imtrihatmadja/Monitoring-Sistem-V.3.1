export type ProjectStatus = 'Aktif' | 'On Track' | 'Terlambat' | 'Selesai' | 'Ditangguhkan';

export interface Outcome {
  id: string;
  projectId: string;
  title: string;
  outcomeText?: string;
  sortOrder?: number;
}

export interface ProjectMember {
  staffId: string;
  staffName?: string;
  projectRole: UserRoleType;
}

export interface Project {
  id: string;
  name: string;
  location: string;
  owner: string;
  donor?: string;
  status: ProjectStatus;
  startDate?: string;
  deadline?: string;
  progress: number; // calculated dynamically or set manually
  budgetApproved: number;
  budgetActual: number;
  desc?: string;
  note?: string;
  goal?: string;
  isArchived: boolean;
  archoredBy?: string;
  archivedAt?: string;
  assignedMembers?: ProjectMember[];
}

export interface Indicator {
  id: string;
  projectId: string;
  title: string;
  target: number;
  current: number;
  unit: string;
  lastUpdated?: string;
  lastValue?: number;
  notes?: string;
  notesUpdatedAt?: string;
  type?: string;
  actual?: number;
  sortOrder?: number;
  indicatorName?: string;
}

export interface ActivityNote {
  id: string;
  text: string;
  date: string;
  author: string;
}

export interface ActivityFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url?: string;
}

export interface SubActivity {
  id: string;
  parentActivityId: string;
  title: string;
  desc?: string;
  pic?: string;
  status: 'Belum Mulai' | 'Sedang Dikerjakan' | 'Tertunda' | 'Selesai';
  priority: 'Low' | 'Normal' | 'High';
  due?: string;
  notes?: ActivityNote[];
}

export interface Activity {
  id: string;
  projectId: string;
  title: string;
  desc?: string;
  pic?: string;
  status: 'Belum Mulai' | 'Sedang Berjalan' | 'Selesai' | 'Tertunda';
  startDate?: string;
  dueDate?: string;
  progress: number;
  notes: ActivityNote[];
  files: ActivityFile[];
  projectName?: string;
  deadline?: string;
  challenges?: string;
}

export interface BeneficiaryRegistration {
  projectId: string;
  activityId?: string;
  subActivityId?: string;
  attendedDate?: string;
  note?: string;
  isFreeLog?: boolean;
  activityName?: string;
  subActivityName?: string;
  source?: string;
}

export interface Beneficiary {
  id: string;
  name: string;
  phone?: string;
  gender: 'Laki-laki' | 'Perempuan';
  birthyear?: number;
  location?: string;
  occupation?: string;
  email?: string;
  note?: string;
  notes?: string;
  registrations: BeneficiaryRegistration[];
}

export interface IssueUpdate {
  id: string;
  text: string;
  evidenceUrl?: string; // comma-separated or single
  date: string;
}

export interface Issue {
  id: string;
  title: string;
  description?: string;
  category: string;
  projectId?: string;
  activityId?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending_review' | 'active' | 'monitoring' | 'resolved' | 'rejected';
  dateOccurred?: string;
  sourceType: 'MANUAL' | 'RSS' | 'GDRIVE' | 'IMPORT';
  sourceLink?: string;
  tags?: string; // comma separated
  updates: IssueUpdate[];
}

export interface Staff {
  id: string;
  name: string;
  role: string;
  systemRole?: UserRoleType;
  email?: string;
  googleAvatarUrl?: string;
  googleId?: string;
  lastLoginAt?: string;
  status: 'active' | 'inactive';
}

export interface ProjectReflection {
  id: string;
  projectId: string;
  title?: string;
  type: 'lesson' | 'success' | 'challenge' | 'recommendation';
  date: string;
  whatHappened?: string;
  whatWorked?: string;
  whatDidnt?: string;
  lesson: string;
  nextSteps?: string;
  contributor?: string;
  projectName?: string;
  reflectionDate?: string;
  lessonLearned?: string;
  createdBy?: string;
}

export interface ProjectDocument {
  id: string;
  projectName: string;
  category: string; // TOR, LAPORAN_BULANAN, FOTO_KEGIATAN, etc.
  fileName: string;
  mimeType: string;
  fileSize: number; // in bytes
  driveFileId?: string;
  driveFolderId?: string;
  webViewLink?: string;
  description?: string;
  createdAt?: string;
}

export type UserRoleType = 'super_admin' | 'project_coordinator' | 'field_officer' | 'donor_viewer';

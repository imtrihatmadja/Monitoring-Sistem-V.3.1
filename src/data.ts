import { Project, Indicator, Outcome, Activity, Beneficiary, Issue, Staff, ProjectReflection, ProjectDocument } from './types';

export const INITIAL_STAFF: Staff[] = [
  { id: 'st-01', name: 'Imam Trihatmadja', role: 'Program Director', systemRole: 'super_admin', email: 'imam.trihatmadja@dfw.or.id', status: 'active' },
  { id: 'st-02', name: 'Admin DFW', role: 'MEL Officer / Admin DFW', systemRole: 'super_admin', email: 'admin@dfw.or.id', status: 'active' },
  { id: 'st-03', name: 'Pengguna Eksternal / Donor', role: 'Viewer (Lihat-Saja)', systemRole: 'donor_viewer', email: 'donor@dfw.or.id', status: 'active' },
  { id: 'st-04', name: 'Staf Lapangan / Mitra', role: 'Field Officer (Lihat-Saja)', systemRole: 'donor_viewer', email: 'staf@dfw.or.id', status: 'active' }
];

export const INITIAL_PROJECTS: Project[] = [];
export const INITIAL_INDICATORS: Indicator[] = [];
export const INITIAL_OUTCOMES: Outcome[] = [];
export const INITIAL_ACTIVITIES: Activity[] = [];
export const INITIAL_BENEFICIARIES: Beneficiary[] = [];
export const INITIAL_ISSUES: Issue[] = [];
export const INITIAL_REFLECTIONS: ProjectReflection[] = [];
export const INITIAL_DOCUMENTS: ProjectDocument[] = [];

import { Project, Indicator, Outcome, Activity, Beneficiary, Issue, Staff, ProjectReflection, ProjectDocument } from './types';

export const INITIAL_STAFF: Staff[] = [
  { id: 'st-01', name: 'Imam Trihatmadja', role: 'Program Director', systemRole: 'super_admin', email: 'imam.trihatmadja@dfw.or.id', status: 'active' },
  { id: 'st-02', name: 'Siti Nurul', role: 'Project Coordinator', systemRole: 'project_coordinator', email: 'siti.nurul@dfw.or.id', status: 'active' },
  { id: 'st-03', name: 'Fadli S.', role: 'Field Officer - WPP 718', systemRole: 'field_officer', email: 'fadli.s@dfw.or.id', status: 'active' },
  { id: 'st-04', name: 'Andi Wijaya', role: 'Fisheries Supervisor (Field PIC)', systemRole: 'field_officer', email: 'andi.wijaya@dfw.or.id', status: 'active' },
  { id: 'st-05', name: 'Dewi Lestari', role: 'Financial & Monitoring Officer', systemRole: 'project_coordinator', email: 'dewi.lestari@dfw.or.id', status: 'active' },
  { id: 'st-06', name: 'Mitra Donor / Verifikator', role: 'Perwakilan Donor Eksternal', systemRole: 'donor_viewer', email: 'donor@partner.org', status: 'active' }
];

export const INITIAL_PROJECTS: Project[] = [];
export const INITIAL_INDICATORS: Indicator[] = [];
export const INITIAL_OUTCOMES: Outcome[] = [];
export const INITIAL_ACTIVITIES: Activity[] = [];
export const INITIAL_BENEFICIARIES: Beneficiary[] = [];
export const INITIAL_ISSUES: Issue[] = [];
export const INITIAL_REFLECTIONS: ProjectReflection[] = [];
export const INITIAL_DOCUMENTS: ProjectDocument[] = [];

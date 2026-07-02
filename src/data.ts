import { Project, Indicator, Outcome, Activity, Beneficiary, Issue, Staff, ProjectReflection, ProjectDocument } from './types';

export const INITIAL_STAFF: Staff[] = [
  { id: 'st-01', name: 'Imam Trihatmadja', role: 'Program Director', status: 'active' },
  { id: 'st-02', name: 'Fadli S.', role: 'Field Officer - WPP 718', status: 'active' },
  { id: 'st-03', name: 'Siti Nurul', role: 'Social Safeguard Expert', status: 'active' },
  { id: 'st-04', name: 'Andi Wijaya', role: 'Fisheries Supervisor', status: 'active' },
  { id: 'st-05', name: 'Dewi Lestari', role: 'Financial Officer', status: 'active' },
  { id: 'st-06', name: 'Budi Hartono', role: 'Field Assistant', status: 'active' }
];

export const INITIAL_PROJECTS: Project[] = [];
export const INITIAL_INDICATORS: Indicator[] = [];
export const INITIAL_OUTCOMES: Outcome[] = [];
export const INITIAL_ACTIVITIES: Activity[] = [];
export const INITIAL_BENEFICIARIES: Beneficiary[] = [];
export const INITIAL_ISSUES: Issue[] = [];
export const INITIAL_REFLECTIONS: ProjectReflection[] = [];
export const INITIAL_DOCUMENTS: ProjectDocument[] = [];

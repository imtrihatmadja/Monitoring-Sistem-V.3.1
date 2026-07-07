import React, { useState, useEffect } from 'react';
import { Project, Activity, Indicator, Outcome, Beneficiary, Issue, Staff, SubActivity, ProjectReflection, ActivityFile, ProjectDocument } from './types';
import { safeStorage as localStorage } from './lib/safeStorage';
import {
  INITIAL_PROJECTS,
  INITIAL_INDICATORS,
  INITIAL_OUTCOMES,
  INITIAL_ACTIVITIES,
  INITIAL_BENEFICIARIES,
  INITIAL_ISSUES,
  INITIAL_STAFF,
  INITIAL_REFLECTIONS,
  INITIAL_DOCUMENTS,
} from './data';
import { SupabaseSync } from './lib/supabaseSync';
import { isSupabaseConfigured, supabase, reinitializeSupabase } from './supabaseClient';
import { createClient } from '@supabase/supabase-js';


// Import Tab Components
import { DashboardTab } from './components/DashboardTab';
import { ProjectsTab } from './components/ProjectsTab';
import { IssuesTab } from './components/IssuesTab';
import { BeneficiaryTab } from './components/BeneficiaryTab';
import { StaffTab } from './components/StaffTab';
import { ProjectForm } from './components/ProjectForm';
import { ProjectDetailTab } from './components/ProjectDetailTab';
import { DocumentsTab } from './components/DocumentsTab';

// Import Confirm Modal
import { ConfirmModal } from './components/ConfirmModal';

// Import Modals Component
import {
  ActivityModal,
  PrintModal,
  ImportModal,
  BeneficiaryModal,
  BenDetailModal,
  StaffTasksModal,
  SubActivitiesModal,
} from './components/Modals';

// Import Icons
import {
  Folder,
  LayoutDashboard,
  Users,
  AlertTriangle,
  ClipboardList,
  FolderMinus,
  Settings,
  PlusCircle,
  Database,
  Printer,
  ChevronRight,
  Info,
  Layers,
  Sparkles,
  CheckCircle2,
  FileText,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
} from 'lucide-react';

export default function App() {
  // --- STATE STORES (PERSISTED IN LOCALSTORAGE) ---
  const [projects, _setProjects] = useState<Project[]>([]);
  const [indicators, _setIndicators] = useState<Indicator[]>([]);
  const [outcomes, _setOutcomes] = useState<Outcome[]>([]);
  const [activities, _setActivities] = useState<Activity[]>([]);
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [subActivities, _setSubActivities] = useState<SubActivity[]>([]);
  const [reflections, _setReflections] = useState<ProjectReflection[]>([]);
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);

  // Helper to sort list items based on creation order parsed from their friendly IDs
  const sortItemsByCreation = <T extends { id: string }>(items: T[]): T[] => {
    return [...items].sort((a, b) => {
      const getTimestamp = (id: string): number => {
        if (!id) return 0;
        const originalId = SupabaseSync.getOriginalId(id);
        
        // Try to match a JS timestamp (10 to 15 digits)
        const tsMatch = originalId.match(/(\d{10,15})/);
        if (tsMatch) {
          return parseInt(tsMatch[1], 10);
        }
        
        // If not found, try to match any number (e.g. ind-1, ind-2)
        const numMatch = originalId.match(/(\d+)/);
        if (numMatch) {
          return parseInt(numMatch[1], 10);
        }
        
        return 0;
      };
      
      const tA = getTimestamp(a.id);
      const tB = getTimestamp(b.id);
      if (tA !== tB) {
        return tA - tB; // oldest first (first input is on top)
      }
      
      const origA = SupabaseSync.getOriginalId(a.id);
      const origB = SupabaseSync.getOriginalId(b.id);
      return origA.localeCompare(origB);
    });
  };

  const setProjects = (val: Project[] | ((prev: Project[]) => Project[])) => {
    if (typeof val === 'function') {
      _setProjects(prev => sortItemsByCreation(val(prev)));
    } else {
      _setProjects(sortItemsByCreation(val));
    }
  };
  const setIndicators = (val: Indicator[] | ((prev: Indicator[]) => Indicator[])) => {
    if (typeof val === 'function') {
      _setIndicators(prev => sortItemsByCreation(val(prev)));
    } else {
      _setIndicators(sortItemsByCreation(val));
    }
  };
  const setOutcomes = (val: Outcome[] | ((prev: Outcome[]) => Outcome[])) => {
    if (typeof val === 'function') {
      _setOutcomes(prev => sortItemsByCreation(val(prev)));
    } else {
      _setOutcomes(sortItemsByCreation(val));
    }
  };
  const setActivities = (val: Activity[] | ((prev: Activity[]) => Activity[])) => {
    if (typeof val === 'function') {
      _setActivities(prev => sortItemsByCreation(val(prev)));
    } else {
      _setActivities(sortItemsByCreation(val));
    }
  };
  const setSubActivities = (val: SubActivity[] | ((prev: SubActivity[]) => SubActivity[])) => {
    if (typeof val === 'function') {
      _setSubActivities(prev => sortItemsByCreation(val(prev)));
    } else {
      _setSubActivities(sortItemsByCreation(val));
    }
  };
  const setReflections = (val: ProjectReflection[] | ((prev: ProjectReflection[]) => ProjectReflection[])) => {
    if (typeof val === 'function') {
      _setReflections(prev => sortItemsByCreation(val(prev)));
    } else {
      _setReflections(sortItemsByCreation(val));
    }
  };

  // Navigation state
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'projects' | 'beneficiary' | 'issues' | 'staff' | 'add_project' | 'edit_project' | 'project_detail' | 'archive' | 'documents' | 'supabase'
  >('dashboard');
  
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [docProjectFilter, setDocProjectFilter] = useState<string>('');

  // Reusable custom confirm modal state to replace iframe-incompatible window.confirm
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'default' | 'danger' | 'warning' | 'info';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Modals state
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | undefined>(undefined);

  const [isSubActivitiesModalOpen, setIsSubActivitiesModalOpen] = useState(false);
  const [activeParentActivityId, setActiveParentActivityId] = useState<string>('');

  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const [isBenModalOpen, setIsBenModalOpen] = useState(false);
  const [selectedBen, setSelectedBen] = useState<Beneficiary | undefined>(undefined);
  const [defaultBenProjectId, setDefaultBenProjectId] = useState<string>('');

  const [isBenDetailModalOpen, setIsBenDetailModalOpen] = useState(false);
  const [selectedDetailBen, setSelectedDetailBen] = useState<Beneficiary | undefined>(undefined);

  const [isStaffTasksModalOpen, setIsStaffTasksModalOpen] = useState(false);
  const [selectedStaffTasksName, setSelectedStaffTasksName] = useState<string>('');

  // Supabase live configuration states
  const [dbUrl, setDbUrl] = useState(localStorage.getItem('dfw_supabase_url') || import.meta.env.VITE_SUPABASE_URL || '');
  const [dbKey, setDbKey] = useState(localStorage.getItem('dfw_supabase_anon_key') || import.meta.env.VITE_SUPABASE_ANON_KEY || '');
  const [dbIsConfigured, setDbIsConfigured] = useState(isSupabaseConfigured);
  const [isTestingDb, setIsTestingDb] = useState(false);
  const [dbError, setDbError] = useState('');
  const [showSqlGuide, setShowSqlGuide] = useState(false);
  const [sqlCopied, setSqlCopied] = useState(false);
  const [tableStatuses, setTableStatuses] = useState<Record<string, 'loading' | 'ok' | 'missing'>>({});
  const [isCheckingTables, setIsCheckingTables] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // Pagination states for conserving database egress load per tab
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);

  // Sync validation status toast
  const [syncToast, setSyncToast] = useState<'success' | 'info' | 'error' | ''>('');
  const [syncToastMsg, setSyncToastMsg] = useState<string>('');

  // Helper to compare IDs robustly (handles raw UUIDs and friendly IDs seamlessly)
  const isIdMatch = (id1: string | undefined | null, id2: string | undefined | null) => {
    if (!id1 || !id2) return false;
    const clean1 = id1.trim().toLowerCase();
    const clean2 = id2.trim().toLowerCase();
    if (clean1 === clean2) return true;
    try {
      return SupabaseSync.getUuid(clean1) === SupabaseSync.getUuid(clean2);
    } catch {
      return false;
    }
  };

  const loadLocalFallback = () => {
    const storedProjects = localStorage.getItem('dfw_projects');
    const storedIndicators = localStorage.getItem('dfw_indicators');
    const storedOutcomes = localStorage.getItem('dfw_outcomes');
    const storedActivities = localStorage.getItem('dfw_activities');
    const storedBeneficiaries = localStorage.getItem('dfw_beneficiaries');
    const storedIssues = localStorage.getItem('dfw_issues');
    const storedStaff = localStorage.getItem('dfw_staff');
    const storedSubActivities = localStorage.getItem('dfw_sub_activities');
    const storedReflections = localStorage.getItem('dfw_reflections');
    const storedDocuments = localStorage.getItem('dfw_documents');

    const safeParse = <T,>(value: string | null, fallback: T): T => {
      if (!value) return fallback;
      try {
        return JSON.parse(value) as T;
      } catch (e) {
        console.warn('Silent local storage parsing restoration active:', e);
        return fallback;
      }
    };

    setProjects(safeParse(storedProjects, INITIAL_PROJECTS));
    setIndicators(safeParse(storedIndicators, INITIAL_INDICATORS));
    setOutcomes(safeParse(storedOutcomes, INITIAL_OUTCOMES));
    setActivities(safeParse(storedActivities, INITIAL_ACTIVITIES));
    setBeneficiaries(safeParse(storedBeneficiaries, INITIAL_BENEFICIARIES));
    setIssues(safeParse(storedIssues, INITIAL_ISSUES));
    setStaff(safeParse(storedStaff, INITIAL_STAFF));
    setSubActivities(safeParse(storedSubActivities, []));
    setReflections(safeParse(storedReflections, INITIAL_REFLECTIONS));
    setDocuments(safeParse(storedDocuments, INITIAL_DOCUMENTS));
  };

  // Reset page when switching tabs or selecting a new project to keep the interface intuitive
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, selectedProjectId]);

  // Optimized background silent data loader to fetch specific tab database partitions
  const silentSyncFromSupabase = async (opts?: { tab?: string; projId?: string; pg?: number; lim?: number }) => {
    if (!dbIsConfigured || isInitialLoading) return;
    try {
      const targetTab = opts?.tab ?? activeTab;
      const targetProj = opts?.projId ?? selectedProjectId;
      const targetPg = opts?.pg ?? currentPage;
      const targetLim = opts?.lim ?? itemsPerPage;

      const data = await SupabaseSync.fetchAllData({
        activeTab: targetTab,
        projectId: targetProj,
        page: targetPg,
        limit: targetLim
      });
      if (!isSupabaseConfigured) return;
      if (data) {
        if (data.projects !== undefined) {
          setProjects(data.projects);
          localStorage.setItem('dfw_projects', JSON.stringify(data.projects));
        }
        if (data.indicators !== undefined) {
          setIndicators(data.indicators);
          localStorage.setItem('dfw_indicators', JSON.stringify(data.indicators));
        }
        if (data.outcomes !== undefined) {
          setOutcomes(data.outcomes);
          localStorage.setItem('dfw_outcomes', JSON.stringify(data.outcomes));
        }
        if (data.activities !== undefined) {
          setActivities(data.activities);
          localStorage.setItem('dfw_activities', JSON.stringify(data.activities));
        }
        if (data.beneficiaries !== undefined) {
          setBeneficiaries(data.beneficiaries);
          localStorage.setItem('dfw_beneficiaries', JSON.stringify(data.beneficiaries));
        }
        if (data.issues !== undefined) {
          setIssues(data.issues);
          localStorage.setItem('dfw_issues', JSON.stringify(data.issues));
        }
        if (data.staff !== undefined) {
          setStaff(data.staff);
          localStorage.setItem('dfw_staff', JSON.stringify(data.staff));
        }
        if (data.subActivities !== undefined) {
          setSubActivities(data.subActivities);
          localStorage.setItem('dfw_sub_activities', JSON.stringify(data.subActivities));
        }
        if (data.reflections !== undefined) {
          setReflections(data.reflections);
          localStorage.setItem('dfw_reflections', JSON.stringify(data.reflections));
        }
        if (data.documents !== undefined) {
          setDocuments(data.documents);
          if (!dbIsConfigured) {
            localStorage.setItem('dfw_documents', JSON.stringify(data.documents));
          } else {
            localStorage.removeItem('dfw_documents');
          }
        }
      }
    } catch (e) {
      console.warn('Quiet tab transition sync failed:', e);
    }
  };

  // Re-fetch active tab records automatically when paging or context switches
  useEffect(() => {
    if (dbIsConfigured) {
      silentSyncFromSupabase();
    }
  }, [activeTab, selectedProjectId, currentPage, itemsPerPage, dbIsConfigured]);

  // Initialize data stores
  useEffect(() => {
    // Force a one-time clear of previous dummy local storage to ensure the user gets a completely empty database
    const clearedFlag = localStorage.getItem('dfw_db_cleared_v1_empty');
    if (!clearedFlag) {
      localStorage.removeItem('dfw_projects');
      localStorage.removeItem('dfw_indicators');
      localStorage.removeItem('dfw_outcomes');
      localStorage.removeItem('dfw_activities');
      localStorage.removeItem('dfw_beneficiaries');
      localStorage.removeItem('dfw_issues');
      localStorage.removeItem('dfw_sub_activities');
      localStorage.removeItem('dfw_reflections');
      localStorage.removeItem('dfw_documents');
      localStorage.removeItem('dfw_staff');
      localStorage.setItem('dfw_db_cleared_v1_empty', 'true');
    }

    if (isSupabaseConfigured) {
      SupabaseSync.fetchSchemaInfo().then(() => {
        SupabaseSync.fetchAllData().then((data) => {
          if (data) {
            const safeParse = <T,>(value: string | null, fallback: T): T => {
              if (!value) return fallback;
              try { return JSON.parse(value) as T; } catch { return fallback; }
            };

            if (data.projects !== undefined) {
              setProjects(data.projects);
              localStorage.setItem('dfw_projects', JSON.stringify(data.projects));
            } else {
              setProjects(safeParse(localStorage.getItem('dfw_projects'), INITIAL_PROJECTS));
            }

            if (data.indicators !== undefined) {
              setIndicators(data.indicators);
              localStorage.setItem('dfw_indicators', JSON.stringify(data.indicators));
            } else {
              setIndicators(safeParse(localStorage.getItem('dfw_indicators'), INITIAL_INDICATORS));
            }

            if (data.outcomes !== undefined) {
              setOutcomes(data.outcomes);
              localStorage.setItem('dfw_outcomes', JSON.stringify(data.outcomes));
            } else {
              setOutcomes(safeParse(localStorage.getItem('dfw_outcomes'), INITIAL_OUTCOMES));
            }

            if (data.activities !== undefined) {
              setActivities(data.activities);
              localStorage.setItem('dfw_activities', JSON.stringify(data.activities));
            } else {
              setActivities(safeParse(localStorage.getItem('dfw_activities'), INITIAL_ACTIVITIES));
            }

            if (data.beneficiaries !== undefined) {
              setBeneficiaries(data.beneficiaries);
              localStorage.setItem('dfw_beneficiaries', JSON.stringify(data.beneficiaries));
            } else {
              setBeneficiaries(safeParse(localStorage.getItem('dfw_beneficiaries'), INITIAL_BENEFICIARIES));
            }

            if (data.issues !== undefined) {
              setIssues(data.issues);
              localStorage.setItem('dfw_issues', JSON.stringify(data.issues));
            } else {
              setIssues(safeParse(localStorage.getItem('dfw_issues'), INITIAL_ISSUES));
            }

            if (data.staff !== undefined) {
              if (data.staff.length === 0 && INITIAL_STAFF.length > 0) {
                setStaff(INITIAL_STAFF);
                INITIAL_STAFF.forEach(member => SupabaseSync.saveStaff(member));
              } else {
                setStaff(data.staff);
              }
              localStorage.setItem('dfw_staff', JSON.stringify(data.staff));
            } else {
              setStaff(safeParse(localStorage.getItem('dfw_staff'), INITIAL_STAFF));
            }

            if (data.subActivities !== undefined) {
              setSubActivities(data.subActivities);
              localStorage.setItem('dfw_sub_activities', JSON.stringify(data.subActivities));
            } else {
              setSubActivities(safeParse(localStorage.getItem('dfw_sub_activities'), []));
            }

            if (data.reflections !== undefined) {
              setReflections(data.reflections);
              localStorage.setItem('dfw_reflections', JSON.stringify(data.reflections));
            } else {
              setReflections(safeParse(localStorage.getItem('dfw_reflections'), INITIAL_REFLECTIONS));
            }

            if (data.documents !== undefined) {
              setDocuments(data.documents);
              localStorage.removeItem('dfw_documents');
            } else {
              setDocuments(safeParse(localStorage.getItem('dfw_documents'), INITIAL_DOCUMENTS));
            }
          } else {
            console.warn('Supabase fetch returned null, falling back to localStorage');
            loadLocalFallback();
          }
          setIsInitialLoading(false);
        }).catch((err) => {
          console.error('Failed to load from Supabase:', err);
          loadLocalFallback();
          setIsInitialLoading(false);
        });
      }).catch((err) => {
        console.error('Failed to load Supabase schema:', err);
        loadLocalFallback();
        setIsInitialLoading(false);
      });
    } else {
      loadLocalFallback();
      setIsInitialLoading(false);
    }
  }, []);

  // Daftarkan pemetaan nama proyek yang mudah dibaca di dalam SupabaseSync saat daftar proyek berubah
  useEffect(() => {
    projects.forEach((p) => {
      if (p.id && p.name) {
        SupabaseSync.cacheProjectName(p.id, p.name);
      }
    });
  }, [projects]);

  // Setup Subscription Real-time untuk sinkronisasi antarterminal pengguna secara instan (Dioptimalkan dengan debounce dan selective-table fetching)
  useEffect(() => {
    if (dbIsConfigured && supabase) {
      const timeouts: Record<string, any> = {};

      const syncTable = (table: string) => {
        SupabaseSync.fetchSingleTable(table).then((data) => {
          if (!data) return;
          
          if (table === 'projects') setProjects(data);
          else if (table === 'project_indicators') setIndicators(data);
          else if (table === 'project_outcomes') setOutcomes(data);
          else if (table === 'project_activities') setActivities(data);
          else if (table === 'beneficiaries') setBeneficiaries(data);
          else if (table === 'issues') setIssues(data);
          else if (table === 'staff') setStaff(data);
          else if (table === 'project_sub_activities') setSubActivities(data);
          else if (table === 'project_reflections') setReflections(data);
          else if (table === 'project_documents') setDocuments(data);
        }).catch((err) => {
          console.warn(`Silent recovery of ${table} real-time sync failure:`, err);
        });
      };

      const handlePayload = (payload: any) => {
        if (!payload || !payload.table) return;
        const table = payload.table;
        
        // Debounce per table to consolidate batch uploads and rapid keyboard edits
        if (timeouts[table]) {
          clearTimeout(timeouts[table]);
        }
        
        timeouts[table] = setTimeout(() => {
          syncTable(table);
          delete timeouts[table];
        }, 1200);
      };

      const clientInstance = supabase;
      const channel = clientInstance
        .channel('realtime_sync')
        .on('postgres_changes', { event: '*', schema: 'public' }, handlePayload)
        .subscribe();

      return () => {
        if (clientInstance) {
          clientInstance.removeChannel(channel);
        }
        Object.values(timeouts).forEach(clearTimeout);
      };
    }
  }, [dbIsConfigured]);

  // Check ketersediaan tabel di database Supabase Cloud
  const checkSupabaseTables = async (customUrl?: string, customKey?: string) => {
    const targetUrl = customUrl || dbUrl;
    const targetKey = customKey || dbKey;
    if (!targetUrl || !targetKey) return;
    
    setIsCheckingTables(true);
    try {
      const client = (targetUrl === dbUrl && targetKey === dbKey && supabase)
        ? supabase
        : createClient(targetUrl, targetKey, { auth: { persistSession: false } });
      const tablesToCheck = [
        'projects',
        'project_indicators',
        'project_outcomes',
        'project_activities',
        'beneficiaries',
        'issues',
        'staff',
        'project_reflections',
        'project_documents',
        'project_sub_activities'
      ];
      
      const nextStatuses: Record<string, 'loading' | 'ok' | 'missing'> = {};
      tablesToCheck.forEach(t => {
        nextStatuses[t] = 'loading';
      });
      setTableStatuses(nextStatuses);
      
      const checks = tablesToCheck.map(async (table) => {
        try {
          const { error } = await client.from(table).select('id').limit(1);
          if (error) {
            const errorMsg = (error.message || '').toLowerCase();
            if (
              errorMsg.includes('does not exist') || 
              errorMsg.includes('could not find') || 
              error.code === 'PGRST116' ||
              error.code === '42P01'
            ) {
              return { table, status: 'missing' as const };
            }
          }
          return { table, status: 'ok' as const };
        } catch (e) {
          return { table, status: 'missing' as const };
        }
      });
      
      const results = await Promise.all(checks);
      const finalStatuses: Record<string, 'ok' | 'missing'> = {};
      results.forEach(res => {
        finalStatuses[res.table] = res.status;
      });
      setTableStatuses(finalStatuses);
    } catch (err) {
      console.error('Failed checking Supabase tables:', err);
    } finally {
      setIsCheckingTables(false);
    }
  };

  // Trigger table checkers upon connection configuring
  useEffect(() => {
    if (dbIsConfigured) {
      checkSupabaseTables();
    }
  }, [dbIsConfigured]);

  // Save states helper with user-friendly feedback
  const handleSyncResult = (promise: Promise<boolean>, actionText: string) => {
    promise.then((success) => {
      if (success) {
        setSyncToast('success');
        setSyncToastMsg(`${actionText} berhasil disinkronisasi ke Supabase!`);
        setTimeout(() => { setSyncToast(''); setSyncToastMsg(''); }, 3000);
      } else {
        setSyncToast('error');
        setSyncToastMsg(`Gagal sinkronisasi ${actionText.toLowerCase()} ke Supabase. Periksa schema tabel Anda.`);
        setTimeout(() => { setSyncToast(''); setSyncToastMsg(''); }, 6000);
      }
    }).catch(err => {
      setSyncToast('error');
      setSyncToastMsg(`Error sinkronisasi: ${err.message || err}`);
      setTimeout(() => { setSyncToast(''); setSyncToastMsg(''); }, 6000);
    });
  };

  const updateDocumentsInStorage = (newList: ProjectDocument[]) => {
    setDocuments(newList);
    if (!dbIsConfigured) {
      localStorage.setItem('dfw_documents', JSON.stringify(newList));
    } else {
      // Clear document cache from localstorage if database is configured
      localStorage.removeItem('dfw_documents');
    }
    if (dbIsConfigured) {
      const deleted = documents.filter(d => !newList.some(item => item.id === d.id));
      deleted.forEach(d => handleSyncResult(SupabaseSync.deleteDocument(d.id), "Penghapusan dokumen"));
      newList.forEach(item => {
        const oldItem = documents.find(d => d.id === item.id);
        if (!oldItem || JSON.stringify(oldItem) !== JSON.stringify(item)) {
          handleSyncResult(SupabaseSync.saveDocument(item), "Dokumen");
        }
      });
    }
  };

  const updateProjectsInStorage = (newList: Project[]) => {
    setProjects(newList);
    localStorage.setItem('dfw_projects', JSON.stringify(newList));
    if (dbIsConfigured) {
      const deleted = projects.filter(p => !newList.some(item => item.id === p.id));
      deleted.forEach(p => handleSyncResult(SupabaseSync.deleteProject(p.id), "Penghapusan proyek"));
      newList.forEach(item => {
        const oldItem = projects.find(p => p.id === item.id);
        if (!oldItem || JSON.stringify(oldItem) !== JSON.stringify(item)) {
          handleSyncResult(SupabaseSync.saveProject(item), "Data proyek");
        }
      });
    }
  };

  const updateIndicatorsInStorage = (newList: Indicator[]) => {
    setIndicators(newList);
    localStorage.setItem('dfw_indicators', JSON.stringify(newList));
    if (dbIsConfigured) {
      const deleted = indicators.filter(i => !newList.some(item => item.id === i.id));
      deleted.forEach(i => handleSyncResult(SupabaseSync.deleteIndicator(i.id), "Penghapusan indikator"));
      newList.forEach(item => {
        const oldItem = indicators.find(i => i.id === item.id);
        if (!oldItem || JSON.stringify(oldItem) !== JSON.stringify(item)) {
          handleSyncResult(SupabaseSync.saveIndicator(item), "Indikator");
        }
      });
    }
  };

  const updateOutcomesInStorage = (newList: Outcome[]) => {
    setOutcomes(newList);
    localStorage.setItem('dfw_outcomes', JSON.stringify(newList));
    if (dbIsConfigured) {
      const deleted = outcomes.filter(o => !newList.some(item => item.id === o.id));
      deleted.forEach(o => handleSyncResult(SupabaseSync.deleteOutcome(o.id), "Penghapusan outcomes"));
      newList.forEach(item => {
        const oldItem = outcomes.find(o => o.id === item.id);
        if (!oldItem || JSON.stringify(oldItem) !== JSON.stringify(item)) {
          handleSyncResult(SupabaseSync.saveOutcome(item), "Hasil/Outcome");
        }
      });
    }
  };

  const updateActivitiesInStorage = (newList: Activity[]) => {
    setActivities(newList);
    localStorage.setItem('dfw_activities', JSON.stringify(newList));
    if (dbIsConfigured) {
      const deleted = activities.filter(a => !newList.some(item => item.id === a.id));
      deleted.forEach(a => handleSyncResult(SupabaseSync.deleteActivity(a.id), "Penghapusan kegiatan"));
      newList.forEach(item => {
        const oldItem = activities.find(a => a.id === item.id);
        if (!oldItem || JSON.stringify(oldItem) !== JSON.stringify(item)) {
          handleSyncResult(SupabaseSync.saveActivity(item), "Kegiatan");
        }
      });
    }
  };

  const updateBeneficiariesInStorage = (newList: Beneficiary[]) => {
    setBeneficiaries(newList);
    localStorage.setItem('dfw_beneficiaries', JSON.stringify(newList));
    if (dbIsConfigured) {
      const deleted = beneficiaries.filter(b => !newList.some(item => item.id === b.id));
      deleted.forEach(b => handleSyncResult(SupabaseSync.deleteBeneficiary(b.id), "Penghapusan penerima manfaat"));
      newList.forEach(item => {
        const oldItem = beneficiaries.find(b => b.id === item.id);
        if (!oldItem || JSON.stringify(oldItem) !== JSON.stringify(item)) {
          handleSyncResult(SupabaseSync.saveBeneficiary(item), "Penerima manfaat");
        }
      });
    }
  };

  const updateIssuesInStorage = (newList: Issue[]) => {
    setIssues(newList);
    localStorage.setItem('dfw_issues', JSON.stringify(newList));
    if (dbIsConfigured) {
      const deleted = issues.filter(i => !newList.some(item => item.id === i.id));
      deleted.forEach(i => handleSyncResult(SupabaseSync.deleteIssue(i.id), "Penghapusan isu"));
      newList.forEach(item => {
        const oldItem = issues.find(i => i.id === item.id);
        if (!oldItem || JSON.stringify(oldItem) !== JSON.stringify(item)) {
          handleSyncResult(SupabaseSync.saveIssue(item), "Isu");
        }
      });
    }
  };

  const updateSubActivitiesInStorage = (newList: SubActivity[]) => {
    setSubActivities(newList);
    localStorage.setItem('dfw_sub_activities', JSON.stringify(newList));
    if (dbIsConfigured) {
      const deleted = subActivities.filter(s => !newList.some(item => item.id === s.id));
      deleted.forEach(s => handleSyncResult(SupabaseSync.deleteSubActivity(s.id), "Penghapusan sub-kegiatan"));
      newList.forEach(item => {
        const oldItem = subActivities.find(s => s.id === item.id);
        if (!oldItem || JSON.stringify(oldItem) !== JSON.stringify(item)) {
          handleSyncResult(SupabaseSync.saveSubActivity(item), "Sub-kegiatan");
        }
      });
    }
  };

  const updateReflectionsInStorage = (newList: ProjectReflection[]) => {
    setReflections(newList);
    localStorage.setItem('dfw_reflections', JSON.stringify(newList));
    if (dbIsConfigured) {
      const deleted = reflections.filter(r => !newList.some(item => item.id === r.id));
      deleted.forEach(r => handleSyncResult(SupabaseSync.deleteReflection(r.id), "Penghapusan refleksi"));
      newList.forEach(item => {
        const oldItem = reflections.find(r => r.id === item.id);
        if (!oldItem || JSON.stringify(oldItem) !== JSON.stringify(item)) {
          handleSyncResult(SupabaseSync.saveReflection(item), "Catatan refleksi");
        }
      });
    }
  };

  const updateStaffInStorage = (newList: Staff[]) => {
    setStaff(newList);
    localStorage.setItem('dfw_staff', JSON.stringify(newList));
    if (dbIsConfigured) {
      const deleted = staff.filter(s => !newList.some(item => item.id === s.id));
      deleted.forEach(s => handleSyncResult(SupabaseSync.deleteStaff(s.id), "Penghapusan staff"));
      newList.forEach(item => {
        const oldItem = staff.find(s => s.id === item.id);
        if (!oldItem || JSON.stringify(oldItem) !== JSON.stringify(item)) {
          handleSyncResult(SupabaseSync.saveStaff(item), "Staff");
        }
      });
    }
  };

  // Recalculates project overall progress dynamically based on activity progress averages
  const recalculateProgressAndSave = (projId: string, customActivities?: Activity[]) => {
    const list = customActivities || activities;
    const projectActs = list.filter((act) => isIdMatch(act.projectId, projId));
    
    let newProgress = 0;
    if (projectActs.length > 0) {
      newProgress = Math.round(projectActs.reduce((sum, act) => sum + act.progress, 0) / projectActs.length);
    }

    const updated = projects.map((p) => {
      if (isIdMatch(p.id, projId)) {
        return { ...p, progress: newProgress };
      }
      return p;
    });

    updateProjectsInStorage(updated);
  };

  // Reusable function to fetch data from Supabase and update states and local storage fallback
  const fetchAndSyncFromSupabase = async () => {
    try {
      setSyncToast('info');
      setSyncToastMsg('Mengsinkronisasi data dengan Supabase Cloud...');
      const data = await SupabaseSync.fetchAllData({
        activeTab,
        projectId: selectedProjectId,
        page: currentPage,
        limit: itemsPerPage
      });
      if (!isSupabaseConfigured) return;
      if (data) {
        if (data.projects !== undefined) {
          setProjects(data.projects);
          localStorage.setItem('dfw_projects', JSON.stringify(data.projects));
        }
        if (data.indicators !== undefined) {
          setIndicators(data.indicators);
          localStorage.setItem('dfw_indicators', JSON.stringify(data.indicators));
        }
        if (data.outcomes !== undefined) {
          setOutcomes(data.outcomes);
          localStorage.setItem('dfw_outcomes', JSON.stringify(data.outcomes));
        }
        if (data.activities !== undefined) {
          setActivities(data.activities);
          localStorage.setItem('dfw_activities', JSON.stringify(data.activities));
        }
        if (data.beneficiaries !== undefined) {
          setBeneficiaries(data.beneficiaries);
          localStorage.setItem('dfw_beneficiaries', JSON.stringify(data.beneficiaries));
        }
        if (data.issues !== undefined) {
          setIssues(data.issues);
          localStorage.setItem('dfw_issues', JSON.stringify(data.issues));
        }
        if (data.staff !== undefined) {
          setStaff(data.staff);
          localStorage.setItem('dfw_staff', JSON.stringify(data.staff));
        }
        if (data.subActivities !== undefined) {
          setSubActivities(data.subActivities);
          localStorage.setItem('dfw_sub_activities', JSON.stringify(data.subActivities));
        }
        if (data.reflections !== undefined) {
          setReflections(data.reflections);
          localStorage.setItem('dfw_reflections', JSON.stringify(data.reflections));
        }
        if (data.documents !== undefined) {
          setDocuments(data.documents);
          if (!dbIsConfigured) {
            localStorage.setItem('dfw_documents', JSON.stringify(data.documents));
          } else {
            localStorage.removeItem('dfw_documents');
          }
        }

        setSyncToast('success');
        setSyncToastMsg('Sinkronisasi data dari Supabase berhasil!');
        setTimeout(() => { setSyncToast(''); setSyncToastMsg(''); }, 3000);
        return true;
      } else {
        throw new Error('Supabase fetch returned null');
      }
    } catch (err: any) {
      setSyncToast('error');
      setSyncToastMsg(`Gagal sinkronisasi data: ${err.message || err}`);
      setTimeout(() => { setSyncToast(''); setSyncToastMsg(''); }, 6000);
      return false;
    }
  };

  const handleExportAllToSupabase = async () => {
    if (!dbIsConfigured) {
      alert("Silakan hubungkan Supabase terlebih dahulu.");
      return;
    }
    
    setSyncToast('info');
    setSyncToastMsg('Memulai migrasi data lokal ke Supabase Cloud...');
    
    try {
      let successCount = 0;
      let totalCount = 0;
      
      async function uploadList<T>(list: T[], saveFunc: (item: T) => Promise<boolean>) {
        for (const item of list) {
          totalCount++;
          const ok = await saveFunc(item);
          if (ok) successCount++;
        }
      }
      
      await uploadList(projects, SupabaseSync.saveProject);
      await uploadList(indicators, SupabaseSync.saveIndicator);
      await uploadList(outcomes, SupabaseSync.saveOutcome);
      await uploadList(activities, SupabaseSync.saveActivity);
      await uploadList(beneficiaries, SupabaseSync.saveBeneficiary);
      await uploadList(issues, SupabaseSync.saveIssue);
      await uploadList(staff, SupabaseSync.saveStaff);
      await uploadList(subActivities, SupabaseSync.saveSubActivity);
      await uploadList(reflections, SupabaseSync.saveReflection);
      await uploadList(documents, SupabaseSync.saveDocument);
      
      setSyncToast('success');
      setSyncToastMsg(`Migrasi selesai: ${successCount} dari ${totalCount} data berhasil diekspor ke Supabase Cloud!`);
      setTimeout(() => { setSyncToast(''); setSyncToastMsg(''); }, 5000);
    } catch (err: any) {
      setSyncToast('error');
      setSyncToastMsg(`Gagal migrasi: ${err.message || err}`);
      setTimeout(() => { setSyncToast(''); setSyncToastMsg(''); }, 6000);
    }
  };

  // --- RECT REVENUE CALLBACK WORKFLOW ---
  const handleSelectProject = (id: string) => {
    setSelectedProjectId(id);
    setActiveTab('project_detail');
  };

  const handleEditProjectClick = (id: string) => {
    setSelectedProjectId(id);
    setActiveTab('edit_project');
  };

  const handleArchiveProject = (id: string) => {
    setConfirmState({
      isOpen: true,
      title: 'Arsipkan Proyek',
      message: 'Apakah Anda yakin ingin mengarsipkan proyek ini? Proyek yang diarsipkan dipindahkan ke tab Arsip dan dapat dipulihkan kembali kapan saja.',
      type: 'info',
      confirmText: 'Ya, Arsipkan',
      onConfirm: () => {
        const updated = projects.map((p) => (p.id === id ? { ...p, isArchived: true, archoredBy: 'Imam Trihatmadja', archivedAt: new Date().toISOString().split('T')[0] } : p));
        updateProjectsInStorage(updated);
        setSyncToast('info');
        setConfirmState((prev) => ({ ...prev, isOpen: false }));
        setTimeout(() => setSyncToast(''), 3000);
      }
    });
  };

  const handleDeleteProject = (id: string) => {
    setConfirmState({
      isOpen: true,
      title: 'Hapus Proyek',
      message: 'Apakah Anda yakin ingin menghapus proyek ini secara permanen? Seluruh data proyek ini beserta relasinya akan dihapus dari sistem dan tidak dapat dikembalikan.',
      type: 'danger',
      confirmText: 'Ya, Hapus',
      onConfirm: () => {
        const updated = projects.filter((p) => p.id !== id);
        updateProjectsInStorage(updated);
        setSyncToast('success');
        setConfirmState((prev) => ({ ...prev, isOpen: false }));
        setTimeout(() => setSyncToast(''), 3000);
      }
    });
  };

  const handleRestoreProject = (id: string) => {
    const updated = projects.map((p) => (p.id === id ? { ...p, isArchived: false, archoredBy: undefined, archivedAt: undefined } : p));
    updateProjectsInStorage(updated);
    setSyncToast('success');
    setTimeout(() => setSyncToast(''), 3000);
  };

  // --- SAVE OR CREATE WIZARD FOR PROJECTS ---
  const handleSaveProjectWizard = (
    projectData: Partial<Project>,
    indicatorsData: Partial<Indicator>[],
    outcomesData: Partial<Outcome>[]
  ) => {
    if (selectedProjectId && activeTab === 'edit_project') {
      // Editing
      const updatedProjects = projects.map((p) =>
        isIdMatch(p.id, selectedProjectId) ? { ...p, ...projectData } : p
      );
      updateProjectsInStorage(updatedProjects);

      // Save outcomes
      const filteredOutcomes = outcomes.filter((o) => !isIdMatch(o.projectId, selectedProjectId));
      const newOutcomes = outcomesData.map((o) => ({
        id: o.id || `out-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        projectId: selectedProjectId,
        title: o.title || '',
      }));
      updateOutcomesInStorage([...filteredOutcomes, ...newOutcomes]);

      // Save indicators
      const filteredIndicators = indicators.filter((i) => !isIdMatch(i.projectId, selectedProjectId));
      const newIndicators = indicatorsData.map((ind) => ({
        id: ind.id || `ind-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        projectId: selectedProjectId,
        title: ind.title || '',
        target: ind.target || 0,
        current: ind.current || 0,
        unit: ind.unit || 'Orang',
      }));
      updateIndicatorsInStorage([...filteredIndicators, ...newIndicators]);

      recalculateProgressAndSave(selectedProjectId);
      setActiveTab('project_detail');
    } else {
      // Creation
      const newId = `p-${Date.now()}`;
      const newProj: Project = {
        id: newId,
        name: projectData.name || '',
        location: projectData.location || '',
        owner: projectData.owner || '',
        donor: projectData.donor,
        status: projectData.status || 'Aktif',
        startDate: projectData.startDate,
        deadline: projectData.deadline,
        progress: 0,
        budgetApproved: projectData.budgetApproved || 0,
        budgetActual: projectData.budgetActual || 0,
        desc: projectData.desc,
        note: projectData.note,
        goal: projectData.goal,
        isArchived: false,
      };

      updateProjectsInStorage([...projects, newProj]);

      const newOutcomes = outcomesData.map((o) => ({
        id: `out-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        projectId: newId,
        title: o.title || '',
      }));
      updateOutcomesInStorage([...outcomes, ...newOutcomes]);

      const newIndicators = indicatorsData.map((ind) => ({
        id: `ind-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        projectId: newId,
        title: ind.title || '',
        target: ind.target || 0,
        current: ind.current || 0,
        unit: ind.unit || 'Orang',
      }));
      updateIndicatorsInStorage([...indicators, ...newIndicators]);

      setSyncToast('success');
      setTimeout(() => setSyncToast(''), 3000);
      setActiveTab('dashboard');
    }
  };

  // --- SAVE CHOSEN ACTIVITY (EDIT / CREATE) ---
  const handleSaveActivityModal = (activityData: Partial<Activity>, rawFiles?: File[]) => {
    // Generate file mock paths from raw uploads
    const mockFiles: ActivityFile[] = [];
    if (rawFiles && rawFiles.length > 0) {
      rawFiles.forEach((f) => {
        mockFiles.push({
          id: `f-staged-${Date.now()}-${Math.random()}`,
          name: f.name,
          size: f.size,
          type: f.type,
        });
      });
    }

    const currentFiles = [...(activityData.files || []), ...mockFiles];

    if (selectedActivity) {
      // Editing Mode
      const updatedActs = activities.map((a) =>
        a.id === selectedActivity.id ? { ...a, ...activityData, files: currentFiles } : a
      );
      updateActivitiesInStorage(updatedActs);
      recalculateProgressAndSave(selectedProjectId, updatedActs);
    } else {
      // Creation Mode
      const newAct: Activity = {
        id: `act-${Date.now()}`,
        projectId: selectedProjectId,
        title: activityData.title || '',
        desc: activityData.desc,
        pic: activityData.pic,
        status: activityData.status || 'Belum Mulai',
        startDate: activityData.startDate,
        dueDate: activityData.dueDate,
        progress: activityData.progress || 0,
        notes: activityData.notes || [],
        files: currentFiles,
      };

      const newList = [...activities, newAct];
      updateActivitiesInStorage(newList);
      recalculateProgressAndSave(selectedProjectId, newList);
    }

    setIsActivityModalOpen(false);
    setSelectedActivity(undefined);
    setSyncToast('success');
    setTimeout(() => setSyncToast(''), 3000);
  };

  // --- SAVE OUTLINE SUB EXECUTIVES ---
  const handleSaveSubActivity = (subActData: Partial<SubActivity>) => {
    const newItem: SubActivity = {
      id: subActData.id || `sub-${Date.now()}`,
      parentActivityId: activeParentActivityId,
      title: subActData.title || '',
      desc: subActData.desc,
      pic: subActData.pic,
      status: subActData.status || 'Belum Mulai',
      priority: subActData.priority || 'Normal',
      due: subActData.due,
    };

    const isExisting = subActivities.some((item) => item.id === newItem.id);
    let updated: SubActivity[] = [];
    if (isExisting) {
      updated = subActivities.map((item) => (item.id === newItem.id ? newItem : item));
    } else {
      updated = [...subActivities, newItem];
    }

    updateSubActivitiesInStorage(updated);
  };

  const handleDeleteSubActivity = (subId: string) => {
    const updated = subActivities.filter((item) => item.id !== subId);
    updateSubActivitiesInStorage(updated);
  };

  // --- QUICK UPDATE PERFORMANCE INDICATORS CURRENT ON PANEL ---
  const handleSaveIndicatorValueInline = (indicatorId: string, newValue: number, newNotes?: string) => {
    const updated = indicators.map((ind) => {
      if (ind.id === indicatorId) {
        const isNoteChanged = newNotes !== undefined;
        return {
          ...ind,
          current: newValue,
          lastValue: ind.current,
          lastUpdated: new Date().toISOString().split('T')[0],
          ...(isNoteChanged ? {
            notes: newNotes,
            notesUpdatedAt: newNotes.trim() !== '' ? new Date().toLocaleString('id-ID', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            }) : undefined
          } : {})
        };
      }
      return ind;
    });

    updateIndicatorsInStorage(updated);
    setSyncToast('success');
    setTimeout(() => setSyncToast(''), 3000);
  };

  // --- SAVE REFLECTION/LESSONS LEARNED ---
  const handleAddReflectionInline = (refData: Partial<ProjectReflection>) => {
    const newRef: ProjectReflection = {
      id: `ref-${Date.now()}`,
      projectId: refData.projectId || '',
      title: refData.title,
      type: refData.type || 'lesson',
      date: refData.date || new Date().toISOString().split('T')[0],
      whatHappened: refData.whatHappened,
      whatWorked: refData.whatWorked,
      whatDidnt: refData.whatDidnt,
      lesson: refData.lesson || '',
      nextSteps: refData.nextSteps,
      contributor: refData.contributor,
    };

    updateReflectionsInStorage([...reflections, newRef]);
    setSyncToast('success');
    setTimeout(() => setSyncToast(''), 3000);
  };

  const handleDeleteReflectionInline = (refId: string) => {
    updateReflectionsInStorage(reflections.filter((r) => r.id !== refId));
    setSyncToast('success');
    setTimeout(() => setSyncToast(''), 3000);
  };

  // --- POPULATE OTHER CORE INTEGRATION TAB FUNCTIONS ---
  const handleExportExcelBeneficiary = (subList: Beneficiary[]) => {
    alert(`Mengekspor ${subList.length} data Penerima Manfaat ke file spreadsheet excel.xls`);
  };

  const handleDownloadTemplateExcel = () => {
    alert('Mempersiapkan dokumen template spreadsheet laporan DFW...');
  };

  const handleSaveBeneficiaryForm = (benData: Partial<Beneficiary>) => {
    if (selectedBen) {
      // Editing
      const updated = beneficiaries.map((b) => (b.id === selectedBen.id ? { ...b, ...benData } : b));
      updateBeneficiariesInStorage(updated);
    } else {
      // Creation
      const newBen: Beneficiary = {
        id: `ben-${Date.now()}`,
        name: benData.name || '',
        phone: benData.phone,
        gender: benData.gender || 'Laki-laki',
        birthyear: benData.birthyear,
        location: benData.location,
        occupation: benData.occupation,
        email: benData.email,
        note: benData.note,
        registrations: benData.registrations || [],
      };
      updateBeneficiariesInStorage([...beneficiaries, newBen]);
    }

    setIsBenModalOpen(false);
    setSelectedBen(undefined);
    setSyncToast('success');
    setTimeout(() => setSyncToast(''), 3000);
  };

  const handleImportSuccessCallback = (importedProjects: Project[], importedIndicators: Indicator[]) => {
    updateProjectsInStorage([...projects, ...importedProjects]);
    updateIndicatorsInStorage([...indicators, ...importedIndicators]);
    setSyncToast('success');
    setTimeout(() => setSyncToast(''), 3000);
  };

  const handleGeneratePrintOutput = (lang: 'id' | 'en', from: string, to: string) => {
    const proj = projects.find((p) => isIdMatch(p.id, selectedProjectId));
    if (!proj) {
      alert(lang === 'id' ? 'Proyek tidak ditemukan.' : 'Project not found.');
      return;
    }

    const isID = lang === 'id';

    function formatPdfText(text: string | undefined | null): string {
      if (!text) return '';
      const lines = text.split('\n');
      let html = '';
      let currentListType: 'ul' | 'ol' | null = null;

      const closeList = () => {
        if (currentListType === 'ul') {
          html += '</ul>';
        } else if (currentListType === 'ol') {
          html += '</ol>';
        }
        currentListType = null;
      };

      lines.forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed) {
          closeList();
          return;
        }

        const bulletMatch = trimmed.match(/^[-*•+]\s+(.*)/);
        const numberMatch = trimmed.match(/^(\d+)[.)]\s+(.*)/);

        if (bulletMatch) {
          if (currentListType !== 'ul') {
            closeList();
            html += '<ul style="margin: 4px 0 4px 16px; padding-left: 0; list-style-type: disc;">';
            currentListType = 'ul';
          }
          html += `<li style="margin-bottom: 3px; line-height: 1.4;">${bulletMatch[1]}</li>`;
        } else if (numberMatch) {
          if (currentListType !== 'ol') {
            closeList();
            html += '<ol style="margin: 4px 0 4px 16px; padding-left: 0; list-style-type: decimal;">';
            currentListType = 'ol';
          }
          html += `<li style="margin-bottom: 3px; line-height: 1.4;">${numberMatch[2]}</li>`;
        } else {
          closeList();
          html += `<p style="margin: 4px 0; line-height: 1.4;">${trimmed}</p>`;
        }
      });

      closeList();
      return html;
    }
    
    // Date Range calculation
    const fromDateObj = from ? new Date(from + 'T00:00:00') : null;
    const toDateObj = to ? new Date(to + 'T23:59:59') : null;

    const fromMs = fromDateObj?.getTime() || null;
    const toMs = toDateObj?.getTime() || null;

    const fromStr = fromDateObj ? fromDateObj.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : '';
    const toStr = toDateObj ? toDateObj.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : '';

    const fromStrEN = fromDateObj ? fromDateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : '';
    const toStrEN = toDateObj ? toDateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : '';

    const periodLabel = fromDateObj && toDateObj
      ? (isID ? `Periode: ${fromStr} – ${toStr}` : `Period: ${fromStrEN} – ${toStrEN}`)
      : (isID ? 'Semua Data' : 'All Data');

    // 1. Filter Indicators
    const projectIndicators = indicators.filter((i) => isIdMatch(i.projectId, proj.id));

    // 2. Filter Activities
    const projectActivities = activities.filter((a) => isIdMatch(a.projectId, proj.id));
    
    // Filtered by range: we consider it in range if start date <= to and due date >= from
    const rangedActivities = projectActivities.filter((act) => {
      if (!fromMs || !toMs) return true;
      const sd = act.startDate ? new Date(act.startDate + 'T00:00:00').getTime() : null;
      const dd = act.dueDate ? new Date(act.dueDate + 'T23:59:59').getTime() : null;
      const inRange = !sd || (sd <= toMs && (!dd || dd >= fromMs));
      return inRange;
    });

    // Outcomes
    const projectOutcomes = outcomes.filter((o) => isIdMatch(o.projectId, proj.id));

    // Reflections (Lesson Learned)
    const projectReflections = reflections.filter((r) => isIdMatch(r.projectId, proj.id));

    // Dynamic stats
    // Indicator progress average
    let avgInd = null;
    if (projectIndicators.length) {
      avgInd = Math.round(
        projectIndicators.reduce((sum, ind) => {
          const t = ind.target || 0;
          const a = ind.current || 0;
          return sum + (t > 0 ? Math.min(Math.round((a / t) * 100), 100) : 0);
        }, 0) / projectIndicators.length
      );
    }

    // Activity progress average
    let avgAct = null;
    if (rangedActivities.length) {
      avgAct = Math.round(
        rangedActivities.reduce((sum, act) => sum + (act.progress || 0), 0) / rangedActivities.length
      );
    }

    // Overall progress
    let overall = 0;
    if (avgInd !== null && avgAct !== null) {
      overall = Math.round((avgInd + avgAct) / 2);
    } else if (avgInd !== null) {
      overall = avgInd;
    } else if (avgAct !== null) {
      overall = avgAct;
    }

    const doneInd = projectIndicators.filter((i) => {
      const a = i.current || 0;
      const t = i.target || 0;
      return t > 0 && a >= t;
    }).length;

    const doneAct = rangedActivities.filter((a) => a.status === 'Selesai').length;

    const budAppr = proj.budgetApproved || 0;
    const budActFinal = proj.budgetActual || 0;
    const budLeft = budAppr - budActFinal;
    const budPct = budAppr > 0 ? Math.min(Math.round((budActFinal / budAppr) * 100), 100) : 0;

    // Aggregate impact chips
    const impG: { [key: string]: { unit: string; total: number } } = {};
    projectIndicators.forEach((ind) => {
      const ru = (ind.unit || '').trim();
      if (!ru) return;
      const k = ru.toLowerCase();
      const av = ind.current || 0;
      if (!impG[k]) impG[k] = { unit: ru, total: 0 };
      impG[k].total += av;
    });
    const impEntries = Object.entries(impG).sort((a, b) => b[1].total - a[1].total);

    // Labels translation dictionary
    const L = isID ? {
      org: 'DFW Indonesia — Program Monitoring & Evaluation',
      reportType: 'LAPORAN KEMAJUAN PROYEK',
      printedOn: 'Dicetak pada',
      sec_info: 'INFORMASI PROYEK',
      sec_summary: 'RINGKASAN KEMAJUAN',
      sec_goal: 'GOAL & OUTCOMES PROGRAM',
      sec_ind: 'CAPAIAN INDIKATOR KINERJA',
      sec_act: 'AKTIVITAS PELAKSANAAN',
      sec_hambatan: 'HAMBATAN & TANTANGAN PELAKSANAAN',
      sec_rtl: 'LESSON LEARNED & REFLEKSI',
      sec_budget: 'REALISASI ANGGARAN',
      sec_impact: 'DAMPAK PROGRAM',
      overallProg: 'Progress Keseluruhan',
      avgInd: 'Rata-rata Indikator',
      avgAct: 'Rata-rata Aktivitas',
      budAbsorption: 'Penyerapan Anggaran',
      indDone: 'Indikator Tercapai',
      actDone: 'Aktivitas Selesai',
      status: 'Status', location: 'Lokasi', owner: 'Penanggung Jawab',
      donor: 'Donor/Mitra', start: 'Tanggal Mulai', deadline: 'Deadline',
      desc: 'Deskripsi', goal: 'Goal', outcomes: 'Outcomes',
      indName: 'Nama Indikator', type: 'Tipe', target: 'Target',
      actual: 'Realisasi', pct: 'Capaian', lastNote: 'Catatan Terakhir',
      actTitle: 'Judul Aktivitas', pic: 'PIC', startAct: 'Mulai', dueAct: 'Deadline',
      actStatus: 'Status', actProg: 'Progress', actNotes: 'Hambatan/Tantangan',
      budAppr: 'Anggaran Disetujui', budAct: 'Realisasi', budLeft: 'Sisa',
      date: 'Tanggal', updBy: 'Diperbarui Oleh', amount: 'Jumlah', note: 'Keterangan',
      noHambatan: 'Tidak ada hambatan/tantangan yang dicatat untuk aktivitas ini.',
      noRTL: 'Tidak ada catatan refleksi atau pelajaran relevan yang dihimpun dalam range tanggal ini.',
      noActData: 'Belum ada aktivitas.',
      noIndData: 'Belum ada indikator.',
      footerNote: 'Laporan ini digenerate otomatis oleh sistem PMIS DFW Indonesia',
      pageOf: 'Halaman',
      hambatanDesc: 'Dihimpun dari catatan tantangan & hambatan yang dicatat pada setiap aktivitas pelaksanaan.',
      rtlDesc: 'Rangkuman pembelajaran (lesson learned), success story, hambatan utama, dan rekomendasi tindak lanjut.',
      rtlIndProg: 'Capaian saat ini',
    } : {
      org: 'DFW Indonesia — Program Monitoring & Evaluation',
      reportType: 'PROJECT PROGRESS REPORT',
      printedOn: 'Printed on',
      sec_info: 'PROJECT INFORMATION',
      sec_summary: 'PROGRESS SUMMARY',
      sec_goal: 'PROGRAM GOAL & OUTCOMES',
      sec_ind: 'KEY PERFORMANCE INDICATORS',
      sec_act: 'IMPLEMENTATION ACTIVITIES',
      sec_hambatan: 'CHALLENGES & OBSTACLES',
      sec_rtl: 'LESSON LEARNED & REFLECTION',
      sec_budget: 'BUDGET REALIZATION',
      sec_impact: 'PROGRAM IMPACT',
      overallProg: 'Overall Progress',
      avgInd: 'Avg. Indicators',
      avgAct: 'Avg. Activities',
      budAbsorption: 'Budget Absorption',
      indDone: 'Indicators Achieved',
      actDone: 'Activities Completed',
      status: 'Status', location: 'Location', owner: 'Person in Charge',
      donor: 'Donor/Partner', start: 'Start Date', deadline: 'Deadline',
      desc: 'Description', goal: 'Goal', outcomes: 'Outcomes',
      indName: 'Indicator Name', type: 'Type', target: 'Target',
      actual: 'Actual', pct: 'Achievement', lastNote: 'Last Note',
      actTitle: 'Activity Title', pic: 'PIC', startAct: 'Start', dueAct: 'Deadline',
      actStatus: 'Status', actProg: 'Progress', actNotes: 'Challenges/Obstacles',
      budAppr: 'Approved Budget', budAct: 'Realization', budLeft: 'Remaining',
      date: 'Date', updBy: 'Updated By', amount: 'Amount', note: 'Note',
      noHambatan: 'No challenges or obstacles have been recorded for this activity.',
      noRTL: 'No reflections or lessons learned have been recorded in this range.',
      noActData: 'No activities yet.',
      noIndData: 'No indicators yet.',
      footerNote: 'This report is auto-generated by the PMIS DFW Indonesia system',
      pageOf: 'Page',
      hambatanDesc: 'Compiled from challenges & obstacles notes recorded on each implementation activity.',
      rtlDesc: 'Summary of lessons learned, success stories, key challenges, and recommendation next steps.',
      rtlIndProg: 'Current achievement',
    };

    // Styling generator functions
    const _statusColor = (s: string) => {
      const map: { [key: string]: string } = {
        'Selesai': '#16a34a',
        'Sedang Berjalan': '#2563eb',
        'Sedang Dikerjakan': '#2563eb',
        'On Track': '#2563eb',
        'Aktif': '#16a34a',
        'Terlambat': '#dc2626',
        'Tertunda': '#d97706',
        'Belum Mulai': '#94a3b8',
        'Ditangguhkan': '#94a3b8',
      };
      return map[s] || '#64748b';
    };

    const _pctColor = (p: number) => {
      if (p >= 85) return '#16a34a';
      if (p >= 60) return '#2563eb';
      if (p >= 35) return '#d97706';
      return '#dc2626';
    };

    const _pctLabel = (p: number) => {
      if (p >= 85) return isID ? 'Sangat Baik' : 'Excellent';
      if (p >= 60) return isID ? 'Baik' : 'Good';
      if (p >= 35) return isID ? 'Sedang' : 'Fair';
      return isID ? 'Perlu Perhatian' : 'Needs Action';
    };

    const _impactIcon = (u: string) => {
      u = u.toLowerCase();
      if (['orang', 'jiwa', 'nelayan', 'peserta', 'perempuan', 'laki-laki', 'anak', 'pekerja', 'buruh', 'anggota', 'komunitas', 'keluarga', 'people', 'beneficiar', 'fisher', 'member'].some(k => u.includes(k))) return '👥';
      if (['dokumen', 'laporan', 'modul', 'publikasi', 'panduan', 'kebijakan', 'regulasi', 'document', 'report', 'module', 'policy'].some(k => u.includes(k))) return '📄';
      if (['kapal', 'perahu', 'alat', 'unit', 'ship', 'boat', 'vessel'].some(k => u.includes(k))) return '🚢';
      if (['hektar', 'ha', 'km', 'wilayah', 'desa', 'kawasan', 'area', 'village', 'hectare'].some(k => u.includes(k))) return '🗺️';
      if (['kegiatan', 'event', 'pelatihan', 'workshop', 'pertemuan', 'sosialisasi', 'activity', 'training'].some(k => u.includes(k))) return '📅';
      if (['kg', 'ton', 'gram', 'kwintal', 'weight'].some(k => u.includes(k))) return '⚖️';
      if (['mou', 'perjanjian', 'kontrak', 'kesepakatan', 'agreement', 'contract'].some(k => u.includes(k))) return '🤝';
      return '🎯';
    };

    const _rptDate = (d: string | undefined) => {
      if (!d) return '—';
      return new Date(d + 'T00:00:00').toLocaleDateString(isID ? 'id-ID' : 'en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    };

    const _toRupiah = (val: number) => {
      return 'Rp ' + val.toLocaleString('id-ID');
    };

    const pbarHtml = (pct: number, color?: string) => {
      const c = color || _pctColor(pct);
      const w = Math.min(pct, 100);
      return `
        <span class="pbar">
          <span class="pbar-track"><span class="pbar-fill" style="width: ${w}%; background: ${c}"></span></span>
          <span class="pbar-pct" style="color: ${c}">${pct}%</span>
        </span>
      `;
    };

    const overallC = _pctColor(overall);

    // Style elements CSS
    const cssStyle = `
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: 'Segoe UI', system-ui, Arial, sans-serif; font-size: 10pt; color: #1e293b; background: #f8fafc; line-height: 1.5; }
      @page { size: A4 portrait; margin: 15mm 14mm 18mm 14mm; }
      @media print {
        body { background: #fff !important; font-size: 9.5pt; }
        .no-print { display: none !important; }
        .page-break { page-break-before: always; }
        .avoid-break { page-break-inside: avoid; }
        .section-card { box-shadow: none !important; border: 1px solid #e2e8f0 !important; }
        .cover-header { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        thead { display: table-header-group; }
        tr { page-break-inside: avoid; }
      }

      /* Float action bar */
      .print-bar { position: fixed; bottom: 24px; right: 24px; z-index: 9999; display: flex; gap: 10px; filter: drop-shadow(0 4px 16px rgba(0,0,0,.18)); }
      .btn-print { background: linear-gradient(135deg,#2563eb,#1d4ed8); color: #fff; border: none; padding: 12px 26px; border-radius: 12px; font-size: 13px; font-weight: 700; cursor: pointer; letter-spacing: .3px; transition: transform .15s; }
      .btn-print:hover { transform: translateY(-2px); }
      .btn-close { background: #fff; color: #64748b; border: 1.5px solid #e2e8f0; padding: 12px 18px; border-radius: 12px; font-size: 13px; font-weight: 600; cursor: pointer; }
      .btn-close:hover { background: #f1f5f9; }

      /* Page container */
      .page { max-width: 820px; margin: 0 auto; padding: 24px 20px 60px; }

      /* Cover Header Banner */
      .cover-header { background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 60%, #1d4ed8 100%); border-radius: 16px; padding: 32px 36px 28px; color: #fff; margin-bottom: 24px; position: relative; overflow: hidden; }
      .cover-header::before { content: ''; position: absolute; top: -40px; right: -40px; width: 220px; height: 220px; background: rgba(255,255,255,.06); border-radius: 50%; }
      .cover-org-badge { display: inline-block; background: rgba(255,255,255,.18); backdrop-filter: blur(8px); border: 1px solid rgba(255,255,255,.25); border-radius: 8px; padding: 4px 14px; font-size: 9.5pt; font-weight: 600; letter-spacing: .5px; margin-bottom: 16px; }
      .cover-type { font-size: 9.5pt; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; opacity: .8; margin-bottom: 6px; }
      .cover-title { font-size: 19pt; font-weight: 800; line-height: 1.25; margin-bottom: 16px; position: relative; z-index: 1; text-shadow: 0 1px 3px rgba(0,0,0,0.2); }
      .cover-period-badge { display: inline-block; background: rgba(255,255,255,.12); color: #fff; font-size: 9pt; font-weight: 700; letter-spacing: .4px; padding: 4px 12px; border-radius: 20px; margin-bottom: 12px; border: 1px solid rgba(255,255,255,.2); }
      .cover-meta-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px 24px; background: rgba(255,255,255,.08); border-radius: 10px; padding: 12px 16px; backdrop-filter: blur(6px); position: relative; z-index: 1; border: 1px solid rgba(255,255,255,0.06); }
      .cover-meta-item { display: flex; flex-direction: column; gap: 1px; }
      .cover-meta-label { font-size: 8pt; opacity: .7; text-transform: uppercase; letter-spacing: .5px; font-weight: 700; }
      .cover-meta-value { font-size: 9.5pt; font-weight: 600; }
      .cover-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 18px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,.15); font-size: 8.5pt; opacity: .8; position: relative; z-index: 1; }

      /* Summary stats */
      .stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
      .stat-card { background: #fff; border-radius: 14px; padding: 16px 14px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,.05); border: 1px solid #f1f5f9; }
      .stat-val { font-size: 20pt; font-weight: 800; line-height: 1.1; }
      .stat-bar { height: 5px; border-radius: 4px; background: #e2e8f0; margin: 8px 6px 0; overflow: hidden; }
      .stat-bar-fill { height: 5px; border-radius: 4px; }
      .stat-label { font-size: 8.5pt; color: #64748b; margin-top: 5px; font-weight: 600; }

      /* Section card */
      .section-card { background: #fff; border-radius: 14px; padding: 20px 22px; margin-bottom: 18px; box-shadow: 0 1px 4px rgba(0,0,0,.04); border: 1px solid #f1f5f9; }
      .sec-head { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; padding-bottom: 10px; border-bottom: 2px solid #f8fafc; }
      .sec-icon { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 14pt; flex-shrink: 0; }
      .sec-title-text { font-size: 11pt; font-weight: 800; color: #0f172a; letter-spacing: .1px; text-transform: uppercase; }
      .sec-badge { margin-left: auto; font-size: 8.5pt; font-weight: 700; color: #475569; background: #f1f5f9; border-radius: 20px; padding: 2px 10px; }

      /* Goal/outcome box */
      .goal-box { border-radius: 10px; padding: 12px 16px; margin-bottom: 10px; border: 1px solid; }
      .goal-label { font-size: 8.5pt; font-weight: 800; letter-spacing: .6px; text-transform: uppercase; margin-bottom: 6px; }
      .outcome-ol { padding-left: 18px; margin: 0; }
      .outcome-ol li { font-size: 9.5pt; margin-bottom: 4px; line-height: 1.5; color: #334155; }

      /* Data table */
      .tbl { width: 100%; border-collapse: collapse; font-size: 9.5pt; margin-top: 6px; }
      .tbl th { background: #1e293b; color: #fff; padding: 8px 10px; font-weight: 600; font-size: 8.5pt; text-align: left; }
      .tbl th:first-child { border-radius: 6px 0 0 0; }
      .tbl th:last-child { border-radius: 0 6px 0 0; }
      .tbl td { padding: 8px 10px; border-bottom: 1px solid #f1f5f9; vertical-align: top; color: #334155; }
      .tbl tr:nth-child(even) td { background: #f8fafc; }
      .tbl tfoot td { background: #f1f5f9 !important; font-weight: 700; border-top: 2px solid #cbd5e1; }
      .tbl .num { text-align: right; }
      .tbl .ctr { text-align: center; }

      /* Progress bar */
      .pbar { display: inline-flex; align-items: center; gap: 6px; min-width: 100px; }
      .pbar-track { width: 60px; height: 7px; background: #e2e8f0; border-radius: 4px; overflow: hidden; flex-shrink: 0; }
      .pbar-fill { height: 7px; border-radius: 4px; }
      .pbar-pct { font-size: 8.5pt; font-weight: 700; min-width: 30px; }

      /* Status Badge */
      .badge { display: inline-block; padding: 2px 10px; border-radius: 20px; font-size: 8pt; font-weight: 700; white-space: nowrap; }

      /* Hambatan cards */
      .hambatan-list { display: flex; flex-direction: column; gap: 10px; }
      .hambatan-card { border-radius: 10px; padding: 12px 16px; border-left: 4px solid #f59e0b; background: #fffbeb; border-top: 1px solid #fef3c7; border-bottom: 1px solid #fef3c7; border-right: 1px solid #fef3c7; }
      .hambatan-act-title { font-size: 9.5pt; font-weight: 800; color: #92400e; margin-bottom: 6px; display: flex; align-items: center; gap: 6px; }
      .hambatan-notes { display: flex; flex-direction: column; gap: 5px; }
      .hambatan-note-item { display: flex; gap: 8px; align-items: flex-start; margin-bottom: 6px; }
      .hambatan-note-dot { width: 6px; height: 6px; border-radius: 50%; background: #f59e0b; flex-shrink: 0; margin-top: 5px; }
      .hambatan-note-text { font-size: 9.5pt; color: #1e293b; line-height: 1.4; flex: 1; }
      .hambatan-note-meta { font-size: 8pt; color: #94a3b8; margin-top: 1px; font-weight: 600; }
      .hambatan-empty { font-size: 9.5pt; color: #94a3b8; font-style: italic; padding: 10px 0; }

      /* RTL cards / Reflections */
      .rtl-list { display: flex; flex-direction: column; gap: 10px; }
      .rtl-card { border-radius: 10px; padding: 12px 16px; border-left: 4px solid #3b82f6; background: #f0f7ff; border-top: 1px solid #dbeafe; border-bottom: 1px solid #dbeafe; border-right: 1px solid #dbeafe; }
      .rtl-ind-title { font-size: 9.5pt; font-weight: 800; color: #1e40af; margin-bottom: 6px; display: flex; align-items: center; gap: 6px; }
      .rtl-type-badge { font-size: 8pt; background: #dbeafe; color: #1d4ed8; border-radius: 20px; padding: 1px 8px; font-weight: 700; text-transform: uppercase; }
      .rtl-notes { display: flex; flex-direction: column; gap: 5px; }
      .rtl-note-item { display: flex; gap: 8px; align-items: flex-start; }
      .rtl-note-dot { width: 6px; height: 6px; border-radius: 50%; background: #3b82f6; flex-shrink: 0; margin-top: 5px; }
      .rtl-note-text { font-size: 9.5pt; color: #1e293b; line-height: 1.4; flex: 1; }
      .rtl-note-meta { font-size: 8pt; color: #94a3b8; margin-top: 1px; font-weight: 600; }

      /* Budget details */
      .budget-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 14px; }
      .bud-card { border-radius: 12px; padding: 14px 16px; border: 1px solid #e2e8f0; background: #f8fafc; }
      .bud-card-label { font-size: 8.5pt; color: #64748b; font-weight: 700; margin-bottom: 4px; text-transform: uppercase; }
      .bud-card-val { font-size: 13pt; font-weight: 800; color: #0f172a; line-height: 1.1; }
      .bud-card-sub { font-size: 8.5pt; color: #f59e0b; margin-top: 4px; font-weight: 700; }

      /* Impact chips */
      .impact-chips { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 4px; }
      .imp-chip { background: #f0fdf4; border: 1.5px solid #86efac; border-radius: 12px; padding: 10px 16px; text-align: center; min-width: 105px; flex: 1; }
      .imp-icon { font-size: 18pt; line-height: 1; margin-bottom: 2px; }
      .imp-val { font-size: 13pt; font-weight: 800; color: #15803d; margin: 2px 0; }
      .imp-unit { font-size: 8.5pt; color: #166534; font-weight: 700; text-transform: uppercase; }

      .rpt-footer { margin-top: 28px; padding-top: 14px; border-top: 1.5px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 6px; font-size: 8.5pt; color: #94a3b8; }
      .rpt-footer-brand { font-weight: 700; color: #1d4ed8; font-size: 9pt; }
    `;

    // Cover Page Block HTML
    const coverPageHtml = `
      <div class="cover-header avoid-break">
        <div class="cover-org-badge">🏢 ${L.org}</div>
        <div class="cover-type">${L.reportType}</div>
        <div class="cover-period-badge">📅 ${periodLabel}</div>
        <div class="cover-title">${proj.name}</div>
        <div class="cover-meta-grid">
          ${proj.location ? `<div class="cover-meta-item"><span class="cover-meta-label">${L.location}</span><span class="cover-meta-value">${proj.location}</span></div>` : ''}
          ${proj.owner ? `<div class="cover-meta-item"><span class="cover-meta-label">${L.owner}</span><span class="cover-meta-value">${proj.owner}</span></div>` : ''}
          ${proj.donor ? `<div class="cover-meta-item"><span class="cover-meta-label">${L.donor}</span><span class="cover-meta-value">${proj.donor}</span></div>` : ''}
          ${proj.startDate ? `<div class="cover-meta-item"><span class="cover-meta-label">${L.start}</span><span class="cover-meta-value">${_rptDate(proj.startDate)}</span></div>` : ''}
          ${proj.deadline ? `<div class="cover-meta-item"><span class="cover-meta-label">${L.deadline}</span><span class="cover-meta-value">${_rptDate(proj.deadline)}</span></div>` : ''}
          <div class="cover-meta-item"><span class="cover-meta-label">${L.status}</span><span class="cover-meta-value">${proj.status || '—'}</span></div>
        </div>
        <div class="cover-footer">
          <span>${L.printedOn}: ${new Date().toLocaleString(isID ? 'id-ID' : 'en-GB')}</span>
          <span style="font-size: 15pt; font-weight: 950; opacity: .95">${overall}% <span style="font-size: 9pt; opacity: .8; font-weight: 600">${_pctLabel(overall)}</span></span>
        </div>
      </div>
    `;

    // Stats Section Block HTML
    const statsSectionHtml = `
      <div class="stats-row avoid-break">
        <div class="stat-card">
          <div class="stat-val" style="color: ${overallC}">${overall}%</div>
          <div class="stat-bar"><div class="stat-bar-fill" style="width: ${Math.min(overall, 100)}%; background: ${overallC}"></div></div>
          <div class="stat-label">${L.overallProg}</div>
        </div>
        <div class="stat-card">
          <div class="stat-val" style="color: ${_pctColor(avgInd ?? 0)}">${avgInd !== null ? avgInd + '%' : '—'}</div>
          ${avgInd !== null ? `<div class="stat-bar"><div class="stat-bar-fill" style="width: ${Math.min(avgInd, 100)}%; background: ${_pctColor(avgInd)}"></div></div>` : '<div style="height:5px;margin:8px 6px 0"></div>'}
          <div class="stat-label">${L.avgInd}</div>
        </div>
        <div class="stat-card">
          <div class="stat-val" style="color: ${_pctColor(avgAct ?? 0)}">${avgAct !== null ? avgAct + '%' : '—'}</div>
          ${avgAct !== null ? `<div class="stat-bar"><div class="stat-bar-fill" style="width: ${Math.min(avgAct, 100)}%; background: ${_pctColor(avgAct)}"></div></div>` : '<div style="height:5px;margin:8px 6px 0"></div>'}
          <div class="stat-label">${L.avgAct}</div>
        </div>
        <div class="stat-card" style="display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 4px; padding: 10px;">
          <div style="font-weight: 800; font-size: 11px; color: #475569;">${L.indDone}</div>
          <div style="font-size: 13pt; font-weight: 950; color: #1d4ed8;">${doneInd} / ${projectIndicators.length}</div>
          <div style="font-weight: 800; font-size: 11px; color: #475569; border-top: 1px solid #f1f5f9; width: 100%; padding-top: 3px; margin-top: 2px;">${L.actDone}</div>
          <div style="font-size: 13pt; font-weight: 950; color: #16a34a;">${doneAct} / ${rangedActivities.length}</div>
        </div>
      </div>
    `;

    // Goals and outcomes Box Block HTML
    const hasGoal = !!proj.goal;
    const hasOut = projectOutcomes.length > 0;
    const hasDesc = !!proj.desc;
    const goalsSectionHtml = (hasGoal || hasOut || hasDesc) ? `
      <div class="section-card avoid-break">
        ${secHead('🎯', L.sec_goal, '#7c3aed')}
        ${hasDesc ? `<div style="font-size: 9.5pt; color: #475569; margin-bottom: 12px; line-height: 1.6; font-style: italic;">${formatPdfText(proj.desc)}</div>` : ''}
        ${hasGoal ? `
          <div class="goal-box" style="background: #f0f7ff; border-color: #bfdbfe; border-radius: 10px;">
            <div class="goal-label" style="color: #1e40af;">${L.goal}</div>
            <div style="font-size: 9.5pt; color: #1e3a8a; line-height: 1.5; font-weight: 500;">${formatPdfText(proj.goal)}</div>
          </div>
        ` : ''}
        ${hasOut ? `
          <div class="goal-box" style="background: #f5f3ff; border-color: #ddd6fe; margin-bottom: 0; border-radius: 10px;">
            <div class="goal-label" style="color: #6d28d9;">${L.outcomes}</div>
            <ol class="outcome-ol">${[...projectOutcomes].sort((a, b) => {
              const getNum = (title: string) => {
                const match = title.match(/Outcome\s*(\d+)/i) || title.match(/(\d+)/);
                return match ? parseInt(match[1], 10) : 999999;
              };
              const numA = getNum(a.title);
              const numB = getNum(b.title);
              if (numA !== numB) return numA - numB;
              return a.id.localeCompare(b.id);
            }).map(o => `<li>${o.title}</li>`).join('')}</ol>
          </div>
        ` : ''}
      </div>
    ` : '';

    // Indicators Table Block HTML
    const indRowsHtml = projectIndicators.map((ind, i) => {
      const a = ind.current || 0;
      const tg = ind.target || 0;
      const pct = tg > 0 ? Math.min(Math.round((a / tg) * 100), 999) : 0;
      const c = _pctColor(pct);
      return `
        <tr>
          <td class="ctr" style="font-weight: 700; color: #64748b;">${i + 1}</td>
          <td>
            <strong style="color: #0f172a;">${ind.title}</strong>
          </td>
          <td class="ctr"><span style="font-size: 8pt; background: #f1f5f9; border: 1px solid #e2e8f0; color: #475569; border-radius: 20px; padding: 2px 8px; font-weight: 700; text-transform: uppercase;">Output</span></td>
          <td class="num font-bold" style="font-weight: 700;">${tg.toLocaleString('id-ID')} <span style="color:#94a3b8; font-size: 8pt; font-weight: 500;">${ind.unit || ''}</span></td>
          <td class="num" style="font-weight: 750;"><strong style="color: ${c}">${a.toLocaleString('id-ID')}</strong> <span style="color:#94a3b8; font-size: 8pt; font-weight: 500;">${ind.unit || ''}</span></td>
          <td>${pbarHtml(pct, c)}</td>
          <td style="font-size: 8.5pt; color: #475569; line-height: 1.4;">
            ${ind.notes ? `
              <div style="font-weight: 500; font-style: italic; color: #334155;">${formatPdfText(ind.notes)}</div>
              ${ind.notesUpdatedAt ? `<div style="font-size: 7.5pt; color: #94a3b8; font-weight: bold; margin-top: 4px; font-style: normal; text-transform: uppercase; letter-spacing: 0.05em;">⏱️ ${ind.notesUpdatedAt}</div>` : ''}
            ` : `
              <span style="color: #94a3b8; font-style: italic;">Tidak ada catatan</span>
              ${ind.lastUpdated ? `<div style="font-size: 7.5pt; color: #cbd5e1; font-weight: bold; margin-top: 4px; font-style: normal;">⏱️ ${_rptDate(ind.lastUpdated)}</div>` : ''}
            `}
          </td>
        </tr>
      `;
    }).join('');

    const indicatorsSectionHtml = projectIndicators.length ? `
      <div class="section-card page-break">
        ${secHead('📊', L.sec_ind, '#2563eb', projectIndicators.length + ' Indikator')}
        <table class="tbl">
          <thead>
            <tr>
              <th class="ctr" style="width: 28px">#</th>
              <th>${L.indName}</th>
              <th class="ctr" style="width: 70px">${L.type}</th>
              <th class="num" style="width: 90px">${L.target}</th>
              <th class="num" style="width: 90px">${L.actual}</th>
              <th style="width: 100px">${L.pct}</th>
              <th style="width: 180px">${L.lastNote}</th>
            </tr>
          </thead>
          <tbody>${indRowsHtml}</tbody>
          <tfoot>
            <tr>
              <td colspan="5" style="text-align: right; color: #1e459c; font-weight: 800;">${L.avgInd}:</td>
              <td colspan="2">${pbarHtml(avgInd ?? 0)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    ` : '';

    // Activities Table Block HTML
    const actRowsHtml = rangedActivities.map((act, i) => {
      const c = _statusColor(act.status);
      const prog = act.progress || 0;
      const notesHtml = act.notes && act.notes.length > 0
        ? act.notes.slice(-2).map(n => `
            <div style="display: flex; gap: 4px; align-items: flex-start; margin-bottom: 3px;">
              <span style="color: #f59e0b; flex-shrink: 0; font-size: 8.5pt;">⚠️</span>
              <span style="font-size: 8.5pt; color: #92400e; line-height: 1.3;">${n.text} <em style="color:#94a3b8; font-size: 7.5pt;">(${n.author})</em></span>
            </div>
          `).join('')
        : `<span style="color: #94a3b8; font-size: 8.5pt; font-style: italic;">—</span>`;

      return `
        <tr>
          <td class="ctr" style="font-weight: 700; color: #64748b;">${i + 1}</td>
          <td>
            <strong style="color: #0f172a;">${act.title}</strong>
            ${act.desc ? `<div style="font-size: 8.5pt; color: #64748b; margin-top: 2px;">${act.desc}</div>` : ''}
          </td>
          <td style="font-size: 8.5pt; font-weight: 600; color: #475569;">${act.pic || '—'}</td>
          <td class="ctr">${badge(act.status, c)}</td>
          <td class="ctr"><strong style="font-size: 10.5pt; color: ${c}; font-weight: 800;">${prog}%</strong></td>
          <td>${notesHtml}</td>
        </tr>
      `;
    }).join('');

    const activitiesSectionHtml = projectActivities.length ? `
      <div class="section-card page-break">
        ${secHead('📋', L.sec_act, '#0891b2', rangedActivities.length + ' Aktivitas')}
        <table class="tbl">
          <thead>
            <tr>
              <th class="ctr" style="width: 28px">#</th>
              <th>${L.actTitle}</th>
              <th style="width: 100px">${L.pic}</th>
              <th class="ctr" style="width: 85px">${L.actStatus}</th>
              <th class="ctr" style="width: 60px">${L.actProg}</th>
              <th style="min-width: 170px;">${L.actNotes}</th>
            </tr>
          </thead>
          <tbody>${actRowsHtml}</tbody>
          <tfoot>
            <tr>
              <td colspan="4" style="text-align: right; color: #1e459c; font-weight: 800;">${L.avgAct}:</td>
              <td class="ctr"><strong style="font-size: 11pt; color: ${_pctColor(avgAct ?? 0)}; font-weight: 800;">${avgAct ?? 0}%</strong></td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    ` : '';

    // Challenges & Obstacles Section (hambatan-card) Block HTML
    const actsWithNotes = rangedActivities.filter((a) => a.notes && a.notes.length > 0);
    const hambatanCardsHtml = actsWithNotes.length
      ? actsWithNotes.map((act) => {
          const notesItems = act.notes.map((n) => `
            <div class="hambatan-note-item">
              <div class="hambatan-note-dot"></div>
              <div>
                <div class="hambatan-note-text" style="font-weight: 500;">${n.text}</div>
                <div class="hambatan-note-meta">${_rptDate(n.date)} · ${n.author}</div>
              </div>
            </div>
          `).join('');
          return `
            <div class="hambatan-card">
              <div class="hambatan-act-title">
                <span style="background: #fef3c7; color: #92400e; border-radius: 6px; padding: 2px 7px; font-size: 8pt; font-weight: 700;">Aktivitas</span>
                ${act.title}
              </div>
              <div class="hambatan-notes">${notesItems}</div>
            </div>
          `;
        }).join('')
      : `<div class="hambatan-empty">${L.noHambatan}</div>`;

    const challengesSectionHtml = `
      <div class="section-card page-break avoid-break">
        ${secHead('⚠️', L.sec_hambatan, '#f59e0b', actsWithNotes.length + ' Aktivitas')}
        <p style="font-size: 9pt; color: #64748b; margin-bottom: 14px; font-style: italic; font-weight: 500;">${L.hambatanDesc}</p>
        <div class="hambatan-list">${hambatanCardsHtml}</div>
      </div>
    `;

    // Lesson learned & Reflection Section (ProjectReflections / project-reflections) Block HTML
    const projectReflectionsInRange = projectReflections.filter((r) => {
      if (!fromMs || !toMs) return true;
      const t = new Date(r.date + 'T00:00:00').getTime();
      return t >= fromMs && t <= toMs;
    });

    const reflectionCardsHtml = projectReflectionsInRange.length > 0
      ? projectReflectionsInRange.map((ref) => {
          let typeColor = '#3b82f6';
          let typeLabel = 'Lesson Learned';
          if (ref.type === 'success') {
            typeColor = '#16a34a';
            typeLabel = isID ? 'Keberhasilan' : 'Success Story';
          } else if (ref.type === 'challenge') {
            typeColor = '#f59e0b';
            typeLabel = isID ? 'Tantangan' : 'Challenge';
          } else if (ref.type === 'recommendation') {
            typeColor = '#7c3aed';
            typeLabel = isID ? 'Rekomendasi' : 'Recommendation';
          }

          let innerContent = `
            <div style="font-size: 9.5pt; color: #1e293b; margin-bottom: 8px; line-height: 1.45;">
              <strong>💡 ${isID ? 'Pelajaran Utama' : 'Key Lesson Learned'}:</strong>
              <div style="margin-top: 4px; padding-left: 4px; font-weight: 500;">${formatPdfText(ref.lesson)}</div>
            </div>
          `;
          if (ref.whatHappened) {
            innerContent += `
              <div style="font-size: 9pt; color: #334155; margin-bottom: 8px; line-height: 1.45;">
                <strong>📝 ${isID ? 'Apa yang Terjadi / Konteks' : 'What Happened / Context'}:</strong>
                <div style="margin-top: 4px; padding-left: 4px; color: #475569;">${formatPdfText(ref.whatHappened)}</div>
              </div>
            `;
          }
          if (ref.whatWorked) {
            innerContent += `
              <div style="font-size: 9pt; color: #15803d; margin-bottom: 8px; line-height: 1.45;">
                <strong>✔️ ${isID ? 'Faktor Penunjang / Keberhasilan' : 'What Worked / Success Factors'}:</strong>
                <div style="margin-top: 4px; padding-left: 4px; color: #166534;">${formatPdfText(ref.whatWorked)}</div>
              </div>
            `;
          }
          if (ref.whatDidnt) {
            innerContent += `
              <div style="font-size: 9pt; color: #b91c1c; margin-bottom: 8px; line-height: 1.45;">
                <strong>⚠️ ${isID ? 'Hambatan / Masalah' : "What Didn't Work / Challenges"}:</strong>
                <div style="margin-top: 4px; padding-left: 4px; color: #991b1b;">${formatPdfText(ref.whatDidnt)}</div>
              </div>
            `;
          }
          if (ref.nextSteps) {
            innerContent += `
              <div style="font-size: 9pt; color: #1e40af; margin-top: 6px; background: #f0f9ff; border: 1px solid #bae6fd; padding: 8px 12px; border-radius: 8px; line-height: 1.45;">
                <strong>📌 ${isID ? 'Rencana Tindak Lanjut' : 'Next Steps / Action Plan'}:</strong>
                <div style="margin-top: 4px;">${formatPdfText(ref.nextSteps)}</div>
              </div>
            `;
          }

          return `
            <div class="rtl-card" style="border-left-color: ${typeColor}; background: ${typeColor}08; border-color: ${typeColor}15; border-radius: 10px; margin-bottom: 12px; page-break-inside: avoid;">
              <div class="rtl-ind-title" style="color: ${typeColor};">
                <span class="rtl-type-badge" style="background: ${typeColor}15; color: ${typeColor};">${typeLabel}</span>
                ${ref.title || (isID ? 'Refleksi Pelaksanaan' : 'Reflection Entry')}
              </div>
              <div class="rtl-notes">
                <div class="rtl-note-item">
                  <div class="rtl-note-dot" style="background: ${typeColor};"></div>
                  <div style="width: 100%;">
                    ${innerContent}
                    <div class="rtl-note-meta" style="margin-top: 8px; border-top: 1px dashed #e2e8f0; padding-top: 6px;">${_rptDate(ref.date)}${ref.contributor ? ' · ' + ref.contributor : ''}</div>
                  </div>
                </div>
              </div>
            </div>
          `;
        }).join('')
      : `<div class="hambatan-empty">${L.noRTL}</div>`;

    const reflectionsSectionHtml = `
      <div class="section-card avoid-break">
        ${secHead('🗂️', L.sec_rtl, '#1d4ed8', projectReflectionsInRange.length + ' Refleksi')}
        <p style="font-size: 9pt; color: #64748b; margin-bottom: 14px; font-style: italic; font-weight: 500;">${L.rtlDesc}</p>
        <div class="rtl-list">${reflectionCardsHtml}</div>
      </div>
    `;

    // Budget Realization Block HTML
    const budgetSectionHtml = budAppr > 0 ? `
      <div class="section-card avoid-break page-break">
        ${secHead('💰', L.sec_budget, '#f59e0b')}
        <div class="budget-cards">
          <div class="bud-card">
            <div class="bud-card-label">${L.budAppr}</div>
            <div class="bud-card-val">${_toRupiah(budAppr)}</div>
          </div>
          <div class="bud-card" style="background: #fffbeb; border-color: #fde68a;">
            <div class="bud-card-label">${L.budAct}</div>
            <div class="bud-card-val" style="color: #d97706">${_toRupiah(budActFinal)}</div>
            <div class="bud-card-sub">${pbarHtml(budPct, '#f59e0b')}</div>
          </div>
          <div class="bud-card" style="background: ${budLeft >= 0 ? '#f0fdf4' : '#fef2f2'}; border-color: ${budLeft >= 0 ? '#bbf7d0' : '#fca5a5'};">
            <div class="bud-card-label">${L.budLeft}</div>
            <div class="bud-card-val" style="color: ${budLeft >= 0 ? '#16a34a' : '#dc2626'}">${_toRupiah(budLeft)}</div>
          </div>
        </div>
      </div>
    ` : '';

    // Impact Grouping Chips Block HTML
    const impByUnitHtml = impEntries.map(([k, d]) => `
      <div class="imp-chip">
        <div class="imp-icon">${_impactIcon(k)}</div>
        <div class="imp-val">${d.total.toLocaleString('id-ID')}</div>
        <div class="imp-unit">${d.unit}</div>
      </div>
    `).join('');

    const impactSectionHtml = impEntries.length ? `
      <div class="section-card avoid-break">
        ${secHead('🌟', L.sec_impact, '#16a34a')}
        <div class="impact-chips">${impByUnitHtml}</div>
      </div>
    ` : '';

    // Footer Block HTML
    const footerHtml = `
      <div class="rpt-footer">
        <span class="rpt-footer-brand">PMIS M&E Tools</span>
        <span>${L.footerNote} · ${new Date().toLocaleString(isID ? 'id-ID' : 'en-GB')}</span>
      </div>
    `;

    // Supporting generic components helper
    function badge(text: string, color: string) {
      return `
        <span class="badge" style="background: ${color}12; color: ${color}; border: 1.5px solid ${color}30;">
          ${text || '—'}
        </span>
      `;
    }

    function secHead(icon: string, title: string, iconBg: string, count?: string) {
      return `
        <div class="sec-head">
          <div class="sec-icon" style="background: ${iconBg}15; color: ${iconBg};">${icon}</div>
          <div class="sec-title-text">${title}</div>
          ${count !== undefined ? `<div class="sec-badge">${count}</div>` : ''}
        </div>
      `;
    }

    const htmlOutput = `
      <!DOCTYPE html>
      <html lang="${isID ? 'id' : 'en'}">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${isID ? 'Laporan Monev' : 'M&E Report'}: ${proj.name}</title>
        <style>${cssStyle}</style>
      </head>
      <body>
        <div class="no-print print-bar">
          <button class="btn-print" onclick="window.print()">🖨️ ${isID ? 'Cetak / Simpan PDF' : 'Print / Save PDF'}</button>
          <button class="btn-close" onclick="window.close()">✕ ${isID ? 'Tutup' : 'Close'}</button>
        </div>
        <div class="page">
          ${coverPageHtml}
          ${statsSectionHtml}
          ${goalsSectionHtml}
          ${indicatorsSectionHtml}
          ${activitiesSectionHtml}
          ${challengesSectionHtml}
          ${reflectionsSectionHtml}
          ${budgetSectionHtml}
          ${impactSectionHtml}
          ${footerHtml}
        </div>
      </body>
      </html>
    `;

    // Open target print view tab/window
    const printWindow = window.open('', '_blank', 'width=1100,height=900,scrollbars=yes,resizable=yes');
    if (!printWindow) {
      alert(
        isID
          ? 'Pop-up telah diblokir oleh browser Anda. Sila izinkan membuka pop-up agar laporan dapat ditampilkan.'
          : 'Pop-up window was blocked by your browser. Please configure permissions to allow pop-ups for this site.'
      );
      return;
    }

    printWindow.document.open();
    printWindow.document.write(htmlOutput);
    printWindow.document.close();

    setIsPrintModalOpen(false);
  };

  // Filter reflections related to currently viewed detail project
  const currentProjectReflections = reflections.filter((r) => isIdMatch(r.projectId, selectedProjectId));

  // Extract staff names uniquely, trimmed, and sorted alphabetically
  const staffNamesList = Array.from(
    new Set(
      staff
        .map((s) => s.name?.trim())
        .filter((name): name is string => typeof name === 'string' && name.length > 0)
    )
  ).sort((a: string, b: string) => a.localeCompare(b));

  // Filter archived projects
  const archivedProjects = projects.filter((p) => p.isArchived);

  return (
    <div id="dfw-layout-root" className="min-h-screen bg-slate-50/50 flex">
      {/* SIDEBAR NAVIGATION Panel */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 border-r border-slate-850 select-none hidden md:flex font-medium text-xs leading-none">
        {/* Brand header */}
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-extrabold text-base">
            DFW
          </div>
          <div>
            <span className="font-extrabold text-white text-sm block">Monev Tools</span>
            <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-widest block">DFW Indonesia</span>
          </div>
        </div>

        {/* Sidebar Tabs Links */}
        <nav className="flex-1 p-4 space-y-1">
          <button
            onClick={() => {
              setActiveTab('dashboard');
              setSelectedProjectId('');
            }}
            className={`w-full py-2.5 px-3 rounded-lg flex items-center gap-3 cursor-pointer text-left transition-all ${
              activeTab === 'dashboard'
                ? 'bg-blue-600 text-white font-bold'
                : 'hover:bg-slate-800 hover:text-slate-100 text-slate-400'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 shrink-0" />
            <span>Dashboard Monev</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('projects');
              setSelectedProjectId('');
            }}
            className={`w-full py-2.5 px-3 rounded-lg flex items-center gap-3 cursor-pointer text-left transition-all ${
              activeTab === 'projects' || activeTab === 'project_detail'
                ? 'bg-blue-600 text-white font-bold'
                : 'hover:bg-slate-800 hover:text-slate-100 text-slate-400'
            }`}
          >
            <Folder className="w-4 h-4 shrink-0" />
            <span>Daftar Proyek Utama</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('beneficiary');
              setSelectedProjectId('');
            }}
            className={`w-full py-2.5 px-3 rounded-lg flex items-center gap-3 cursor-pointer text-left transition-all ${
              activeTab === 'beneficiary'
                ? 'bg-blue-600 text-white font-bold'
                : 'hover:bg-slate-800 hover:text-slate-100 text-slate-400'
            }`}
          >
            <Users className="w-4 h-4 shrink-0" />
            <span>Penerima Manfaat</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('issues');
              setSelectedProjectId('');
            }}
            className={`w-full py-2.5 px-3 rounded-lg flex items-center gap-3 cursor-pointer text-left transition-all ${
              activeTab === 'issues'
                ? 'bg-blue-600 text-white font-bold'
                : 'hover:bg-slate-800 hover:text-slate-100 text-slate-400'
            }`}
          >
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Isu &amp; Temuan Hukum</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('staff');
              setSelectedProjectId('');
            }}
            className={`w-full py-2.5 px-3 rounded-lg flex items-center gap-3 cursor-pointer text-left transition-all ${
              activeTab === 'staff'
                ? 'bg-blue-600 text-white font-bold'
                : 'hover:bg-slate-800 hover:text-slate-100 text-slate-400'
            }`}
          >
            <ClipboardList className="w-4 h-4 shrink-0" />
            <span>Staff &amp; Beban Kerja</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('documents');
              setSelectedProjectId('');
              setDocProjectFilter('');
            }}
            className={`w-full py-2.5 px-3 rounded-lg flex items-center gap-3 cursor-pointer text-left transition-all ${
              activeTab === 'documents'
                ? 'bg-blue-600 text-white font-bold'
                : 'hover:bg-slate-800 hover:text-slate-100 text-slate-400'
            }`}
          >
            <FileText className="w-4 h-4 shrink-0" />
            <span>Manajemen Dokumen</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('archive');
              setSelectedProjectId('');
            }}
            className={`w-full py-2.5 px-3 rounded-lg flex items-center gap-3 cursor-pointer text-left transition-all ${
              activeTab === 'archive'
                ? 'bg-blue-600 text-white font-bold'
                : 'hover:bg-slate-800 hover:text-slate-100 text-slate-400'
            }`}
          >
            <FolderMinus className="w-4 h-4 shrink-0" />
            <span>Arsip Proyek Selesai</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('supabase');
              setSelectedProjectId('');
            }}
            className={`w-full py-2.5 px-3 rounded-lg flex items-center gap-3 cursor-pointer text-left transition-all ${
              activeTab === 'supabase'
                ? 'bg-blue-600 text-white font-bold'
                : 'hover:bg-slate-800 hover:text-slate-100 text-slate-400'
            }`}
          >
            <Database className="w-4 h-4 shrink-0" />
            <span>Pengaturan Supabase</span>
          </button>
        </nav>

        {/* User identification footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-white text-xs shrink-0 select-none">
              DFW
            </div>
            <div className="min-w-0">
              <span className="font-bold text-slate-200 block truncate">DFW Indonesia</span>
              <span className="text-[10px] text-slate-500 block">Program Coordinator</span>
            </div>
          </div>
        </div>
      </aside>

      {/* CORE DISPLAY STAGE */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top Coordinator Banner */}
        <div className="bg-white border-b border-slate-100 h-16 px-6 flex items-center justify-between shrink-0 select-none">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-bold block md:hidden text-lg">☰</span>
            <div className="flex items-center gap-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <span>DFW Monitoring Tools</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
              <span className="text-slate-700">{activeTab.replace('_', ' ')}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 py-1 px-2.5 rounded-full border border-emerald-100 inline-flex items-center gap-1">
              <span>🟢</span> Realtime Database ON
            </span>
            <button
              onClick={() => setIsPrintModalOpen(true)}
              className="p-1 px-3.5 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl font-bold text-xs inline-flex items-center gap-1.5 transition-all cursor-pointer h-8"
            >
              <Printer className="w-3.5 h-3.5" /> PDF
            </button>
          </div>
        </div>

        {/* Main Work Content Panel */}
        <div className="flex-1 p-6 overflow-y-auto max-w-7xl w-full mx-auto space-y-6">
          {/* Quick sync feedback toast indicator */}
          {syncToast && (
            <div className={`font-extrabold text-xs py-2.5 px-4 rounded-xl shadow-xs animate-slide-in flex items-center gap-2 ${
              syncToast === 'success' ? 'bg-emerald-500 text-white' :
              syncToast === 'error' ? 'bg-rose-500 text-white' :
              'bg-sky-500 text-white'
            }`}>
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {syncToastMsg || (syncToast === 'success' ? 'Data berhasil disinkronisasi dengan Supabase Cloud!' : 'Aksi proyek berhasil diproses.')}
              </span>
            </div>
          )}

          {/* TAB ROUTING COMPONENT SWITCH */}
          {activeTab === 'dashboard' && (
            <DashboardTab
              projects={projects}
              activities={activities}
              issues={issues}
              indicators={indicators}
              onSelectProject={handleSelectProject}
              onAddProjectClick={() => setActiveTab('add_project')}
              onOpenImportModal={() => setIsImportModalOpen(true)}
            />
          )}

          {activeTab === 'projects' && (
            <ProjectsTab
              projects={projects}
              activities={activities}
              indicators={indicators}
              onSelectProject={handleSelectProject}
              onEditProject={handleEditProjectClick}
              onArchiveProject={handleArchiveProject}
              onDeleteProject={handleDeleteProject}
              onAddProjectClick={() => setActiveTab('add_project')}
              onOpenImportModal={() => setIsImportModalOpen(true)}
            />
          )}

          {activeTab === 'project_detail' && selectedProjectId && (
            (() => {
              const proj = projects.find((p) => isIdMatch(p.id, selectedProjectId));
              if (!proj) return <p className="text-xs">Proyek tidak ditemukan.</p>;
              
              const projectOutcomes = outcomes.filter((o) => isIdMatch(o.projectId, selectedProjectId));
              const projectIndicators = indicators.filter((i) => isIdMatch(i.projectId, selectedProjectId));
              const projectActs = activities.filter((a) => isIdMatch(a.projectId, selectedProjectId));

              return (
                <ProjectDetailTab
                  project={proj}
                  activities={projectActs}
                  indicators={projectIndicators}
                  outcomes={projectOutcomes}
                  reflections={currentProjectReflections}
                  staffList={staffNamesList}
                  documents={documents}
                  onUpdateDocuments={updateDocumentsInStorage}
                  onBackToDashboard={() => setActiveTab('dashboard')}
                  onEditProjectClick={handleEditProjectClick}
                  onAddActivityClick={() => {
                    setSelectedActivity(undefined);
                    setIsActivityModalOpen(true);
                  }}
                  onEditActivityClick={(act) => {
                    setSelectedActivity(act);
                    setIsActivityModalOpen(true);
                  }}
                  onOpenSubActivities={(activityId) => {
                    setActiveParentActivityId(activityId);
                    setIsSubActivitiesModalOpen(true);
                  }}
                  onDeleteActivityClick={(activityId) => {
                    setConfirmState({
                      isOpen: true,
                      title: 'Hapus Rencana Kegiatan',
                      message: 'Apakah Anda yakin ingin menghapus rencana kegiatan ini beserta seluruh sub-aktivitasnya? Tindakan ini tidak dapat dibatalkan.',
                      type: 'danger',
                      confirmText: 'Ya, Hapus Kegiatan',
                      onConfirm: () => {
                        const updated = activities.filter(a => a.id !== activityId);
                        updateActivitiesInStorage(updated);
                        setConfirmState((prev) => ({ ...prev, isOpen: false }));
                      }
                    });
                  }}
                  onSaveIndicatorValue={handleSaveIndicatorValueInline}
                  onUpdateBudgetActual={(projId, amount) => {
                    const updated = projects.map(p => p.id === projId ? { ...p, budgetActual: amount } : p);
                    updateProjectsInStorage(updated);
                  }}
                  onGoToDocumentsTab={() => {
                    setDocProjectFilter(proj.name);
                    setActiveTab('documents');
                  }}
                  onAddReflection={handleAddReflectionInline}
                  onDeleteReflection={handleDeleteReflectionInline}
                />
              );
            })()
          )}

          {(activeTab === 'add_project' || activeTab === 'edit_project') && (
            <ProjectForm
              initialProject={activeTab === 'edit_project' ? projects.find((p) => isIdMatch(p.id, selectedProjectId)) : undefined}
              initialIndicators={activeTab === 'edit_project' ? indicators.filter((i) => isIdMatch(i.projectId, selectedProjectId)) : undefined}
              initialOutcomes={
                activeTab === 'edit_project'
                  ? [...outcomes.filter((o) => isIdMatch(o.projectId, selectedProjectId))].sort((a, b) => {
                      const getNum = (title: string) => {
                        const match = title.match(/Outcome\s*(\d+)/i) || title.match(/(\d+)/);
                        return match ? parseInt(match[1], 10) : 999999;
                      };
                      const numA = getNum(a.title);
                      const numB = getNum(b.title);
                      if (numA !== numB) return numA - numB;
                      return a.id.localeCompare(b.id);
                    })
                  : undefined
              }
              staffList={staffNamesList}
              onSubmit={handleSaveProjectWizard}
              onCancel={() => {
                if (activeTab === 'edit_project') setActiveTab('project_detail');
                else setActiveTab('dashboard');
              }}
            />
          )}

          {activeTab === 'beneficiary' && (
            <BeneficiaryTab
              beneficiaries={beneficiaries}
              projects={projects}
              activities={activities}
              subActivities={subActivities}
              onUpdateBeneficiaries={updateBeneficiariesInStorage}
              onUpdateProjects={updateProjectsInStorage}
              onUpdateActivities={updateActivitiesInStorage}
              onUpdateSubActivities={updateSubActivitiesInStorage}
              onOpenAddModal={(defaultProjId) => {
                setSelectedBen(undefined);
                setDefaultBenProjectId(defaultProjId || '');
                setIsBenModalOpen(true);
              }}
              onOpenEditModal={(ben) => {
                setSelectedBen(ben);
                setIsBenModalOpen(true);
              }}
              onOpenDetailModal={(ben) => {
                setSelectedDetailBen(ben);
                setIsBenDetailModalOpen(true);
              }}
            />
          )}

          {activeTab === 'issues' && (
            <IssuesTab
              issues={issues}
              projects={projects}
              activities={activities}
              onUpdateIssues={updateIssuesInStorage}
              onRefresh={() => {
                setSyncToast('success');
                setTimeout(() => setSyncToast(''), 1500);
              }}
              allCategories={['IUU Fishing', 'HAM / Ketenagakerjaan', 'Konservasi Mangrove', 'Umum']}
            />
          )}

          {activeTab === 'staff' && (
            <StaffTab
              staffList={staff}
              activities={activities}
              projects={projects}
              subActivities={subActivities}
              onUpdateStaffList={updateStaffInStorage}
              onOpenTasksModal={(staffName) => {
                setSelectedStaffTasksName(staffName);
                setIsStaffTasksModalOpen(true);
              }}
            />
          )}

          {activeTab === 'archive' && (
            <div className="space-y-4">
              <div className="border-b border-slate-150 pb-3">
                <h3 className="font-bold text-slate-800 text-sm">🗄️ Arsip Proyek yang Telah Selesai / Ditutup</h3>
                <p className="text-xs text-slate-400">Proyek-proyek yang telah dituntaskan penugasannya oleh kepala program DFW</p>
              </div>

              <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-xs">
                <table className="w-full text-left border-collapse text-xs font-semibold text-slate-600">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-3 px-4">Nama Proyek Selesai</th>
                      <th className="py-3 px-4">Lokasi</th>
                      <th className="py-3 px-4">PIC Lapangan</th>
                      <th className="py-3 px-4">Diarsipkan Tanggal</th>
                      <th className="py-3 px-4">Oleh Koordinator</th>
                      <th className="py-3 px-4 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {archivedProjects.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-10 text-center text-slate-400 font-medium">
                          Belum ada arsip proyek tersimpan.
                        </td>
                      </tr>
                    ) : (
                      archivedProjects.map((p) => (
                        <tr key={p.id}>
                          <td className="py-3 px-4 font-bold text-slate-800">{p.name}</td>
                          <td className="py-3 px-4">{p.location}</td>
                          <td className="py-3 px-4 font-bold text-slate-600">{p.owner}</td>
                          <td className="py-3 px-4 font-mono text-slate-400">{p.archivedAt || '—'}</td>
                          <td className="py-3 px-4 text-slate-400">{p.archoredBy || 'Imam T.'}</td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => handleRestoreProject(p.id)}
                              className="text-xs bg-slate-100 hover:bg-slate-200 py-1 px-2.5 rounded-md border text-slate-600 cursor-pointer"
                            >
                              Pulihkan Proyek
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'documents' && (
            <DocumentsTab
              documents={documents}
              projects={projects}
              onUpdateDocuments={updateDocumentsInStorage}
              initialProjectFilter={docProjectFilter}
              onRefresh={() => {
                setSyncToast('success');
                setTimeout(() => setSyncToast(''), 1500);
              }}
            />
          )}

          {/* Pagination and egress stats bar */}
          {['projects', 'issues', 'staff', 'documents'].includes(activeTab) && (
            <div id="dfw-pagination-container" className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50 border border-slate-200 p-3.5 rounded-2xl text-xs text-slate-500">
              <div className="flex items-center gap-1.5 font-mono">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Optimasi Egress DB: <strong className="text-slate-700">Aktif (Hanya mengunduh data per tab/halaman)</strong></span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  id="btn-prev-page"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 font-bold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 active:scale-95 disabled:opacity-50 disabled:pointer-events-none transition-all cursor-pointer shadow-xs inline-flex items-center gap-1"
                >
                  &larr; Sebelumnya
                </button>
                <span id="page-num-display" className="font-semibold text-slate-700 font-mono">Halaman {currentPage}</span>
                <button
                  type="button"
                  id="btn-next-page"
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  disabled={
                    activeTab === 'projects' ? (projects?.length || 0) < itemsPerPage :
                    activeTab === 'beneficiary' ? (beneficiaries?.length || 0) < itemsPerPage :
                    activeTab === 'issues' ? (issues?.length || 0) < itemsPerPage :
                    activeTab === 'staff' ? (staff?.length || 0) < itemsPerPage :
                    activeTab === 'documents' ? (documents?.length || 0) < itemsPerPage : false
                  }
                  className="px-3 py-1.5 font-bold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 active:scale-95 disabled:opacity-50 disabled:pointer-events-none transition-all cursor-pointer shadow-xs inline-flex items-center gap-1"
                >
                  Selanjutnya &rarr;
                </button>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">Baris:</span>
                <select
                  id="select-items-limit"
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-white border border-slate-200 rounded-lg py-1 px-2 text-xs text-slate-700 font-semibold focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value={5}>5 baris</option>
                  <option value={10}>10 baris</option>
                  <option value={20}>20 baris</option>
                  <option value={50}>50 baris</option>
                </select>
              </div>
            </div>
          )}

          {activeTab === 'supabase' && (
            <div className="bg-white rounded-2xl border border-slate-100 p-8 shadow-xs max-w-2xl mx-auto space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2.5">
                  <Database className="w-5 h-5 text-blue-600" />
                  Koneksi Database Supabase Cloud
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Konfigurasikan sambungan ke database Supabase Anda untuk menyimpan data pemantauan secara real-time dan berkolaborasi antarpengguna secara instan.
                </p>
              </div>

              {/* Connection Status Indicator */}
              <div className={`p-4 rounded-xl border flex items-start gap-3.5 transition-all ${
                dbIsConfigured 
                  ? 'bg-emerald-50/50 border-emerald-100 text-slate-850'
                  : 'bg-amber-50/50 border-amber-100 text-slate-850'
              }`}>
                <div className={`w-10 h-10 rounded-lg shrink-0 flex items-center justify-center font-bold text-lg select-none ${
                  dbIsConfigured ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'
                }`}>
                  {dbIsConfigured ? '✓' : '!'}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="font-bold text-[10px] uppercase tracking-wider text-slate-400">Status Sambungan</div>
                  <div className="text-sm font-bold text-slate-800">
                    {dbIsConfigured 
                      ? 'Terhubung dengan Supabase Cloud (Aktif)' 
                      : 'Menggunakan Penyimpanan Lokal (Offline Fallback)'}
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {dbIsConfigured 
                      ? `Semua pengisian, pengeditan, atau penghapusan silih berganti dari proyek, kegiatan, indikator, atau dokumen saat ini disinkronisasikan ke Supabase secara langsung.`
                      : 'Saat ini data hanya tersimpan secara aman di browser lokal Anda. Jika cache browser dibersihkan, data mungkin terhapus. Hubungkan dengan Supabase Cloud API untuk sinkronisasi jangka panjang.'}
                  </p>
                </div>
              </div>

              {/* Form Input fields */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">Supabase URL</label>
                  <input
                    type="text"
                    value={dbUrl}
                    onChange={(e) => setDbUrl(e.target.value)}
                    placeholder="https://your-project-id.supabase.co"
                    className="w-full text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none transition-all font-mono"
                  />
                  <p className="text-[10px] text-slate-400">Dapatkan URL ini pada menu Settings &gt; API di dashboard Supabase milik Anda.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">Supabase Anon Key (API Key)</label>
                  <input
                    type="password"
                    value={dbKey}
                    onChange={(e) => setDbKey(e.target.value)}
                    placeholder="eyJhbGciOi..."
                    className="w-full text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none transition-all font-mono"
                  />
                  <p className="text-[10px] text-slate-400 font-medium">Kunci anon publik aman digunakan pada browser web untuk interaksi database langsung.</p>
                </div>
              </div>

              {/* Error box */}
              {dbError && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-xl">
                  <p className="text-xs font-bold text-red-600">Gagal Melakukan Sambungan ke Tabel:</p>
                  <p className="text-xs text-red-500 mt-0.5 leading-relaxed font-mono select-text">{dbError}</p>
                </div>
              )}

              {/* Buttons Actions */}
              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={async () => {
                    setIsTestingDb(true);
                    setDbError('');
                    try {
                      if (!dbUrl.trim() || !dbKey.trim()) {
                        throw new Error('Harap masukkan Supabase URL dan Anon Key terlebih dahulu.');
                      }
                      
                      const urlStr = dbUrl.trim();
                      const keyStr = dbKey.trim();
                      
                      // Safely test with temporary client instance
                      const tempClient = (urlStr === dbUrl.trim() && keyStr === dbKey.trim() && supabase)
                        ? supabase
                        : createClient(urlStr, keyStr, { auth: { persistSession: false } });
                      const { error } = await tempClient.from('projects').select('id').limit(1);
                      if (error) {
                        throw new Error(`Tes koneksi ke database berhasil, namun gagal mengambil data tabel: ${error.message}. Harap pastikan tabel "projects" beserta skema tabel DFW Indonesia telah dibuat di Supabase Anda.`);
                      }

                      // Successfully verified! Reinitialize global db client
                      reinitializeSupabase(urlStr, keyStr);
                      setDbIsConfigured(true);
                      await SupabaseSync.fetchSchemaInfo(urlStr, keyStr);
                      await checkSupabaseTables(urlStr, keyStr);
                      setSyncToast('success');
                      setSyncToastMsg('Koneksi Supabase berhasil diproses dan disimpan secara permanen!');
                      setTimeout(() => { setSyncToast(''); setSyncToastMsg(''); }, 4000);
                    } catch (err: any) {
                      setDbError(err.message || 'Gagal terhubung ke Supabase. Periksa kembali format URL / Key API Anda.');
                    } finally {
                      setIsTestingDb(false);
                    }
                  }}
                  disabled={isTestingDb}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs py-2.5 px-4 rounded-xl cursor-pointer transition-all flex items-center justify-center gap-2"
                >
                  {isTestingDb ? 'Sedang Memverifikasi...' : 'Tes & Hubungkan Supabase'}
                </button>

                {dbIsConfigured && (
                  <button
                    onClick={() => {
                      setConfirmState({
                        isOpen: true,
                        title: 'Putuskan Koneksi Supabase',
                        message: 'Apakah Anda yakin ingin memutus koneksi Supabase? Aplikasi akan sepenuhnya beralih menggunakan Penyimpanan Lokal Offline.',
                        type: 'warning',
                        confirmText: 'Ya, Putuskan Koneksi',
                        onConfirm: () => {
                          reinitializeSupabase('', '');
                          setDbIsConfigured(false);
                          setDbUrl('');
                          setDbKey('');
                          loadLocalFallback();
                          setSyncToast('success');
                          setSyncToastMsg('Koneksi diputus. Aplikasi kembali ke penyimpanan lokal.');
                          setConfirmState((prev) => ({ ...prev, isOpen: false }));
                          setTimeout(() => { setSyncToast(''); setSyncToastMsg(''); }, 3000);
                        }
                      });
                    }}
                    className="sm:w-auto bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs py-2.5 px-4 rounded-xl cursor-pointer transition-all"
                  >
                    Putuskan Koneksi
                  </button>
                )}
              </div>

              {dbIsConfigured && (
                <div className="border-t border-slate-100 pt-5 mt-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      📊 Status Ketersediaan Tabel di Supabase
                    </h3>
                    <button
                      onClick={() => checkSupabaseTables()}
                      disabled={isCheckingTables}
                      className="px-2 py-1 text-[10px] font-bold bg-blue-50 text-blue-600 hover:bg-blue-100 disabled:opacity-50 rounded-lg cursor-pointer transition-all flex items-center gap-1"
                    >
                      {isCheckingTables ? 'Memeriksa...' : 'Re-check Tabel'}
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                    {Object.keys(tableStatuses).length === 0 ? (
                      <div className="col-span-full py-4 text-center text-slate-400 font-medium">
                        Sedang memuat status tabel, atau tekan "Re-check Tabel" untuk memulai pendeteksian ketersediaan skema.
                      </div>
                    ) : (
                      Object.entries(tableStatuses).map(([tableName, status]) => {
                        let statusColor = 'text-slate-400 bg-slate-50 border-slate-100';
                        let labelText = 'Memeriksa...';
                        
                        if (status === 'ok') {
                          statusColor = 'text-emerald-700 bg-emerald-50 border-emerald-100';
                          labelText = 'Terpasang (Ready)';
                        } else if (status === 'missing') {
                          statusColor = 'text-rose-700 bg-rose-50 border-rose-100 font-extrabold animate-pulse';
                          labelText = 'Belum Ada (Missing)';
                        }
                        
                        return (
                          <div key={tableName} className="p-2 border border-slate-100 bg-slate-50/30 rounded-lg flex items-center justify-between gap-3">
                            <span className="font-mono text-slate-700 font-semibold">{tableName}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] border font-bold ${statusColor}`}>
                              {labelText}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                  
                  {Object.values(tableStatuses).some(s => s === 'missing') && (
                    <div className="p-3.5 bg-rose-50/50 border border-rose-100 rounded-xl space-y-2">
                      <p className="text-xs font-bold text-rose-800 flex items-center gap-1.5">
                        ⚠️ Beberapa tabel belum terpasang di database Supabase Anda!
                      </p>
                      <p className="text-[11px] text-rose-600 leading-relaxed font-semibold">
                        Data input seperti "Tambah Aktivitas" (tabel <code className="bg-white px-1.5 py-0.5 border border-rose-150 rounded font-mono text-xs font-bold text-slate-800">project_activities</code>) tidak akan tersimpan di Supabase hingga tabel tersebut dibuat.
                      </p>
                      <p className="text-[11px] text-slate-600 leading-relaxed font-semibold">
                        Selesaikan dengan menyalin skema SQL di bagian paling bawah halaman ini, lalu tempelkan dan jalankan pada menu <strong className="text-slate-800">SQL Editor</strong> di dashboard Supabase milik Anda!
                      </p>
                    </div>
                  )}
                </div>
              )}

              {dbIsConfigured && (
                <div className="border-t border-slate-100 pt-5 mt-4 space-y-4">
                  <h3 className="text-xs font-bold text-slate-800">Sinkronisasi & Migrasi Data Manual</h3>
                  <p className="text-xs text-slate-500 leading-relaxed font-medium">
                    Gunakan tombol pemrosesan di bawah untuk mentransfer seluruh draf lokal Anda langsung ke Supabase, atau mengganti draf lokal dengan data terbaru dari database Cloud:
                  </p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      onClick={handleExportAllToSupabase}
                      className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs py-2.5 px-3 rounded-xl cursor-pointer transition-all flex items-center justify-center gap-2"
                    >
                      <PlusCircle className="text-emerald-500 w-4 h-4" />
                      <span>Unggah Data Lokal ke Supabase</span>
                    </button>

                    <button
                      onClick={() => {
                        setConfirmState({
                          isOpen: true,
                          title: 'Unduh & Timpa Data dari Supabase',
                          message: 'Langkah ini akan sepenuhnya MENIMPA seluruh data lokal yang ada saat ini dengan salinan terbaru dari Supabase Cloud. Apakah Anda yakin ingin melanjutkan?',
                          type: 'warning',
                          confirmText: 'Ya, Timpa Data Lokal',
                          onConfirm: async () => {
                            setConfirmState((prev) => ({ ...prev, isOpen: false }));
                            await fetchAndSyncFromSupabase();
                          }
                        });
                      }}
                      className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs py-2.5 px-3 rounded-xl cursor-pointer transition-all flex items-center justify-center gap-2"
                    >
                      <ChevronRight className="text-blue-500 w-4 h-4" />
                      <span>Unduh Data dari Supabase</span>
                    </button>
                  </div>
                </div>
              )}

              {/* SECTION: INTEGRATED SQL DB SCHEMA HANDBOOK */}
              <div className="border-t border-slate-100 pt-5 mt-4 space-y-4">
                <div 
                  onClick={() => setShowSqlGuide(!showSqlGuide)}
                  className="p-4 bg-blue-50/50 hover:bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-between cursor-pointer transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <Database className="w-5 h-5 text-blue-600 shrink-0" />
                    <div>
                      <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                        <span>🛠️ Pemasangan Skema SQL Supabase</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-800 uppercase font-bold tracking-wider">Penting</span>
                      </h3>
                      <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed font-medium">
                        Data tidak bisa masuk atau tersinkron? Gunakan skema SQL resmi di sini untuk mendaftarkan 10 tabel DFW di editor Supabase Anda.
                      </p>
                    </div>
                  </div>
                  <div className="text-slate-400 group-hover:text-blue-600 transition-colors">
                    {showSqlGuide ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>

                {showSqlGuide && (
                  <div className="p-4 bg-slate-50 border border-slate-150 rounded-xl space-y-3.5 animate-fadeIn">
                    <div className="space-y-1">
                      <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">Langkah-Langkah Pembuatan Tabel:</h4>
                      <ol className="list-decimal list-inside text-xs text-slate-600 space-y-1 leading-relaxed font-medium">
                        <li>Buka halaman dashboard projek Anda pada portal <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-bold">Supabase Cloud</a>.</li>
                        <li>Di panel navigasi sebelah kiri, klik menu <span className="font-bold text-slate-850">"SQL Editor"</span>.</li>
                        <li>Klik tombol <span className="font-bold text-slate-850">"+ New Query"</span> untuk membuka lembar kerja kosong.</li>
                        <li>Klik tombol <b>"Salin Skema SQL"</b> di bawah, kemudian <b>tempel (Paste)</b> di SQL editor Supabase Anda.</li>
                        <li>Klik tombol hijau <span className="font-bold text-green-600">"Run"</span> di sudut kanan bawah editor Supabase. Selesai!</li>
                        <li className="text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-150 mt-1.5">
                          ⚠️ <b>PENTING UNTUK IMPORT EXCEL/CSV:</b> Jika format tanggal di file Anda menggunakan format <b>Hari/Bulan/Tahun (DD/MM/YYYY)</b> seperti <code>15/04/2026</code>, pastikan untuk menjalankan perintah <code>ALTER DATABASE postgres SET datestyle TO 'ISO, DMY';</code> di SQL Editor Anda terlebih dahulu untuk menghindari error.
                        </li>
                      </ol>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Skema SQL DFW Indonesia</label>
                        <button
                          onClick={() => {
                            const sqlText = `-- SKEMA STRUKTUR DATABASE DFW INDONESIA UNTUK SUPABASE
-- Harap jalankan seluruh instruksi di bawah ini di menu SQL Editor Supabase Anda

-- KONFIGURASI FORMAT TANGGAL (PENTING AGAR IMPORT EXCEL/CSV HARI/BULAN/TAHUN TIDAK ERROR)
ALTER DATABASE postgres SET datestyle TO 'ISO, DMY';

-- 1. Tabel Projects
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    location TEXT,
    owner TEXT,
    donor TEXT,
    status TEXT,
    start_date DATE,
    deadline DATE,
    progress NUMERIC DEFAULT 0,
    budget_approved DOUBLE PRECISION DEFAULT 0,
    budget_actual DOUBLE PRECISION DEFAULT 0,
    "desc" TEXT,
    description TEXT, -- Untuk kecocokan impor CSV/Excel
    note TEXT,
    goal TEXT,
    is_archived BOOLEAN DEFAULT false,
    archived BOOLEAN DEFAULT false, -- Untuk kecocokan impor CSV/Excel
    archored_by TEXT,
    archived_by TEXT, -- Untuk kecocokan impor CSV/Excel dan koreksi typo
    archived_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()), -- Untuk kecocokan impor CSV/Excel
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())  -- Untuk kecocokan impor CSV/Excel
);

-- 2. Tabel Project Indicators
CREATE TABLE IF NOT EXISTS project_indicators (
    id UUID PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    title TEXT, -- Boleh NULL agar cocok dengan ekspor CSV yang hanya memiliki indicator_name
    indicator_name TEXT,
    target NUMERIC DEFAULT 0,
    current NUMERIC DEFAULT 0,
    actual NUMERIC DEFAULT 0,
    type TEXT,
    sort_order INTEGER DEFAULT 0,
    unit TEXT,
    last_updated TEXT,
    last_value NUMERIC DEFAULT 0,
    project_name TEXT DEFAULT 'DFW Indonesia',
    notes TEXT,
    notes_updated_at TEXT,
    description TEXT,
    archived BOOLEAN DEFAULT false,
    archived_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Tabel Project Outcomes
CREATE TABLE IF NOT EXISTS project_outcomes (
    id UUID PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    title TEXT, -- Boleh NULL agar cocok dengan ekspor CSV yang hanya memiliki outcome_text
    outcome_text TEXT,
    sort_order INTEGER DEFAULT 0,
    project_name TEXT DEFAULT 'DFW Indonesia',
    description TEXT,
    archived BOOLEAN DEFAULT false,
    archived_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. Tabel Project Activities
CREATE TABLE IF NOT EXISTS project_activities (
    id UUID PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    "desc" TEXT,
    description TEXT,
    pic TEXT,
    status TEXT,
    start_date DATE,
    due_date DATE,
    deadline TEXT,
    challenges TEXT,
    project_name TEXT DEFAULT 'DFW Indonesia',
    progress NUMERIC DEFAULT 0,
    notes JSONB DEFAULT '[]'::jsonb,
    files JSONB DEFAULT '[]'::jsonb,
    archived BOOLEAN DEFAULT false,
    archived_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5. Tabel Beneficiaries (Penerima Manfaat)
CREATE TABLE IF NOT EXISTS beneficiaries (
    id UUID PRIMARY KEY,
    full_name TEXT NOT NULL,
    phone TEXT,
    gender TEXT,
    birth_year INTEGER,
    location TEXT,
    occupation TEXT,
    email TEXT,
    note TEXT,
    notes TEXT,
    registrations JSONB DEFAULT '[]'::jsonb,
    description TEXT,
    archived BOOLEAN DEFAULT false,
    archived_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 6. Tabel Issues (Isu & Pengaduan)
CREATE TABLE IF NOT EXISTS issues (
    id UUID PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    activity_id UUID REFERENCES project_activities(id) ON DELETE SET NULL,
    severity TEXT,
    status TEXT,
    date_occurred TEXT,
    source_type TEXT,
    source_link TEXT,
    tags TEXT,
    updates JSONB DEFAULT '[]'::jsonb,
    archived BOOLEAN DEFAULT false,
    archived_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 7. Tabel Staff (Anggota Tim)
CREATE TABLE IF NOT EXISTS staff (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT,
    status TEXT DEFAULT 'active',
    email TEXT,
    phone TEXT,
    is_active BOOLEAN DEFAULT true,
    joined_at TIMESTAMP WITH TIME ZONE,
    description TEXT,
    archived BOOLEAN DEFAULT false,
    archived_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 8. Tabel Project Reflections (Catatan Belajar / Refleksi)
CREATE TABLE IF NOT EXISTS project_reflections (
    id UUID PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    title TEXT,
    type TEXT,
    date DATE,
    reflection_date TEXT,
    what_happened TEXT,
    what_worked TEXT,
    what_didnt TEXT,
    lesson TEXT, -- Boleh NULL agar cocok dengan ekspor CSV yang hanya memiliki lesson_learned
    lesson_learned TEXT,
    next_steps TEXT,
    contributor TEXT,
    created_by TEXT,
    project_name TEXT DEFAULT 'DFW Indonesia',
    description TEXT,
    archived BOOLEAN DEFAULT false,
    archived_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 9. Tabel Project Documents (Dokumen / Arsip File)
CREATE TABLE IF NOT EXISTS project_documents (
    id UUID PRIMARY KEY,
    project_name TEXT DEFAULT 'DFW Indonesia',
    category TEXT,
    file_name TEXT NOT NULL,
    mime_type TEXT,
    file_size BIGINT DEFAULT 0,
    drive_file_id TEXT,
    drive_folder_id TEXT,
    web_view_link TEXT,
    description TEXT,
    archived BOOLEAN DEFAULT false,
    archived_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 10. Tabel Project Sub-Activities
CREATE TABLE IF NOT EXISTS project_sub_activities (
    id UUID PRIMARY KEY,
    parent_activity_id UUID REFERENCES project_activities(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    "desc" TEXT,
    description TEXT,
    pic TEXT,
    status TEXT,
    priority TEXT,
    due DATE,
    archived BOOLEAN DEFAULT false,
    archived_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- MATIKAN RLS AGAR INTERAKSI INTEGRASI DAPAT DISINKRONISASI AKTIF LANGSUNG
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE project_indicators DISABLE ROW LEVEL SECURITY;
ALTER TABLE project_outcomes DISABLE ROW LEVEL SECURITY;
ALTER TABLE project_activities DISABLE ROW LEVEL SECURITY;
ALTER TABLE beneficiaries DISABLE ROW LEVEL SECURITY;
ALTER TABLE issues DISABLE ROW LEVEL SECURITY;
ALTER TABLE staff DISABLE ROW LEVEL SECURITY;
ALTER TABLE project_reflections DISABLE ROW LEVEL SECURITY;
ALTER TABLE project_documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE project_sub_activities DISABLE ROW LEVEL SECURITY;

-- KOSTUMISASI COMPATIBILITY: JALANKAN ALTER TABLE JIKA TABEL SUDAH ADA SEBELUMNYA DAN MENGALAMI HILANG KOLOM ATAU PERBAIKAN CONSTRAINT
ALTER TABLE projects ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS archived_by TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());
ALTER TABLE projects ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

ALTER TABLE project_indicators ADD COLUMN IF NOT EXISTS project_name TEXT DEFAULT 'DFW Indonesia';
ALTER TABLE project_indicators ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE project_indicators ADD COLUMN IF NOT EXISTS notes_updated_at TEXT;
ALTER TABLE project_indicators ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE project_indicators ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false;
ALTER TABLE project_indicators ADD COLUMN IF NOT EXISTS archived_by TEXT;
ALTER TABLE project_indicators ADD COLUMN IF NOT EXISTS indicator_name TEXT;
ALTER TABLE project_indicators ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE project_indicators ADD COLUMN IF NOT EXISTS actual NUMERIC DEFAULT 0;
ALTER TABLE project_indicators ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
ALTER TABLE project_indicators ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());
ALTER TABLE project_indicators ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

ALTER TABLE project_outcomes ADD COLUMN IF NOT EXISTS project_name TEXT DEFAULT 'DFW Indonesia';
ALTER TABLE project_outcomes ADD COLUMN IF NOT EXISTS outcome_text TEXT;
ALTER TABLE project_outcomes ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
ALTER TABLE project_outcomes ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE project_outcomes ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false;
ALTER TABLE project_outcomes ADD COLUMN IF NOT EXISTS archived_by TEXT;
ALTER TABLE project_outcomes ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());
ALTER TABLE project_outcomes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

ALTER TABLE project_activities ADD COLUMN IF NOT EXISTS project_name TEXT DEFAULT 'DFW Indonesia';
ALTER TABLE project_activities ADD COLUMN IF NOT EXISTS deadline TEXT;
ALTER TABLE project_activities ADD COLUMN IF NOT EXISTS challenges TEXT;
ALTER TABLE project_activities ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE project_activities ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false;
ALTER TABLE project_activities ADD COLUMN IF NOT EXISTS archived_by TEXT;
ALTER TABLE project_activities ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());
ALTER TABLE project_activities ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

ALTER TABLE beneficiaries ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE beneficiaries ADD COLUMN IF NOT EXISTS note TEXT;
ALTER TABLE beneficiaries ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE beneficiaries ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE beneficiaries ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false;
ALTER TABLE beneficiaries ADD COLUMN IF NOT EXISTS archived_by TEXT;
ALTER TABLE beneficiaries ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());
ALTER TABLE beneficiaries ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

ALTER TABLE issues ADD COLUMN IF NOT EXISTS date_occurred TEXT;
ALTER TABLE issues ADD COLUMN IF NOT EXISTS source_type TEXT;
ALTER TABLE issues ADD COLUMN IF NOT EXISTS updates JSONB DEFAULT '[]'::jsonb;
ALTER TABLE issues ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false;
ALTER TABLE issues ADD COLUMN IF NOT EXISTS archived_by TEXT;
ALTER TABLE issues ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());
ALTER TABLE issues ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());
ALTER TABLE issues DROP CONSTRAINT IF EXISTS issues_severity_check;
ALTER TABLE issues DROP CONSTRAINT IF EXISTS issues_status_check;

ALTER TABLE staff ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS joined_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS archived_by TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());
ALTER TABLE staff ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

ALTER TABLE project_reflections ADD COLUMN IF NOT EXISTS project_name TEXT DEFAULT 'DFW Indonesia';
ALTER TABLE project_reflections ADD COLUMN IF NOT EXISTS reflection_date TEXT;
ALTER TABLE project_reflections ADD COLUMN IF NOT EXISTS lesson_learned TEXT;
ALTER TABLE project_reflections ADD COLUMN IF NOT EXISTS created_by TEXT;
ALTER TABLE project_reflections ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE project_reflections ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false;
ALTER TABLE project_reflections ADD COLUMN IF NOT EXISTS archived_by TEXT;
ALTER TABLE project_reflections ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());
ALTER TABLE project_reflections ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

ALTER TABLE project_documents ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false;
ALTER TABLE project_documents ADD COLUMN IF NOT EXISTS archived_by TEXT;
ALTER TABLE project_documents ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

ALTER TABLE project_sub_activities ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE project_sub_activities ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false;
ALTER TABLE project_sub_activities ADD COLUMN IF NOT EXISTS archived_by TEXT;
ALTER TABLE project_sub_activities ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());
ALTER TABLE project_sub_activities ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());
ALTER TABLE project_sub_activities DROP CONSTRAINT IF EXISTS project_sub_activities_parent_activity_id_fkey;
ALTER TABLE project_sub_activities ADD CONSTRAINT project_sub_activities_parent_activity_id_fkey FOREIGN KEY (parent_activity_id) REFERENCES project_activities(id) ON DELETE CASCADE NOT VALID;`;
                            navigator.clipboard.writeText(sqlText);
                            setSqlCopied(true);
                            setTimeout(() => setSqlCopied(false), 2500);
                          }}
                          className="px-2.5 py-1 text-[10px] font-bold shadow-xs hover:shadow-sm bg-white hover:bg-slate-50 border border-slate-250 text-blue-600 rounded-lg flex items-center gap-1.5 cursor-pointer transition-all animate-none inline-flex"
                        >
                          {sqlCopied ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                              <span className="text-emerald-600 font-bold">Tersalin!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Salin Skema SQL</span>
                            </>
                          )}
                        </button>
                      </div>

                      <div className="bg-slate-900 text-slate-100 rounded-xl p-3 text-[10px] font-mono leading-relaxed h-52 overflow-y-auto border border-slate-800 shadow-inner select-text">
                        <span className="text-amber-400">-- KONFIGURASI FORMAT TANGGAL</span>{"\n"}
                        <span className="text-purple-400">ALTER DATABASE</span> postgres <span className="text-purple-400">SET</span> datestyle <span className="text-purple-400">TO</span> <span className="text-emerald-400">'ISO, DMY'</span>;{"\n"}{"\n"}

                        <span className="text-amber-400">-- 1. Tabel Projects</span>{"\n"}
                        <span className="text-purple-400">CREATE TABLE IF NOT EXISTS</span> projects ({"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;id UUID <span className="text-emerald-400">PRIMARY KEY</span>,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;name TEXT <span className="text-red-400">NOT NULL</span>,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;location TEXT,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;owner TEXT,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;donor TEXT,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;status TEXT,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;start_date DATE,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;deadline DATE,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;progress NUMERIC <span className="text-blue-400">DEFAULT</span> 0,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;budget_approved DOUBLE PRECISION <span className="text-blue-400">DEFAULT</span> 0,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;budget_actual DOUBLE PRECISION <span className="text-blue-400">DEFAULT</span> 0,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;"desc" TEXT,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;description TEXT,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;note TEXT,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;goal TEXT,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;is_archived BOOLEAN <span className="text-blue-400">DEFAULT</span> <span className="text-emerald-400">false</span>,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;archived BOOLEAN <span className="text-blue-400">DEFAULT</span> <span className="text-emerald-400">false</span>,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;archored_by TEXT,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;archived_by TEXT,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;archived_at TIMESTAMP WITH TIME ZONE,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;created_at TIMESTAMP WITH TIME ZONE <span className="text-blue-400">DEFAULT</span> timezone('utc'::text, now()),{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;updated_at TIMESTAMP WITH TIME ZONE <span className="text-blue-400">DEFAULT</span> timezone('utc'::text, now()){"\n"}
                        );{"\n"}{"\n"}
                        
                        <span className="text-amber-400">-- 2. Tabel Project Indicators</span>{"\n"}
                        <span className="text-purple-400">CREATE TABLE IF NOT EXISTS</span> project_indicators ({"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;id UUID <span className="text-emerald-400">PRIMARY KEY</span>,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;project_id UUID <span className="text-emerald-400">REFERENCES</span> projects(id) <span className="text-purple-400">ON DELETE CASCADE</span>,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;title TEXT, <span className="text-slate-400">-- Boleh NULL untuk impor CSV</span>{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;indicator_name TEXT,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;target NUMERIC <span className="text-blue-400">DEFAULT</span> 0,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;current NUMERIC <span className="text-blue-400">DEFAULT</span> 0,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;actual NUMERIC <span className="text-blue-400">DEFAULT</span> 0,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;type TEXT,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;sort_order INTEGER <span className="text-blue-400">DEFAULT</span> 0,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;unit TEXT,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;last_updated TEXT,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;last_value NUMERIC <span className="text-blue-400">DEFAULT</span> 0,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;project_name TEXT <span className="text-blue-400">DEFAULT</span> <span className="text-emerald-400">'DFW Indonesia'</span>,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;notes TEXT,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;notes_updated_at TEXT,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;description TEXT,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;archived BOOLEAN <span className="text-blue-400">DEFAULT</span> <span className="text-emerald-400">false</span>,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;archived_by TEXT,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;created_at TIMESTAMP WITH TIME ZONE <span className="text-blue-400">DEFAULT</span> timezone('utc'::text, now()),{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;updated_at TIMESTAMP WITH TIME ZONE <span className="text-blue-400">DEFAULT</span> timezone('utc'::text, now()){"\n"}
                        );{"\n"}{"\n"}

                        <span className="text-amber-400">-- 3. Tabel Project Outcomes</span>{"\n"}
                        <span className="text-purple-400">CREATE TABLE IF NOT EXISTS</span> project_outcomes ({"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;id UUID <span className="text-emerald-400">PRIMARY KEY</span>,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;project_id UUID <span className="text-emerald-400">REFERENCES</span> projects(id) <span className="text-purple-400">ON DELETE CASCADE</span>,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;title TEXT, <span className="text-slate-400">-- Boleh NULL untuk impor CSV</span>{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;outcome_text TEXT,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;sort_order INTEGER <span className="text-blue-400">DEFAULT</span> 0,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;project_name TEXT <span className="text-blue-400">DEFAULT</span> <span className="text-emerald-400">'DFW Indonesia'</span>,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;description TEXT,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;archived BOOLEAN <span className="text-blue-400">DEFAULT</span> <span className="text-emerald-400">false</span>,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;archived_by TEXT,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;created_at TIMESTAMP WITH TIME ZONE <span className="text-blue-400">DEFAULT</span> timezone('utc'::text, now()),{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;updated_at TIMESTAMP WITH TIME ZONE <span className="text-blue-400">DEFAULT</span> timezone('utc'::text, now()){"\n"}
                        );{"\n"}{"\n"}

                        <span className="text-amber-400">-- 4. Tabel Project Activities</span>{"\n"}
                        <span className="text-purple-400">CREATE TABLE IF NOT EXISTS</span> project_activities ({"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;id UUID <span className="text-emerald-400">PRIMARY KEY</span>,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;project_id UUID <span className="text-emerald-400">REFERENCES</span> projects(id) <span className="text-purple-400">ON DELETE CASCADE</span>,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;title TEXT <span className="text-red-400">NOT NULL</span>,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;"desc" TEXT,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;description TEXT,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;pic TEXT,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;status TEXT,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;start_date DATE,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;due_date DATE,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;progress NUMERIC <span className="text-blue-400">DEFAULT</span> 0,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;notes JSONB <span className="text-blue-400">DEFAULT</span> <span className="text-emerald-400">'[]'::jsonb</span>,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;files JSONB <span className="text-blue-400">DEFAULT</span> <span className="text-emerald-400">'[]'::jsonb</span>,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;archived BOOLEAN <span className="text-blue-400">DEFAULT</span> <span className="text-emerald-400">false</span>,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;archived_by TEXT,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;created_at TIMESTAMP WITH TIME ZONE <span className="text-blue-400">DEFAULT</span> timezone('utc'::text, now()),{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;updated_at TIMESTAMP WITH TIME ZONE <span className="text-blue-400">DEFAULT</span> timezone('utc'::text, now()){"\n"}
                        );{"\n"}{"\n"}

                        <span className="text-amber-400">-- 5. Tabel Beneficiaries</span>{"\n"}
                        <span className="text-purple-400">CREATE TABLE IF NOT EXISTS</span> beneficiaries ({"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;id UUID <span className="text-emerald-400">PRIMARY KEY</span>,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;full_name TEXT <span className="text-red-400">NOT NULL</span>,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;phone TEXT,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;gender TEXT,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;birth_year INTEGER,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;location TEXT,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;occupation TEXT,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;email TEXT,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;note TEXT,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;notes TEXT,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;registrations JSONB <span className="text-blue-400">DEFAULT</span> <span className="text-emerald-400">'[]'::jsonb</span>,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;description TEXT,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;archived BOOLEAN <span className="text-blue-400">DEFAULT</span> <span className="text-emerald-400">false</span>,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;archived_by TEXT,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;created_at TIMESTAMP WITH TIME ZONE <span className="text-blue-400">DEFAULT</span> timezone('utc'::text, now()),{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;updated_at TIMESTAMP WITH TIME ZONE <span className="text-blue-400">DEFAULT</span> timezone('utc'::text, now()){"\n"}
                        );{"\n"}{"\n"}

                        <span className="text-amber-400">-- 6. Tabel Issues</span>{"\n"}
                        <span className="text-purple-400">CREATE TABLE IF NOT EXISTS</span> issues ({"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;id UUID <span className="text-emerald-400">PRIMARY KEY</span>,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;title TEXT <span className="text-red-400">NOT NULL</span>,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;description TEXT,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;category TEXT,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;project_id UUID <span className="text-emerald-400">REFERENCES</span> projects(id) <span className="text-purple-400">ON DELETE SET NULL</span>,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;activity_id UUID <span className="text-emerald-400">REFERENCES</span> project_activities(id) <span className="text-purple-400">ON DELETE SET NULL</span>,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;severity TEXT,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;status TEXT,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;date_occurred TEXT,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;source_type TEXT,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;source_link TEXT,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;tags TEXT,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;updates JSONB <span className="text-blue-400">DEFAULT</span> <span className="text-emerald-400">'[]'::jsonb</span>,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;archived BOOLEAN <span className="text-blue-400">DEFAULT</span> <span className="text-emerald-400">false</span>,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;archived_by TEXT,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;created_at TIMESTAMP WITH TIME ZONE <span className="text-blue-400">DEFAULT</span> timezone('utc'::text, now()),{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;updated_at TIMESTAMP WITH TIME ZONE <span className="text-blue-400">DEFAULT</span> timezone('utc'::text, now()){"\n"}
                        );{"\n"}{"\n"}

                        <span className="text-amber-400">-- 7. Tabel Staff</span>{"\n"}
                        <span className="text-purple-400">CREATE TABLE IF NOT EXISTS</span> staff ({"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;id UUID <span className="text-emerald-400">PRIMARY KEY</span>,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;name TEXT <span className="text-red-400">NOT NULL</span>,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;role TEXT,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;status TEXT <span className="text-blue-400">DEFAULT</span> <span className="text-emerald-400">'active'</span>,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;email TEXT,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;phone TEXT,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;is_active BOOLEAN <span className="text-blue-400">DEFAULT</span> <span className="text-emerald-400">true</span>,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;joined_at TIMESTAMP WITH TIME ZONE,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;description TEXT,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;archived BOOLEAN <span className="text-blue-400">DEFAULT</span> <span className="text-emerald-400">false</span>,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;archived_by TEXT,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;created_at TIMESTAMP WITH TIME ZONE <span className="text-blue-400">DEFAULT</span> timezone('utc'::text, now()),{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;updated_at TIMESTAMP WITH TIME ZONE <span className="text-blue-400">DEFAULT</span> timezone('utc'::text, now()){"\n"}
                        );{"\n"}{"\n"}

                        <span className="text-amber-400">-- 8. Tabel Project Reflections</span>{"\n"}
                        <span className="text-purple-400">CREATE TABLE IF NOT EXISTS</span> project_reflections ({"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;id UUID <span className="text-emerald-400">PRIMARY KEY</span>,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;project_id UUID <span className="text-emerald-400">REFERENCES</span> projects(id) <span className="text-purple-400">ON DELETE CASCADE</span>,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;title TEXT,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;type TEXT,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;date DATE,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;reflection_date TEXT,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;what_happened TEXT,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;what_worked TEXT,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;what_didnt TEXT,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;lesson TEXT, <span className="text-slate-400">-- Boleh NULL untuk impor CSV</span>{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;lesson_learned TEXT,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;next_steps TEXT,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;contributor TEXT,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;created_by TEXT,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;project_name TEXT <span className="text-blue-400">DEFAULT</span> <span className="text-emerald-400">'DFW Indonesia'</span>,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;description TEXT,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;archived BOOLEAN <span className="text-blue-400">DEFAULT</span> <span className="text-emerald-400">false</span>,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;archived_by TEXT,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;created_at TIMESTAMP WITH TIME ZONE <span className="text-blue-400">DEFAULT</span> timezone('utc'::text, now()),{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;updated_at TIMESTAMP WITH TIME ZONE <span className="text-blue-400">DEFAULT</span> timezone('utc'::text, now()){"\n"}
                        );{"\n"}{"\n"}

                        <span className="text-amber-400">-- 9. Tabel Project Documents</span>{"\n"}
                        <span className="text-purple-400">CREATE TABLE IF NOT EXISTS</span> project_documents ({"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;id UUID <span className="text-emerald-400">PRIMARY KEY</span>,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;project_name TEXT <span className="text-blue-400">DEFAULT</span> <span className="text-emerald-400">'DFW Indonesia'</span>,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;category TEXT,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;file_name TEXT <span className="text-red-400">NOT NULL</span>,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;mime_type TEXT,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;file_size BIGINT <span className="text-blue-400">DEFAULT</span> 0,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;drive_file_id TEXT,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;drive_folder_id TEXT,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;web_view_link TEXT,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;description TEXT,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;archived BOOLEAN <span className="text-blue-400">DEFAULT</span> <span className="text-emerald-400">false</span>,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;archived_by TEXT,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;created_at TIMESTAMP WITH TIME ZONE <span className="text-blue-400">DEFAULT</span> timezone('utc'::text, now()),{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;updated_at TIMESTAMP WITH TIME ZONE <span className="text-blue-400">DEFAULT</span> timezone('utc'::text, now()){"\n"}
                        );{"\n"}{"\n"}

                        <span className="text-amber-400">-- 10. Tabel Project Sub-Activities</span>{"\n"}
                        <span className="text-purple-400">CREATE TABLE IF NOT EXISTS</span> project_sub_activities ({"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;id UUID <span className="text-emerald-400">PRIMARY KEY</span>,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;parent_activity_id UUID <span className="text-emerald-400">REFERENCES</span> project_activities(id) <span className="text-purple-400">ON DELETE CASCADE</span>,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;title TEXT <span className="text-red-400">NOT NULL</span>,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;"desc" TEXT,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;description TEXT,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;pic TEXT,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;status TEXT,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;priority TEXT,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;due DATE,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;archived BOOLEAN <span className="text-blue-400">DEFAULT</span> <span className="text-emerald-400">false</span>,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;archived_by TEXT,{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;created_at TIMESTAMP WITH TIME ZONE <span className="text-blue-400">DEFAULT</span> timezone('utc'::text, now()),{"\n"}
                        &nbsp;&nbsp;&nbsp;&nbsp;updated_at TIMESTAMP WITH TIME ZONE <span className="text-blue-400">DEFAULT</span> timezone('utc'::text, now()){"\n"}
                        );{"\n"}{"\n"}

                        <span className="text-amber-400">-- PENTING: DISABLE ROW LEVEL SECURITY (RLS)</span>{"\n"}
                        <span className="text-purple-400">ALTER TABLE</span> projects <span className="text-emerald-400">DISABLE ROW LEVEL SECURITY</span>;{"\n"}
                        <span className="text-purple-400">ALTER TABLE</span> project_indicators <span className="text-emerald-400">DISABLE ROW LEVEL SECURITY</span>;{"\n"}
                        <span className="text-purple-400">ALTER TABLE</span> project_outcomes <span className="text-emerald-400">DISABLE ROW LEVEL SECURITY</span>;{"\n"}
                        <span className="text-purple-400">ALTER TABLE</span> project_activities <span className="text-emerald-400">DISABLE ROW LEVEL SECURITY</span>;{"\n"}
                        <span className="text-purple-400">ALTER TABLE</span> beneficiaries <span className="text-emerald-400">DISABLE ROW LEVEL SECURITY</span>;{"\n"}
                        <span className="text-purple-400">ALTER TABLE</span> issues <span className="text-emerald-400">DISABLE ROW LEVEL SECURITY</span>;{"\n"}
                        <span className="text-purple-400">ALTER TABLE</span> staff <span className="text-emerald-400">DISABLE ROW LEVEL SECURITY</span>;{"\n"}
                        <span className="text-purple-400">ALTER TABLE</span> project_reflections <span className="text-emerald-400">DISABLE ROW LEVEL SECURITY</span>;{"\n"}
                        <span className="text-purple-400">ALTER TABLE</span> project_documents <span className="text-emerald-400">DISABLE ROW LEVEL SECURITY</span>;{"\n"}
                        <span className="text-purple-400">ALTER TABLE</span> project_sub_activities <span className="text-emerald-400">DISABLE ROW LEVEL SECURITY</span>;{"\n"}{"\n"}

                        <span className="text-amber-400">-- KOSTUMISASI COMPATIBILITY: JALANKAN ALTER TABLE JIKA TABEL SUDAH ADA SEBELUMNYA DAN MENGALAMI HILANG KOLOM ATAU PERBAIKAN CONSTRAINT</span>{"\n"}
                        <span className="text-purple-400">ALTER TABLE</span> projects <span className="text-purple-400">ADD COLUMN IF NOT EXISTS</span> description TEXT;{"\n"}
                        <span className="text-purple-400">ALTER TABLE</span> projects <span className="text-purple-400">ADD COLUMN IF NOT EXISTS</span> archived BOOLEAN <span className="text-blue-400">DEFAULT</span> <span className="text-emerald-400">false</span>;{"\n"}
                        <span className="text-purple-400">ALTER TABLE</span> projects <span className="text-purple-400">ADD COLUMN IF NOT EXISTS</span> archived_by TEXT;{"\n"}
                        <span className="text-purple-400">ALTER TABLE</span> projects <span className="text-purple-400">ADD COLUMN IF NOT EXISTS</span> created_at TIMESTAMP WITH TIME ZONE <span className="text-blue-400">DEFAULT</span> timezone('utc'::text, now());{"\n"}
                        <span className="text-purple-400">ALTER TABLE</span> projects <span className="text-purple-400">ADD COLUMN IF NOT EXISTS</span> updated_at TIMESTAMP WITH TIME ZONE <span className="text-blue-400">DEFAULT</span> timezone('utc'::text, now());{"\n"}{"\n"}

                        <span className="text-purple-400">ALTER TABLE</span> project_indicators <span className="text-purple-400">ADD COLUMN IF NOT EXISTS</span> project_name TEXT <span className="text-blue-400">DEFAULT</span> <span className="text-emerald-400">'DFW Indonesia'</span>;{"\n"}
                        <span className="text-purple-400">ALTER TABLE</span> project_indicators <span className="text-purple-400">ADD COLUMN IF NOT EXISTS</span> notes TEXT;{"\n"}
                        <span className="text-purple-400">ALTER TABLE</span> project_indicators <span className="text-purple-400">ADD COLUMN IF NOT EXISTS</span> notes_updated_at TEXT;{"\n"}
                        <span className="text-purple-400">ALTER TABLE</span> project_indicators <span className="text-purple-400">ADD COLUMN IF NOT EXISTS</span> description TEXT;{"\n"}
                        <span className="text-purple-400">ALTER TABLE</span> project_indicators <span className="text-purple-400">ADD COLUMN IF NOT EXISTS</span> archived BOOLEAN <span className="text-blue-400">DEFAULT</span> <span className="text-emerald-400">false</span>;{"\n"}
                        <span className="text-purple-400">ALTER TABLE</span> project_indicators <span className="text-purple-400">ADD COLUMN IF NOT EXISTS</span> archived_by TEXT;{"\n"}
                        <span className="text-purple-400">ALTER TABLE</span> project_indicators <span className="text-purple-400">ADD COLUMN IF NOT EXISTS</span> indicator_name TEXT;{"\n"}
                        <span className="text-purple-400">ALTER TABLE</span> project_indicators <span className="text-purple-400">ADD COLUMN IF NOT EXISTS</span> type TEXT;{"\n"}
                        <span className="text-purple-400">ALTER TABLE</span> project_indicators <span className="text-purple-400">ADD COLUMN IF NOT EXISTS</span> actual NUMERIC <span className="text-blue-400">DEFAULT</span> 0;{"\n"}
                        <span className="text-purple-400">ALTER TABLE</span> project_indicators <span className="text-purple-400">ADD COLUMN IF NOT EXISTS</span> sort_order INTEGER <span className="text-blue-400">DEFAULT</span> 0;{"\n"}
                        <span className="text-purple-400">ALTER TABLE</span> project_indicators <span className="text-purple-400">ADD COLUMN IF NOT EXISTS</span> created_at TIMESTAMP WITH TIME ZONE <span className="text-blue-400">DEFAULT</span> timezone('utc'::text, now());{"\n"}
                        <span className="text-purple-400">ALTER TABLE</span> project_indicators <span className="text-purple-400">ADD COLUMN IF NOT EXISTS</span> updated_at TIMESTAMP WITH TIME ZONE <span className="text-blue-400">DEFAULT</span> timezone('utc'::text, now());{"\n"}{"\n"}

                        <span className="text-purple-400">ALTER TABLE</span> project_outcomes <span className="text-purple-400">ADD COLUMN IF NOT EXISTS</span> project_name TEXT <span className="text-blue-400">DEFAULT</span> <span className="text-emerald-400">'DFW Indonesia'</span>;{"\n"}
                        <span className="text-purple-400">ALTER TABLE</span> project_outcomes <span className="text-purple-400">ADD COLUMN IF NOT EXISTS</span> description TEXT;{"\n"}
                        <span className="text-purple-400">ALTER TABLE</span> project_outcomes <span className="text-purple-400">ADD COLUMN IF NOT EXISTS</span> archived BOOLEAN <span className="text-blue-400">DEFAULT</span> <span className="text-emerald-400">false</span>;{"\n"}
                        <span className="text-purple-400">ALTER TABLE</span> project_outcomes <span className="text-purple-400">ADD COLUMN IF NOT EXISTS</span> archived_by TEXT;{"\n"}
                        <span className="text-purple-400">ALTER TABLE</span> project_outcomes <span className="text-purple-400">ADD COLUMN IF NOT EXISTS</span> created_at TIMESTAMP WITH TIME ZONE <span className="text-blue-400">DEFAULT</span> timezone('utc'::text, now());{"\n"}
                        <span className="text-purple-400">ALTER TABLE</span> project_outcomes <span className="text-purple-400">ADD COLUMN IF NOT EXISTS</span> updated_at TIMESTAMP WITH TIME ZONE <span className="text-blue-400">DEFAULT</span> timezone('utc'::text, now());{"\n"}{"\n"}

                        <span className="text-purple-400">ALTER TABLE</span> project_activities <span className="text-purple-400">ADD COLUMN IF NOT EXISTS</span> pic TEXT;{"\n"}
                        <span className="text-purple-400">ALTER TABLE</span> project_activities <span className="text-purple-400">ADD COLUMN IF NOT EXISTS</span> progress NUMERIC <span className="text-blue-400">DEFAULT</span> 0;{"\n"}
                        <span className="text-purple-400">ALTER TABLE</span> project_activities <span className="text-purple-400">ADD COLUMN IF NOT EXISTS</span> notes JSONB <span className="text-blue-400">DEFAULT</span> <span className="text-emerald-400">'[]'::jsonb</span>;{"\n"}
                        <span className="text-purple-400">ALTER TABLE</span> project_activities <span className="text-purple-400">ADD COLUMN IF NOT EXISTS</span> files JSONB <span className="text-blue-400">DEFAULT</span> <span className="text-emerald-400">'[]'::jsonb</span>;{"\n"}
                        <span className="text-purple-400">ALTER TABLE</span> project_activities <span className="text-purple-400">ADD COLUMN IF NOT EXISTS</span> challenges TEXT;{"\n"}
                        <span className="text-purple-400">ALTER TABLE</span> project_activities <span className="text-purple-400">ADD COLUMN IF NOT EXISTS</span> project_name TEXT <span className="text-blue-400">DEFAULT</span> <span className="text-emerald-400">'DFW Indonesia'</span>;{"\n"}
                        <span className="text-purple-400">ALTER TABLE</span> project_activities <span className="text-purple-400">ADD COLUMN IF NOT EXISTS</span> deadline TEXT;{"\n"}
                        <span className="text-purple-400">ALTER TABLE</span> project_activities <span className="text-purple-400">ADD COLUMN IF NOT EXISTS</span> start_date DATE;{"\n"}
                        <span className="text-purple-400">ALTER TABLE</span> project_activities <span className="text-purple-400">ADD COLUMN IF NOT EXISTS</span> due_date DATE;{"\n"}
                        <span className="text-purple-400">ALTER TABLE</span> project_activities <span className="text-purple-400">ADD COLUMN IF NOT EXISTS</span> "desc" TEXT;{"\n"}
                        <span className="text-purple-400">ALTER TABLE</span> project_activities <span className="text-purple-400">ADD COLUMN IF NOT EXISTS</span> description TEXT;{"\n"}
                        <span className="text-purple-400">ALTER TABLE</span> project_activities <span className="text-purple-400">ADD COLUMN IF NOT EXISTS</span> archived BOOLEAN <span className="text-blue-400">DEFAULT</span> <span className="text-emerald-400">false</span>;{"\n"}
                        <span className="text-purple-400">ALTER TABLE</span> project_activities <span className="text-purple-400">ADD COLUMN IF NOT EXISTS</span> archived_by TEXT;{"\n"}
                        <span className="text-purple-400">ALTER TABLE</span> project_activities <span className="text-purple-400">ADD COLUMN IF NOT EXISTS</span> created_at TIMESTAMP WITH TIME ZONE <span className="text-blue-400">DEFAULT</span> timezone('utc'::text, now());{"\n"}
                        <span className="text-purple-400">ALTER TABLE</span> project_activities <span className="text-purple-400">ADD COLUMN IF NOT EXISTS</span> updated_at TIMESTAMP WITH TIME ZONE <span className="text-blue-400">DEFAULT</span> timezone('utc'::text, now());{"\n"}{"\n"}

                        <span className="text-purple-400">ALTER TABLE</span> beneficiaries <span className="text-purple-400">ADD COLUMN IF NOT EXISTS</span> full_name TEXT;{"\n"}
                        <span className="text-purple-400">ALTER TABLE</span> beneficiaries <span className="text-purple-400">ADD COLUMN IF NOT EXISTS</span> note TEXT;{"\n"}
                        <span className="text-purple-400">ALTER TABLE</span> beneficiaries <span className="text-purple-400">ADD COLUMN IF NOT EXISTS</span> notes TEXT;{"\n"}
                        <span className="text-purple-400">ALTER TABLE</span> beneficiaries <span className="text-purple-400">ADD COLUMN IF NOT EXISTS</span> description TEXT;{"\n"}
                        <span className="text-purple-400">ALTER TABLE</span> beneficiaries <span className="text-purple-400">ADD COLUMN IF NOT EXISTS</span> archived BOOLEAN <span className="text-blue-400">DEFAULT</span> <span className="text-emerald-400">false</span>;{"\n"}
                        <span className="text-purple-400">ALTER TABLE</span> beneficiaries <span className="text-purple-400">ADD COLUMN IF NOT EXISTS</span> archived_by TEXT;{"\n"}
                        <span className="text-purple-400">ALTER TABLE</span> beneficiaries <span className="text-purple-400">ADD COLUMN IF NOT EXISTS</span> created_at TIMESTAMP WITH TIME ZONE <span className="text-blue-400">DEFAULT</span> timezone('utc'::text, now());{"\n"}
                        <span className="text-purple-400">ALTER TABLE</span> beneficiaries <span className="text-purple-400">ADD COLUMN IF NOT EXISTS</span> updated_at TIMESTAMP WITH TIME ZONE <span className="text-blue-400">DEFAULT</span> timezone('utc'::text, now());{"\n"}{"\n"}

                        <span className="text-purple-400">ALTER TABLE</span> issues <span className="text-purple-400">ADD COLUMN IF NOT EXISTS</span> date_occurred TEXT;{"\n"}
                        <span className="text-purple-400">ALTER TABLE</span> issues <span className="text-purple-400">ADD COLUMN IF NOT EXISTS</span> source_type TEXT;{"\n"}
                        <span className="text-purple-400">ALTER TABLE</span> issues <span className="text-purple-400">ADD COLUMN IF NOT EXISTS</span> updates JSONB <span className="text-blue-400">DEFAULT</span> <span className="text-emerald-400">'[]'::jsonb</span>;{"\n"}
                        <span className="text-purple-400">ALTER TABLE</span> issues <span className="text-purple-400">ADD COLUMN IF NOT EXISTS</span> archived BOOLEAN <span className="text-blue-400">DEFAULT</span> <span className="text-emerald-400">false</span>;{"\n"}
                        <span className="text-purple-400">ALTER TABLE</span> issues <span className="text-purple-400">ADD COLUMN IF NOT EXISTS</span> archived_by TEXT;{"\n"}
                        <span className="text-purple-400">ALTER TABLE</span> issues <span className="text-purple-400">ADD COLUMN IF NOT EXISTS</span> created_at TIMESTAMP WITH TIME ZONE <span className="text-blue-400">DEFAULT</span> timezone('utc'::text, now());{"\n"}
                        <span className="text-purple-400">ALTER TABLE</span> issues <span className="text-purple-400">ADD COLUMN IF NOT EXISTS</span> updated_at TIMESTAMP WITH TIME ZONE <span className="text-blue-400">DEFAULT</span> timezone('utc'::text, now());{"\n"}
                        <span className="text-purple-400">ALTER TABLE</span> issues <span className="text-purple-400">DROP CONSTRAINT IF EXISTS</span> issues_severity_check;{"\n"}
                        <span className="text-purple-400">ALTER TABLE</span> issues <span className="text-purple-400">DROP CONSTRAINT IF EXISTS</span> issues_status_check;{"\n"}{"\n"}

                        <span className="text-purple-400">ALTER TABLE</span> staff <span className="text-purple-400">ADD COLUMN IF NOT EXISTS</span> email TEXT;{"\n"}
                        <span className="text-purple-400">ALTER TABLE</span> staff <span className="text-purple-400">ADD COLUMN IF NOT EXISTS</span> phone TEXT;{"\n"}
                        <span className="text-purple-400">ALTER TABLE</span> staff <span className="text-purple-400">ADD COLUMN IF NOT EXISTS</span> is_active BOOLEAN <span className="text-blue-400">DEFAULT</span> <span className="text-emerald-400">true</span>;{"\n"}
                        <span className="text-purple-400">ALTER TABLE</span> staff <span className="text-purple-400">ADD COLUMN IF NOT EXISTS</span> joined_at TIMESTAMP WITH TIME ZONE;{"\n"}
                        <span className="text-purple-400">ALTER TABLE</span> staff <span className="text-purple-400">ADD COLUMN IF NOT EXISTS</span> description TEXT;{"\n"}
                        <span className="text-purple-400">ALTER TABLE</span> staff <span className="text-purple-400">ADD COLUMN IF NOT EXISTS</span> archived BOOLEAN <span className="text-blue-400">DEFAULT</span> <span className="text-emerald-400">false</span>;{"\n"}
                        <span className="text-purple-400">ALTER TABLE</span> staff <span className="text-purple-400">ADD COLUMN IF NOT EXISTS</span> archived_by TEXT;{"\n"}
                        <span className="text-purple-400">ALTER TABLE</span> staff <span className="text-purple-400">ADD COLUMN IF NOT EXISTS</span> created_at TIMESTAMP WITH TIME ZONE <span className="text-blue-400">DEFAULT</span> timezone('utc'::text, now());{"\n"}
                        <span className="text-purple-400">ALTER TABLE</span> staff <span className="text-purple-400">ADD COLUMN IF NOT EXISTS</span> updated_at TIMESTAMP WITH TIME ZONE <span className="text-blue-400">DEFAULT</span> timezone('utc'::text, now());{"\n"}{"\n"}

                        <span className="text-purple-400">ALTER TABLE</span> project_reflections <span className="text-purple-400">ADD COLUMN IF NOT EXISTS</span> description TEXT;{"\n"}
                        <span className="text-purple-400">ALTER TABLE</span> project_reflections <span className="text-purple-400">ADD COLUMN IF NOT EXISTS</span> archived BOOLEAN <span className="text-blue-400">DEFAULT</span> <span className="text-emerald-400">false</span>;{"\n"}
                        <span className="text-purple-400">ALTER TABLE</span> project_reflections <span className="text-purple-400">ADD COLUMN IF NOT EXISTS</span> archived_by TEXT;{"\n"}
                        <span className="text-purple-400">ALTER TABLE</span> project_reflections <span className="text-purple-400">ADD COLUMN IF NOT EXISTS</span> created_at TIMESTAMP WITH TIME ZONE <span className="text-blue-400">DEFAULT</span> timezone('utc'::text, now());{"\n"}
                        <span className="text-purple-400">ALTER TABLE</span> project_reflections <span className="text-purple-400">ADD COLUMN IF NOT EXISTS</span> updated_at TIMESTAMP WITH TIME ZONE <span className="text-blue-400">DEFAULT</span> timezone('utc'::text, now());{"\n"}{"\n"}

                        <span className="text-purple-400">ALTER TABLE</span> project_documents <span className="text-purple-400">ADD COLUMN IF NOT EXISTS</span> archived BOOLEAN <span className="text-blue-400">DEFAULT</span> <span className="text-emerald-400">false</span>;{"\n"}
                        <span className="text-purple-400">ALTER TABLE</span> project_documents <span className="text-purple-400">ADD COLUMN IF NOT EXISTS</span> archived_by TEXT;{"\n"}
                        <span className="text-purple-400">ALTER TABLE</span> project_documents <span className="text-purple-400">ADD COLUMN IF NOT EXISTS</span> updated_at TIMESTAMP WITH TIME ZONE <span className="text-blue-400">DEFAULT</span> timezone('utc'::text, now());{"\n"}{"\n"}

                        <span className="text-purple-400">ALTER TABLE</span> project_sub_activities <span className="text-purple-400">ADD COLUMN IF NOT EXISTS</span> pic TEXT;{"\n"}
                        <span className="text-purple-400">ALTER TABLE</span> project_sub_activities <span className="text-purple-400">ADD COLUMN IF NOT EXISTS</span> priority TEXT <span className="text-blue-400">DEFAULT</span> <span className="text-emerald-400">'Normal'</span>;{"\n"}
                        <span className="text-purple-400">ALTER TABLE</span> project_sub_activities <span className="text-purple-400">ADD COLUMN IF NOT EXISTS</span> due TEXT;{"\n"}
                        <span className="text-purple-400">ALTER TABLE</span> project_sub_activities <span className="text-purple-400">ADD COLUMN IF NOT EXISTS</span> "desc" TEXT;{"\n"}
                        <span className="text-purple-400">ALTER TABLE</span> project_sub_activities <span className="text-purple-400">ADD COLUMN IF NOT EXISTS</span> description TEXT;{"\n"}
                        <span className="text-purple-400">ALTER TABLE</span> project_sub_activities <span className="text-purple-400">ADD COLUMN IF NOT EXISTS</span> archived BOOLEAN <span className="text-blue-400">DEFAULT</span> <span className="text-emerald-400">false</span>;{"\n"}
                        <span className="text-purple-400">ALTER TABLE</span> project_sub_activities <span className="text-purple-400">ADD COLUMN IF NOT EXISTS</span> archived_by TEXT;{"\n"}
                        <span className="text-purple-400">ALTER TABLE</span> project_sub_activities <span className="text-purple-400">ADD COLUMN IF NOT EXISTS</span> created_at TIMESTAMP WITH TIME ZONE <span className="text-blue-400">DEFAULT</span> timezone('utc'::text, now());{"\n"}
                        <span className="text-purple-400">ALTER TABLE</span> project_sub_activities <span className="text-purple-400">ADD COLUMN IF NOT EXISTS</span> updated_at TIMESTAMP WITH TIME ZONE <span className="text-blue-400">DEFAULT</span> timezone('utc'::text, now());
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* --- INTEGRATED MODALS ROUTING AND POPUPS --- */}
      <ActivityModal
        isOpen={isActivityModalOpen}
        activity={selectedActivity}
        projectId={selectedProjectId}
        staffList={staffNamesList}
        onClose={() => {
          setIsActivityModalOpen(false);
          setSelectedActivity(undefined);
        }}
        onSave={handleSaveActivityModal}
        onOpenSubActivities={(activityId) => {
          setActiveParentActivityId(activityId);
          setIsSubActivitiesModalOpen(true);
        }}
      />

      <SubActivitiesModal
        isOpen={isSubActivitiesModalOpen}
        parentActivityId={activeParentActivityId}
        subActivities={subActivities}
        staffList={staffNamesList}
        onClose={() => {
          setIsSubActivitiesModalOpen(false);
          setActiveParentActivityId('');
        }}
        onSaveSubActivity={handleSaveSubActivity}
        onDeleteSubActivity={handleDeleteSubActivity}
      />

      <PrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        onGeneratePrint={handleGeneratePrintOutput}
      />

      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportDone={handleImportSuccessCallback}
      />

      <BeneficiaryModal
        isOpen={isBenModalOpen}
        beneficiary={selectedBen}
        projectsList={projects.map((p) => ({ id: p.id, name: p.name }))}
        defaultProjectId={defaultBenProjectId}
        onClose={() => {
          setIsBenModalOpen(false);
          setSelectedBen(undefined);
          setDefaultBenProjectId('');
        }}
        onSave={handleSaveBeneficiaryForm}
      />

      <BenDetailModal
        isOpen={isBenDetailModalOpen}
        beneficiary={selectedDetailBen}
        projects={projects}
        activities={activities}
        onClose={() => {
          setIsBenDetailModalOpen(false);
          setSelectedDetailBen(undefined);
        }}
      />

      <StaffTasksModal
        isOpen={isStaffTasksModalOpen}
        staffName={selectedStaffTasksName}
        activities={activities}
        projects={projects}
        subActivities={subActivities}
        onClose={() => {
          setIsStaffTasksModalOpen(false);
          setSelectedStaffTasksName('');
        }}
        onEditActivity={(act) => {
          setIsStaffTasksModalOpen(false);
          setSelectedStaffTasksName('');
          setSelectedActivity(act);
          setIsActivityModalOpen(true);
        }}
        onEditSubActivity={(sub) => {
          setIsStaffTasksModalOpen(false);
          setSelectedStaffTasksName('');
          setActiveParentActivityId(sub.parentActivityId);
          setIsSubActivitiesModalOpen(true);
        }}
      />

      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        cancelText={confirmState.cancelText}
        type={confirmState.type}
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}

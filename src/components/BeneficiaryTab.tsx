import React, { useState, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Beneficiary, Project, Activity, BeneficiaryRegistration, SubActivity } from '../types';
import { SupabaseSync } from '../lib/supabaseSync';
import { safeStorage } from '../lib/safeStorage';
import {
  Search,
  FileSpreadsheet,
  Download,
  Plus,
  Eye,
  Edit2,
  ChevronUp,
  ChevronDown,
  MapPin,
  X,
  Upload,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  RefreshCw,
  FolderOpen
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';

interface BeneficiaryTabProps {
  beneficiaries: Beneficiary[];
  projects: Project[];
  activities: Activity[];
  subActivities?: SubActivity[];
  onUpdateBeneficiaries: (newList: Beneficiary[]) => void;
  onUpdateProjects?: (newList: Project[]) => void;
  onUpdateActivities?: (newList: Activity[]) => void;
  onUpdateSubActivities?: (newList: SubActivity[]) => void;
  onOpenAddModal: (defaultProjId?: string) => void;
  onOpenEditModal: (ben: Beneficiary) => void;
  onOpenDetailModal: (ben: Beneficiary) => void;
}

const CHART_COLORS = [
  '#2563eb', // Blue-600
  '#0891b2', // Cyan-600
  '#059669', // Emerald-600
  '#d97706', // Amber-600
  '#dc2626', // Red-600
  '#7c3aed', // Violet-600
  '#db2777', // Pink-600
  '#ea580c', // Orange-600
  '#0284c7', // Sky-600
  '#14b8a6'  // Teal-600
];

// Robust flat column mapping case-insensitive aliases for Excel Imports
const FLAT_COL_MAP = {
  project_name: [
    'project', 'proyek', 'nama proyek', 'project name', 'nama_proyek', 'project_name', 
    'proyek pembinaan terikat', 'target proyek / program', 'target proyek', 'program', 
    'proyek_pembinaan_terikat', 'target_proyek_program'
  ],
  activity_name: [
    'aktivitas', 'kegiatan', 'activity', 'nama kegiatan', 'event', 'nama_kegiatan', 'activity_name',
    'kegiatan diikuti', 'kegiatan_diikuti'
  ],
  sub_activity_name: [
    'sub aktivitas', 'sub-aktivitas', 'sub kegiatan', 'sub_kegiatan', 'sub kegiatan diikuti', 'sub-kegiatan', 'subactivity', 'sub_activity', 'sub activity name', 'sub_activity_name'
  ],
  name: ['name', 'nama', 'nama lengkap', 'full name', 'nama_lengkap', 'full_name', 'nama*'],
  phone: ['handphone', 'hp', 'no hp', 'no_hp', 'telepon', 'phone', 'nomor_hp', 'no hp/kontak', 'kontak'],
  gender: ['jenis kelamin', 'gender', 'kelamin', 'jenis_kelamin', 'sex'],
  location: ['asal', 'lokasi', 'desa', 'alamat', 'location', 'domisili', 'kecamatan', 'asal/lokasi', 'asal wilayah/lokasi', 'asal_wilayah_lokasi'],
  occupation: ['pekerjaan', 'occupation', 'profesi', 'job', 'pekerjaan utama', 'pekerjaan_utama', 'pekerjaan_utama_penerima'],
  birthyear: ['tahun lahir', 'birth_year', 'thn_lahir', 'tahun_lahir', 'lahir', 'tahun_lahir', 'estimasi usia', 'usia'],
  email: ['email', 'e_mail', 'surel', 'alamat email', 'alamat_email'],
  note: ['catatan', 'note', 'keterangan', 'keterangan catatan', 'catatan tambahan', 'keterangan_catatan'],
  attended_date: ['tanggal', 'tanggal hadir', 'event date', 'date', 'attended_date', 'tanggal_hadir']
};

export const formatOccupation = (raw: any): string => {
  if (raw === null || raw === undefined) return 'Tidak Diketahui';
  let str = '';
  if (typeof raw === 'string') {
    str = raw;
  } else if (typeof raw.toString === 'function') {
    str = raw.toString();
  } else {
    return 'Tidak Diketahui';
  }
  const trimmed = str.trim();
  if (!trimmed) return 'Tidak Diketahui';
  
  // Capitalize first letter of each word (Title Case)
  return trimmed
    .toLowerCase()
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export const BeneficiaryTab: React.FC<BeneficiaryTabProps> = ({
  beneficiaries,
  projects,
  activities,
  subActivities,
  onUpdateBeneficiaries,
  onUpdateProjects,
  onUpdateActivities,
  onUpdateSubActivities,
  onOpenAddModal,
  onOpenEditModal,
  onOpenDetailModal,
}) => {
  const [selectedProjectId, setSelectedProjectId] = useState(() => {
    return safeStorage.getItem('dfw_ben_selected_project_id') || '';
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [toolbarProjectFilter, setToolbarProjectFilter] = useState(() => {
    return safeStorage.getItem('dfw_ben_selected_project_id') || '';
  });
  const [activityFilter, setActivityFilter] = useState('');
  
  // Chart visual toggle state
  const [showCharts, setShowCharts] = useState(true);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Excel Import UI states
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [stagedRows, setStagedRows] = useState<any[] | null>(null);
  const [importFeedback, setImportFeedback] = useState<{ message: string; type: 'success' | 'error' | 'info' | '' }>({ message: '', type: '' });
  const [isImportingProgress, setIsImportingProgress] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeProjects = projects.filter(p => !p.isArchived);

  // Calculate count of unique beneficiaries registered to a specific project
  const getBeneficiaryCountForProject = (projId: string) => {
    return beneficiaries.filter((b) => 
      b.registrations.some((r) => {
        if (!r.projectId) return false;
        return r.projectId === projId || 
               SupabaseSync.getOriginalId(r.projectId) === projId || 
               SupabaseSync.getUuid(r.projectId) === SupabaseSync.getUuid(projId);
      })
    ).length;
  };

  // Compute activities available for dropdown based on active project selection
  const availableActivitiesForFilter = useMemo(() => {
    const activeProj = selectedProjectId || toolbarProjectFilter;
    if (activeProj) {
      return activities.filter(a => a.projectId === activeProj || SupabaseSync.getOriginalId(a.projectId) === activeProj || SupabaseSync.getUuid(a.projectId) === SupabaseSync.getUuid(activeProj));
    }
    return activities;
  }, [activities, selectedProjectId, toolbarProjectFilter]);

  // Synchronize top project selector bar and inside filter dropdown selector
  const syncProjectFilter = (pId: string) => {
    setSelectedProjectId(pId);
    setToolbarProjectFilter(pId);
    setActivityFilter(''); // Reset activity filter when switching projects
    safeStorage.setItem('dfw_ben_selected_project_id', pId);
  };

  // Helper text normalization
  const normalizeBenText = (v: any) => String(v || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const normalizeBenName = (v: any) => normalizeBenText(v);
  const normalizeBenLocation = (v: any) => normalizeBenText(v).replace(/[.,\/\\-]+/g, ' ').replace(/\s+/g, ' ').trim();
  const normalizeBenPhone = (v: any) => {
    const raw = String(v || '').trim();
    if (!raw) return null;
    const digits = raw.replace(/\D/g, '');
    if (!digits) return null;
    if (digits.startsWith('62')) return digits;
    if (digits.startsWith('0')) return '62' + digits.slice(1);
    return digits;
  };

  const parseDate = (v: any) => {
    if (!v) return null;
    const s = String(v).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const m1 = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (m1) return `${m1[3]}-${m1[2].padStart(2, '0')}-${m1[1].padStart(2, '0')}`;
    if (/^\d{4,5}$/.test(s)) {
      const d = new Date(Math.round((parseInt(s) - 25569) * 86400 * 1000));
      if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    }
    return null;
  };

  const normGender = (v: any): 'Laki-laki' | 'Perempuan' => {
    if (!v) return 'Laki-laki';
    const vl = String(v).toLowerCase();
    if (vl.startsWith('l') || vl === 'm' || vl.includes('laki') || vl === 'pria') return 'Laki-laki';
    if (vl.startsWith('p') || vl === 'f' || vl.includes('perempuan') || vl.includes('wanita')) return 'Perempuan';
    return 'Laki-laki';
  };

  // Deduplication check: checks if matching name + phone or name + location
  const findExistingBeneficiary = (list: Beneficiary[], row: any) => {
    const nameNorm = normalizeBenName(row.name);
    if (!nameNorm) return null;
    const phoneNorm = normalizeBenPhone(row.phone);
    const locationNorm = normalizeBenLocation(row.location);

    return list.find(b => {
      const exName = normalizeBenName(b.name);
      if (exName !== nameNorm) return false;

      const exPhone = normalizeBenPhone(b.phone);
      const exLocation = normalizeBenLocation(b.location);

      if (phoneNorm && exPhone && locationNorm && exLocation) {
        return phoneNorm === exPhone && locationNorm === exLocation;
      }
      if (phoneNorm && exPhone) {
        return phoneNorm === exPhone;
      }
      if (locationNorm && exLocation) {
        return locationNorm === exLocation;
      }
      return false;
    });
  };

  // 1. Filter beneficiaries based on project selector, search term, gender, and activity dropdown
  const filteredBeneficiaries = useMemo(() => {
    const activeFilterProjId = selectedProjectId || toolbarProjectFilter;
    return beneficiaries.filter((b) => {
      // Filter by project connection
      if (activeFilterProjId) {
        const isRegisteredToProject = b.registrations.some((r) => {
          if (!r.projectId) return false;
          if (r.projectId === activeFilterProjId) return true;
          if (SupabaseSync.getOriginalId(r.projectId) === activeFilterProjId) return true;
          if (SupabaseSync.getUuid(r.projectId) === SupabaseSync.getUuid(activeFilterProjId)) return true;
          return false;
        });
        if (!isRegisteredToProject) return false;
      }

      // Filter by activity connection
      if (activityFilter) {
        const isRegisteredToActivity = b.registrations.some((r) => {
          if (!r.activityId && !r.activityName) return false;
          if (r.activityId === activityFilter) return true;
          if (r.activityId && SupabaseSync.getOriginalId(r.activityId) === activityFilter) return true;
          if (r.activityId && SupabaseSync.getUuid(r.activityId) === SupabaseSync.getUuid(activityFilter)) return true;
          if (r.activityName) {
            const activeActTitle = activities.find(a => a.id === activityFilter)?.title.toLowerCase().trim();
            if (activeActTitle && r.activityName.toLowerCase().trim() === activeActTitle) return true;
          }
          return false;
        });
        if (!isRegisteredToActivity) return false;
      }

      // Search term (Matches: name, phone, location, occupation)
      const s = searchQuery.toLowerCase().trim();
      const matchesSearch = !s ||
        b.name.toLowerCase().includes(s) ||
        (b.phone && b.phone.includes(s)) ||
        (b.location && b.location.toLowerCase().includes(s)) ||
        (b.occupation && b.occupation.toLowerCase().includes(s));

      // Gender filter
      const matchesGender = genderFilter ? b.gender === genderFilter : true;

      return matchesSearch && matchesGender;
    });
  }, [beneficiaries, selectedProjectId, toolbarProjectFilter, activityFilter, searchQuery, genderFilter, activities]);

  // Reset pagination on filter change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [selectedProjectId, toolbarProjectFilter, searchQuery, genderFilter, activityFilter]);

  // Statistics calculation
  const statsOverview = useMemo(() => {
    const activeProj = selectedProjectId || toolbarProjectFilter;
    
    let maleCount = 0;
    let femaleCount = 0;
    let totalPartisipasi = 0; // standard activity milestones
    let totalLogBebas = 0; // free-text logs (no activityId or explicitly annotated)

    filteredBeneficiaries.forEach((b) => {
      // Gender split
      if (b.gender === 'Laki-laki') maleCount++;
      else if (b.gender === 'Perempuan') femaleCount++;

      // Filter registrations count based on current active project selection if any
      const relevantRegs = activeProj
        ? b.registrations.filter((r) => {
            if (!r.projectId) return false;
            if (r.projectId === activeProj) return true;
            if (SupabaseSync.getOriginalId(r.projectId) === activeProj) return true;
            if (SupabaseSync.getUuid(r.projectId) === SupabaseSync.getUuid(activeProj)) return true;
            return false;
          })
        : b.registrations;

      relevantRegs.forEach((reg) => {
        if (reg.isFreeLog || !reg.activityId) {
          totalLogBebas++;
        } else {
          totalPartisipasi++;
        }
      });
    });

    return {
      total: filteredBeneficiaries.length,
      male: maleCount,
      female: femaleCount,
      partisipasi: totalPartisipasi,
      logBebas: totalLogBebas
    };
  }, [filteredBeneficiaries, selectedProjectId, toolbarProjectFilter]);

  // 2. Prepare visual charts data dynamically based on the filtered list
  const occupationChartData = useMemo(() => {
    const occupationCounts: Record<string, { name: string; value: number; 'Laki-laki': number; 'Perempuan': number }> = {};
    
    filteredBeneficiaries.forEach((b) => {
      const occName = formatOccupation(b.occupation);
      if (!occupationCounts[occName]) {
        occupationCounts[occName] = { name: occName, value: 0, 'Laki-laki': 0, 'Perempuan': 0 };
      }
      occupationCounts[occName].value += 1;
      if (b.gender === 'Perempuan') {
        occupationCounts[occName]['Perempuan'] += 1;
      } else {
        occupationCounts[occName]['Laki-laki'] += 1;
      }
    });

    // Sort descending and cap top ones for donut, combining the minor ones as 'Lainnya' if there are too many
    const rawAll = Object.values(occupationCounts).sort((a, b) => b.value - a.value);
    
    if (rawAll.length <= 6) {
      return rawAll;
    }

    const topOccs = rawAll.slice(0, 5);
    const otherOccs = rawAll.slice(5);
    const otherVal = otherOccs.reduce((sum, item) => sum + item.value, 0);
    const otherMale = otherOccs.reduce((sum, item) => sum + item['Laki-laki'], 0);
    const otherFemale = otherOccs.reduce((sum, item) => sum + item['Perempuan'], 0);

    if (otherVal > 0) {
      topOccs.push({
        name: 'Lainnya',
        value: otherVal,
        'Laki-laki': otherMale,
        'Perempuan': otherFemale
      });
    }

    return topOccs;
  }, [filteredBeneficiaries]);

  // Pagination processing
  const totalPages = Math.ceil(filteredBeneficiaries.length / itemsPerPage);
  const paginatedBeneficiaries = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    return filteredBeneficiaries.slice(startIdx, startIdx + itemsPerPage);
  }, [filteredBeneficiaries, currentPage]);

  const getAge = (birthyear?: number) => {
    if (!birthyear) return '—';
    const currentYear = new Date().getFullYear();
    return currentYear - birthyear;
  };

  // Excel template downloader
  const handleDownloadTemplate = () => {
    try {
      const wb = XLSX.utils.book_new();
      
      const headers = [
        'Project', 'Aktivitas', 'Sub-Aktivitas', 'Nama*', 'Jenis Kelamin',
        'Asal', 'Handphone', 'Pekerjaan', 'Tahun Lahir', 'Tanggal Hadir', 'Catatan'
      ];
      
      const sampleData = [
        ['USAID Oceans — Perlindungan Hak Asasi', 'Pelatihan Hak Ketenagakerjaan Nelayan', 'Sesi Teori Hak Pekerja', 'Ahmad Fauzi', 'Laki-laki', 'Kepulauan Aru / Dobo', '081234567890', 'Nelayan Tangkap', '1985', '2026-03-15', 'Ketua paguyuban nelayan dilingkungan Dobo'],
        ['Enabling Environment - DFW Indonesia', 'Sosialisasi Perlindungan KP', 'Pembagian Buku Panduan', 'Siti Rahma', 'Perempuan', 'Sulawesi Utara / Manado', '082345678901', 'Pengolah Hasil Laut', '1990', '2026-03-15', 'Butuh e-logbook panduan tertulis'],
        ['USAID Oceans — Perlindungan Hak Asasi', 'Consultation Workshop C188', 'Focus Group Discussion', 'Yohanis Maru', 'Laki-laki', 'Wamar / Dobo', '085299887711', 'Anak Buah Kapal', '1988', '2026-04-10', 'Hadir tepat waktu dan membawa berkas kartu keluarga']
      ];

      const wsData = [headers, ...sampleData];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      
      // Auto column widths
      ws['!cols'] = [30, 30, 25, 25, 15, 25, 15, 18, 12, 14, 25].map(w => ({ wch: w }));
      
      // Freezing first row
      ws['!freeze'] = { xSplit: 0, ySplit: 1 };

      XLSX.utils.book_append_sheet(wb, ws, 'Penerima Manfaat');
      XLSX.writeFile(wb, 'Template_PenerimaManfaat_Monev_DFW.xlsx');
    } catch (err: any) {
      alert('Gagal mendownload template format excel: ' + err.message);
    }
  };

  // Robust export Excel to local
  const handleExportToExcel = () => {
    try {
      const activeProjName = selectedProjectId || toolbarProjectFilter
        ? activeProjects.find(p => p.id === (selectedProjectId || toolbarProjectFilter))?.name
        : '';

      const wb = XLSX.utils.book_new();

      // Sheet 1: Master Penerima Manfaat
      const headers1 = [
        'No', 'Nama Lengkap', 'No HP', 'Jenis Kelamin', 'Tahun Lahir', 'Estimasi Usia',
        'Asal Wilayah/Lokasi', 'Pekerjaan Utama', 'Alamat Email', 'Total Kegiatan Diikuti', 'Proyek Pembinaan Terikat', 'Keterangan Catatan'
      ];

      const rows1 = filteredBeneficiaries.map((b, i) => {
        const projs = b.registrations.map(r => {
          const pObj = projects.find(p => p.id === r.projectId || SupabaseSync.getOriginalId(r.projectId) === p.id || SupabaseSync.getUuid(r.projectId) === SupabaseSync.getUuid(p.id));
          return pObj ? pObj.name : 'Proyek Umum';
        });
        const uniqueProjs = Array.from(new Set(projs)).join(', ');

        return [
          i + 1,
          b.name,
          b.phone || '',
          b.gender,
          b.birthyear || '',
          b.birthyear ? (new Date().getFullYear() - b.birthyear) : '',
          b.location || '',
          formatOccupation(b.occupation),
          b.email || '',
          b.registrations.length,
          uniqueProjs || 'Tidak Terikat',
          b.note || ''
        ];
      });

      const ws1 = XLSX.utils.aoa_to_sheet([headers1, ...rows1]);
      ws1['!cols'] = [5, 25, 16, 14, 12, 14, 25, 18, 25, 15, 40, 25].map(w => ({ wch: w }));
      XLSX.utils.book_append_sheet(wb, ws1, 'Penerima Manfaat');

      // Sheet 2: Riwayat Kegiatan Flat
      const headers2 = ['No', 'Nama Penerima', 'No HP/Kontak', 'Target Proyek / Program', 'Pekerjaan', 'Kegiatan Diikuti', 'Sub-Aktivitas', 'Tanggal Kehadiran', 'Kategori Kehadiran', 'Catatan Tambahan'];
      const rows2: any[] = [];
      let no2 = 1;

      filteredBeneficiaries.forEach((b) => {
        b.registrations.forEach((reg) => {
          const pObj = projects.find(p => p.id === reg.projectId || SupabaseSync.getOriginalId(reg.projectId) === p.id || SupabaseSync.getUuid(reg.projectId) === SupabaseSync.getUuid(p.id));
          const actObj = reg.activityId ? activities.find(a => a.id === reg.activityId) : null;
          
          let actNameStr = reg.activityName || 'Aktivitas Umum';
          if (actObj) {
            actNameStr = actObj.title;
          }

          let subActNameStr = reg.subActivityName || '—';

          rows2.push([
            no2++,
            b.name,
            b.phone || '',
            pObj ? pObj.name : 'Program Umum DFW',
            formatOccupation(b.occupation),
            actNameStr,
            subActNameStr,
            reg.attendedDate || '—',
            reg.isFreeLog ? 'Log Bebas' : 'Partisipasi Sistem',
            reg.note || ''
          ]);
        });
      });

      if (rows2.length > 0) {
        const ws2 = XLSX.utils.aoa_to_sheet([headers2, ...rows2]);
        ws2['!cols'] = [5, 25, 16, 35, 18, 35, 25, 15, 18, 25].map(w => ({ wch: w }));
        XLSX.utils.book_append_sheet(wb, ws2, 'Riwayat Kegiatan');
      }

      // Sheet 3: Statistik Demografi Ringkas
      const totalPria = filteredBeneficiaries.filter(b => b.gender === 'Laki-laki').length;
      const totalWanita = filteredBeneficiaries.filter(b => b.gender === 'Perempuan').length;
      
      const statRows = [
        ['RINGKASAN LAPORAN MONEV - PENERIMA MANFAAT PANTAUAN'],
        ['Filter Proyek Aktif', activeProjName || 'Semua Proyek DFW Indonesia'],
        ['Tanggal Penarikan Data', new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })],
        [''],
        ['Ringkasan Parameter', 'Jumlah Kontribusi', 'Persentase Distribusi'],
        ['Total Penerima Manfaat Unik', filteredBeneficiaries.length, '100%'],
        ['Jenis Kelamin: Laki-laki', totalPria, filteredBeneficiaries.length ? `${Math.round(totalPria / filteredBeneficiaries.length * 100)}%` : '0%'],
        ['Jenis Kelamin: Perempuan', totalWanita, filteredBeneficiaries.length ? `${Math.round(totalWanita / filteredBeneficiaries.length * 100)}%` : '0%'],
        [''],
        ['Pekerjaan Terdaftar', 'Jumlah Orang', 'Persentasi Total']
      ];

      // Add occupation statistics to sheet
      const occCountsMap: Record<string, number> = {};
      filteredBeneficiaries.forEach(b => {
        const o = formatOccupation(b.occupation);
        occCountsMap[o] = (occCountsMap[o] || 0) + 1;
      });

      Object.entries(occCountsMap)
        .sort((a, c) => c[1] - a[1])
        .forEach(([occ, count]) => {
          statRows.push([occ, count, filteredBeneficiaries.length ? `${Math.round(count / filteredBeneficiaries.length * 100)}%` : '0%']);
        });

      const ws3 = XLSX.utils.aoa_to_sheet(statRows);
      ws3['!cols'] = [{ wch: 35 }, { wch: 15 }, { wch: 20 }];
      XLSX.utils.book_append_sheet(wb, ws3, 'Statistik');

      // Save
      const filename = activeProjName
        ? `Laporan_PenerimaManfaat_${activeProjName.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 25)}_${new Date().toISOString().slice(0, 10)}.xlsx`
        : `Laporan_PenerimaManfaat_SemuaProyek_${new Date().toISOString().slice(0, 10)}.xlsx`;
      
      XLSX.writeFile(wb, filename);
    } catch (err: any) {
      alert('Gagal mengekspor data ke format excel database: ' + err.message);
    }
  };

  // Parse and preview chosen Excel file for import
  const handleChooseImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary', raw: false });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawJson: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

        if (rawJson.length === 0) {
          setImportFeedback({ message: '⚠️ File Excel kosong atau tidak terbaca data valid.', type: 'error' });
          setStagedRows(null);
          return;
        }

        // Apply column maps case-insensitively
        const parsed: any[] = rawJson.map((row: any) => {
          const mapped: any = {};
          const rowLowerKeys: any = {};
          
          Object.keys(row).forEach(key => {
            const cleanKey = key.toLowerCase().trim().replace(/\s+/g, ' ');
            rowLowerKeys[cleanKey] = row[key];
          });

          // Resolve aliased headers
          Object.entries(FLAT_COL_MAP).forEach(([field, aliases]) => {
            let matchedValue = '';
            for (const alias of aliases) {
              if (rowLowerKeys[alias] !== undefined && String(rowLowerKeys[alias]).trim() !== '') {
                matchedValue = String(rowLowerKeys[alias]).trim();
                break;
              }
            }
            mapped[field] = matchedValue;
          });

          return mapped;
        }).filter(item => item.name && String(item.name).trim() !== '');

        if (parsed.length === 0) {
          setImportFeedback({ message: '⚠️ Format kolom tidak cocok. Pastikan terdapat kolom nama atau name.', type: 'error' });
          setStagedRows(null);
          return;
        }

        setStagedRows(parsed);
        
        // Count deduplication merges
        let duplicateCount = 0;
        parsed.forEach(row => {
          const dup = findExistingBeneficiary(beneficiaries, row);
          if (dup) duplicateCount++;
        });

        const statsMsg = `Terbaca ${parsed.length} baris data penerima manfaat. (${duplicateCount} orang terdeteksi sudah ada dan akan digabung/merged otomatis). Sila klik Import Sekarang di bawah.`;
        setImportFeedback({ message: statsMsg, type: 'success' });
      } catch (err: any) {
        setImportFeedback({ message: '⚠️ Gagal membaca berkas: ' + err.message, type: 'error' });
        setStagedRows(null);
      }
    };
    reader.readAsBinaryString(file);
  };

  // Run the parsed rows import into state
  const handleExecuteImport = () => {
    if (!stagedRows || stagedRows.length === 0) return;
    
    setIsImportingProgress(true);
    setImportFeedback({ message: 'Menjalankan integrasi data penerima manfaat...', type: 'info' });

    setTimeout(() => {
      try {
        let mergedCount = 0;
        let createdCount = 0;
        let regCount = 0;
        let logBebasCount = 0;

        let workingList = [...beneficiaries];
        let currentProjects = [...projects];
        let currentActivities = [...activities];
        let currentSubActivities = subActivities ? [...subActivities] : [];

        stagedRows.forEach((row) => {
          const normalizedInput = {
            name: String(row.name).trim(),
            phone: normalizeBenPhone(row.phone) || undefined,
            gender: normGender(row.gender),
            birthyear: parseInt(row.birthyear, 10) || undefined,
            location: row.location ? String(row.location).trim() : undefined,
            occupation: row.occupation ? formatOccupation(row.occupation) : undefined,
            email: row.email ? String(row.email).trim() : undefined,
            note: row.note ? String(row.note).trim() : undefined
          };

          // Find duplicates
          const dup = findExistingBeneficiary(workingList, normalizedInput);
          let targetBenId = '';

          if (dup) {
            // Merging properties gracefully without overriding populated data if incoming is empty
            const merged: Beneficiary = {
              ...dup,
              phone: normalizedInput.phone || dup.phone,
              gender: normalizedInput.gender,
              birthyear: normalizedInput.birthyear || dup.birthyear,
              location: normalizedInput.location || dup.location,
              occupation: normalizedInput.occupation || dup.occupation,
              email: normalizedInput.email || dup.email,
              note: normalizedInput.note || dup.note,
            };
            workingList = workingList.map(b => b.id === dup.id ? merged : b);
            targetBenId = dup.id;
            mergedCount++;
          } else {
            // No duplicate, create new
            const newId = `ben-imp-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            const newBen: Beneficiary = {
              id: newId,
              name: normalizedInput.name,
              phone: normalizedInput.phone,
              gender: normalizedInput.gender,
              birthyear: normalizedInput.birthyear,
              location: normalizedInput.location,
              occupation: normalizedInput.occupation,
              email: normalizedInput.email,
              note: normalizedInput.note,
              registrations: []
            };
            workingList.push(newBen);
            targetBenId = newId;
            createdCount++;
          }

          // Register project and activity if provided
          if (row.project_name && targetBenId) {
            const rowProjName = String(row.project_name).trim();
            const rowProjNameLower = rowProjName.toLowerCase();

            // Find matching project
            // 1. Exact match (case insensitive)
            let matchedProjObj = currentProjects.find(p => p.name.toLowerCase().trim() === rowProjNameLower);

            // 2. Loose Substring match
            if (!matchedProjObj) {
              matchedProjObj = currentProjects.find(p => {
                const nameLower = p.name.toLowerCase().trim();
                return nameLower.includes(rowProjNameLower) || rowProjNameLower.includes(nameLower);
              });
            }

            let resolvedProjectId = '';

            if (matchedProjObj) {
              resolvedProjectId = matchedProjObj.id;
            } else {
              // Create new project automatically so the imported data fits in perfectly!
              const newProjId = `p-auto-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
              const newProj: Project = {
                id: newProjId,
                name: rowProjName,
                location: 'Lokasi Diimpor',
                owner: 'Sistem Terintegrasi',
                status: 'Aktif',
                progress: 0,
                budgetApproved: 0,
                budgetActual: 0,
                isArchived: false,
                desc: 'Proyek ini otomatis dibuat saat melakukan import data penerima manfaat.'
              };
              currentProjects.push(newProj);
              resolvedProjectId = newProjId;
            }

            // Check activity match
            let matchedActivityId: string | undefined = undefined;
            let isFreeLog = false;
            let finalActivityName = row.activity_name ? String(row.activity_name).trim() : undefined;

            if (row.activity_name) {
              const rowActLower = String(row.activity_name).toLowerCase().trim();
              const matchedActObj = currentActivities.find(a => 
                a.projectId === resolvedProjectId && 
                a.title.toLowerCase().trim() === rowActLower
              );

              if (matchedActObj) {
                matchedActivityId = matchedActObj.id;
                finalActivityName = matchedActObj.title;
                regCount++;
              } else {
                // Auto-create missing activity under resolvedProjectId
                const newActId = `act-auto-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
                const newAct: Activity = {
                  id: newActId,
                  projectId: resolvedProjectId,
                  title: finalActivityName || String(row.activity_name).trim(),
                  desc: 'Aktivitas ini otomatis dibuat saat melakukan import data penerima manfaat.',
                  pic: 'Sistem Terintegrasi',
                  status: 'Sedang Berjalan',
                  progress: 0,
                  notes: [],
                  files: []
                };
                currentActivities.push(newAct);
                matchedActivityId = newActId;
                finalActivityName = newAct.title;
                regCount++;
              }
            }

            // Check sub-activity match and auto-create if provided
            let matchedSubActivityId: string | undefined = undefined;
            let finalSubActivityName = row.sub_activity_name ? String(row.sub_activity_name).trim() : undefined;

            if (finalSubActivityName && matchedActivityId) {
              const rowSubActLower = finalSubActivityName.toLowerCase().trim();
              const matchedSubActObj = currentSubActivities.find(s => 
                s.parentActivityId === matchedActivityId && 
                s.title.toLowerCase().trim() === rowSubActLower
              );

              if (matchedSubActObj) {
                matchedSubActivityId = matchedSubActObj.id;
                finalSubActivityName = matchedSubActObj.title;
              } else {
                // Auto-create missing sub-activity under matchedActivityId
                const newSubId = `sub-auto-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
                const newSub: SubActivity = {
                  id: newSubId,
                  parentActivityId: matchedActivityId,
                  title: finalSubActivityName,
                  desc: 'Sub-aktivitas ini otomatis dibuat saat melakukan import data penerima manfaat.',
                  pic: 'Sistem Terintegrasi',
                  status: 'Sedang Dikerjakan',
                  priority: 'Normal'
                };
                currentSubActivities.push(newSub);
                matchedSubActivityId = newSubId;
                finalSubActivityName = newSub.title;
              }
            }

            // Create registration object
            const regObj: BeneficiaryRegistration = {
              projectId: resolvedProjectId,
              activityId: matchedActivityId,
              subActivityId: matchedSubActivityId,
              attendedDate: parseDate(row.attended_date) || new Date().toISOString().split('T')[0],
              note: row.note ? String(row.note).trim() : 'Diimport via dokumen Excel',
              isFreeLog: isFreeLog,
              activityName: finalActivityName,
              subActivityName: finalSubActivityName,
              source: 'import'
            };

            // Add new registration without adding duplicate registration if already matching project + activity combo!
            workingList = workingList.map(b => {
              if (b.id === targetBenId) {
                const alreadyRegistered = b.registrations.some(r => 
                  r.projectId === regObj.projectId && 
                  ((r.activityId && r.activityId === regObj.activityId) || 
                   (r.activityName && r.activityName === regObj.activityName)) &&
                  ((!regObj.subActivityId && !r.subActivityId) || 
                   (r.subActivityId && r.subActivityId === regObj.subActivityId) ||
                   (r.subActivityName && r.subActivityName === regObj.subActivityName))
                );
                if (alreadyRegistered) return b;
                return {
                  ...b,
                  registrations: [...b.registrations, regObj]
                };
              }
              return b;
            });
          }
        });

        // Save projects if any were automatically created
        if (onUpdateProjects && currentProjects.length > projects.length) {
          onUpdateProjects(currentProjects);
        }

        // Save activities if any were automatically created
        if (onUpdateActivities && currentActivities.length > activities.length) {
          onUpdateActivities(currentActivities);
        }

        // Save sub-activities if any were automatically created
        if (onUpdateSubActivities && currentSubActivities.length > (subActivities?.length || 0)) {
          onUpdateSubActivities(currentSubActivities);
        }

        // Save beneficiaries
        onUpdateBeneficiaries(workingList);
        setIsImportingProgress(false);
        setStagedRows(null);
        
        let successStr = `Sukses mengintegrasikan data! Berhasil mendaftarkan ${createdCount} orang baru, menyatukan ${mergedCount} data yang sudah ada.`;
        if (regCount > 0) successStr += ` Tercatat ${regCount} kehadiran kegiatan resmi.`;
        if (logBebasCount > 0) successStr += ` Log bebas tersimpan sebanyak ${logBebasCount}.`;

        alert(successStr);
        setIsImportModalOpen(false);
      } catch (err: any) {
        setIsImportingProgress(false);
        setImportFeedback({ message: '🚨 Gagal memproses import data: ' + err.message, type: 'error' });
      }
    }, 1200);
  };

  return (
    <div id="beneficiary-tab-container" className="space-y-6">
      {/* 1. Proyek Aktif Selector Bar */}
      <div 
        id="ben-project-selector"
        className={`border rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all duration-300 ${
          selectedProjectId || toolbarProjectFilter
            ? 'bg-gradient-to-br from-blue-50/40 to-blue-50/10 border-blue-200'
            : 'bg-white border-slate-100'
        }`}
      >
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-blue-100/60 text-blue-700 rounded-xl">
            <FolderOpen className="w-5 h-5 shrink-0" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Proyek Dipantau Aktif</span>
            <span className="font-extrabold text-slate-800 text-sm">
              {selectedProjectId || toolbarProjectFilter
                ? activeProjects.find((p) => p.id === (selectedProjectId || toolbarProjectFilter))?.name
                : 'Semua Proyek DFW Indonesia'}
            </span>
          </div>
        </div>

        <select
          value={selectedProjectId || toolbarProjectFilter}
          onChange={(e) => syncProjectFilter(e.target.value)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs py-2.5 px-4 rounded-xl border-none focus:outline-none transition-all cursor-pointer min-w-[200px]"
        >
          <option value="" className="text-slate-800 bg-white font-medium">✨ Semua Proyek</option>
          {activeProjects.map((p) => {
            const count = getBeneficiaryCountForProject(p.id);
            return (
              <option key={p.id} value={p.id} className="text-slate-800 bg-white font-medium">
                {p.name} ({count} data)
              </option>
            );
          })}
        </select>
      </div>

      {/* 2. Stats Dashboard Microcards */}
      <div id="ben-stat-cards" className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-xs select-none">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Penerima Unik</span>
          <p className="text-2xl font-black text-slate-800 mt-1">{statsOverview.total.toLocaleString('id-ID')}</p>
          <span className="text-[9px] text-slate-400 font-bold block mt-0.5">Individu Terdata</span>
        </div>
        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-xs select-none">
          <span className="text-[10px] font-extrabold text-sky-500 uppercase tracking-wider block">Laki-Laki</span>
          <p className="text-2xl font-black text-sky-800 mt-1">{statsOverview.male.toLocaleString('id-ID')}</p>
          <span className="text-[9px] text-slate-400 font-bold block mt-0.5">
            {statsOverview.total ? Math.round(statsOverview.male / statsOverview.total * 100) : 0}% Distribusi
          </span>
        </div>
        <div className="bg-white border border-pink-100/60 bg-pink-50/5 rounded-2xl p-4 shadow-xs select-none">
          <span className="text-[10px] font-extrabold text-pink-500 uppercase tracking-wider block">Perempuan</span>
          <p className="text-2xl font-black text-pink-700 mt-1">{statsOverview.female.toLocaleString('id-ID')}</p>
          <span className="text-[9px] text-slate-400 font-bold block mt-0.5">
            {statsOverview.total ? Math.round(statsOverview.female / statsOverview.total * 100) : 0}% Distribusi
          </span>
        </div>
        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-xs select-none">
          <span className="text-[10px] font-extrabold text-indigo-500 uppercase tracking-wider block">Partisipasi</span>
          <p className="text-2xl font-black text-indigo-800 mt-1">{statsOverview.partisipasi.toLocaleString('id-ID')}</p>
          <span className="text-[9px] text-slate-400 font-bold block mt-0.5">Aktivitas Sistem</span>
        </div>
        <div className="col-span-2 md:col-span-1 bg-white border border-amber-150/60 bg-amber-50/5 rounded-2xl p-4 shadow-xs select-none">
          <span className="text-[10px] font-extrabold text-amber-600 uppercase tracking-wider block">Log Bebas</span>
          <p className="text-2xl font-black text-amber-700 mt-1">{statsOverview.logBebas.toLocaleString('id-ID')}</p>
          <span className="text-[9px] text-slate-400 font-bold block mt-0.5">Kehadiran Non-Sistem</span>
        </div>
      </div>

      {/* 3. Action Panel, Search & Filter Toolbar */}
      <div id="ben-controls" className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs space-y-4">
        {/* Row 1: Search, Gender, and Project Filters */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-md w-full">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-400 focus:bg-white transition-all h-[34px]"
              placeholder="Cari nama, hp, asal desa…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Gender and Project Selector dropdowns */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={genderFilter}
              onChange={(e) => setGenderFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-400 transition-all cursor-pointer h-[34px] min-w-[120px]"
            >
              <option value="">Semua Gender</option>
              <option value="Laki-laki">Laki-laki</option>
              <option value="Perempuan">Perempuan</option>
            </select>

            <select
              value={toolbarProjectFilter}
              onChange={(e) => syncProjectFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-400 transition-all cursor-pointer h-[34px] max-w-[280px]"
            >
              <option value="">Semua Proyek Pembinaan</option>
              {activeProjects.map((p) => {
                const count = getBeneficiaryCountForProject(p.id);
                return (
                  <option key={p.id} value={p.id}>
                    {p.name} ({count} data)
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* Dynamic Activity Filter (Only visible or enabled when applicable, placed in its own clean row) */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider hidden sm:inline">Aktivitas Proyek:</span>
            <select
              value={activityFilter}
              onChange={(e) => setActivityFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-400 transition-all cursor-pointer h-[34px] w-full sm:w-[240px]"
            >
              <option value="">Semua Aktivitas</option>
              {availableActivitiesForFilter.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title}
                </option>
              ))}
            </select>
          </div>

          {/* Action Buttons (Import, Export, Tambah Manual) */}
          <div className="flex flex-wrap items-center gap-1.5 justify-end">
            <button
              onClick={() => {
                setImportFeedback({ message: '', type: '' });
                setStagedRows(null);
                setIsImportModalOpen(true);
              }}
              className="bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 font-extrabold text-xs py-1.5 px-3 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer h-[34px]"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Import Excel
            </button>
            <button
              onClick={handleExportToExcel}
              disabled={filteredBeneficiaries.length === 0}
              className="disabled:opacity-50 disabled:cursor-not-allowed bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 font-extrabold text-xs py-1.5 px-3 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer h-[34px]"
            >
              <Download className="w-4 h-4 text-blue-600" /> Export Excel
            </button>
            <button
              onClick={handleDownloadTemplate}
              className="bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-800 border border-slate-200 font-extrabold text-xs py-1.5 px-2.5 rounded-lg transition-all cursor-pointer h-[34px]"
              title="Download Template Format Impor"
            >
              Template
            </button>
            <button
              onClick={() => onOpenAddModal(selectedProjectId || toolbarProjectFilter)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs py-1.5 px-4 rounded-lg shadow-xs transition-all flex items-center gap-1 cursor-pointer h-[34px]"
            >
              ＋ Tambah Manual
            </button>
          </div>
        </div>
      </div>

      {/* 4. Demographic & Occupation Recharts Panel */}
      {filteredBeneficiaries.length > 0 && (
        <div id="demographics-charts" className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-extrabold text-slate-800 tracking-wider uppercase flex items-center gap-2">
              📊 Analisis Proporsi Distribusi Pekerjaan &amp; Klaster Demografi Gender
            </h3>
            <button
              onClick={() => setShowCharts(!showCharts)}
              className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1.5 cursor-pointer font-bold"
            >
              {showCharts ? (
                <>
                  <ChevronUp className="w-4 h-4" /> Sembunyikan Grafik
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" /> Tampilkan Grafik
                </>
              )}
            </button>
          </div>

          {showCharts && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
              {/* Chart 1: Donut Proportion */}
              <div className="bg-slate-50/40 p-4 rounded-xl border border-slate-100 min-h-[310px] flex flex-col justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-2">🍩 Proporsi Pekerjaan Utama</span>
                <div className="flex-1 min-h-[220px] relative">
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={occupationChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {occupationChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => [`${v} Orang`, 'Total']} />
                      <Legend 
                        verticalAlign="bottom" 
                        height={40} 
                        iconType="circle" 
                        iconSize={6} 
                        wrapperStyle={{ fontSize: '9px', fontWeight: 'bold' }} 
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart 2: Horizontal Bar distributions */}
              <div className="bg-slate-50/40 p-4 rounded-xl border border-slate-100 min-h-[310px] flex flex-col justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-2">📊 Jumlah Orang per Sektor</span>
                <div className="flex-1 min-h-[220px]">
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={occupationChartData} layout="vertical" margin={{ left: -10, right: 10, top: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                      <XAxis type="number" stroke="#94a3b8" fontSize={9} />
                      <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={9} width={80} />
                      <Tooltip formatter={(v) => [`${v} Orang`, 'Jumlah']} />
                      <Bar dataKey="value" name="Penerima Manfaat" fill="#0284c7" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart 3: Stacked Bar Genders */}
              <div className="bg-slate-50/40 p-4 rounded-xl border border-slate-100 min-h-[310px] flex flex-col justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-2">🧑‍🤝‍🧑 Komposisi Gender Sektor Kerja</span>
                <div className="flex-1 min-h-[220px]">
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={occupationChartData} margin={{ top: 10, right: 10, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} />
                      <YAxis stroke="#94a3b8" fontSize={9} />
                      <Tooltip />
                      <Legend verticalAlign="bottom" height={36} iconType="rect" iconSize={6} wrapperStyle={{ fontSize: '9px', fontWeight: 'bold' }} />
                      <Bar dataKey="Laki-laki" name="Laki-laki" fill="#1d4ed8" stackId="gender" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="Perempuan" name="Perempuan" fill="#db2777" stackId="gender" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. Master Data Table */}
      <div id="ben-table-block" className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4 w-12 text-center">No</th>
                <th className="py-3.5 px-4">Nama Penerima / Kontak</th>
                <th className="py-3.5 px-4">Gender</th>
                <th className="py-3.5 px-4 text-center">Usia</th>
                <th className="py-3.5 px-4">Asal Wilayah/Lokasi</th>
                <th className="py-3.5 px-4">Pekerjaan Utama</th>
                <th className="py-3.5 px-4 text-center">Kontribusi Partisipasi</th>
                <th className="py-3.5 px-4">Partisipasi Laporan Terakhir</th>
                <th className="py-3.5 px-4 text-center">Aksi Pelayanan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-xs font-semibold text-slate-700">
              {paginatedBeneficiaries.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    Tidak ditemukan data penerima manfaat yang terdaftar di bawah instruksi filter aktif.
                  </td>
                </tr>
              ) : (
                paginatedBeneficiaries.map((b, idx) => {
                  const itemIndex = (currentPage - 1) * itemsPerPage + idx + 1;
                  
                  // Latest activity/registration descriptor
                  const currentReg = b.registrations[b.registrations.length - 1];
                  let registeredProjectName = 'Tidak Terikat';
                  let registeredActivityName = '—';

                  if (currentReg) {
                    const pObj = projects.find(p => p.id === currentReg.projectId || SupabaseSync.getOriginalId(currentReg.projectId) === p.id || SupabaseSync.getUuid(currentReg.projectId) === SupabaseSync.getUuid(p.id));
                    registeredProjectName = pObj ? pObj.name : 'Program Umum';

                    if (currentReg.activityId) {
                      const actObj = activities.find(a => a.id === currentReg.activityId);
                      registeredActivityName = actObj ? actObj.title : (currentReg.activityName || 'Aktivitas Khusus');
                    } else if (currentReg.activityName) {
                      registeredActivityName = currentReg.activityName;
                    } else {
                      registeredActivityName = 'Aktivitas Umum';
                    }
                  }

                  let genderColor = 'bg-blue-50 text-blue-700 border-blue-100';
                  if (b.gender === 'Perempuan') {
                    genderColor = 'bg-pink-50 text-pink-700 border-pink-100';
                  }

                  return (
                    <tr key={b.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4 text-center text-slate-400 font-bold">{itemIndex}</td>
                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          <button
                            onClick={() => onOpenDetailModal(b)}
                            className="font-bold text-slate-800 hover:text-blue-600 block text-left text-xs bg-transparent border-none p-0 cursor-pointer"
                          >
                            {b.name}
                          </button>
                          {b.phone ? (
                            <span className="text-[10px] text-slate-400 font-mono tracking-tight block">
                              📞 {b.phone}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-350 italic block">Tanpa kontak</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-block py-0.5 px-2 rounded-md border text-[9px] font-extrabold ${genderColor}`}>
                          {b.gender}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">{getAge(b.birthyear)} th</td>
                      <td className="py-3 px-4 text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-450 shrink-0" />
                          <span className="truncate max-w-[140px]" title={b.location}>{b.location || '—'}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">{b.occupation || '—'}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="bg-slate-100 font-bold text-slate-705 py-0.5 px-2.5 rounded-full text-[11px] inline-block border border-slate-150">
                          {b.registrations.length}x
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="space-y-0.5 max-w-[180px]">
                          <span className="text-slate-800 font-extrabold text-[11px] truncate block" title={registeredProjectName}>
                            📁 {registeredProjectName}
                          </span>
                          <span className="text-[10px] text-slate-500 truncate block font-medium" title={registeredActivityName}>
                            {currentReg?.isFreeLog ? '📝 ' : '🎯 '}{registeredActivityName}
                          </span>
                          {currentReg?.subActivityName && (
                            <span className="text-[10px] text-emerald-650 truncate block font-semibold" title={currentReg.subActivityName}>
                              ↪️ {currentReg.subActivityName}
                            </span>
                          )}
                          {currentReg?.attendedDate && (
                            <span className="text-[9px] text-slate-400 block font-mono">📅 {currentReg.attendedDate}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => onOpenDetailModal(b)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 bg-slate-50 border border-slate-200 rounded-lg transition-all cursor-pointer"
                            title="Riwayat Kehadiran Lengkap"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onOpenEditModal(b)}
                            className="p-1.5 text-slate-400 hover:text-amber-600 bg-slate-50 border border-slate-200 rounded-lg transition-all cursor-pointer"
                            title="Edit Data Pribadi"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="bg-slate-50/50 p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-semibold select-none">
            <span>
              Menampilkan <span className="font-bold text-slate-700">{paginatedBeneficiaries.length}</span> dari{' '}
              <span className="font-bold text-slate-700">{filteredBeneficiaries.length}</span> data penerima
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                className="disabled:opacity-40 p-1.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-all cursor-pointer text-[10px]"
              >
                ◀
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-1 rounded-lg border transition-all cursor-pointer text-[11px] ${
                    page === currentPage
                      ? 'bg-blue-605 border-blue-600 text-blue-600 font-extrabold bg-blue-50/40'
                      : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-600 font-medium'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                className="disabled:opacity-40 p-1.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-all cursor-pointer text-[10px]"
              >
                ▶
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 6. Self-Contained Dedup-Excel Importer Modal overlay */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4 z-50 text-xs">
          <div className="bg-white rounded-2xl border border-slate-100 max-w-2xl w-full max-h-[85vh] shadow-2xl flex flex-col justify-between overflow-hidden text-slate-600 font-medium">
            <div className="p-4 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
              <span className="text-sm font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                📥 Integrasi Import Nelayan &amp; Penerima Manfaat
              </span>
              <button 
                onClick={() => {
                  setStagedRows(null);
                  setIsImportModalOpen(false);
                }} 
                className="p-1 hover:bg-slate-100 border border-slate-200 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            <div className="p-5 flex-1 overflow-y-auto space-y-4">
              <div className="bg-indigo-50 border border-indigo-120/40 p-3.5 rounded-xl text-[11px] text-indigo-900 leading-relaxed space-y-2">
                <span className="font-bold flex items-center gap-1">💡 Aturan Pintar M&amp;E Importer:</span>
                <ul className="list-disc pl-4 space-y-1 font-semibold text-indigo-800">
                  <li>Kolom <strong>Nama*</strong> wajib terisi untuk kelayakan data.</li>
                  <li><strong>Duplicate Prevention:</strong> Jika nama + HP atau nama + asal lokasi sudah ada di database, sistem M&amp;E akan menggabungkan (menerapkan auto-merge) properti kosong secara cerdas tanpa menimpa data yang ada!</li>
                  <li><strong>Aktivitas Log Bebas:</strong> Bila kolom aktivitas tidak terdaftar sebagai milestones resmi di proyek, sistem secara otomatis memasukkannya sebagai <strong>Log Bebas (non-sistem)</strong> agar kehadiran lapangan tetap direkam.</li>
                </ul>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="md:col-span-1 border-2 border-dashed border-slate-200 py-10 px-4 rounded-xl hover:border-blue-400 hover:bg-blue-50/5 transition-all text-center flex flex-col items-center justify-center cursor-pointer gap-2 text-slate-400">
                  <Upload className="w-8 h-8 text-slate-300" />
                  <p className="font-bold text-slate-700 text-xs">Pilihlah File Excel Laporan Lapangan</p>
                  <span className="text-[10px]">Format berekstensi xls, xlsx, csv</span>
                  <input 
                    type="file" 
                    accept=".xlsx,.xls,.csv" 
                    className="hidden" 
                    ref={fileInputRef}
                    onChange={handleChooseImportFile} 
                  />
                </label>

                <div className="md:col-span-1 border border-slate-200/55 rounded-xl p-4 bg-slate-50/40 flex flex-col justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 block">Butuh Template Format?</span>
                    <p className="text-[11px] text-slate-500 leading-relaxed font-semibold">Gunakan template format seragam demi menghindari kesalahan pemetaan kolom.</p>
                  </div>
                  <button
                    onClick={handleDownloadTemplate}
                    className="w-full bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-extrabold hover:text-slate-900 py-2 px-3 rounded-xl transition-all cursor-pointer inline-flex items-center justify-center gap-1 text-[11px] mt-4"
                  >
                    <Download className="w-4 h-4 text-emerald-600" /> Download Template Excel Format
                  </button>
                </div>
              </div>

              {importFeedback.message && (
                <div className={`p-3 rounded-lg border text-[11px] font-semibold flex items-start gap-2 ${
                  importFeedback.type === 'error' ? 'bg-rose-50 border-rose-100 text-rose-800' :
                  importFeedback.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' :
                  'bg-blue-50 border-blue-100 text-blue-800'
                }`}>
                  {importFeedback.type === 'error' ? <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" /> : <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />}
                  <span>{importFeedback.message}</span>
                </div>
              )}

              {/* Preview Grid */}
              {stagedRows && stagedRows.length > 0 && (
                <div className="space-y-2 pt-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">Pratinjau Hasil Pembacaan Sheet (Baris Terpilih):</span>
                  <div className="border border-slate-150 rounded-xl overflow-hidden max-h-[160px] overflow-y-auto">
                    <table className="w-full text-left border-collapse text-[10px]">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-150 text-[10px] text-slate-400 font-bold">
                          <th className="py-2 px-3 text-center">#</th>
                          <th className="py-2 px-3">Nama</th>
                          <th className="py-2 px-3">Gender</th>
                          <th className="py-2 px-3">HP/Kontak</th>
                          <th className="py-2 px-3">Lokasi</th>
                          <th className="py-2 px-3">Proyek</th>
                          <th className="py-2 px-3">Nama Aktivitas</th>
                          <th className="py-2 px-3">Sub-Aktivitas</th>
                          <th className="py-2 px-3">Tanggal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-semibold text-slate-700 bg-white">
                        {stagedRows.slice(0, 15).map((row, index) => {
                          const dup = findExistingBeneficiary(beneficiaries, row);
                          return (
                            <tr key={index} className={dup ? 'bg-amber-50/15' : ''}>
                              <td className="py-1.5 px-3 text-center text-slate-400">{index + 1}</td>
                              <td className="py-1.5 px-3">
                                <div>
                                  <span className="font-bold text-slate-800">{row.name}</span>
                                  {dup && <span className="text-[8px] bg-amber-100 text-amber-800 rounded px-1 ml-1 font-extrabold block w-fit">MERGED</span>}
                                </div>
                              </td>
                              <td className="py-1.5 px-3">{normGender(row.gender)}</td>
                              <td className="py-1.5 px-3 font-mono">{row.phone || '—'}</td>
                              <td className="py-1.5 px-3 truncate max-w-[80px]">{row.location || '—'}</td>
                              <td className="py-1.5 px-3 text-blue-700 truncate max-w-[100px]">{row.project_name || '—'}</td>
                              <td className="py-1.5 px-3 truncate max-w-[100px]">{row.activity_name || '—'}</td>
                              <td className="py-1.5 px-3 text-emerald-700 truncate max-w-[100px]">{row.sub_activity_name || '—'}</td>
                              <td className="py-1.5 px-3 font-mono text-[9px]">{row.attended_date || '—'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {stagedRows.length > 15 && <span className="text-[10px] text-slate-400 italic block text-right font-medium">Menampilkan 15 dari {stagedRows.length} baris...</span>}
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2 shrink-0">
              <button
                onClick={() => {
                  setStagedRows(null);
                  setIsImportModalOpen(false);
                }}
                disabled={isImportingProgress}
                className="bg-white border border-slate-200 text-slate-500 py-2 px-4 rounded-xl font-bold transition-all hover:bg-slate-100 cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleExecuteImport}
                disabled={!stagedRows || isImportingProgress}
                className="disabled:opacity-50 disabled:cursor-not-allowed bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-2 px-5 rounded-xl transition-all cursor-pointer inline-flex items-center gap-1"
              >
                {isImportingProgress ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                {isImportingProgress ? 'Memproses...' : 'Import Sekarang'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { 
  Plus, 
  Trash2, 
  Save, 
  Download, 
  Upload,
  Printer, 
  X, 
  CheckCircle2, 
  Table, 
  Copy, 
  RefreshCw,
  Sparkles,
  HelpCircle,
  FileSpreadsheet,
  FileUp,
  AlertCircle,
  FileDown,
  ArrowRight,
  ChevronDown,
  Edit3,
  ListFilter,
  Cloud,
  Loader2,
  Check
} from 'lucide-react';
import { Project, Activity, Indicator, Outcome, LogframeRow, LogframeSyncBundle, ProjectReflection } from '../types';
import { SupabaseSync } from '../lib/supabaseSync';

interface LogicalFrameworkModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  activities?: Activity[];
  indicators?: Indicator[];
  outcomes?: Outcome[];
  canEdit?: boolean;
  onSaveLogframe: (
    projectId: string, 
    rows: LogframeRow[], 
    syncBundle?: LogframeSyncBundle
  ) => void;
}

export const LogicalFrameworkModal: React.FC<LogicalFrameworkModalProps> = ({
  isOpen,
  onClose,
  project,
  activities = [],
  indicators = [],
  outcomes = [],
  canEdit = true,
  onSaveLogframe,
}) => {
  const [rows, setRows] = useState<LogframeRow[]>([]);
  const [isSaved, setIsSaved] = useState(true);
  const [lastSavedTime, setLastSavedTime] = useState<string>('');
  const [showHelper, setShowHelper] = useState(false);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [isSavingToDb, setIsSavingToDb] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState('');

  // Tracking manual text edit mode for cells that have dropdowns (e.g. `${rowId}-${field}`)
  const [manualEditCells, setManualEditCells] = useState<Record<string, boolean>>({});

  const toggleManualEdit = (rowId: string, field: string) => {
    const key = `${rowId}-${field}`;
    setManualEditCells(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const isManualEdit = (rowId: string, field: string) => {
    return !!manualEditCells[`${rowId}-${field}`];
  };

  // Distinct system data options from project
  const outcomeOptions = Array.from(new Set(outcomes.map(o => o.title).filter(Boolean)));
  const activityOptions = Array.from(new Set(activities.map(a => a.title).filter(Boolean)));
  const indicatorOptions = Array.from(new Set(indicators.map(i => i.title).filter(Boolean)));

  // Target options derived from project indicators
  const targetOptions = Array.from(
    new Set(
      indicators.flatMap(i => [
        i.unit ? `${i.target} ${i.unit}`.trim() : String(i.target),
        String(i.target)
      ]).filter(Boolean)
    )
  );

  // Import State
  const [showImportModal, setShowImportModal] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [importedFileName, setImportedFileName] = useState('');
  const [importedPreviewRows, setImportedPreviewRows] = useState<LogframeRow[]>([]);
  const [importMode, setImportMode] = useState<'replace' | 'append'>('replace');
  const [autoSyncToProject, setAutoSyncToProject] = useState(true);
  const [importError, setImportError] = useState<string>('');
  const [importSuccessMsg, setImportSuccessMsg] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load existing logframe from Supabase -> Project state -> localStorage
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;

    // 1. Check if project already has logframe saved in state
    if (project.logframe && project.logframe.length > 0) {
      setRows(project.logframe);
      setIsSaved(true);
      return;
    }

    // 2. Fetch from Supabase database table project_logframes
    SupabaseSync.fetchLogframeRows(project.id).then((dbRows) => {
      if (!isMounted) return;
      if (dbRows && dbRows.length > 0) {
        setRows(dbRows);
        setIsSaved(true);
        return;
      }

      // 3. Fallback to localStorage
      const storageKey = `dfw_logframe_${project.id}`;
      const savedLocal = localStorage.getItem(storageKey);
      if (savedLocal) {
        try {
          const parsed = JSON.parse(savedLocal);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setRows(parsed);
            setIsSaved(true);
            return;
          }
        } catch (err) {
          console.warn('Gagal membaca logframe lokal:', err);
        }
      }

      // 4. Auto-populate initial template from project's existing Outcomes & Activities
      generateInitialRows();
    });

    return () => {
      isMounted = false;
    };
  }, [isOpen, project.id]);

  const generateInitialRows = () => {
    const initialRows: LogframeRow[] = [];

    if (activities.length > 0) {
      activities.forEach((act, idx) => {
        const matchedOutcome = outcomes[idx % (outcomes.length || 1)] || outcomes[0];
        const matchedIndicator = indicators.find(i => i.projectId === project.id) || indicators[idx % (indicators.length || 1)];

        const actTarget = matchedIndicator ? `${matchedIndicator.target} ${matchedIndicator.unit || ''}`.trim() : '1 Kegiatan';
        const actAchieved = matchedIndicator ? `${matchedIndicator.current} ${matchedIndicator.unit || ''}`.trim() : (act.status === 'Selesai' ? '1 Kegiatan' : '0');
        
        let initialVariance = '0';
        let initialProgress = act.progress ? `${act.progress}%` : '0%';

        if (matchedIndicator && matchedIndicator.target > 0) {
          const diff = matchedIndicator.current - matchedIndicator.target;
          initialVariance = diff >= 0 ? `+${diff}` : `${diff}`;
          const pct = Math.min(100, Math.round((matchedIndicator.current / matchedIndicator.target) * 100));
          initialProgress = `${pct}%`;
        }

        initialRows.push({
          id: `lf-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`,
          outcome: matchedOutcome ? matchedOutcome.title : (outcomes.length > 0 ? outcomes[0].title : `Outcome ${idx + 1}`),
          output: `Output ${(idx % 3) + 1}: Hasil kegiatan terlaksana dengan baik`,
          activities: act.title,
          indicator: matchedIndicator ? matchedIndicator.title : `Persentase capaian kegiatan ${act.title}`,
          target: actTarget,
          achievement: actAchieved,
          variance: initialVariance,
          progress: initialProgress,
          tantangan: act.challenges || 'Kendala koordinasi operasional dan logistik lapangan',
          pembelajaran: 'Pentingnya sosialisasi awal dan koordinasi intensif dengan pemangku kepentingan',
          recommendationActivities: act.status === 'Selesai' 
            ? 'Pertahankan keberlanjutan hasil dan dokumentasikan laporan akhir'
            : 'Percepat koordinasi dengan tim lapangan dan pantau jadwal realisasi',
        });
      });
    }

    // If still empty, add default blank rows
    if (initialRows.length === 0) {
      for (let i = 1; i <= 3; i++) {
        initialRows.push({
          id: `lf-blank-${Date.now()}-${i}`,
          outcome: outcomes.length > 0 ? outcomes[0].title : `Outcome ${i}`,
          output: `Output ${i}.1`,
          activities: activities.length > 0 ? activities[0].title : `Aktivitas ${i}.1.1`,
          indicator: indicators.length > 0 ? indicators[0].title : `Indikator capaian ${i}`,
          target: indicators.length > 0 ? (indicators[0].unit ? `${indicators[0].target} ${indicators[0].unit}`.trim() : String(indicators[0].target)) : '100',
          achievement: '75',
          variance: '-25 (-25%)',
          progress: '75%',
          tantangan: 'Hambatan perizinan teknis dan cuaca di pelabuhan',
          pembelajaran: 'Peningkatan mitigasi risiko dan pengawalan SOP bersama otoritas pelabuhan',
          recommendationActivities: 'Tindak lanjut pendampingan dan monitoring berkala',
        });
      }
    }

    setRows(initialRows);
    setIsSaved(false);
  };

  // Auto calculate variance and progress if numeric
  const handleCellChange = (id: string, field: keyof LogframeRow, value: string) => {
    setIsSaved(false);
    setRows(prevRows =>
      prevRows.map(row => {
        if (row.id !== id) return row;

        const updated = { ...row, [field]: value };

        // If target or achievement changed, auto-calculate variance and progress if valid numbers
        if (field === 'target' || field === 'achievement') {
          const targetNum = parseFloat(String(field === 'target' ? value : row.target).replace(/[^0-9.-]/g, ''));
          const achieveNum = parseFloat(String(field === 'achievement' ? value : row.achievement).replace(/[^0-9.-]/g, ''));

          if (!isNaN(targetNum) && !isNaN(achieveNum) && targetNum > 0) {
            const diff = achieveNum - targetNum;
            const diffSign = diff >= 0 ? `+${diff}` : `${diff}`;
            const pct = Math.round((achieveNum / targetNum) * 100);
            
            // Only auto-update if not manually customized or standard format
            updated.variance = `${diffSign} (${pct - 100 >= 0 ? '+' : ''}${pct - 100}%)`;
            updated.progress = `${pct}%`;
          }
        }

        return updated;
      })
    );
  };

  // Dropdown selection handlers for linked system data
  const handleSelectOutcome = (rowId: string, outcomeTitle: string) => {
    if (outcomeTitle === '__MANUAL__') {
      toggleManualEdit(rowId, 'outcome');
      return;
    }
    handleCellChange(rowId, 'outcome', outcomeTitle);
  };

  const handleSelectActivity = (rowId: string, activityTitle: string) => {
    if (activityTitle === '__MANUAL__') {
      toggleManualEdit(rowId, 'activities');
      return;
    }
    setIsSaved(false);
    const foundAct = activities.find(a => a.title === activityTitle);
    setRows(prevRows =>
      prevRows.map(row => {
        if (row.id !== rowId) return row;
        const updated = { ...row, activities: activityTitle };
        if (foundAct?.challenges && (!row.tantangan || row.tantangan === '')) {
          updated.tantangan = foundAct.challenges;
        }
        return updated;
      })
    );
  };

  const handleSelectIndicator = (rowId: string, indicatorTitle: string) => {
    if (indicatorTitle === '__MANUAL__') {
      toggleManualEdit(rowId, 'indicator');
      return;
    }
    setIsSaved(false);
    const foundInd = indicators.find(i => i.title === indicatorTitle);
    setRows(prevRows =>
      prevRows.map(row => {
        if (row.id !== rowId) return row;
        const updated = { ...row, indicator: indicatorTitle };
        if (foundInd) {
          const targetStr = foundInd.unit ? `${foundInd.target} ${foundInd.unit}`.trim() : String(foundInd.target);
          const achieveNum = foundInd.current !== undefined ? foundInd.current : (foundInd.actual || 0);
          const achieveStr = foundInd.unit ? `${achieveNum} ${foundInd.unit}`.trim() : String(achieveNum);

          updated.target = targetStr;
          updated.achievement = achieveStr;

          if (foundInd.target > 0) {
            const diff = achieveNum - foundInd.target;
            const diffSign = diff >= 0 ? `+${diff}` : `${diff}`;
            const pct = Math.round((achieveNum / foundInd.target) * 100);
            updated.variance = `${diffSign} (${pct - 100 >= 0 ? '+' : ''}${pct - 100}%)`;
            updated.progress = `${pct}%`;
          }
        }
        return updated;
      })
    );
  };

  const handleSelectTarget = (rowId: string, targetVal: string) => {
    if (targetVal === '__MANUAL__') {
      toggleManualEdit(rowId, 'target');
      return;
    }
    handleCellChange(rowId, 'target', targetVal);
  };

  const handleAddRow = (index?: number) => {
    const defaultOutcome = outcomes.length > 0 ? outcomes[0].title : (rows.length > 0 ? rows[rows.length - 1].outcome : 'Outcome 1');
    const defaultAct = activities.length > 0 ? activities[0].title : '';
    const defaultInd = indicators.length > 0 ? indicators[0].title : '';
    const defaultTarget = indicators.length > 0 
      ? (indicators[0].unit ? `${indicators[0].target} ${indicators[0].unit}`.trim() : String(indicators[0].target))
      : '100';
    const defaultAchieve = indicators.length > 0 ? String(indicators[0].current ?? 0) : '0';

    const newRow: LogframeRow = {
      id: `lf-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      outcome: defaultOutcome,
      output: '',
      activities: defaultAct,
      indicator: defaultInd,
      target: defaultTarget,
      achievement: defaultAchieve,
      variance: '-100 (-100%)',
      progress: '0%',
      tantangan: '',
      pembelajaran: '',
      recommendationActivities: '',
    };

    setIsSaved(false);
    if (typeof index === 'number') {
      const copy = [...rows];
      copy.splice(index + 1, 0, newRow);
      setRows(copy);
    } else {
      setRows(prev => [...prev, newRow]);
    }
  };

  const handleDuplicateRow = (index: number) => {
    const source = rows[index];
    if (!source) return;
    const duplicated: LogframeRow = {
      ...source,
      id: `lf-dup-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      activities: `${source.activities} (Salinan)`,
    };
    const copy = [...rows];
    copy.splice(index + 1, 0, duplicated);
    setRows(copy);
    setIsSaved(false);
  };

  const handleDeleteRow = (id: string) => {
    if (rows.length <= 1) {
      alert('Minimal harus ada 1 baris dalam tabel Logical Framework.');
      return;
    }
    setRows(prev => prev.filter(r => r.id !== id));
    setIsSaved(false);
  };

  // Helper to compile updated/new Activities, Indicators, Outcomes, and Reflections from LFA rows
  const buildProjectSyncBundle = (sourceRows: LogframeRow[]): LogframeSyncBundle => {
    // 1. Process Outcomes: unique outcomes from rows
    const uniqueOutcomesMap = new Map<string, Outcome>();
    
    // Seed with existing outcomes for this project
    outcomes.forEach(o => {
      if (o.title) uniqueOutcomesMap.set(o.title.trim().toLowerCase(), { ...o });
    });

    let outcomeSort = outcomes.length;
    sourceRows.forEach(r => {
      const title = (r.outcome || '').trim();
      if (!title) return;
      const key = title.toLowerCase();
      if (!uniqueOutcomesMap.has(key)) {
        outcomeSort++;
        uniqueOutcomesMap.set(key, {
          id: `out-${Date.now()}-${outcomeSort}-${Math.random().toString(36).substring(2, 7)}`,
          projectId: project.id,
          title: title,
          outcomeText: title,
          sortOrder: outcomeSort
        });
      }
    });
    const finalOutcomes = Array.from(uniqueOutcomesMap.values());

    // 2. Process Indicators
    const indicatorsMap = new Map<string, Indicator>();
    indicators.forEach(i => {
      if (i.title) indicatorsMap.set(i.title.trim().toLowerCase(), { ...i });
    });

    let indSort = indicators.length;
    sourceRows.forEach(r => {
      const title = (r.indicator || '').trim();
      if (!title) return;
      const key = title.toLowerCase();

      // Extract target numeric & unit
      const targetMatch = (r.target || '').match(/([0-9.,]+)\s*(.*)/);
      const rawTargetNum = targetMatch ? parseFloat(targetMatch[1].replace(/,/g, '')) : parseFloat((r.target || '').replace(/[^0-9.-]/g, ''));
      const targetNum = !isNaN(rawTargetNum) ? rawTargetNum : 0;
      const unit = targetMatch && targetMatch[2] ? targetMatch[2].trim() : '';

      // Extract achievement numeric
      const achieveNum = parseFloat((r.achievement || '').replace(/[^0-9.-]/g, ''));
      const currentNum = !isNaN(achieveNum) ? achieveNum : 0;

      const existing = indicatorsMap.get(key);
      if (existing) {
        indicatorsMap.set(key, {
          ...existing,
          target: targetNum > 0 ? targetNum : existing.target,
          current: currentNum,
          actual: currentNum,
          unit: unit || existing.unit || '',
          outcome: r.outcome || existing.outcome,
          output: r.output || existing.output,
          tantangan: r.tantangan || existing.tantangan,
          pembelajaran: r.pembelajaran || existing.pembelajaran,
        });
      } else {
        indSort++;
        indicatorsMap.set(key, {
          id: `ind-${Date.now()}-${indSort}-${Math.random().toString(36).substring(2, 7)}`,
          projectId: project.id,
          title: title,
          target: targetNum || 100,
          current: currentNum,
          actual: currentNum,
          unit: unit || 'Unit',
          type: r.output || 'Output Indikator Logframe',
          sortOrder: indSort,
          outcome: r.outcome,
          output: r.output,
          tantangan: r.tantangan,
          pembelajaran: r.pembelajaran,
        });
      }
    });
    const finalIndicators = Array.from(indicatorsMap.values());

    // 3. Process Activities
    const activitiesMap = new Map<string, Activity>();
    activities.forEach(a => {
      if (a.title) activitiesMap.set(a.title.trim().toLowerCase(), { ...a });
    });

    let actSort = activities.length;
    let totalProgressSum = 0;
    let countedRows = 0;

    sourceRows.forEach(r => {
      const title = (r.activities || '').trim();
      if (!title) return;
      const key = title.toLowerCase();

      // Extract progress numeric
      const rawProg = parseFloat((r.progress || '').replace(/[^0-9.-]/g, ''));
      const progress = !isNaN(rawProg) ? Math.min(100, Math.max(0, rawProg)) : 0;

      totalProgressSum += progress;
      countedRows++;

      let status: 'Selesai' | 'Sedang Berjalan' | 'Belum Mulai' | 'Tertunda' = 'Belum Mulai';
      if (progress >= 100) status = 'Selesai';
      else if (progress > 0) status = 'Sedang Berjalan';

      const existing = activitiesMap.get(key);
      if (existing) {
        activitiesMap.set(key, {
          ...existing,
          progress: progress,
          status: progress >= 100 ? 'Selesai' : (existing.status === 'Tertunda' ? 'Tertunda' : status),
          challenges: r.tantangan || existing.challenges,
          tantangan: r.tantangan || existing.tantangan,
          pembelajaran: r.pembelajaran || existing.pembelajaran,
          recommendationActivities: r.recommendationActivities || existing.recommendationActivities,
          output: r.output || existing.output,
          outcome: r.outcome || existing.outcome,
        });
      } else {
        actSort++;
        activitiesMap.set(key, {
          id: `act-${Date.now()}-${actSort}-${Math.random().toString(36).substring(2, 7)}`,
          projectId: project.id,
          title: title,
          progress: progress,
          status: status,
          challenges: r.tantangan,
          tantangan: r.tantangan,
          pembelajaran: r.pembelajaran,
          recommendationActivities: r.recommendationActivities,
          output: r.output,
          outcome: r.outcome,
          dueDate: project.deadline || new Date().toISOString().split('T')[0],
          pic: project.owner || 'DFW Tim Lapangan',
          notes: [],
          files: []
        });
      }
    });
    const finalActivities = Array.from(activitiesMap.values());

    // 4. Process Reflections (Tantangan & Pembelajaran)
    const reflectionsList: ProjectReflection[] = [];
    sourceRows.forEach((r, idx) => {
      if (r.pembelajaran || r.tantangan) {
        reflectionsList.push({
          id: `ref-lfa-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
          projectId: project.id,
          title: r.activities ? `Pembelajaran: ${r.activities}` : (r.outcome ? `Pembelajaran: ${r.outcome}` : `Refleksi LFA ${idx + 1}`),
          lesson: r.pembelajaran || r.tantangan || '',
          nextSteps: r.recommendationActivities || '',
          type: r.pembelajaran ? 'lesson' : 'challenge',
          date: new Date().toISOString().split('T')[0],
          contributor: project.owner || 'Sistem LFA DFW',
          createdBy: project.owner || 'Sistem LFA DFW'
        });
      }
    });

    const calculatedProgress = countedRows > 0 ? Math.round(totalProgressSum / countedRows) : project.progress || 0;

    return {
      activities: finalActivities,
      indicators: finalIndicators,
      outcomes: finalOutcomes,
      reflections: reflectionsList,
      calculatedProgress: calculatedProgress
    };
  };

  const handleSave = async (overrideRows?: LogframeRow[]) => {
    const targetRows = overrideRows || rows;
    setIsSavingToDb(true);
    setSyncStatusMsg('Menyinkronkan ke Supabase & seluruh data proyek...');

    try {
      // 1. Build synchronization bundle for project activities, indicators, outcomes, reflections & progress
      const syncBundle = buildProjectSyncBundle(targetRows);

      // 2. Save directly to Supabase project_logframes table
      const saveRes = await SupabaseSync.saveLogframeRows(project.id, targetRows);

      // 3. Update localStorage cache
      const storageKey = `dfw_logframe_${project.id}`;
      localStorage.setItem(storageKey, JSON.stringify(targetRows));

      // 4. Call parent callback with syncBundle
      onSaveLogframe(project.id, targetRows, syncBundle);

      setIsSaved(true);
      const timeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setLastSavedTime(timeStr);
      setSyncStatusMsg(saveRes.success ? 'Tersimpan di Supabase & Seluruh Data Proyek Tersinkronisasi!' : 'Tersimpan lokal & modul proyek tersinkronisasi');
      setTimeout(() => setSyncStatusMsg(''), 4500);
    } catch (err) {
      console.error('Error in handleSave:', err);
      setSyncStatusMsg('Tersimpan di sistem lokal.');
      setTimeout(() => setSyncStatusMsg(''), 3500);
    } finally {
      setIsSavingToDb(false);
    }
  };

  // Download official template file for users to fill in
  const handleDownloadTemplate = () => {
    const headers = [
      'Outcome',
      'Output',
      'Activities',
      'Indicator',
      'Target',
      'Achievement',
      'Variance Achievement',
      'Progress',
      'Tantangan',
      'Pembelajaran',
      'Recommendation Activities'
    ];

    const sampleData = [
      headers,
      [
        'Outcome 1: Peningkatan Tata Kelola Perikanan',
        'Output 1.1: Regulasi keselamatan kerja tersosialisasi',
        'Pelatihan K3 bagi awak kapal perikanan di pelabuhan',
        'Jumlah awak kapal yang tersertifikasi K3 dasar',
        '100',
        '85',
        '-15 (-15%)',
        '85%',
        'Waktu luang awak kapal terbatas karena jadwal melaut yang padat',
        'Pelatihan modul mikro (durasi singkat) lebih efektif diterima nelayan',
        'Jadwalkan gelombang pelatihan susulan saat masa jeda melaut'
      ],
      [
        'Outcome 2: Penguatan Perlindungan Tenaga Kerja',
        'Output 2.1: Posko aduan dan pendampingan aktif',
        'Pendampingan hukum kasus ketenagakerjaan pelaut',
        'Persentase kasus yang teradvokasi hingga tuntas',
        '20',
        '18',
        '-2 (-10%)',
        '90%',
        'Ketiadaan salinan Perjanjian Kerja Laut (PKL) tertulis dari pihak perusahaan',
        'Penyuluhan pra-keberangkatan harus mewajibkan pemegang PKL memegang salinan sah',
        'Tingkatkan koordinasi dengan Syahbandar dan dinas tenaga kerja setempat'
      ]
    ];

    const ws = XLSX.utils.aoa_to_sheet(sampleData);
    ws['!cols'] = [
      { wch: 30 }, // Outcome
      { wch: 30 }, // Output
      { wch: 35 }, // Activities
      { wch: 35 }, // Indicator
      { wch: 15 }, // Target
      { wch: 15 }, // Achievement
      { wch: 22 }, // Variance
      { wch: 12 }, // Progress
      { wch: 35 }, // Tantangan
      { wch: 35 }, // Pembelajaran
      { wch: 40 }  // Recommendation
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Logical Framework');
    XLSX.writeFile(wb, `Template_Logical_Framework_DFW.xlsx`);
  };

  // Export as native Excel (.xlsx)
  const handleExportExcel = () => {
    const headers = [
      'No',
      'Outcome',
      'Output',
      'Activities',
      'Indicator',
      'Target',
      'Achievement',
      'Variance Achievement',
      'Progress',
      'Tantangan',
      'Pembelajaran',
      'Recommendation Activities'
    ];

    const dataRows = rows.map((r, i) => [
      i + 1,
      r.outcome || '',
      r.output || '',
      r.activities || '',
      r.indicator || '',
      r.target || '',
      r.achievement || '',
      r.variance || '',
      r.progress || '',
      r.tantangan || r.challenges || '',
      r.pembelajaran || r.lessonsLearned || '',
      r.recommendationActivities || ''
    ]);

    const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);
    ws['!cols'] = [
      { wch: 6 },  // No
      { wch: 28 }, // Outcome
      { wch: 28 }, // Output
      { wch: 35 }, // Activities
      { wch: 35 }, // Indicator
      { wch: 15 }, // Target
      { wch: 15 }, // Achievement
      { wch: 22 }, // Variance
      { wch: 12 }, // Progress
      { wch: 35 }, // Tantangan
      { wch: 35 }, // Pembelajaran
      { wch: 40 }  // Recommendation
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'LFA');
    const safeProjectName = project.name.replace(/[^a-zA-Z0-9_-]/g, '_');
    XLSX.writeFile(wb, `Logical_Framework_${safeProjectName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    setShowDownloadMenu(false);
  };

  // Export as CSV
  const handleExportCSV = () => {
    const headers = [
      'No',
      'Outcome',
      'Output',
      'Activities',
      'Indicator',
      'Target',
      'Achievement',
      'Variance Achievement',
      'Progress',
      'Tantangan',
      'Pembelajaran',
      'Recommendation Activities'
    ];

    const csvContent = [
      headers.join(','),
      ...rows.map((r, i) => [
        `"${i + 1}"`,
        `"${(r.outcome || '').replace(/"/g, '""')}"`,
        `"${(r.output || '').replace(/"/g, '""')}"`,
        `"${(r.activities || '').replace(/"/g, '""')}"`,
        `"${(r.indicator || '').replace(/"/g, '""')}"`,
        `"${(r.target || '').replace(/"/g, '""')}"`,
        `"${(r.achievement || '').replace(/"/g, '""')}"`,
        `"${(r.variance || '').replace(/"/g, '""')}"`,
        `"${(r.progress || '').replace(/"/g, '""')}"`,
        `"${(r.tantangan || r.challenges || '').replace(/"/g, '""')}"`,
        `"${(r.pembelajaran || r.lessonsLearned || '').replace(/"/g, '""')}"`,
        `"${(r.recommendationActivities || '').replace(/"/g, '""')}"`
      ].join(','))
    ];

    const blob = new Blob(['\uFEFF' + csvContent.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Logical_Framework_${project.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowDownloadMenu(false);
  };

  // File parsing logic for Import (.xlsx, .xls, .csv)
  const processImportFile = (file: File) => {
    setImportError('');
    setImportSuccessMsg('');
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !['xlsx', 'xls', 'csv'].includes(ext)) {
      setImportError('Format berkas tidak didukung. Harap unggah berkas berekstensi .xlsx, .xls, atau .csv');
      return;
    }

    setImportedFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buffer = e.target?.result;
        if (!buffer) throw new Error('Berkas kosong atau tidak dapat dibaca.');

        const wb = XLSX.read(buffer, { type: 'array' });
        const sheetName = wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];
        
        // Convert to array of arrays (AOA)
        const rawGrid: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
        if (!rawGrid || rawGrid.length === 0) {
          throw new Error('Tidak ada data yang ditemukan di dalam lembar kerja berkas.');
        }

        // Smart Header Row Detection (look through first 10 rows)
        let headerRowIdx = -1;
        let colMap: Record<string, number> = {
          outcome: -1,
          output: -1,
          activities: -1,
          indicator: -1,
          target: -1,
          achievement: -1,
          variance: -1,
          progress: -1,
          tantangan: -1,
          pembelajaran: -1,
          recommendationActivities: -1
        };

        for (let r = 0; r < Math.min(rawGrid.length, 12); r++) {
          const rowText = rawGrid[r].map(c => String(c).toLowerCase().trim());
          let matches = 0;

          const tempMap: Record<string, number> = {
            outcome: -1,
            output: -1,
            activities: -1,
            indicator: -1,
            target: -1,
            achievement: -1,
            variance: -1,
            progress: -1,
            tantangan: -1,
            pembelajaran: -1,
            recommendationActivities: -1
          };

          rowText.forEach((cell, cIdx) => {
            if (/outcome|hasil jangka panjang|tujuan/i.test(cell) && tempMap.outcome === -1) {
              tempMap.outcome = cIdx;
              matches++;
            } else if (/^output|keluaran|hasil langsung/i.test(cell) && tempMap.output === -1) {
              tempMap.output = cIdx;
              matches++;
            } else if (/activit|kegiatan|aktivitas/i.test(cell) && tempMap.activities === -1) {
              tempMap.activities = cIdx;
              matches++;
            } else if (/indicator|indikator|tolak ukur/i.test(cell) && tempMap.indicator === -1) {
              tempMap.indicator = cIdx;
              matches++;
            } else if (/^target|sasaran/i.test(cell) && tempMap.target === -1) {
              tempMap.target = cIdx;
              matches++;
            } else if (/achievement|capaian|realisasi|aktual/i.test(cell) && tempMap.achievement === -1) {
              tempMap.achievement = cIdx;
              matches++;
            } else if (/variance|selisih|gap|deviasi/i.test(cell) && tempMap.variance === -1) {
              tempMap.variance = cIdx;
              matches++;
            } else if (/progress|kemajuan|persentase|%/i.test(cell) && tempMap.progress === -1) {
              tempMap.progress = cIdx;
              matches++;
            } else if (/tantangan|kendala|hambatan|challenge|challenges|isu/i.test(cell) && tempMap.tantangan === -1) {
              tempMap.tantangan = cIdx;
              matches++;
            } else if (/pembelajaran|lesson|lessons|learning|wawasan|pelajaran/i.test(cell) && tempMap.pembelajaran === -1) {
              tempMap.pembelajaran = cIdx;
              matches++;
            } else if (/recommend|rekomendasi|tindak lanjut|catatan/i.test(cell) && tempMap.recommendationActivities === -1) {
              tempMap.recommendationActivities = cIdx;
              matches++;
            }
          });

          // If at least 2 header matches found, consider this row the header
          if (matches >= 2) {
            headerRowIdx = r;
            colMap = tempMap;
            break;
          }
        }

        // Fallback default index if no headers were matched
        const dataStartRow = headerRowIdx >= 0 ? headerRowIdx + 1 : 0;
        if (headerRowIdx === -1) {
          // If first column looks like "No" or row numbers, shift by 1
          const firstCell = String(rawGrid[0]?.[0] || '').toLowerCase().trim();
          const offset = firstCell === 'no' || firstCell === '#' ? 1 : 0;
          colMap = {
            outcome: offset + 0,
            output: offset + 1,
            activities: offset + 2,
            indicator: offset + 3,
            target: offset + 4,
            achievement: offset + 5,
            variance: offset + 6,
            progress: offset + 7,
            tantangan: offset + 8,
            pembelajaran: offset + 9,
            recommendationActivities: offset + 10,
          };
        }

        // Parse data rows
        const parsedRows: LogframeRow[] = [];
        for (let r = dataStartRow; r < rawGrid.length; r++) {
          const rowData = rawGrid[r];
          if (!rowData || rowData.length === 0) continue;

          // Check if row has any non-empty cell
          const hasContent = rowData.some(c => String(c).trim().length > 0);
          if (!hasContent) continue;

          const getVal = (cIdx: number) => (cIdx >= 0 && rowData[cIdx] !== undefined ? String(rowData[cIdx]).trim() : '');

          const outcomeVal = getVal(colMap.outcome);
          const outputVal = getVal(colMap.output);
          const actVal = getVal(colMap.activities);
          const indVal = getVal(colMap.indicator);
          const targetVal = getVal(colMap.target);
          const achieveVal = getVal(colMap.achievement);
          let varianceVal = getVal(colMap.variance);
          let progressVal = getVal(colMap.progress);
          const tantanganVal = getVal(colMap.tantangan);
          const pembelajaranVal = getVal(colMap.pembelajaran);
          const recoVal = getVal(colMap.recommendationActivities);

          // Auto calculate variance and progress if missing and target/achievement are numbers
          if (targetVal && achieveVal) {
            const targetNum = parseFloat(targetVal.replace(/[^0-9.-]/g, ''));
            const achieveNum = parseFloat(achieveVal.replace(/[^0-9.-]/g, ''));

            if (!isNaN(targetNum) && !isNaN(achieveNum) && targetNum > 0) {
              if (!varianceVal) {
                const diff = achieveNum - targetNum;
                const pct = Math.round((achieveNum / targetNum) * 100);
                varianceVal = `${diff >= 0 ? `+${diff}` : diff} (${pct - 100 >= 0 ? '+' : ''}${pct - 100}%)`;
              }
              if (!progressVal) {
                const pct = Math.round((achieveNum / targetNum) * 100);
                progressVal = `${pct}%`;
              }
            }
          }

          // If at least one meaningful column is filled
          if (outcomeVal || outputVal || actVal || indVal || targetVal || achieveVal) {
            parsedRows.push({
              id: `lf-imp-${Date.now()}-${r}-${Math.random().toString(36).substring(2, 6)}`,
              outcome: outcomeVal,
              output: outputVal,
              activities: actVal,
              indicator: indVal,
              target: targetVal || '0',
              achievement: achieveVal || '0',
              variance: varianceVal || '0',
              progress: progressVal || '0%',
              tantangan: tantanganVal,
              pembelajaran: pembelajaranVal,
              recommendationActivities: recoVal
            });
          }
        }

        if (parsedRows.length === 0) {
          throw new Error('Tidak ada baris data yang valid ditemukan di berkas. Pastikan format tabel memiliki kolom Outcome, Output, Activities, dll.');
        }

        setImportedPreviewRows(parsedRows);
        setImportSuccessMsg(`Berhasil membaca ${parsedRows.length} baris data dari file "${file.name}".`);
      } catch (err: any) {
        console.error('Import parse error:', err);
        setImportError(err.message || 'Gagal membaca isi berkas spreadsheet.');
        setImportedPreviewRows([]);
      }
    };

    reader.onerror = () => {
      setImportError('Terjadi kesalahan saat membaca berkas.');
    };

    reader.readAsArrayBuffer(file);
  };

  const handleApplyImport = async (triggerDirectSync = true) => {
    if (importedPreviewRows.length === 0) return;

    const newCombinedRows = importMode === 'replace'
      ? [...importedPreviewRows]
      : [...rows, ...importedPreviewRows];

    setRows(newCombinedRows);
    setShowImportModal(false);
    setImportedPreviewRows([]);
    setImportedFileName('');
    setImportSuccessMsg('');

    if (triggerDirectSync || autoSyncToProject) {
      await handleSave(newCombinedRows);
    } else {
      setIsSaved(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-[96vw] max-h-[95vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Spreadsheet Modal Header */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/30">
              <Table className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-base tracking-tight text-white flex items-center gap-1.5">
                  Logical Framework Project
                </h2>
                <span className="text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full">
                  LFA Spreadsheet
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Proyek: <strong className="text-slate-200">{project.name}</strong> • Donor: <span className="text-slate-300">{project.donor || 'Mandiri'}</span>
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2 flex-wrap">
            {canEdit && (
              <button
                type="button"
                onClick={() => handleAddRow()}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2 px-3 rounded-lg flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                title="Tambah baris baru di bagian bawah"
              >
                <Plus className="w-4 h-4" /> Tambah Baris
              </button>
            )}

            {/* IMPORT / UPLOAD BUTTON */}
            {canEdit && (
              <button
                type="button"
                id="btn-import-lfa"
                onClick={() => {
                  setImportError('');
                  setImportSuccessMsg('');
                  setImportedPreviewRows([]);
                  setImportedFileName('');
                  setShowImportModal(true);
                }}
                className="bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-extrabold text-xs py-2 px-3.5 rounded-lg border border-blue-400/40 flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                title="Unggah atau import berkas Excel/CSV ke tabel LFA"
              >
                <Upload className="w-4 h-4" /> Import / Unggah LFA
              </button>
            )}

            {/* DOWNLOAD / EXPORT MENU */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs py-2 px-3 rounded-lg border border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
                title="Opsi unduh dokumen tabel"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" /> Unduh LFA <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {showDownloadMenu && (
                <div 
                  className="absolute right-0 mt-1.5 w-56 bg-slate-800 border border-slate-700 rounded-xl shadow-xl py-1 z-30 animate-in fade-in zoom-in-95 text-xs"
                  onMouseLeave={() => setShowDownloadMenu(false)}
                >
                  <button
                    type="button"
                    onClick={handleExportExcel}
                    className="w-full text-left px-3.5 py-2 text-slate-200 hover:bg-slate-700/80 hover:text-emerald-400 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                    <div>
                      <span className="font-bold block">Unduh Excel (.xlsx)</span>
                      <span className="text-[10px] text-slate-400">Format spreadsheet rapi</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportCSV}
                    className="w-full text-left px-3.5 py-2 text-slate-200 hover:bg-slate-700/80 hover:text-blue-400 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <FileDown className="w-4 h-4 text-blue-400" />
                    <div>
                      <span className="font-bold block">Unduh CSV (.csv)</span>
                      <span className="text-[10px] text-slate-400">Format teks koma standar</span>
                    </div>
                  </button>

                  <div className="border-t border-slate-700 my-1" />

                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="w-full text-left px-3.5 py-2 text-slate-200 hover:bg-slate-700/80 hover:text-amber-400 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-amber-400" />
                    <div>
                      <span className="font-bold block">Unduh Template Kosong (.xlsx)</span>
                      <span className="text-[10px] text-slate-400">Contoh format siap diisi</span>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {canEdit && (
              <button
                type="button"
                onClick={generateInitialRows}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs py-2 px-3 rounded-lg border border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
                title="Muat ulang template berdasarkan aktivitas & indikator proyek"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Reset Template
              </button>
            )}

            <button
              type="button"
              onClick={handlePrint}
              className="hidden sm:flex bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs py-2 px-3 rounded-lg border border-slate-700 items-center gap-1.5 transition-all cursor-pointer"
              title="Cetak tabel"
            >
              <Printer className="w-3.5 h-3.5 text-blue-400" /> Cetak
            </button>

            {canEdit && (
              <button
                type="button"
                id="btn-save-lfa-modal"
                disabled={isSavingToDb}
                onClick={() => handleSave()}
                className={`font-extrabold text-xs py-2 px-4 rounded-lg flex items-center gap-1.5 transition-all shadow-sm cursor-pointer ${
                  isSavingToDb
                    ? 'bg-blue-800 text-blue-200 cursor-wait'
                    : isSaved
                    ? 'bg-slate-800 text-emerald-400 border border-emerald-500/40'
                    : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/30'
                }`}
                title="Simpan perubahan LFA dan sinkronkan dengan database Supabase & modul proyek"
              >
                {isSavingToDb ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                ) : isSaved ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {isSavingToDb ? 'Menyinkronkan...' : isSaved ? 'Tersimpan & Sinkron' : 'Simpan & Sinkron'}
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="bg-slate-800 hover:bg-red-950/40 hover:text-red-300 text-slate-400 p-2 rounded-lg border border-slate-700 transition-all cursor-pointer ml-1"
              title="Tutup jendela (ESC)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Sub-bar Info & Status */}
        <div className="bg-slate-100/90 px-5 py-2 border-b border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-600 shrink-0">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-slate-700">
              Total Baris: <strong className="font-mono text-blue-700">{rows.length}</strong>
            </span>
            <span className="text-slate-300">|</span>
            <span className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${isSavingToDb ? 'bg-blue-500 animate-ping' : isSaved ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              {syncStatusMsg ? (
                <span className="text-blue-700 font-semibold flex items-center gap-1">
                  <Cloud className="w-3.5 h-3.5 text-blue-600" /> {syncStatusMsg}
                </span>
              ) : isSaved ? (
                <span className="text-emerald-700 font-medium flex items-center gap-1">
                  <Cloud className="w-3.5 h-3.5 text-emerald-600" /> Semua data tersimpan & sinkron {lastSavedTime && `(${lastSavedTime})`}
                </span>
              ) : (
                <span className="text-amber-700 font-medium">Ada perubahan yang belum disimpan</span>
              )}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {canEdit && (
              <button
                type="button"
                onClick={() => {
                  setImportError('');
                  setImportSuccessMsg('');
                  setImportedPreviewRows([]);
                  setImportedFileName('');
                  setShowImportModal(true);
                }}
                className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer bg-blue-50 px-2 py-0.5 rounded border border-blue-200"
              >
                <Upload className="w-3 h-3" /> Upload Dokumen LFA Excel
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowHelper(!showHelper)}
              className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5" /> Panduan Pengisian
            </button>
          </div>
        </div>

        {/* Optional Guide Banner */}
        {showHelper && (
          <div className="bg-blue-50/80 px-5 py-3 border-b border-blue-200 text-xs text-blue-900 leading-relaxed shrink-0 animate-in slide-in-from-top-2">
            <div className="flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold">Panduan Kolom Logical Framework (LFA):</p>
                <p className="text-blue-800">
                  • <strong>Outcome & Output:</strong> Hasil strategis dan hasil langsung kegiatan.
                  • <strong>Activities:</strong> Aktivitas operasional yang dilaksanakan tim.
                  • <strong>Target & Achievement:</strong> Masukkan angka atau teks capaian (contoh: 100 vs 80). Kolom <em>Variance</em> dan <em>Progress</em> akan terkalkulasi otomatis.
                  • <strong>Recommendation Activities:</strong> Tindak lanjut atau rekomendasi perbaikan untuk menutup gap pencapaian.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Excel / Spreadsheet Grid Table Container */}
        <div className="flex-1 overflow-auto bg-slate-50 relative p-3">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs min-w-[1280px]">
              <thead>
                {/* Excel Column Letters (A, B, C, ...) */}
                <tr className="bg-slate-100/90 text-slate-500 font-mono text-[10px] select-none border-b border-slate-200">
                  <th className="w-10 px-2 py-1 text-center font-bold border-r border-slate-200 bg-slate-200/60">#</th>
                  <th className="px-3 py-1 text-center border-r border-slate-200">A</th>
                  <th className="px-3 py-1 text-center border-r border-slate-200">B</th>
                  <th className="px-3 py-1 text-center border-r border-slate-200">C</th>
                  <th className="px-3 py-1 text-center border-r border-slate-200">D</th>
                  <th className="w-28 px-3 py-1 text-center border-r border-slate-200">E</th>
                  <th className="w-28 px-3 py-1 text-center border-r border-slate-200">F</th>
                  <th className="w-36 px-3 py-1 text-center border-r border-slate-200">G</th>
                  <th className="w-28 px-3 py-1 text-center border-r border-slate-200">H</th>
                  <th className="px-3 py-1 text-center border-r border-slate-200 bg-rose-50 text-rose-700">I</th>
                  <th className="px-3 py-1 text-center border-r border-slate-200 bg-teal-50 text-teal-700">J</th>
                  <th className="px-3 py-1 text-center border-r border-slate-200">K</th>
                  {canEdit && <th className="w-20 px-2 py-1 text-center">Aksi</th>}
                </tr>

                {/* Main Header Labels requested by User */}
                <tr className="bg-slate-800 text-white text-[11px] font-bold tracking-wider border-b border-slate-300">
                  <th className="w-10 px-2 py-3 text-center border-r border-slate-700 bg-slate-900">
                    No
                  </th>
                  <th className="px-3.5 py-3 border-r border-slate-700 min-w-[200px]">
                    <div className="flex items-center justify-between gap-1">
                      <span>Outcome</span>
                      {outcomeOptions.length > 0 && (
                        <span className="text-[9px] font-normal bg-blue-500/30 text-blue-300 px-1.5 py-0.5 rounded">
                          Dropdown ({outcomeOptions.length})
                        </span>
                      )}
                    </div>
                  </th>
                  <th className="px-3.5 py-3 border-r border-slate-700 min-w-[160px]">
                    Output
                  </th>
                  <th className="px-3.5 py-3 border-r border-slate-700 min-w-[220px]">
                    <div className="flex items-center justify-between gap-1">
                      <span>Activities</span>
                      {activityOptions.length > 0 && (
                        <span className="text-[9px] font-normal bg-blue-500/30 text-blue-300 px-1.5 py-0.5 rounded">
                          Dropdown ({activityOptions.length})
                        </span>
                      )}
                    </div>
                  </th>
                  <th className="px-3.5 py-3 border-r border-slate-700 min-w-[220px]">
                    <div className="flex items-center justify-between gap-1">
                      <span>Indicator</span>
                      {indicatorOptions.length > 0 && (
                        <span className="text-[9px] font-normal bg-emerald-500/30 text-emerald-300 px-1.5 py-0.5 rounded">
                          Dropdown ({indicatorOptions.length})
                        </span>
                      )}
                    </div>
                  </th>
                  <th className="px-3 py-3 border-r border-slate-700 w-32 text-center bg-blue-900/60">
                    Target
                  </th>
                  <th className="px-3 py-3 border-r border-slate-700 w-28 text-center bg-emerald-900/60">
                    Achievement
                  </th>
                  <th className="px-3 py-3 border-r border-slate-700 w-36 text-center bg-purple-900/60">
                    Variance Achievement
                  </th>
                  <th className="px-3 py-3 border-r border-slate-700 w-28 text-center bg-amber-900/60">
                    Progress
                  </th>
                  {/* New Columns requested: Tantangan & Pembelajaran after Progress */}
                  <th className="px-3.5 py-3 border-r border-slate-700 min-w-[200px] bg-rose-950/80 text-rose-200">
                    Tantangan
                  </th>
                  <th className="px-3.5 py-3 border-r border-slate-700 min-w-[200px] bg-teal-950/80 text-teal-200">
                    Pembelajaran
                  </th>
                  <th className="px-3.5 py-3 border-r border-slate-700 min-w-[200px]">
                    Recommendation Activities
                  </th>
                  {canEdit && (
                    <th className="w-20 px-2 py-3 text-center bg-slate-900">
                      Tindakan
                    </th>
                  )}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200 bg-white font-sans">
                {rows.map((row, idx) => {
                  // Calculate progress color for badge
                  const pctNumber = parseFloat(String(row.progress).replace(/[^0-9.-]/g, ''));
                  let progressBadgeColor = 'bg-slate-100 text-slate-700 border-slate-200';
                  if (!isNaN(pctNumber)) {
                    if (pctNumber >= 100) progressBadgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold';
                    else if (pctNumber >= 70) progressBadgeColor = 'bg-blue-50 text-blue-700 border-blue-200 font-bold';
                    else if (pctNumber >= 40) progressBadgeColor = 'bg-amber-50 text-amber-700 border-amber-200 font-bold';
                    else progressBadgeColor = 'bg-rose-50 text-rose-700 border-rose-200 font-bold';
                  }

                  return (
                    <tr 
                      key={row.id}
                      className="hover:bg-blue-50/40 transition-colors group"
                    >
                      {/* Row Index */}
                      <td className="w-10 px-2 py-2 text-center font-mono font-bold text-slate-400 bg-slate-50/80 border-r border-slate-200 text-[11px] select-none">
                        {idx + 1}
                      </td>

                      {/* 1. Outcome (Dropdown from existing project outcomes or custom manual text) */}
                      <td className="p-1.5 border-r border-slate-200 min-w-[200px]">
                        {canEdit ? (
                          outcomeOptions.length > 0 && !isManualEdit(row.id, 'outcome') ? (
                            <div className="flex items-center gap-1">
                              <select
                                value={row.outcome || ''}
                                onChange={(e) => handleSelectOutcome(row.id, e.target.value)}
                                className="w-full bg-white text-slate-800 text-xs p-1.5 rounded border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-medium transition-all"
                                title="Pilih Outcome proyek dari daftar"
                              >
                                <option value="">-- Pilih Outcome Proyek --</option>
                                {outcomeOptions.map((title, optIdx) => (
                                  <option key={optIdx} value={title}>
                                    {title}
                                  </option>
                                ))}
                                {row.outcome && !outcomeOptions.includes(row.outcome) && (
                                  <option value={row.outcome}>{row.outcome} (Kustom)</option>
                                )}
                                <option value="__MANUAL__">✏️ Ketik Bebas / Kustom...</option>
                              </select>
                              <button
                                type="button"
                                onClick={() => toggleManualEdit(row.id, 'outcome')}
                                className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded shrink-0 transition-colors"
                                title="Beralih ke mode ketik bebas"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="relative">
                              <textarea
                                value={row.outcome || ''}
                                onChange={(e) => handleCellChange(row.id, 'outcome', e.target.value)}
                                rows={2}
                                placeholder="Tuliskan Outcome..."
                                className="w-full bg-white p-1.5 pr-6 rounded text-xs text-slate-800 border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all resize-y"
                              />
                              {outcomeOptions.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => toggleManualEdit(row.id, 'outcome')}
                                  className="absolute top-1.5 right-1.5 p-0.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                  title="Kembali ke pilihan dropdown"
                                >
                                  <ListFilter className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          )
                        ) : (
                          <div className="p-1.5 text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">{row.outcome || '—'}</div>
                        )}
                      </td>

                      {/* 2. Output */}
                      <td className="p-1.5 border-r border-slate-200 min-w-[160px]">
                        {canEdit ? (
                          <textarea
                            value={row.output || ''}
                            onChange={(e) => handleCellChange(row.id, 'output', e.target.value)}
                            rows={2}
                            placeholder="Tuliskan Output..."
                            className="w-full bg-transparent hover:bg-white focus:bg-white p-1.5 rounded text-xs text-slate-800 border border-transparent hover:border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all resize-y"
                          />
                        ) : (
                          <div className="p-1.5 text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">{row.output || '—'}</div>
                        )}
                      </td>

                      {/* 3. Activities (Dropdown from existing project activities or custom manual text) */}
                      <td className="p-1.5 border-r border-slate-200 min-w-[220px]">
                        {canEdit ? (
                          activityOptions.length > 0 && !isManualEdit(row.id, 'activities') ? (
                            <div className="flex items-center gap-1">
                              <select
                                value={row.activities || ''}
                                onChange={(e) => handleSelectActivity(row.id, e.target.value)}
                                className="w-full bg-white text-slate-800 text-xs p-1.5 rounded border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-semibold transition-all"
                                title="Pilih Aktivitas dari data proyek"
                              >
                                <option value="">-- Pilih Aktivitas Proyek --</option>
                                {activityOptions.map((title, optIdx) => (
                                  <option key={optIdx} value={title}>
                                    {title}
                                  </option>
                                ))}
                                {row.activities && !activityOptions.includes(row.activities) && (
                                  <option value={row.activities}>{row.activities} (Kustom)</option>
                                )}
                                <option value="__MANUAL__">✏️ Ketik Bebas / Kustom...</option>
                              </select>
                              <button
                                type="button"
                                onClick={() => toggleManualEdit(row.id, 'activities')}
                                className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded shrink-0 transition-colors"
                                title="Beralih ke mode ketik bebas"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="relative">
                              <textarea
                                value={row.activities || ''}
                                onChange={(e) => handleCellChange(row.id, 'activities', e.target.value)}
                                rows={2}
                                placeholder="Uraian Aktivitas..."
                                className="w-full bg-white p-1.5 pr-6 rounded text-xs font-semibold text-slate-800 border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all resize-y"
                              />
                              {activityOptions.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => toggleManualEdit(row.id, 'activities')}
                                  className="absolute top-1.5 right-1.5 p-0.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                  title="Kembali ke pilihan dropdown"
                                >
                                  <ListFilter className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          )
                        ) : (
                          <div className="p-1.5 text-xs font-semibold text-slate-800 leading-relaxed whitespace-pre-wrap">{row.activities || '—'}</div>
                        )}
                      </td>

                      {/* 4. Indicator (Dropdown from existing project indicators with auto target/achievement sync) */}
                      <td className="p-1.5 border-r border-slate-200 min-w-[220px]">
                        {canEdit ? (
                          indicatorOptions.length > 0 && !isManualEdit(row.id, 'indicator') ? (
                            <div className="flex items-center gap-1">
                              <select
                                value={row.indicator || ''}
                                onChange={(e) => handleSelectIndicator(row.id, e.target.value)}
                                className="w-full bg-white text-slate-800 text-xs p-1.5 rounded border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-medium transition-all"
                                title="Pilih Indikator (akan menyinkronkan Target & Capaian otomatis)"
                              >
                                <option value="">-- Pilih Indikator Proyek --</option>
                                {indicators.map((ind) => (
                                  <option key={ind.id} value={ind.title}>
                                    {ind.title} (Target: {ind.target} {ind.unit || ''})
                                  </option>
                                ))}
                                {row.indicator && !indicatorOptions.includes(row.indicator) && (
                                  <option value={row.indicator}>{row.indicator} (Kustom)</option>
                                )}
                                <option value="__MANUAL__">✏️ Ketik Bebas / Kustom...</option>
                              </select>
                              <button
                                type="button"
                                onClick={() => toggleManualEdit(row.id, 'indicator')}
                                className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded shrink-0 transition-colors"
                                title="Beralih ke mode ketik bebas"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="relative">
                              <textarea
                                value={row.indicator || ''}
                                onChange={(e) => handleCellChange(row.id, 'indicator', e.target.value)}
                                rows={2}
                                placeholder="Tolak ukur / Indikator..."
                                className="w-full bg-white p-1.5 pr-6 rounded text-xs text-slate-700 border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all resize-y"
                              />
                              {indicatorOptions.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => toggleManualEdit(row.id, 'indicator')}
                                  className="absolute top-1.5 right-1.5 p-0.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                  title="Kembali ke pilihan dropdown"
                                >
                                  <ListFilter className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          )
                        ) : (
                          <div className="p-1.5 text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">{row.indicator || '—'}</div>
                        )}
                      </td>

                      {/* 5. Target (Dropdown from indicator targets or manual input) */}
                      <td className="p-1.5 border-r border-slate-200 bg-blue-50/20 w-32">
                        {canEdit ? (
                          targetOptions.length > 0 && !isManualEdit(row.id, 'target') ? (
                            <div className="flex items-center gap-1">
                              <select
                                value={row.target || ''}
                                onChange={(e) => handleSelectTarget(row.id, e.target.value)}
                                className="w-full bg-white text-blue-700 font-mono font-bold text-xs p-1.5 rounded border border-blue-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                                title="Pilih Target dari daftar indikator"
                              >
                                <option value="">-- Target --</option>
                                {targetOptions.map((tVal, optIdx) => (
                                  <option key={optIdx} value={tVal}>
                                    {tVal}
                                  </option>
                                ))}
                                {row.target && !targetOptions.includes(row.target) && (
                                  <option value={row.target}>{row.target}</option>
                                )}
                                <option value="__MANUAL__">✏️ Ketik Nilai...</option>
                              </select>
                              <button
                                type="button"
                                onClick={() => toggleManualEdit(row.id, 'target')}
                                className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded shrink-0 transition-colors"
                                title="Ketik target kustom"
                              >
                                <Edit3 className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <div className="relative flex items-center">
                              <input
                                type="text"
                                value={row.target || ''}
                                onChange={(e) => handleCellChange(row.id, 'target', e.target.value)}
                                placeholder="100"
                                className="w-full bg-white p-1.5 pr-5 rounded text-xs font-mono font-bold text-center text-blue-700 border border-blue-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                              />
                              {targetOptions.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => toggleManualEdit(row.id, 'target')}
                                  className="absolute right-1 p-0.5 text-slate-400 hover:text-blue-600 rounded"
                                  title="Pilih dari daftar target"
                                >
                                  <ListFilter className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          )
                        ) : (
                          <div className="p-1.5 text-xs font-mono font-bold text-center text-blue-700">{row.target || '—'}</div>
                        )}
                      </td>

                      {/* 6. Achievement */}
                      <td className="p-1.5 border-r border-slate-200 bg-emerald-50/20 w-28">
                        {canEdit ? (
                          <input
                            type="text"
                            value={row.achievement || ''}
                            onChange={(e) => handleCellChange(row.id, 'achievement', e.target.value)}
                            placeholder="0"
                            className="w-full bg-transparent hover:bg-white focus:bg-white p-1.5 rounded text-xs font-mono font-bold text-center text-emerald-700 border border-transparent hover:border-emerald-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                          />
                        ) : (
                          <div className="p-1.5 text-xs font-mono font-bold text-center text-emerald-700">{row.achievement || '—'}</div>
                        )}
                      </td>

                      {/* 7. Variance Achievement */}
                      <td className="p-1.5 border-r border-slate-200 bg-purple-50/20 w-36">
                        {canEdit ? (
                          <input
                            type="text"
                            value={row.variance || ''}
                            onChange={(e) => handleCellChange(row.id, 'variance', e.target.value)}
                            placeholder="Selisih capaian..."
                            className="w-full bg-transparent hover:bg-white focus:bg-white p-1.5 rounded text-xs font-mono font-bold text-center text-purple-700 border border-transparent hover:border-purple-200 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                            title="Variance Achievement (Otomatis atau dapat diubah manual)"
                          />
                        ) : (
                          <div className="p-1.5 text-xs font-mono font-bold text-center text-purple-700">{row.variance || '—'}</div>
                        )}
                      </td>

                      {/* 8. Progress */}
                      <td className="p-1.5 border-r border-slate-200 bg-amber-50/20 w-28 text-center">
                        {canEdit ? (
                          <div className="space-y-1">
                            <input
                              type="text"
                              value={row.progress || ''}
                              onChange={(e) => handleCellChange(row.id, 'progress', e.target.value)}
                              placeholder="0%"
                              className="w-full bg-transparent hover:bg-white focus:bg-white p-1.5 rounded text-xs font-mono font-bold text-center text-slate-800 border border-transparent hover:border-amber-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
                            />
                            {!isNaN(pctNumber) && (
                              <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                                <div 
                                  className={`h-1.5 rounded-full transition-all ${
                                    pctNumber >= 100 ? 'bg-emerald-500' : pctNumber >= 70 ? 'bg-blue-500' : pctNumber >= 40 ? 'bg-amber-500' : 'bg-rose-500'
                                  }`} 
                                  style={{ width: `${Math.min(100, Math.max(0, pctNumber))}%` }} 
                                />
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-mono border ${progressBadgeColor}`}>
                            {row.progress || '0%'}
                          </span>
                        )}
                      </td>

                      {/* 9. Tantangan (Baru - disisipkan setelah Progress) */}
                      <td className="p-1.5 border-r border-slate-200 bg-rose-50/15 min-w-[200px]">
                        {canEdit ? (
                          <textarea
                            value={row.tantangan || row.challenges || ''}
                            onChange={(e) => handleCellChange(row.id, 'tantangan', e.target.value)}
                            rows={2}
                            placeholder="Kendala / tantangan pelaksanaan..."
                            className="w-full bg-transparent hover:bg-white focus:bg-white p-1.5 rounded text-xs text-rose-950 border border-transparent hover:border-rose-300 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-all resize-y placeholder:text-slate-400"
                          />
                        ) : (
                          <div className="p-1.5 text-xs text-rose-950 leading-relaxed whitespace-pre-wrap">{row.tantangan || row.challenges || '—'}</div>
                        )}
                      </td>

                      {/* 10. Pembelajaran (Baru - disisipkan setelah Tantangan) */}
                      <td className="p-1.5 border-r border-slate-200 bg-teal-50/15 min-w-[200px]">
                        {canEdit ? (
                          <textarea
                            value={row.pembelajaran || row.lessonsLearned || ''}
                            onChange={(e) => handleCellChange(row.id, 'pembelajaran', e.target.value)}
                            rows={2}
                            placeholder="Pembelajaran (lessons learned)..."
                            className="w-full bg-transparent hover:bg-white focus:bg-white p-1.5 rounded text-xs text-teal-950 border border-transparent hover:border-teal-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all resize-y placeholder:text-slate-400"
                          />
                        ) : (
                          <div className="p-1.5 text-xs text-teal-950 leading-relaxed whitespace-pre-wrap">{row.pembelajaran || row.lessonsLearned || '—'}</div>
                        )}
                      </td>

                      {/* 11. Recommendation Activities */}
                      <td className="p-1.5 border-r border-slate-200 min-w-[200px]">
                        {canEdit ? (
                          <textarea
                            value={row.recommendationActivities || ''}
                            onChange={(e) => handleCellChange(row.id, 'recommendationActivities', e.target.value)}
                            rows={2}
                            placeholder="Tuliskan rekomendasi tindakan / follow-up..."
                            className="w-full bg-transparent hover:bg-white focus:bg-white p-1.5 rounded text-xs text-slate-700 border border-transparent hover:border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all resize-y"
                          />
                        ) : (
                          <div className="p-1.5 text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">{row.recommendationActivities || '—'}</div>
                        )}
                      </td>

                      {/* 12. Actions (Row control) */}
                      {canEdit && (
                        <td className="w-20 px-2 py-2 text-center bg-slate-50/50">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleAddRow(idx)}
                              className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-all cursor-pointer"
                              title="Sisipkan baris baru di bawahnya"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDuplicateRow(idx)}
                              className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all cursor-pointer"
                              title="Duplikasi baris ini"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteRow(row.id)}
                              className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-all cursor-pointer"
                              title="Hapus baris ini"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Quick Add Bar Button at bottom */}
          {canEdit && (
            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleAddRow()}
                  className="bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-300 font-bold text-xs py-2 px-4 rounded-xl flex items-center gap-2 transition-all shadow-2xs cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> + Tambah Baris Baru
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setImportError('');
                    setImportSuccessMsg('');
                    setImportedPreviewRows([]);
                    setImportedFileName('');
                    setShowImportModal(true);
                  }}
                  className="bg-white hover:bg-blue-50 text-blue-700 border border-blue-300 font-bold text-xs py-2 px-4 rounded-xl flex items-center gap-2 transition-all shadow-2xs cursor-pointer"
                >
                  <Upload className="w-4 h-4" /> Import Excel / CSV
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSave()}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs py-2 px-5 rounded-xl flex items-center gap-2 transition-all shadow-xs cursor-pointer"
                >
                  <Save className="w-4 h-4" /> Simpan Tabel Logframe
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-white px-5 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-2 text-[11px]">
            <span className="font-semibold text-slate-700">Logical Framework Matrix:</span>
            <span>Mendukung pengisian langsung (inline edit), impor berkas Excel, dan kalkulasi selisih capaian secara instan.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-1.5 px-4 rounded-xl transition-all cursor-pointer"
          >
            Tutup
          </button>
        </div>

      </div>

      {/* DEDICATED IMPORT LFA MODAL / DIALOG */}
      {showImportModal && (
        <div className="fixed inset-0 z-60 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg border border-blue-500/30">
                  <FileUp className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white">Import File Logical Framework</h3>
                  <p className="text-xs text-slate-400">Unggah berkas spreadsheet (.xlsx, .xls, .csv) ke proyek <strong>{project.name}</strong></p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              
              {/* Template Download Prompt */}
              <div className="bg-amber-50/80 border border-amber-200/90 rounded-xl p-3.5 flex items-center justify-between gap-3 text-xs text-amber-900">
                <div className="flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Belum memiliki format yang sesuai?</p>
                    <p className="text-amber-800 text-[11px]">
                      Unduh template kosong resmi DFW yang telah terkonfigurasi kolom Outcome, Output, Activities, Target, dan Capaian.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="bg-white hover:bg-amber-100 text-amber-800 border border-amber-300 font-bold text-xs py-1.5 px-3 rounded-lg flex items-center gap-1.5 transition-all shrink-0 cursor-pointer shadow-2xs"
                >
                  <Download className="w-3.5 h-3.5" /> Unduh Template
                </button>
              </div>

              {/* Drag & Drop Upload Zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    processImportFile(e.dataTransfer.files[0]);
                  }
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-blue-500 bg-blue-50/70 scale-[1.01]'
                    : 'border-slate-300 hover:border-blue-400 bg-slate-50/60 hover:bg-blue-50/20'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      processImportFile(e.target.files[0]);
                    }
                  }}
                />
                <div className="flex flex-col items-center justify-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="font-extrabold text-sm text-slate-800">
                      Klik untuk memilih berkas atau seret & lepas ke sini
                    </p>
                    <p className="text-xs text-slate-500">
                      Mendukung format file <strong>Excel (.xlsx, .xls)</strong> dan <strong>CSV (.csv)</strong>
                    </p>
                  </div>
                </div>
              </div>

              {/* Error Alert */}
              {importError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{importError}</span>
                </div>
              )}

              {/* Success Alert & Preview */}
              {importSuccessMsg && importedPreviewRows.length > 0 && (
                <div className="space-y-3">
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{importSuccessMsg}</span>
                  </div>

                  {/* Mode Option */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                    <label className="text-xs font-bold text-slate-700 block">Pilihan Penggabungan Data:</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <label 
                        className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all ${
                          importMode === 'replace'
                            ? 'bg-blue-50 border-blue-300 text-blue-900 font-semibold'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100/60'
                        }`}
                      >
                        <input
                          type="radio"
                          name="importMode"
                          value="replace"
                          checked={importMode === 'replace'}
                          onChange={() => setImportMode('replace')}
                          className="mt-0.5 text-blue-600 focus:ring-blue-500"
                        />
                        <div>
                          <span className="block">Ganti Semua Baris ({importedPreviewRows.length} baris)</span>
                          <span className="text-[11px] font-normal text-slate-500">Menghapus baris lama dan menggantikannya dengan berkas baru</span>
                        </div>
                      </label>

                      <label 
                        className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all ${
                          importMode === 'append'
                            ? 'bg-blue-50 border-blue-300 text-blue-900 font-semibold'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100/60'
                        }`}
                      >
                        <input
                          type="radio"
                          name="importMode"
                          value="append"
                          checked={importMode === 'append'}
                          onChange={() => setImportMode('append')}
                          className="mt-0.5 text-blue-600 focus:ring-blue-500"
                        />
                        <div>
                          <span className="block">Tambahkan ke Baris Saat Ini</span>
                          <span className="text-[11px] font-normal text-slate-500">Menggabungkan ({rows.length} lama + {importedPreviewRows.length} baru)</span>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Auto-Sync Option to all project modules */}
                  <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3.5 space-y-1.5">
                    <label className="flex items-start gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={autoSyncToProject}
                        onChange={(e) => setAutoSyncToProject(e.target.checked)}
                        className="mt-0.5 w-4 h-4 text-emerald-600 rounded border-emerald-300 focus:ring-emerald-500"
                      />
                      <div>
                        <span className="text-xs font-bold text-emerald-900 block flex items-center gap-1.5">
                          <Cloud className="w-3.5 h-3.5 text-emerald-700" />
                          Otomatis hubungkan & sinkronkan seluruh data proyek ke Supabase
                        </span>
                        <span className="text-[11px] text-emerald-700 leading-normal block">
                          Memperbarui daftar Aktivitas, Indikator capaian, Outcome, Tantangan, Pembelajaran, dan persentase progres proyek secara terintegrasi.
                        </span>
                      </div>
                    </label>
                  </div>

                  {/* Quick Preview of Parsed Rows */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="bg-slate-100 px-3 py-1.5 text-[11px] font-bold text-slate-600 border-b border-slate-200 flex justify-between items-center">
                      <span>Pratinjau Data Impor (3 baris pertama):</span>
                      <span className="font-mono text-blue-600">{importedPreviewRows.length} Total Baris</span>
                    </div>
                    <div className="max-h-36 overflow-y-auto divide-y divide-slate-100 text-xs bg-white">
                      {importedPreviewRows.slice(0, 3).map((r, idx) => (
                        <div key={idx} className="p-2.5 space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-slate-800 truncate max-w-[280px]">
                              {idx + 1}. {r.activities || r.output || 'Tanpa Nama Aktivitas'}
                            </span>
                            <span className="font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                              Target: {r.target} | Capaian: {r.achievement} ({r.progress})
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 truncate">
                            Outcome: {r.outcome || '—'} • Indikator: {r.indicator || '—'}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              )}

            </div>

            {/* Footer */}
            <div className="bg-slate-50 px-5 py-3.5 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs py-2 px-4 rounded-xl border border-slate-200 transition-all cursor-pointer"
              >
                Batal
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={importedPreviewRows.length === 0}
                  onClick={() => handleApplyImport(false)}
                  className={`font-semibold text-xs py-2 px-3.5 rounded-xl border transition-all cursor-pointer ${
                    importedPreviewRows.length > 0
                      ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                      : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                  }`}
                  title="Hanya masukkan ke tabel LFA tanpa langsung sinkron ke modul lain"
                >
                  Terapkan ke Tabel Saja
                </button>

                <button
                  type="button"
                  disabled={importedPreviewRows.length === 0}
                  onClick={() => handleApplyImport(true)}
                  className={`font-extrabold text-xs py-2 px-5 rounded-xl flex items-center gap-1.5 transition-all shadow-sm cursor-pointer ${
                    importedPreviewRows.length > 0
                      ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                  title="Terapkan ke LFA dan otomatis sinkronkan ke seluruh modul proyek & Supabase"
                >
                  <Cloud className="w-4 h-4" />
                  Terapkan & Sinkronkan Proyek <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

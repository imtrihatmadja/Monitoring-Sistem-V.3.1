import React, { useState } from 'react';
import { Project, Activity, Indicator, Outcome, ProjectReflection, ProjectDocument } from '../types';
import {
  Play,
  Calendar,
  MapPin,
  User,
  Award,
  CheckCircle2,
  TrendingUp,
  AlertTriangle,
  BookOpen,
  AlertOctagon,
  Edit,
  Check,
  HelpCircle,
  Save,
  CloudUpload,
  Eye,
  Trash2,
  ExternalLink,
  Plus,
  X,
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
  FileArchive,
  FolderOpen,
  Clock
} from 'lucide-react';
import { DOC_CATEGORIES } from './DocumentsTab';
import { ProjectLearningSection } from './ProjectLearningSection';
import { getAccessToken } from '../lib/googleAuth';
import { deleteFileFromGoogleDrive } from '../lib/googleDriveService';
import { FormattedText } from './FormattedText';

interface ProjectDetailTabProps {
  project: Project;
  activities: Activity[];
  indicators: Indicator[];
  outcomes: Outcome[];
  reflections: ProjectReflection[];
  staffList: string[];
  documents: ProjectDocument[];
  onUpdateDocuments: (newDocs: ProjectDocument[]) => void;
  onBackToDashboard: () => void;
  onEditProjectClick: (projectId: string) => void;
  onAddActivityClick: () => void;
  onEditActivityClick: (activity: Activity) => void;
  onOpenSubActivities: (activityId: string) => void;
  onDeleteActivityClick: (activityId: string) => void;
  onSaveIndicatorValue: (indicatorId: string, newValue: number, newNotes?: string) => void;
  onUpdateBudgetActual?: (projectId: string, newBudgetActual: number) => void;
  onGoToDocumentsTab?: () => void;
  onAddReflection: (reflection: Partial<ProjectReflection>) => void;
  onDeleteReflection: (refId: string) => void;
}

export const ProjectDetailTab: React.FC<ProjectDetailTabProps> = ({
  project,
  activities = [],
  indicators = [],
  outcomes = [],
  reflections = [],
  staffList = [],
  documents = [],
  onUpdateDocuments,
  onBackToDashboard,
  onEditProjectClick,
  onAddActivityClick,
  onEditActivityClick,
  onOpenSubActivities,
  onDeleteActivityClick,
  onSaveIndicatorValue,
  onUpdateBudgetActual,
  onGoToDocumentsTab,
  onAddReflection,
  onDeleteReflection,
}) => {
  // Inline indicator states for quick value edits
  const [indValues, setIndValues] = useState<Record<string, number>>({});
  const [indNotes, setIndNotes] = useState<Record<string, string>>({});

  // Budget actual update states
  const [showBudgetUpdateModal, setShowBudgetUpdateModal] = useState(false);
  const [newBudgetActualInput, setNewBudgetActualInput] = useState('');

  // Inline Project Documents States
  const [showDocUpload, setShowDocUpload] = useState(false);
  const [inlineDocFile, setInlineDocFile] = useState<File | null>(null);
  const [inlineDocCategory, setInlineDocCategory] = useState('TOR');
  const [inlineDocDesc, setInlineDocDesc] = useState('');
  const [inlineDocProgress, setInlineDocProgress] = useState(0);
  const [inlineIsUploading, setInlineIsUploading] = useState(false);
  const [inlinePreviewDoc, setInlinePreviewDoc] = useState<ProjectDocument | null>(null);

  const handleIndValueChange = (id: string, val: number) => {
    setIndValues((prev) => ({ ...prev, [id]: val }));
  };

  const handleIndNotesChange = (id: string, val: string) => {
    setIndNotes((prev) => ({ ...prev, [id]: val }));
  };

  const handleSaveInd = (id: string, currentVal: number, existingNotes: string) => {
    const val = indValues[id] !== undefined ? indValues[id] : currentVal;
    const note = indNotes[id] !== undefined ? indNotes[id] : existingNotes;
    onSaveIndicatorValue(id, val, note);
  };

  const formatRupiah = (value: any) => {
    const num = Number(value || 0);
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  // 1. Average activities progress
  const avgActivitiesProgress = activities.length > 0 
    ? Math.round(activities.reduce((sum, act) => sum + (act.progress || 0), 0) / activities.length) 
    : 0;

  // 2. Average indicator progress (cap completion of each indicator at 100%)
  const sumIndsProgress = indicators.reduce((sum, ind) => {
    const currentVal = indValues[ind.id] !== undefined ? indValues[ind.id] : ind.current;
    const progressPercent = ind.target > 0 ? Math.round((currentVal / ind.target) * 100) : 0;
    return sum + Math.min(100, progressPercent);
  }, 0);
  const avgIndicatorsProgress = indicators.length > 0 
    ? Math.round(sumIndsProgress / indicators.length) 
    : 0;

  // 3. Overall composite progress
  const overallProgress = Math.round((avgActivitiesProgress + avgIndicatorsProgress) / 2);

  // 4. Counts
  const totalIndicators = indicators.length;
  const achievedIndicatorsCount = indicators.filter((ind) => {
    const val = indValues[ind.id] !== undefined ? indValues[ind.id] : ind.current;
    return val >= ind.target && ind.target > 0;
  }).length;

  // Rating label mapping
  let ratingLabel = 'KURANG';
  let ratingColor = 'bg-rose-50 text-rose-700 border-rose-200';
  if (overallProgress >= 80) {
    ratingLabel = 'SANGAT BAIK';
    ratingColor = 'bg-emerald-50 text-emerald-700 border-emerald-250';
  } else if (overallProgress >= 60) {
    ratingLabel = 'BAIK';
    ratingColor = 'bg-blue-50 text-blue-700 border-blue-250';
  } else if (overallProgress >= 40) {
    ratingLabel = 'CUKUP';
    ratingColor = 'bg-amber-50 text-amber-700 border-amber-250';
  }

  const getDynamicDateText = () => {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];
    const d = new Date();
    return `${d.getDate()} ${monthNames[d.getMonth()]} ${d.getFullYear()}`;
  };

  return (
    <div id="project-detail-layout" className="space-y-6">
      {/* Header Panel */}
      <div id="detail-header-panel" className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-1.5 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={onBackToDashboard}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
              >
                ← Kembali ke List
              </button>
              <span className="text-[10px] text-slate-300 font-bold">|</span>
              <span className="text-[10px] font-bold text-slate-400 bg-slate-50 py-0.5 px-2 rounded-md uppercase tracking-wider">
                {project.donor || 'Mandiri'}
              </span>
            </div>
            <h1 className="text-xl font-extrabold text-slate-800 leading-tight tracking-tight">
              {project.name}
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500 font-semibold pt-1">
              <div className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>{project.location}</span>
              </div>
              <div className="flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>PIC: <strong className="text-slate-700">{project.owner}</strong></span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400 font-mono" />
                <span>Deadline: <strong className="text-slate-700">{project.deadline || '—'}</strong></span>
              </div>
            </div>
            {project.desc && (
              <div className="pt-3 border-t border-slate-100/60 text-slate-600 text-xs leading-relaxed max-w-3xl">
                <FormattedText text={project.desc} className="text-slate-600 font-medium text-xs" />
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
            <button
              onClick={() => onEditProjectClick(project.id)}
              className="bg-slate-50 hover:bg-slate-100 text-slate-700 font-extrabold text-xs py-2 px-3.5 rounded-xl border border-slate-200 transition-all cursor-pointer flex items-center gap-1"
            >
              <Edit className="w-3.5 h-3.5" /> Edit Proyek
            </button>
          </div>
        </div>

        {/* Goal highlight */}
        {project.goal && (
          <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100/40 text-xs text-blue-900 leading-relaxed space-y-1">
            <span className="font-extrabold text-[10px] text-blue-600 uppercase tracking-widest block mb-1">Goal Proyek</span>
            <div className="font-semibold italic text-blue-800">
              <FormattedText text={project.goal} className="text-blue-800" italic />
            </div>
          </div>
        )}

        {/* Outcomes listed directly below Goal */}
        {outcomes && outcomes.length > 0 && (
          <div className="bg-amber-50/40 p-4 rounded-xl border border-amber-150/30 text-xs text-slate-700 leading-relaxed space-y-2">
            <div className="flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span className="font-extrabold text-[10px] text-amber-600 uppercase tracking-widest block">Project Outcomes (Hasil yang Diharapkan)</span>
            </div>
            <ul className="space-y-1.5 pl-1">
              {[...outcomes]
                .sort((a, b) => {
                  const getNum = (title: string) => {
                    const match = title.match(/Outcome\s*(\d+)/i) || title.match(/(\d+)/);
                    return match ? parseInt(match[1], 10) : 999999;
                  };
                  const numA = getNum(a.title);
                  const numB = getNum(b.title);
                  if (numA !== numB) return numA - numB;
                  return a.id.localeCompare(b.id);
                })
                .map((o, idx) => (
                  <li key={o.id} className="flex items-start gap-2 text-xs font-semibold">
                    <span className="flex items-center justify-center w-4 h-4 rounded-full bg-amber-100 text-amber-850 font-bold text-[9px] shrink-0 mt-0.5 font-mono">
                      {idx + 1}
                    </span>
                    <span className="pt-0.5 text-slate-750 leading-relaxed">{o.title}</span>
                  </li>
                ))}
            </ul>
          </div>
        )}

        {/* Dynamic Composite Progress & Budget Overview Grid */}
        <div className="space-y-4 pt-2">
          {/* Main Card: Progress Keseluruhan */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  📊 Progress Keseluruhan
                </h3>
              </div>
              <span className={`text-[10px] font-mono font-extrabold px-2.5 py-0.5 rounded-full border ${ratingColor}`}>
                {ratingLabel}
              </span>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-blue-600 tracking-tight">
                {overallProgress}%
              </span>
              <span className="text-[11px] font-semibold text-slate-400">
                rata-rata aktivitas &amp; indikator
              </span>
            </div>

            {/* horizontal progress bar */}
            <div className="w-full bg-slate-100/80 rounded-full h-2.5">
              <div
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${overallProgress}%` }}
              />
            </div>

            {/* formula detail row */}
            <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold text-slate-500 pt-1">
              <span className="bg-slate-50 border border-slate-150 px-2 py-1 rounded-md text-slate-600 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Aktivitas {avgActivitiesProgress}%
              </span>
              <span className="text-slate-350 font-medium">+</span>
              <span className="bg-slate-50 border border-slate-150 px-2 py-1 rounded-md text-slate-600 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Indikator {avgIndicatorsProgress}%
              </span>
              <span className="text-slate-350 font-medium">÷ 2</span>
            </div>
          </div>

          {/* Row of 4 Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-50/40 border border-slate-100 p-4 rounded-xl shadow-3xs space-y-2">
              <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block">Total Indikator</span>
              <p className="text-2xl font-extrabold text-slate-800">{totalIndicators}</p>
            </div>
            <div className="bg-slate-50/40 border border-slate-100 p-4 rounded-xl shadow-3xs space-y-2">
              <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block">Indikator Tercapai</span>
              <p className="text-2xl font-extrabold text-emerald-600">{achievedIndicatorsCount}/{totalIndicators}</p>
            </div>
            <div className="bg-slate-50/40 border border-slate-100 p-4 rounded-xl shadow-3xs space-y-2">
              <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block">Avg. Indikator</span>
              <p className="text-2xl font-extrabold text-blue-600">{avgIndicatorsProgress}%</p>
            </div>
            <div className="bg-slate-50/40 border border-slate-100 p-4 rounded-xl shadow-3xs space-y-2">
              <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block">Update Terakhir</span>
              <p className="text-sm font-extrabold text-slate-705 pt-1.5">{getDynamicDateText()}</p>
            </div>
          </div>

          {/* Yellow Card: Anggaran Proyek */}
          <div className="bg-amber-50/15 border border-amber-200/50 p-5 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-xs">💰</span>
                <h4 className="text-xs font-extrabold text-amber-800 uppercase tracking-wider">
                  Anggaran Proyek
                </h4>
              </div>
              <button
                onClick={() => {
                  setNewBudgetActualInput(String(project.budgetActual || 0));
                  setShowBudgetUpdateModal(true);
                }}
                className="p-1.5 px-2.5 border border-amber-200 bg-amber-100/70 hover:bg-amber-100 text-amber-850 rounded-lg flex items-center gap-1 cursor-pointer font-extrabold text-[10px] transition-all"
                title="Update Realisasi Anggaran"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Update Capaian</span>
              </button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Disetujui</span>
                <p className="text-xl font-bold text-slate-850">{formatRupiah(project.budgetApproved)}</p>
              </div>
              <div className="space-y-1 text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Realisasi</span>
                <p className="text-xl font-extrabold text-amber-600">
                  {formatRupiah(project.budgetActual)}{' '}
                  <span className="text-xs font-extrabold px-1.5 py-0.5 bg-amber-100 hover:bg-amber-150 rounded text-amber-800 ml-1.5 transition-all">
                    {project.budgetApproved > 0 ? Math.round((project.budgetActual / project.budgetApproved) * 100) : 0}% absorb
                  </span>
                </p>
              </div>
            </div>

            {/* Golden budget utilization bar */}
            <div className="w-full bg-slate-200/50 rounded-full h-2">
              <div
                className="bg-amber-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, project.budgetApproved > 0 ? Math.round((project.budgetActual / project.budgetApproved) * 100) : 0)}%` }}
              />
            </div>

            {/* Riwayat Update Realisasi */}
            <div className="space-y-2 pt-2 border-t border-dashed border-amber-200/600">
              <span className="text-[9px] font-extrabold uppercase tracking-widest text-amber-800 block">
                Riwayat Update Realisasi
              </span>
              <div className="space-y-1.5 text-[10.5px] font-bold font-mono">
                <div className="flex items-center justify-between text-slate-600">
                  <span>{formatRupiah(project.budgetActual)}</span>
                  <span className="text-slate-400 font-normal">{getDynamicDateText()}, 11.24</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>{formatRupiah(project.budgetApproved)}</span>
                  <span className="text-slate-400 font-normal">{getDynamicDateText()}, 09.46</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid Split Panel: Left Activities, Right Indicators */}
      <div id="detail-split-panel" className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* PANEL KIRI: LIST AKTIVITAS */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs flex flex-col min-h-[400px]">
          <div className="flex items-center justify-between border-b border-slate-50 pb-3 mb-4">
            <div>
              <h3 className="font-extrabold text-slate-800 text-xs tracking-wider uppercase flex items-center gap-1.5">
                📋 Rencana &amp; Progress Aktivitas
              </h3>
              <span className="text-[10px] text-slate-400">{activities.length} Kegiatan Ditugaskan</span>
            </div>
            <button
              onClick={onAddActivityClick}
              className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs py-1 px-3 rounded-lg shadow-xs transition-all cursor-pointer"
            >
              ＋ Tambah
            </button>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto max-h-[480px] p-0.5">
            {activities.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                Belum ada rencana kegiatan untuk proyek ini. Klik tombol Tambah untuk membuat penugasan pertama.
              </div>
            ) : (
              activities.map((act) => {
                let statusColor = 'bg-slate-50 border-slate-200 text-slate-500';
                if (act.status === 'Belum Mulai') {
                  statusColor = 'bg-rose-50 border-rose-100 text-rose-700';
                } else if (act.status === 'Sedang Berjalan') {
                  statusColor = 'bg-amber-50 border-amber-201 text-amber-700';
                } else if (act.status === 'Selesai') {
                  statusColor = 'bg-emerald-50 border-emerald-100 text-emerald-700';
                } else if (act.status === 'Tertunda') {
                  statusColor = 'bg-slate-100 border-slate-200 text-slate-500';
                }

                return (
                  <div
                    key={act.id}
                    onClick={() => onOpenSubActivities(act.id)}
                    className="p-4 rounded-xl border border-slate-100 bg-slate-50/20 hover:bg-blue-50/10 hover:border-blue-200 cursor-pointer transition-all space-y-3 group relative shadow-2xs hover:shadow-xs"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1 select-none">
                        <span className={`inline-block py-0.5 px-2 rounded border text-[9px] font-bold ${statusColor}`}>
                          {act.status}
                        </span>
                        <h4 className="font-extrabold text-slate-800 text-xs group-hover:text-blue-600 transition-colors leading-relaxed">
                          {act.title}
                        </h4>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* PIC label */}
                        <span className="text-[10px] text-slate-500 font-bold font-mono py-0.5 px-2 bg-white rounded-md border border-slate-100">
                          {act.pic || '—'}
                        </span>
                        {/* CRUD actions with stopPropagation */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditActivityClick(act);
                          }}
                          className="p-1.5 hover:bg-slate-200/80 rounded-lg text-slate-500 hover:text-blue-600 cursor-pointer transition-colors"
                          title="Edit Aktivitas Utama"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteActivityClick(act.id);
                          }}
                          className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 cursor-pointer transition-colors"
                          title="Hapus Aktivitas Utama"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {act.desc && (
                      <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                        {act.desc}
                      </p>
                    )}

                    {/* Progress slider inside card footer */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] text-slate-500 font-bold">
                        <span>Penyelesaian</span>
                        <span>{act.progress}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1">
                        <div
                          className="bg-blue-600 h-1 rounded-full transition-all duration-300"
                          style={{ width: `${act.progress}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100/50">
                      <span>Jatuh Tempo: <strong className="text-slate-505">{act.dueDate || '—'}</strong></span>
                      <div className="flex items-center gap-1.5">
                        {act.notes && Array.isArray(act.notes) && act.notes.length > 0 && (
                          <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 font-bold text-[9px]">
                            💬 {act.notes.length}
                          </span>
                        )}
                        <span className="text-blue-650 font-extrabold text-[9px] flex items-center gap-1 bg-blue-50/50 px-2 py-0.5 rounded-lg group-hover:bg-blue-50 transition-colors border border-blue-100/50">
                          📋 Sub-Aktivitas
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* PANEL KANAN: UPDATE INDIKATOR */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs flex flex-col min-h-[400px]">
          <div className="border-b border-slate-50 pb-3 mb-4">
            <h3 className="font-extrabold text-slate-800 text-xs tracking-wider uppercase flex items-center gap-1.5">
              📊 Realtime Update Capaian Indikator
            </h3>
            <span className="text-[10px] text-slate-400">Silakan ubah capaian dan simpan secara terpisah</span>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto max-h-[480px]">
            {indicators.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                Tidak ada indikator kinerja terdaftar untuk proyek ini.
              </div>
            ) : (
              indicators.map((ind) => {
                const currentVal = indValues[ind.id] !== undefined ? indValues[ind.id] : ind.current;
                const progressPercent = ind.target > 0 ? Math.round((currentVal / ind.target) * 100) : 0;

                return (
                  <div
                    key={ind.id}
                    className="p-4 rounded-xl border border-slate-100 bg-slate-50/20 space-y-3 text-xs"
                  >
                    <div className="space-y-1">
                      <p className="font-bold text-slate-800 leading-snug">
                        {ind.title}
                      </p>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                        <span>Target: {ind.target} {ind.unit}</span>
                        <span>•</span>
                        <span className="text-emerald-600">Terbaca: {ind.current} {ind.unit}</span>
                      </div>
                    </div>

                    {/* Progress indicators wrapper */}
                    <div className="space-y-1 pt-1">
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold">
                        <span>Pencapaian Target</span>
                        <span className="text-slate-600">{progressPercent}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5">
                        <div
                          className="bg-emerald-500 h-1.5 rounded-full"
                          style={{ width: `${Math.min(progressPercent, 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Catatan / Keterangan Capaian Display */}
                    {ind.notes ? (
                      <div className="bg-slate-100/65 border border-slate-200/60 p-2.5 rounded-xl mt-2 space-y-1.5 animate-fadeIn">
                        <div className="text-[11px] font-medium text-slate-700 leading-relaxed italic">
                          <FormattedText text={ind.notes} className="text-slate-700 font-medium italic text-[11px]" italic />
                        </div>
                        {ind.notesUpdatedAt && (
                          <div className="flex items-center gap-1 text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>Catatan Terakhir: {ind.notesUpdatedAt}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-[10px] text-slate-400 italic mt-1 font-medium bg-slate-50 border border-slate-100 p-2.5 rounded-xl">
                        Belum ada catatan atau keterangan capaian.
                      </div>
                    )}

                    {/* Inline updating inputs */}
                    <div className="space-y-2 pt-2 border-t border-slate-100/60">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="space-y-1 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                          <span>Edit Angka Capaian</span>
                          <input
                            type="number"
                            className="w-full bg-white border border-slate-200 py-1.5 px-2.5 rounded-lg focus:outline-none focus:border-blue-400 text-xs font-bold text-slate-800"
                            value={currentVal}
                            onChange={(e) => handleIndValueChange(ind.id, Number(e.target.value))}
                          />
                        </div>

                        <div className="space-y-1 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                          <span>Catatan / Keterangan Capaian</span>
                          <input
                            type="text"
                            placeholder="Tulis progres, kendala atau info capaian..."
                            className="w-full bg-white border border-slate-200 py-1.5 px-2.5 rounded-lg focus:outline-none focus:border-blue-400 text-xs font-medium text-slate-800"
                            value={indNotes[ind.id] !== undefined ? indNotes[ind.id] : (ind.notes || '')}
                            onChange={(e) => handleIndNotesChange(ind.id, e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="flex justify-end pt-1">
                        <button
                          onClick={() => handleSaveInd(ind.id, ind.current, ind.notes || '')}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-[10px] py-1.5 px-3.5 rounded-lg shadow-xs cursor-pointer inline-flex items-center gap-1.5 transition-all"
                        >
                          <Check className="w-3.5 h-3.5" /> Simpan Capaian &amp; Catatan
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* BERKAS & DOKUMEN PROYEK (Sinkronisasi GDrive) */}
      <div id="project-documents-panel" className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs space-y-5">
        <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-extrabold text-slate-800 tracking-wider uppercase flex items-center gap-1.5">
              <FolderOpen className="w-4 h-4 text-blue-500" /> Berkas &amp; Dokumen Proyek
            </h3>
            <span className="text-[10px] text-slate-400">Total {documents.filter(d => d.projectName === project.name).length} dokumen tersimpan di Google Drive</span>
          </div>
          <button
            onClick={() => {
              if (onGoToDocumentsTab) {
                onGoToDocumentsTab();
              }
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs py-1.5 px-3 rounded-lg shadow-xs transition-all cursor-pointer inline-flex items-center gap-1"
          >
            ☁️ Unggah Dokumen
          </button>
        </div>

        {/* List of project documents */}
        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
          {documents.filter(d => d.projectName === project.name).length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              Belum ada dokumen yang terdaftar untuk proyek ini. Klik tombol Unggah Dokumen untuk mengelola dan menambahkan berkas pendukung di halaman Manajemen Dokumen.
            </div>
          ) : (
            documents
              .filter(d => d.projectName === project.name)
              .map((doc) => {
                const cat = DOC_CATEGORIES.find(c => c.code === doc.category) || { icon: '🗂️', label: doc.category };
                const ext = doc.fileName.split('.').pop()?.toLowerCase();
                let fileColor = 'text-slate-400';
                if (doc.mimeType.startsWith('image/')) fileColor = 'text-purple-500';
                if (doc.mimeType === 'application/pdf' || ext === 'pdf') fileColor = 'text-red-500';
                if (ext && ['doc', 'docx'].includes(ext)) fileColor = 'text-blue-500';
                if (ext && ['xls', 'xlsx', 'csv'].includes(ext)) fileColor = 'text-emerald-500';

                return (
                  <div
                    key={doc.id}
                    onClick={() => setInlinePreviewDoc(doc)}
                    className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/20 hover:bg-slate-50/50 hover:border-slate-200 cursor-pointer transition-all gap-4 group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 bg-white rounded-lg border border-slate-100">
                        <FileText className={`w-4 h-4 ${fileColor}`} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-extrabold text-slate-800 text-[11px] truncate group-hover:text-blue-600 transition-colors" title={doc.fileName}>
                          {doc.fileName}
                        </p>
                        <div className="flex items-center gap-2 text-[9px] text-slate-400 mt-0.5 mt-0.5">
                          <span className="font-bold text-slate-500">{cat.icon} {cat.label}</span>
                          <span>•</span>
                          <span>{doc.createdAt || '—'}</span>
                          <span>•</span>
                          <span className="font-mono">{doc.fileSize ? (doc.fileSize / 1024).toFixed(0) + ' KB' : ''}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setInlinePreviewDoc(doc);
                        }}
                        className="p-1 px-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-700 border border-transparent hover:border-slate-250 rounded-lg transition-all"
                        title="Pratinjau"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <a
                        href={doc.webViewLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="p-1 px-1.5 hover:bg-slate-100 text-slate-400 hover:text-blue-600 border border-transparent hover:border-slate-250 rounded-lg transition-all inline-flex"
                        title="Buka Google Drive"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (window.confirm(`Hapus dokumen "${doc.fileName}" dari proyek ini?`)) {
                            // Delete from Google Drive if there's an active token and a drive file ID
                            if (doc.driveFileId) {
                              try {
                                const token = getAccessToken() || '';
                                await deleteFileFromGoogleDrive(doc.driveFileId, token);
                                console.log(`Document file ${doc.driveFileId} successfully deleted of ${doc.fileName}`);
                              } catch (err: any) {
                                console.warn('Gagal menghapus file dari Google Drive:', err);
                                alert(`Catatan: File di Google Drive tidak dapat dihapus (${err.message || err}), namun metadata di database tetap dihapus.`);
                              }
                            }
                            onUpdateDocuments(documents.filter(d => d.id !== doc.id));
                          }
                        }}
                        className="p-1 px-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-750 border border-transparent hover:border-rose-250 rounded-lg transition-all"
                        title="Hapus"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
          )}
        </div>
      </div>

      {/* PANEL REFLEKSI & PEMBELAJARAN PROYEK */}
      <ProjectLearningSection
        projectId={project.id}
        reflections={reflections}
        staffList={staffList}
        onAddReflection={onAddReflection}
        onDeleteReflection={onDeleteReflection}
      />

      {/* INLINE DRIVE PREVIEW MODAL */}
      {inlinePreviewDoc && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 text-xs">
          <div className="bg-white rounded-2xl border border-slate-100 max-w-4xl w-full h-[80vh] shadow-2xl flex flex-col justify-between overflow-hidden text-slate-705">
            {/* Header toolbar */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="min-w-0 flex-1">
                <span className="text-[9px] font-extrabold text-blue-600 uppercase tracking-widest block">Google Drive Cloud Preview</span>
                <h3 className="font-extrabold text-slate-800 text-xs truncate leading-snug mt-0.5">{inlinePreviewDoc.fileName}</h3>
              </div>
              <button
                onClick={() => setInlinePreviewDoc(null)}
                className="p-1.5 hover:bg-slate-100 border border-slate-200 rounded-lg cursor-pointer ml-4"
              >
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            {/* Simulated iframe preview */}
            <div className="flex-1 bg-slate-100 relative">
              <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-slate-905 w-full h-full">
                <div className="p-5 bg-white rounded-2xl border border-slate-200 max-w-sm w-full space-y-4 shadow-sm">
                  <div className="p-4 bg-blue-50 text-blue-600 rounded-full w-14 h-14 mx-auto flex items-center justify-center">
                    <FileText className="w-8 h-8" />
                  </div>
                  <div>
                    <h5 className="font-extrabold text-slate-800 text-xs leading-snug">{inlinePreviewDoc.fileName}</h5>
                    <p className="text-[10px] text-slate-550 font-bold font-mono mt-1 mb-0.5">Ukuran: {inlinePreviewDoc.fileSize ? (inlinePreviewDoc.fileSize / 1024).toFixed(0) + ' KB' : ''}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Jenis: {inlinePreviewDoc.mimeType}</p>
                  </div>
                  {inlinePreviewDoc.description && (
                    <div className="bg-slate-50 p-2.5 rounded-lg text-left text-[11px] text-slate-600 leading-normal border border-slate-200/50">
                      <p>{inlinePreviewDoc.description}</p>
                    </div>
                  )}
                  <div className="pt-2">
                    <a
                      href={inlinePreviewDoc.webViewLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs py-2 px-5 rounded-xl shadow-xs transition-all inline-flex items-center gap-1.5 cursor-pointer text-center w-full justify-center"
                    >
                      Buka di Google Drive Baru ↗️
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal actions */}
            <div className="p-3 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setInlinePreviewDoc(null)}
                className="bg-slate-200 hover:bg-slate-300 border border-slate-300 py-1.5 px-4 rounded-lg text-slate-750 font-bold cursor-pointer font-sans"
              >
                Tutup Pratinjau
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Update Capaian Realisasi Anggaran */}
      {showBudgetUpdateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-100 max-w-sm w-full shadow-xl overflow-hidden font-medium">
            <div className="p-4 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-1.5">
                <span className="text-sm">📈</span>
                <span className="text-xs font-extrabold text-slate-800 uppercase tracking-widest">
                  Update Realisasi Anggaran
                </span>
              </div>
              <button
                onClick={() => setShowBudgetUpdateModal(false)}
                className="p-1 px-1.5 hover:bg-slate-200 border border-slate-200/60 rounded-lg cursor-pointer"
              >
                <X className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>

            <div className="p-4 space-y-4 text-slate-700 text-xs">
              <div className="bg-amber-50/40 p-3 border border-amber-100 rounded-xl space-y-1 text-amber-800">
                <span className="font-extrabold text-[9px] uppercase tracking-wider block">ℹ️ Petunjuk</span>
                <p className="leading-relaxed">
                  Masukkan pengeluaran riil terbaru. Nilai ini dibandingkan dengan disetujui (<strong>{formatRupiah(project.budgetApproved)}</strong>) untuk penyerapan.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-500 font-bold block">
                  Realisasi Pengeluaran (IDR)
                </label>
                <div className="relative rounded-lg">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <span className="text-slate-400 font-bold font-mono">Rp</span>
                  </div>
                  <input
                    type="number"
                    value={newBudgetActualInput}
                    onChange={(e) => setNewBudgetActualInput(e.target.value)}
                    className="w-full bg-slate-50/50 border border-slate-200 py-2 pl-9 pr-3 rounded-xl focus:outline-none focus:border-amber-400 cursor-text font-bold font-mono text-xs"
                    placeholder="Contoh: 5000000"
                    autoFocus
                  />
                </div>
                {Number(newBudgetActualInput) > project.budgetApproved && (
                  <div className="flex items-start gap-1 p-2 bg-rose-50 border border-rose-100 text-rose-700 rounded-lg text-[9px] leading-snug mt-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>Perhatian: Realisasi melebihi total anggaran proyek disetujui!</span>
                  </div>
                )}
                {newBudgetActualInput && (
                  <p className="text-[9.5px] text-slate-400 font-bold font-mono mt-1">
                    Format: {formatRupiah(Number(newBudgetActualInput))}
                  </p>
                )}
              </div>
            </div>

            <div className="p-3 border-t border-slate-100 bg-slate-50/60 flex justify-end gap-2 text-xs">
              <button
                onClick={() => setShowBudgetUpdateModal(false)}
                className="bg-slate-200/80 hover:bg-slate-200 border border-slate-300 py-1 px-3 rounded-lg text-slate-705 font-bold cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  const numValue = Number(newBudgetActualInput);
                  if (isNaN(numValue) || numValue < 0) {
                    alert('Masukkan nilai angka yang valid!');
                    return;
                  }
                  if (onUpdateBudgetActual) {
                    onUpdateBudgetActual(project.id, numValue);
                  }
                  setShowBudgetUpdateModal(false);
                }}
                className="bg-amber-500 hover:bg-amber-600 border border-amber-600/50 py-1 px-3.5 rounded-lg text-white font-extrabold cursor-pointer flex items-center gap-1 shadow-xs transition-colors"
              >
                <Save className="w-3.5 h-3.5" />
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

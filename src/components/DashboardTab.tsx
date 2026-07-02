import React from 'react';
import { Project, Activity, Issue, Indicator } from '../types';
import { 
  Folder, Play, AlertTriangle, CheckCircle, Percent, MapPin, 
  User, Calendar, Award, Sparkles, DollarSign, TrendingUp, 
  ArrowUpRight, BarChart3, AlertCircle, ShieldAlert, FileSpreadsheet, FileDown, Upload 
} from 'lucide-react';
import { ProjectImpactRow } from './ProjectImpactRow';
import { downloadProjectTemplate, exportProjectsToExcel } from '../lib/excelHelpers';

interface DashboardTabProps {
  projects: Project[];
  activities: Activity[];
  issues: Issue[];
  indicators: Indicator[];
  onSelectProject: (projectId: string) => void;
  onAddProjectClick: () => void;
  onOpenImportModal: () => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  projects,
  activities,
  issues,
  indicators,
  onSelectProject,
  onAddProjectClick,
  onOpenImportModal,
}) => {
  // Budget Formatting Helper
  const formatRupiah = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Stats calculations
  const nonArchivedProjects = projects.filter((p) => !p.isArchived);
  const totalProjects = nonArchivedProjects.length;
  
  const activeProjects = nonArchivedProjects.filter(
    (p) => p.status === 'Aktif' || p.status === 'On Track'
  ).length;
  
  const lateProjects = nonArchivedProjects.filter((p) => p.status === 'Terlambat').length;

  // Average progress across non-archived projects
  const avgProgress = totalProjects
    ? Math.round(nonArchivedProjects.reduce((sum, p) => {
        // Calculate average progress from activities first if available
        const pActs = activities.filter((a) => a.projectId === p.id);
        const pProgress = pActs.length
          ? Math.round(pActs.reduce((s, act) => s + act.progress, 0) / pActs.length)
          : p.progress;
        return sum + pProgress;
      }, 0) / totalProjects)
    : 0;

  // Aggregate stats logic for the system overview hero
  const totalBudgetApproved = nonArchivedProjects.reduce((sum, p) => sum + (p.budgetApproved || 0), 0);
  const totalBudgetActual = nonArchivedProjects.reduce((sum, p) => sum + (p.budgetActual || 0), 0);
  const globalAbsorption = totalBudgetApproved > 0
    ? Math.round((totalBudgetActual / totalBudgetApproved) * 100)
    : 0;

  const totalActsCount = activities.filter(a => nonArchivedProjects.some(p => p.id === a.projectId)).length;
  const completedActsCount = activities.filter(a => a.status === 'Selesai' && nonArchivedProjects.some(p => p.id === a.projectId)).length;
  const globalActivityProgress = totalActsCount > 0 
    ? Math.round((completedActsCount / totalActsCount) * 100)
    : 0;

  return (
    <div id="dashboard-tab-container" className="space-y-6">
      
      {/* Visual Aggregrated Hero Section */}
      <div id="dashboard-system-hero" className="bg-slate-900 rounded-3xl p-6 text-white overflow-hidden relative shadow-md">
        {/* Subtle Decorative elements */}
        <div className="absolute right-0 top-0 -translate-y-12 translate-x-12 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 translate-y-12 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
          <div className="lg:col-span-2 space-y-3">
            <div className="inline-flex items-center gap-1.5 py-1 px-3 bg-blue-500/25 border border-blue-400/25 rounded-full text-[11px] font-bold uppercase tracking-wider text-blue-300">
              <Sparkles className="w-3.5 h-3.5" /> Portal Monitoring &amp; Evaluasi
            </div>
            <h1 className="text-xl md:text-2xl font-extrabold tracking-tight">
              Selamat Datang di DFW Indonesia — Monev Tools
            </h1>
            <p className="text-slate-300 text-xs leading-relaxed max-w-2xl">
              Kombinasi analisis indikator kualitatif, pengawasan isu perikanan (IUU Fishing, HAM/Ketenagakerjaan Awak Kapal Perikanan), tracking anggaran lapangan, serta database penerima manfaat program nelayan binaan secara realtime.
            </p>
          </div>
          
          <div className="bg-slate-800/60 backdrop-blur-md rounded-2xl p-4 border border-slate-700/50 space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Capaian Agregat Program</h3>
            <div className="space-y-2.5 text-xs text-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Penyerapan Anggaran</span>
                <span className="font-extrabold text-amber-400">{globalAbsorption}%</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-1.5 overflow-hidden">
                <div className="bg-amber-400 h-1.5 rounded-full" style={{ width: `${globalAbsorption}%` }} />
              </div>
              
              <div className="flex items-center justify-between pt-1">
                <span className="text-slate-400">Penyelesaian Aktivitas</span>
                <span className="font-extrabold text-emerald-400">{globalActivityProgress}%</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-1.5 overflow-hidden">
                <div className="bg-emerald-400 h-1.5 rounded-full" style={{ width: `${globalActivityProgress}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Metric Stat Grid */}
      <div id="dashboard-stats" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div id="stat-card-total" className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-4 hover:border-blue-100 transition-all group">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl group-hover:scale-105 transition-transform">
            <Folder className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Proyek</p>
            <p className="text-2xl font-black text-slate-800 leading-none mt-1">{totalProjects}</p>
            <span className="text-[10px] text-slate-400 block mt-1">proyek aktif terdaftar</span>
          </div>
        </div>

        <div id="stat-card-active" className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-4 hover:border-emerald-100 transition-all group">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl group-hover:scale-105 transition-transform">
            <Play className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Aktif &amp; On Track</p>
            <p className="text-2xl font-black text-slate-800 leading-none mt-1">{activeProjects}</p>
            <span className="text-[10px] text-emerald-600 font-bold block mt-1">
              {totalProjects ? Math.round((activeProjects / totalProjects) * 100) : 0}% sehat operasional
            </span>
          </div>
        </div>

        <div id="stat-card-late" className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-4 hover:border-rose-100 transition-all group">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl group-hover:scale-105 transition-transform">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Terlambat</p>
            <p className="text-2xl font-black text-slate-800 leading-none mt-1">{lateProjects}</p>
            <span className="text-[10px] text-rose-500 font-bold block mt-1">butuh tindakan koordinasi</span>
          </div>
        </div>

        <div id="stat-card-progress" className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-4 hover:border-amber-100 transition-all group">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl group-hover:scale-105 transition-transform">
            <Percent className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Rata-rata Progress</p>
            <p className="text-2xl font-black text-slate-800 leading-none mt-1">{avgProgress}%</p>
            <div className="w-16 bg-slate-100 rounded-full h-1 mt-1.5 overflow-hidden">
              <div className="bg-amber-500 h-1 rounded-full" style={{ width: `${avgProgress}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Projects list header */}
      <div id="dashboard-projects-header" className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Proyek Aktif DFW Indonesia
            <span className="text-xs font-semibold text-blue-600 py-0.5 px-2 bg-blue-50 border border-blue-100 rounded-full">
              {totalProjects} Proyek
            </span>
          </h2>
          <p className="text-xs text-slate-500">Klik kartu proyek untuk rincian aktivitas dan update capaian indikator kerja</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={downloadProjectTemplate}
            id="btn-download-template-dash"
            className="bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 font-extrabold text-xs py-2 px-3.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer h-9"
            title="Unduh Template Excel untuk pembuatan Proyek Secara Massal (Bulk)"
          >
            <FileDown className="w-4 h-4 text-emerald-600" /> Template Excel
          </button>

          <button
            onClick={onOpenImportModal}
            id="btn-import-excel-dash"
            className="bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 font-extrabold text-xs py-2 px-3.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer h-9"
          >
            <Upload className="w-4 h-4 text-blue-600" /> Import Proyek
          </button>

          <button
            onClick={() => exportProjectsToExcel(projects, indicators)}
            id="btn-export-excel-dash"
            className="bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 font-extrabold text-xs py-2 px-3.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer h-9"
            title="Ekspor seluruh data Proyek dan Indikator ke format Excel"
          >
            <FileSpreadsheet className="w-4 h-4 text-purple-600" /> Export Proyek
          </button>

          <button
            onClick={onAddProjectClick}
            id="btn-add-project-dash"
            className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs py-2 px-4 rounded-xl shadow-xs hover:shadow-md transition-all flex items-center gap-1.5 cursor-pointer h-9"
          >
            <span>＋</span> Tambah Proyek Baru
          </button>
        </div>
      </div>

      {/* Project Cards Grid */}
      <div id="project-cards-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {totalProjects === 0 ? (
          <div id="empty-projects-state" className="col-span-full bg-slate-50 text-center py-12 px-4 rounded-2xl border border-dashed border-slate-200">
            <Folder className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-700 mb-1">Belum Ada Proyek</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">Mulai kelola program kerja dengan mengunggah template Excel atau mengisi formulir manual.</p>
            <button
               onClick={onAddProjectClick}
               className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2 px-4 rounded-xl cursor-pointer"
            >
              Buat Proyek Pertama
            </button>
          </div>
        ) : (
          nonArchivedProjects.map((p) => {
            const projectIndicators = indicators.filter((ind) => ind.projectId === p.id);
            const projectActivities = activities.filter((act) => act.projectId === p.id);
            const projectIssues = issues.filter((is) => is.projectId === p.id);

            // Calculate overall progress from activities
            const completedActivitiesCount = projectActivities.filter((a) => a.status === 'Selesai').length;
            const activitiesProgress = projectActivities.length
              ? Math.round(projectActivities.reduce((sum, act) => sum + act.progress, 0) / projectActivities.length)
              : null;
            
            const displayProgress = activitiesProgress !== null ? activitiesProgress : p.progress;

            // Status styling
            let statusColor = 'bg-slate-50 border-slate-200 text-slate-600';
            if (p.status === 'Aktif' || p.status === 'On Track') {
              statusColor = 'bg-emerald-50 border-emerald-100 text-emerald-700';
            } else if (p.status === 'Terlambat') {
              statusColor = 'bg-rose-50 border-rose-100 text-rose-700';
            } else if (p.status === 'Selesai') {
              statusColor = 'bg-blue-50 border-blue-100 text-blue-700';
            } else if (p.status === 'Ditangguhkan') {
              statusColor = 'bg-amber-50 border-amber-100 text-amber-700';
            }

            // FILTER: Indicators with progress under < 50% for DFW Priority Indicators summary box
            const lowInds = projectIndicators.map((ind) => {
              const pct = ind.target > 0 ? Math.min(Math.round((ind.current / ind.target) * 100), 100) : 0;
              return { ...ind, pct };
            }).filter((ind) => ind.pct < 50)
              .sort((a, b) => a.pct - b.pct);

            // Calculate critical vs warning indicator categories
            const critCount = lowInds.filter(ind => ind.pct < 25).length;
            const prepCount = lowInds.filter(ind => ind.pct >= 25).length;

            return (
              <div
                key={p.id}
                id={`project-card-${p.id}`}
                onClick={() => onSelectProject(p.id)}
                className="bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200 hover:-translate-y-0.5 transition-all cursor-pointer flex flex-col h-full group overflow-hidden"
              >
                {/* Header info */}
                <div className="p-5 flex-1 space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <span className={`text-[10px] font-extrabold py-0.5 px-2.5 rounded-full border uppercase tracking-wide ${statusColor}`}>
                      {p.status}
                    </span>
                    {p.donor && (
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-50 py-0.5 px-2 rounded-md">
                        {p.donor}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1">
                    <h3 className="font-extrabold text-slate-800 text-sm leading-snug group-hover:text-blue-600 transition-colors line-clamp-2">
                      {p.name}
                    </h3>
                    <p className="text-slate-500 text-xs line-clamp-2 leading-relaxed">
                      {p.desc || 'Tidak ada deskripsi singkat proyek.'}
                    </p>
                  </div>

                  {/* Metadata labels */}
                  <div className="grid grid-cols-2 gap-3 pt-1 text-[11px] text-slate-500 font-semibold">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{p.location}</span>
                    </div>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{p.owner}</span>
                    </div>
                    {p.deadline && (
                      <div className="flex items-center gap-1.5 col-span-2 min-w-0 font-mono">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>Deadline: <span className="font-extrabold text-slate-600">{p.deadline}</span></span>
                      </div>
                    )}
                  </div>

                  {/* Goal or principal outcome highlights */}
                  {p.goal && (
                    <div className="bg-blue-50/40 p-2.5 rounded-xl border border-blue-100/30 text-[11px] text-blue-850 flex items-start gap-1.5 leading-relaxed">
                      <Award className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                      <span className="italic font-medium">"{p.goal}"</span>
                    </div>
                  )}

                  {/* Approved vs Actual Budget inside the project card */}
                  {(p.budgetApproved > 0 || p.budgetActual > 0) && (
                    <div className="bg-slate-50 border border-slate-100/80 p-2.5 rounded-xl space-y-1.5 text-[11px]">
                      <div className="flex justify-between items-center text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">
                        <span>Anggaran Proyek</span>
                        <span className="text-slate-500 font-medium">realisasi</span>
                      </div>
                      <div className="flex justify-between items-baseline font-mono">
                        <span className="text-slate-500">{formatRupiah(p.budgetApproved)}</span>
                        <span className="font-extrabold text-slate-800">
                          {formatRupiah(p.budgetActual)}
                          {p.budgetApproved > 0 && (
                            <span className="text-[10px] text-amber-600 font-bold ml-1">
                              ({Math.round((p.budgetActual / p.budgetApproved) * 100)}%)
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="w-full bg-slate-200/50 h-1 rounded-full overflow-hidden">
                        <div 
                          className="bg-amber-500 h-1 rounded-full transition-all duration-500" 
                          style={{ width: `${Math.min(Math.round((p.budgetActual / p.budgetApproved) * 100), 100)}%` }} 
                        />
                      </div>
                    </div>
                  )}

                  {/* Dynamic Priority Indicators M&E Section */}
                  <div className="border-t border-slate-100 pt-3 mt-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
                        <AlertCircle className={`w-3.5 h-3.5 ${lowInds.length > 0 ? 'text-amber-500' : 'text-slate-300'}`} />
                        Prioritas Kerja
                      </span>
                      {lowInds.length > 0 && (
                        <div className="flex gap-1">
                          {critCount > 0 && (
                            <span className="text-[8px] font-extrabold px-1.5 py-0.2 rounded-md bg-rose-50 text-rose-700 border border-rose-200">
                              {critCount} Kritis
                            </span>
                          )}
                          {prepCount > 0 && (
                            <span className="text-[8px] font-extrabold px-1.5 py-0.2 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                              {prepCount} Perhatian
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {lowInds.length === 0 ? (
                      <div className="bg-emerald-50/50 border border-emerald-100/40 p-2 rounded-xl text-[11px] text-emerald-800 flex items-center gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span className="font-semibold">Semua indikator aman (≥ 50%)</span>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {lowInds.slice(0, 3).map((ind) => {
                          const isCritical = ind.pct < 25;
                          const colorFill = isCritical ? 'bg-rose-500' : 'bg-amber-500';
                          const badgeColor = isCritical 
                            ? 'bg-rose-50 text-rose-700 border-rose-200' 
                            : 'bg-amber-50 text-amber-700 border-amber-200';
                            
                          return (
                            <div key={ind.id} className="p-2 rounded-xl border border-slate-100 bg-slate-50/30 hover:bg-slate-50 transition-colors space-y-1 text-[11px]">
                              <div className="flex items-start justify-between gap-2">
                                <span className="font-extrabold text-slate-700 line-clamp-1 flex-1 leading-snug" title={ind.title}>
                                  {ind.title}
                                </span>
                                <span className={`text-[9px] font-black px-1 py-0.2 rounded-md border shrink-0 ${badgeColor}`}>
                                  {ind.pct}%
                                </span>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <div className="flex-1 bg-slate-100 h-1 rounded-full overflow-hidden">
                                  <div className={`h-1 rounded-full ${colorFill}`} style={{ width: `${ind.pct}%` }} />
                                </div>
                                <span className="text-[9px] font-mono text-slate-500 whitespace-nowrap">
                                  {ind.current}/{ind.target} {ind.unit}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                        
                        {lowInds.length > 3 && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectProject(p.id);
                            }}
                            className="w-full text-center py-1 text-[10px] text-blue-600 hover:text-blue-700 font-extrabold hover:underline"
                          >
                            +{lowInds.length - 3} indikator perhatian lainnya — lihat detail →
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Realtime Impact aggregates row */}
                  <ProjectImpactRow projectIndicators={projectIndicators} />
                </div>

                {/* Progress bar inside card footer */}
                <div className="px-5 pb-5 pt-3 border-t border-slate-150 space-y-3 bg-slate-50/40 rounded-b-3xl">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-500">Milestone Capaian</span>
                    <span className="font-extrabold text-slate-800">{displayProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-200/50 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${displayProgress}%` }}
                    />
                  </div>

                  {/* Operational indicators counts */}
                  <div className="grid grid-cols-3 gap-1 text-center pt-1 border-t border-slate-100">
                    <div className="border-r border-slate-100 last:border-0 pr-1">
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Aktivitas</p>
                      <p className="text-xs font-black text-slate-700">
                        {completedActivitiesCount}/{projectActivities.length}
                      </p>
                    </div>
                    <div className="border-r border-slate-100 last:border-0 px-1">
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Indikator</p>
                      <p className="text-xs font-black text-slate-700">{projectIndicators.length}</p>
                    </div>
                    <div className="px-1">
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Isu Aktif</p>
                      <p className={`text-xs font-black ${projectIssues.filter(i => i.status !== 'resolved' && i.status !== 'rejected').length > 0 ? 'text-red-600' : 'text-slate-700'}`}>
                        {projectIssues.filter(is => is.status !== 'resolved' && is.status !== 'rejected').length}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

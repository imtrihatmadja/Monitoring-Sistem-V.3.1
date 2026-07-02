import React, { useState } from 'react';
import { Project, Activity, Indicator } from '../types';
import { 
  Search, FileDown, Plus, Edit, Archive, Eye, Trash2,
  CheckCircle2, TrendingUp, DollarSign, LayoutGrid, 
  List, AlertCircle, Percent, Coins, Wallet, FileSpreadsheet, Upload 
} from 'lucide-react';
import { ProjectImpactRow } from './ProjectImpactRow';
import { downloadProjectTemplate, exportProjectsToExcel } from '../lib/excelHelpers';

interface ProjectsTabProps {
  projects: Project[];
  activities: Activity[];
  indicators: Indicator[];
  onSelectProject: (projectId: string) => void;
  onEditProject: (projectId: string) => void;
  onArchiveProject: (projectId: string) => void;
  onDeleteProject: (projectId: string) => void;
  onAddProjectClick: () => void;
  onOpenImportModal: () => void;
}

export const ProjectsTab: React.FC<ProjectsTabProps> = ({
  projects,
  activities,
  indicators,
  onSelectProject,
  onEditProject,
  onArchiveProject,
  onDeleteProject,
  onAddProjectClick,
  onOpenImportModal,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Filter projects (non-archived only)
  const nonArchivedProjects = projects.filter((p) => !p.isArchived);

  const filteredProjects = nonArchivedProjects.filter((p) => {
    const s = searchTerm.toLowerCase();
    return (
      p.name.toLowerCase().includes(s) ||
      p.location.toLowerCase().includes(s) ||
      p.owner.toLowerCase().includes(s) ||
      (p.donor && p.donor.toLowerCase().includes(s))
    );
  });

  // Financial aggregates calculated on the fly
  const totalApproved = nonArchivedProjects.reduce((sum, p) => sum + (p.budgetApproved || 0), 0);
  const totalActual = nonArchivedProjects.reduce((sum, p) => sum + (p.budgetActual || 0), 0);
  const totalRemaining = totalApproved - totalActual;
  const globalAbsorption = totalApproved > 0 ? Math.round((totalActual / totalApproved) * 100) : 0;

  // Budget formatting helper
  const formatRupiah = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div id="projects-tab-container" className="space-y-6">
      
      {/* Financial Health Mini-Overview */}
      <div id="projects-financial-summary" className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl shrink-0">
            <Coins className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Total Komitmen Dan Hibah</p>
            <p className="text-sm font-black text-slate-800 tracking-tight truncate mt-0.5">{formatRupiah(totalApproved)}</p>
            <p className="text-[10px] text-slate-400 font-medium">Dari seluruh donor program aktif</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl shrink-0">
            <Wallet className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Realisasi Lapangan</p>
            <p className="text-sm font-black text-slate-800 tracking-tight truncate mt-0.5">{formatRupiah(totalActual)}</p>
            <p className="text-[10px] text-amber-600 font-bold flex items-center gap-1 mt-0.5">
              <TrendingUp className="w-3 h-3" /> Penyerapan {globalAbsorption}%
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Sisa Sisa Anggaran</p>
            <p className="text-sm font-black text-slate-800 tracking-tight truncate mt-0.5">
              {totalRemaining >= 0 ? formatRupiah(totalRemaining) : `-${formatRupiah(Math.abs(totalRemaining))}`}
            </p>
            <p className="text-[10px] text-emerald-600 font-medium">Dana siap dialokasikan</p>
          </div>
        </div>
      </div>

      {/* Table & Grid Toolbar */}
      <div id="projects-toolbar" className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-10 pr-4 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-400 focus:bg-white transition-all"
            placeholder="Cari nama proyek, lokasi, PIC, atau donor…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* View Mode Toggle */}
          <div className="flex items-center border border-slate-200 rounded-xl p-0.5 bg-slate-50">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg cursor-pointer transition-all ${
                viewMode === 'table' ? 'bg-white shadow-xs text-blue-600 font-bold' : 'text-slate-400 hover:text-slate-600'
              }`}
              title="Tampilkan Tabel"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg cursor-pointer transition-all ${
                viewMode === 'grid' ? 'bg-white shadow-xs text-blue-600 font-bold' : 'text-slate-400 hover:text-slate-600'
              }`}
              title="Tampilkan Kartu (Grid)"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={downloadProjectTemplate}
            id="btn-download-template-proj"
            className="bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 font-extrabold text-xs py-2 px-3.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer h-9"
            title="Unduh Template Excel untuk pembuatan Proyek Secara Massal (Bulk)"
          >
            <FileDown className="w-4 h-4 text-emerald-600" /> Template Excel
          </button>

          <button
            onClick={onOpenImportModal}
            id="btn-import-excel-proj"
            className="bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 font-extrabold text-xs py-2 px-3.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer h-9"
          >
            <Upload className="w-4 h-4 text-blue-600" /> Import Proyek
          </button>

          <button
            onClick={() => exportProjectsToExcel(projects, indicators)}
            id="btn-export-excel-proj"
            className="bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 font-extrabold text-xs py-2 px-3.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer h-9"
            title="Ekspor seluruh data Proyek dan Indikator ke format Excel"
          >
            <FileSpreadsheet className="w-4 h-4 text-purple-600" /> Export Proyek
          </button>
          
          <button
            onClick={onAddProjectClick}
            id="btn-add-project-tbl"
            className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs py-2 px-4 rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer h-9"
          >
            <Plus className="w-4 h-4" /> Tambah Proyek
          </button>
        </div>
      </div>

      {/* Filter Feedback Status */}
      {searchTerm && (
        <div className="text-xs text-slate-500 font-semibold flex items-center gap-1 px-1">
          <AlertCircle className="w-3.5 h-3.5 text-slate-400" />
          Menampilkan <span className="text-slate-800 font-bold">{filteredProjects.length}</span> dari <span className="text-slate-800 font-bold">{nonArchivedProjects.length}</span> proyek aktif hasil pencarian.
        </div>
      )}

      {/* PROJECTS RENDERING: VIEW MODES SWITCH */}
      {viewMode === 'table' ? (
        /* TABLE VIEW MODE */
        <div id="projects-table-wrap" className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-150 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  <th className="py-3.5 px-4 w-12 text-center">No</th>
                  <th className="py-3.5 px-4">Nama Proyek</th>
                  <th className="py-3.5 px-4">Lokasi</th>
                  <th className="py-3.5 px-4">Penanggung Jawab</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Progress</th>
                  <th className="py-3.5 px-4">Deadline</th>
                  <th className="py-3.5 px-4">Anggaran &amp; Realisasi</th>
                  <th className="py-3.5 px-4 text-center">Aksi &amp; Kontrol</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProjects.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400 font-medium text-xs">
                      Tidak ada proyek ditemukan yang cocok dengan pencarian Anda.
                    </td>
                  </tr>
                ) : (
                  filteredProjects.map((p, idx) => {
                    const projectActivities = activities.filter((act) => act.projectId === p.id);
                    const projectIndicators = indicators.filter((i) => i.projectId === p.id);
                    const activitiesProgress = projectActivities.length
                      ? Math.round(projectActivities.reduce((sum, act) => sum + act.progress, 0) / projectActivities.length)
                      : null;
                    const displayProgress = activitiesProgress !== null ? activitiesProgress : p.progress;

                    // Status badge styles
                    let badgeStyle = 'bg-slate-50 border-slate-100 text-slate-600';
                    if (p.status === 'Aktif' || p.status === 'On Track') {
                      badgeStyle = 'bg-emerald-50 border-emerald-100 text-emerald-700';
                    } else if (p.status === 'Terlambat') {
                      badgeStyle = 'bg-rose-50 border-rose-100 text-rose-700';
                    } else if (p.status === 'Selesai') {
                      badgeStyle = 'bg-blue-50 border-blue-100 text-blue-700';
                    } else if (p.status === 'Ditangguhkan') {
                      badgeStyle = 'bg-amber-50 border-amber-100 text-amber-700';
                    }

                    const absorptionPercent = p.budgetApproved > 0 
                      ? Math.round((p.budgetActual / p.budgetApproved) * 100) 
                      : 0;

                    return (
                      <tr
                        key={p.id}
                        className="hover:bg-slate-50/50 transition-colors text-xs text-slate-700 font-semibold"
                      >
                        <td className="py-4 px-4 text-center text-slate-400 font-bold">{idx + 1}</td>
                        <td className="py-4 px-4">
                          <div className="space-y-1 max-w-[280px]">
                            <button
                              onClick={() => onSelectProject(p.id)}
                              className="font-extrabold text-slate-800 text-left hover:text-blue-600 transition-colors line-clamp-2 block cursor-pointer leading-snug"
                            >
                              {p.name}
                            </button>
                            {p.donor && (
                              <span className="inline-block text-[9px] text-slate-400 font-extrabold px-1.5 py-0.2 bg-slate-50 border border-slate-100 rounded-md mt-1">
                                {p.donor}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4 text-slate-500 font-medium">{p.location}</td>
                        <td className="py-4 px-4 text-slate-700">{p.owner}</td>
                        <td className="py-4 px-4 whitespace-nowrap">
                          <span className={`inline-block py-0.5 px-2.5 rounded-full border text-[10px] font-extrabold uppercase tracking-wide ${badgeStyle}`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2 max-w-[120px]">
                            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-blue-600 h-1.5 rounded-full"
                                style={{ width: `${displayProgress}%` }}
                              />
                            </div>
                            <span className="text-[11px] font-bold text-slate-600 shrink-0">{displayProgress}%</span>
                          </div>
                        </td>
                        <td className="py-4 px-4 font-mono text-slate-500 whitespace-nowrap">{p.deadline || '—'}</td>
                        <td className="py-4 px-4 whitespace-nowrap">
                          <div className="space-y-0.5">
                            <span className="font-extrabold text-slate-800 text-[11px]">{formatRupiah(p.budgetActual)}</span>
                            <span className="block text-[9px] text-slate-400 font-semibold">
                              dari {formatRupiah(p.budgetApproved)} ({absorptionPercent}%)
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap text-center">
                          <div className="inline-flex items-center gap-1.5 justify-center">
                            <button
                              onClick={() => onSelectProject(p.id)}
                              className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-blue-600 rounded-lg transition-all cursor-pointer"
                              title="Buka Detail Proyek"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => onEditProject(p.id)}
                              className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-amber-600 rounded-lg transition-all cursor-pointer"
                              title="Edit Proyek"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => onArchiveProject(p.id)}
                              className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-rose-600 rounded-lg transition-all cursor-pointer"
                              title="Arsip Proyek"
                            >
                              <Archive className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => onDeleteProject(p.id)}
                              className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-rose-700 rounded-lg transition-all cursor-pointer"
                              title="Hapus Proyek"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
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
        </div>
      ) : (
        /* GRID VIEW MODE */
        <div id="projects-grid-wrap" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.length === 0 ? (
            <div className="col-span-full text-center py-12 text-slate-450 font-medium text-xs bg-white rounded-2xl border border-slate-150 p-4">
              Tidak ada proyek ditemukan yang cocok dengan kriteria pencarian Anda.
            </div>
          ) : (
            filteredProjects.map((p) => {
              const projectActivities = activities.filter((act) => act.projectId === p.id);
              const projectIndicators = indicators.filter((i) => i.projectId === p.id);
              const activitiesProgress = projectActivities.length
                ? Math.round(projectActivities.reduce((sum, act) => sum + act.progress, 0) / projectActivities.length)
                : null;
              const displayProgress = activitiesProgress !== null ? activitiesProgress : p.progress;

              let statusStyle = 'bg-slate-50 border-slate-200 text-slate-600';
              if (p.status === 'Aktif' || p.status === 'On Track') {
                statusStyle = 'bg-emerald-50 border-emerald-100 text-emerald-700';
              } else if (p.status === 'Terlambat') {
                statusStyle = 'bg-rose-50 border-rose-100 text-rose-700';
              } else if (p.status === 'Selesai') {
                statusStyle = 'bg-blue-50 border-blue-100 text-blue-700';
              } else if (p.status === 'Ditangguhkan') {
                statusStyle = 'bg-amber-50 border-amber-100 text-amber-700';
              }

              const absorptionPercent = p.budgetApproved > 0 
                ? Math.round((p.budgetActual / p.budgetApproved) * 100) 
                : 0;

              return (
                <div
                  key={p.id}
                  className="bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200 transition-all flex flex-col justify-between overflow-hidden"
                >
                  <div className="p-5 space-y-4">
                    <div className="flex items-start justify-between gap-2">
                      <span className={`text-[10px] font-extrabold py-0.5 px-2.5 rounded-full border uppercase tracking-wide ${statusStyle}`}>
                        {p.status}
                      </span>
                      {p.donor && (
                        <span className="text-[10px] font-extrabold text-slate-400 bg-slate-50 py-0.5 px-2 rounded-md border border-slate-100/50">
                          {p.donor}
                        </span>
                      )}
                    </div>

                    <div className="space-y-1">
                      <button
                        onClick={() => onSelectProject(p.id)}
                        className="font-extrabold text-slate-800 text-sm leading-snug hover:text-blue-600 transition-colors cursor-pointer text-left block line-clamp-2"
                      >
                        {p.name}
                      </button>
                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {p.desc || 'Tidak ada deskripsi singkat proyek.'}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500 font-bold border-t border-slate-100 pt-3">
                      <div>
                        <span className="text-slate-400 block font-semibold text-[9px] uppercase tracking-wider">Lokasi</span>
                        <span className="truncate block font-bold text-slate-700">{p.location}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-semibold text-[9px] uppercase tracking-wider">Owner Field</span>
                        <span className="truncate block font-bold text-slate-700">{p.owner}</span>
                      </div>
                    </div>

                    {/* Progress tracking */}
                    <div className="space-y-1.5 pt-2">
                      <div className="flex justify-between items-center text-[11px] font-bold">
                        <span className="text-slate-400">Penyelesaian Milestone</span>
                        <span className="text-blue-600">{displayProgress}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${displayProgress}%` }} />
                      </div>
                    </div>

                    {/* Financial absorption detail */}
                    <div className="bg-slate-50 border border-slate-100 p-3 rounded-2xl space-y-2">
                      <div className="flex justify-between items-center text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">
                        <span>Anggaran</span>
                        <span>{absorptionPercent}% Realisasi</span>
                      </div>
                      <div className="text-[11px] font-bold flex justify-between items-baseline font-mono text-slate-700">
                        <span>{formatRupiah(p.budgetApproved)}</span>
                        <span className="text-slate-900 font-extrabold">{formatRupiah(p.budgetActual)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions inside grid card */}
                  <div className="bg-slate-50/40 p-4 border-t border-slate-150 flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-slate-405">{p.deadline || 'No Deadline'}</span>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => onSelectProject(p.id)}
                        className="p-1 px-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-[10px] font-extrabold text-slate-650 hover:text-blue-600 rounded-lg transition-all flex items-center gap-1 cursor-pointer shadow-xs"
                      >
                        <Eye className="w-3 h-3" /> Detail
                      </button>
                      <button
                        onClick={() => onEditProject(p.id)}
                        className="p-1 px-2 bg-white hover:bg-slate-50 border border-slate-200 text-[10px] font-semibold text-slate-600 hover:text-amber-600 rounded-lg transition-all cursor-pointer"
                        title="Edit Proyek"
                      >
                        <Edit className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => onArchiveProject(p.id)}
                        className="p-1 px-2 bg-white hover:bg-slate-50 border border-slate-200 text-[10px] font-semibold text-slate-600 hover:text-rose-600 rounded-lg transition-all cursor-pointer"
                        title="Arsip Proyek"
                      >
                        <Archive className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => onDeleteProject(p.id)}
                        className="p-1 px-2 bg-white hover:bg-slate-50 border border-slate-200 text-[10px] font-semibold text-slate-600 hover:text-rose-750 rounded-lg transition-all cursor-pointer"
                        title="Hapus Proyek"
                      >
                        <Trash2 className="w-3 h-3 text-rose-500" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

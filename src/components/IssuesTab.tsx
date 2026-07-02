import React, { useState, useEffect } from 'react';
import { Issue, Project, Activity, IssueUpdate } from '../types';
import { 
  Search, RotateCcw, Plus, Eye, AlertTriangle, CheckCircle2, 
  MessageSquare, Info, Link, Tag, Calendar, X, Edit, Trash2, 
  ShieldAlert, AlertCircle, Sparkles, Folder, ExternalLink, HelpCircle
} from 'lucide-react';

interface IssuesTabProps {
  issues: Issue[];
  projects: Project[];
  activities: Activity[];
  onUpdateIssues: (newIssues: Issue[]) => void;
  onRefresh: () => void;
  allCategories: string[];
}

export const IssuesTab: React.FC<IssuesTabProps> = ({
  issues,
  projects,
  activities,
  onUpdateIssues,
  onRefresh,
  allCategories,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);

  // Form Fields state
  const [formId, setFormId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategory, setFormCategory] = useState('HAM / Ketenagakerjaan');
  const [formProjectId, setFormProjectId] = useState('');
  const [formActivityId, setFormActivityId] = useState('');
  const [formSeverity, setFormSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [formStatus, setFormStatus] = useState<'pending_review' | 'active' | 'monitoring' | 'resolved' | 'rejected'>('active');
  const [formDateOccurred, setFormDateOccurred] = useState('');
  const [formSourceType, setFormSourceType] = useState<'MANUAL' | 'RSS' | 'GDRIVE' | 'IMPORT'>('MANUAL');
  const [formSourceLink, setFormSourceLink] = useState('');
  const [formTags, setFormTags] = useState('');

  // Staged updates adding
  const [newUpdateText, setNewUpdateText] = useState('');
  const [newUpdateEvidence, setNewUpdateEvidence] = useState('');

  // Calculate statistics
  const nonArchivedProjects = projects.filter(p => !p.isArchived);
  const totalIssues = issues.length;
  const criticalIssues = issues.filter((i) => i.severity === 'critical' || i.severity === 'high').length;
  const resolvedIssues = issues.filter((i) => i.status === 'resolved').length;
  const totalUpdates = issues.reduce((sum, i) => sum + i.updates.length, 0);

  // Filter the issues list
  const filteredIssues = issues.filter((i) => {
    const s = searchQuery.toLowerCase();
    const matchesSearch =
      i.title.toLowerCase().includes(s) ||
      (i.description && i.description.toLowerCase().includes(s)) ||
      i.category.toLowerCase().includes(s) ||
      (i.tags && i.tags.toLowerCase().includes(s));

    const matchesStatus = statusFilter ? i.status === statusFilter : true;
    const matchesCategory = categoryFilter ? i.category === categoryFilter : true;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  // Open Form for Adding
  const handleOpenAddForm = () => {
    setFormId(null);
    setFormTitle('');
    setFormDescription('');
    setFormCategory(allCategories[0] || 'HAM / Ketenagakerjaan');
    setFormProjectId('');
    setFormActivityId('');
    setFormSeverity('medium');
    setFormStatus('active');
    setFormDateOccurred(new Date().toISOString().split('T')[0]);
    setFormSourceType('MANUAL');
    setFormSourceLink('');
    setFormTags('');
    setIsFormOpen(true);
  };

  // Open Form for Editing
  const handleOpenEditForm = (issue: Issue, e: React.MouseEvent) => {
    e.stopPropagation();
    setFormId(issue.id);
    setFormTitle(issue.title);
    setFormDescription(issue.description || '');
    setFormCategory(issue.category);
    setFormProjectId(issue.projectId || '');
    setFormActivityId(issue.activityId || '');
    setFormSeverity(issue.severity);
    setFormStatus(issue.status);
    setFormDateOccurred(issue.dateOccurred || '');
    setFormSourceType(issue.sourceType);
    setFormSourceLink(issue.sourceLink || '');
    setFormTags(issue.tags || '');
    setIsFormOpen(true);
  };

  // Open Detail View
  const handleOpenDetailModal = (issue: Issue) => {
    setSelectedIssue(issue);
    setIsDetailOpen(true);
    setNewUpdateText('');
    setNewUpdateEvidence('');
  };

  // Delete Issue Handler
  const handleDeleteIssue = (issueId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Apakah Anda yakin ingin menghapus temuan isu ini secara permanen dari sistem?')) {
      const updatedList = issues.filter((i) => i.id !== issueId);
      onUpdateIssues(updatedList);
    }
  };

  // Save Form Handler (Add or Update)
  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      alert('Judul temuan wajib diisi.');
      return;
    }
    if (!formCategory.trim()) {
      alert('Kategori wajib dipilih.');
      return;
    }

    if (formId) {
      // Edit mode
      const updatedList = issues.map((i) => {
        if (i.id === formId) {
          return {
            ...i,
            title: formTitle.trim(),
            description: formDescription.trim() || undefined,
            category: formCategory,
            projectId: formProjectId || undefined,
            activityId: formActivityId || undefined,
            severity: formSeverity,
            status: formStatus,
            dateOccurred: formDateOccurred || undefined,
            sourceType: formSourceType,
            sourceLink: formSourceLink.trim() || undefined,
            tags: formTags.trim() || undefined,
          };
        }
        return i;
      });
      onUpdateIssues(updatedList);
    } else {
      // Add mode
      const newIssue: Issue = {
        id: `is-${Date.now()}`,
        title: formTitle.trim(),
        description: formDescription.trim() || undefined,
        category: formCategory,
        projectId: formProjectId || undefined,
        activityId: formActivityId || undefined,
        severity: formSeverity,
        status: formStatus,
        dateOccurred: formDateOccurred || undefined,
        sourceType: formSourceType,
        sourceLink: formSourceLink.trim() || undefined,
        tags: formTags.trim() || undefined,
        updates: [],
      };
      onUpdateIssues([...issues, newIssue]);
    }

    setIsFormOpen(false);
  };

  // Add Log Follow-Up Update Handler
  const handleAddUpdateLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIssue) return;
    if (!newUpdateText.trim()) {
      alert('Catatan tindak lanjut atau tanggapan wajib diisi.');
      return;
    }

    const newLog: IssueUpdate = {
      id: `up-${Date.now()}`,
      text: newUpdateText.trim(),
      evidenceUrl: newUpdateEvidence.trim() || undefined,
      date: new Date().toISOString().split('T')[0],
    };

    const updatedIssue: Issue = {
      ...selectedIssue,
      updates: [...selectedIssue.updates, newLog],
    };

    const updatedList = issues.map((i) => (i.id === selectedIssue.id ? updatedIssue : i));
    onUpdateIssues(updatedList);
    
    // Update active visual model state
    setSelectedIssue(updatedIssue);
    setNewUpdateText('');
    setNewUpdateEvidence('');
  };

  return (
    <div id="issues-tab-container" className="space-y-6">
      {/* Top Banner & Header info */}
      <div id="issues-header" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            Manajemen Isu Lapangan
            <span className="text-xs font-bold text-rose-600 py-0.5 px-2 bg-rose-50 border border-rose-150 rounded-full animate-pulse">
              Aktif &amp; Terpantau
            </span>
          </h2>
          <p className="text-xs text-slate-500">
            Kaji, pantau, dan selesaikan kasus IUU Fishing, jaminan HAM, dan isu ketenagakerjaan secara akurat dan transparan
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs py-2 px-3.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer h-9"
          >
            <RotateCcw className="w-4 h-4" /> Refresh Data
          </button>
          <button
            onClick={handleOpenAddForm}
            id="btn-add-issue"
            className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs py-2 px-4 rounded-xl shadow-xs hover:shadow-md transition-all flex items-center gap-1.5 cursor-pointer h-9"
          >
            <Plus className="w-4 h-4" /> Tambah Temuan Isu
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div id="issues-stats" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-4 hover:border-slate-250 transition-all">
          <div className="p-3 bg-slate-50 text-slate-700 rounded-xl">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Isu Terdaftar</p>
            <p className="text-2xl font-black text-slate-800 leading-none mt-1">{totalIssues}</p>
            <span className="text-[9px] text-slate-400 block mt-1">kasus hukum &amp; lingkungan</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-rose-150 bg-rose-50/10 flex items-center gap-4 hover:bg-rose-50/20 transition-all">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">Tingkat Kritis / Tinggi</p>
            <p className="text-2xl font-black text-rose-700 leading-none mt-1">{criticalIssues}</p>
            <span className="text-[9px] text-rose-500 font-bold block mt-1">membutuhkan perhatian super</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-emerald-150 bg-emerald-50/10 flex items-center gap-4 hover:bg-emerald-50/20 transition-all">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Isu Selesai (Resolved)</p>
            <p className="text-2xl font-black text-emerald-700 leading-none mt-1">{resolvedIssues}</p>
            <span className="text-[9px] text-emerald-600 font-bold block mt-1">
              {totalIssues ? Math.round((resolvedIssues / totalIssues) * 100) : 0}% rasio resolusi sukses
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-blue-150 bg-blue-50/10 flex items-center gap-4 hover:bg-blue-50/20 transition-all">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">Tindak Lanjut Lapangan</p>
            <p className="text-2xl font-black text-blue-700 leading-none mt-1">{totalUpdates}</p>
            <span className="text-[9px] text-blue-500 font-semibold block mt-1">catatan log perkembangan aktif</span>
          </div>
        </div>
      </div>

      {/* Filter toolbar */}
      <div id="issues-filters" className="flex flex-col md:flex-row md:items-center gap-3 bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
        <div className="relative flex-1 md:max-w-md">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-10 pr-4 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-400 focus:bg-white transition-all"
            placeholder="Cari kata kunci judul, deskripsi atau tag..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex gap-2 flex-wrap items-center">
          <select
            className="bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-400 transition-all cursor-pointer"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">Semua Status</option>
            <option value="pending_review">Pending Review</option>
            <option value="active">Active</option>
            <option value="monitoring">Monitoring</option>
            <option value="resolved">Resolved</option>
            <option value="rejected">Rejected</option>
          </select>

          <select
            className="bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-400 transition-all cursor-pointer"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="">Semua Kategori</option>
            {allCategories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table view */}
      <div id="issues-table" className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <th className="py-3.5 px-4 w-12 text-center">No</th>
                <th className="py-3.5 px-4">Judul Isu / Temuan Kasus</th>
                <th className="py-3.5 px-4">Kategori Program</th>
                <th className="py-3.5 px-4">Tingkat Kepangkatan</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Tanggal Kejadian</th>
                <th className="py-3.5 px-4">Proyek Terkait</th>
                <th className="py-3.5 px-4">Log Terakhir</th>
                <th className="py-3.5 px-4 text-center">Aksi Operasional</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-650">
              {filteredIssues.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 text-xs">
                    Tidak ada temuan laporan isu lapangan yang memenuhi kriteria filtrasi saat ini.
                  </td>
                </tr>
              ) : (
                filteredIssues.map((issue, idx) => {
                  const associatedProject = projects.find((p) => p.id === issue.projectId);
                  
                  // Style configurations
                  let severityStyle = 'bg-slate-50 text-slate-600 border-slate-200';
                  if (issue.severity === 'critical') {
                    severityStyle = 'bg-rose-50 text-rose-800 border-rose-200 font-extrabold';
                  } else if (issue.severity === 'high') {
                    severityStyle = 'bg-amber-50 text-amber-800 border-amber-200';
                  } else if (issue.severity === 'medium') {
                    severityStyle = 'bg-blue-50 text-blue-800 border-blue-100';
                  }

                  let statusStyle = 'bg-slate-100 text-slate-750';
                  if (issue.status === 'resolved') {
                    statusStyle = 'bg-emerald-50 text-emerald-800 border-emerald-150';
                  } else if (issue.status === 'active') {
                    statusStyle = 'bg-rose-50 text-rose-800 border-rose-150';
                  } else if (issue.status === 'monitoring') {
                    statusStyle = 'bg-purple-50 text-purple-800 border-purple-150';
                  } else if (issue.status === 'pending_review') {
                    statusStyle = 'bg-amber-50 text-amber-800 border-amber-150';
                  }

                  const lastUpdateText = issue.updates && issue.updates.length > 0 
                    ? issue.updates[issue.updates.length - 1].text 
                    : 'Belum ada tindakan terdokumentasi';

                  const lastUpdateDate = issue.updates && issue.updates.length > 0 
                    ? issue.updates[issue.updates.length - 1].date 
                    : issue.dateOccurred;

                  return (
                    <tr key={issue.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-4 text-center font-bold text-slate-400">{idx + 1}</td>
                      <td className="py-3.5 px-4 max-w-sm">
                        <div className="space-y-1">
                          <button
                            onClick={() => handleOpenDetailModal(issue)}
                            className="font-extrabold text-slate-800 hover:text-blue-600 text-left block cursor-pointer leading-snug hover:underline"
                          >
                            {issue.title}
                          </button>
                          {issue.tags && (
                            <div className="flex flex-wrap gap-1">
                              {issue.tags.split(',').map((tag, tIdx) => (
                                <span
                                  key={tIdx}
                                  className="text-[9px] bg-slate-50 text-slate-400 px-1.5 py-0.2 rounded border border-slate-100 font-semibold"
                                >
                                  #{tag.trim()}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-700">{issue.category}</td>
                      <td className="py-3.5 px-4">
                        <span className={`py-0.5 px-2 rounded-md border text-[9px] font-bold uppercase tracking-wider ${severityStyle}`}>
                          {issue.severity}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`py-0.5 px-2.5 rounded-full border text-[9px] font-bold uppercase tracking-wider ${statusStyle}`}>
                          {issue.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-500 whitespace-nowrap">{issue.dateOccurred || '—'}</td>
                      <td className="py-3.5 px-4">
                        <span className="text-slate-500 font-bold shrink-0 block truncate max-w-[150px]" title={associatedProject?.name}>
                          {associatedProject ? (
                            <span className="text-blue-600">{associatedProject.name}</span>
                          ) : (
                            <span className="text-slate-400 italic font-medium">Umum (Luar Proyek)</span>
                          )}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 max-w-[200px]">
                        <div className="space-y-0.5 min-w-0">
                          <p className="text-slate-500 line-clamp-1 italic text-[11px]">"{lastUpdateText}"</p>
                          <span className="text-[9px] text-slate-400 block font-mono">{lastUpdateDate}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap text-center">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => handleOpenDetailModal(issue)}
                            className="p-1 px-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-[10px] font-bold transition-all cursor-pointer inline-flex items-center gap-1"
                            title="Tindak Lanjut &amp; Catatan Log"
                          >
                            <MessageSquare className="w-3" /> Log ({issue.updates ? issue.updates.length : 0})
                          </button>
                          <button
                            onClick={(e) => handleOpenEditForm(issue, e)}
                            className="p-1.5 bg-slate-50 hover:bg-amber-50 text-slate-600 hover:text-amber-700 border border-slate-150 rounded-lg transition-all cursor-pointer"
                            title="Edit Data Isu"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => handleDeleteIssue(issue.id, e)}
                            className="p-1.5 bg-slate-50 hover:bg-rose-50 text-slate-600 hover:text-rose-750 border border-slate-150 rounded-lg transition-all cursor-pointer"
                            title="Hapus Temuan"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

      {/* ==========================================
          MODAL: ADD / EDIT ISSUE FORM
         ========================================== */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-100 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl font-medium text-slate-700 text-xs">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <span className="text-sm font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                {formId ? '✏️ Edit Temuan Isu Lapangan' : '➕ Tambah Temuan Isu Baru'}
              </span>
              <button 
                onClick={() => setIsFormOpen(false)} 
                className="p-1.5 hover:bg-slate-100 border border-slate-150 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Title */}
                <div className="col-span-full space-y-1">
                  <label className="text-slate-500 font-bold">Judul Temuan / Kasus Isu *</label>
                  <input
                    type="text"
                    required
                    className="w-full bg-slate-50/50 border border-slate-200 py-2 px-3 rounded-lg focus:outline-none focus:border-blue-400 focus:bg-white font-bold text-slate-800 text-xs"
                    placeholder="Misal: Dugaan Pelanggaran Jalur Tangkap Kapal Trawl di Dobo..."
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                  />
                </div>

                {/* Categories & Severity */}
                <div className="space-y-1">
                  <label className="text-slate-500 font-bold">Kategori Isu / Aspek *</label>
                  <select
                    required
                    className="w-full bg-slate-50/50 border border-slate-200 py-2 px-3 rounded-lg focus:outline-none focus:border-blue-400 focus:bg-white font-bold"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                  >
                    {allCategories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-500 font-bold">Tingkat Keparahan (Severity)</label>
                  <select
                    className="w-full bg-slate-50/50 border border-slate-200 py-2 px-3 rounded-lg focus:outline-none focus:border-blue-400 focus:bg-white font-bold"
                    value={formSeverity}
                    onChange={(e) => setFormSeverity(e.target.value as any)}
                  >
                    <option value="low">Low (Klasifikasi Ringan)</option>
                    <option value="medium">Medium (Membutuhkan Pengamatan)</option>
                    <option value="high">High (Mendesak / Mengganggu Operasi)</option>
                    <option value="critical">Critical (Kritis / Pelanggaran Berat)</option>
                  </select>
                </div>

                {/* Status & Date occurred */}
                <div className="space-y-1">
                  <label className="text-slate-500 font-bold">Status Awal</label>
                  <select
                    className="w-full bg-slate-50/50 border border-slate-200 py-2 px-3 rounded-lg focus:outline-none focus:border-blue-400 focus:bg-white font-bold"
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                  >
                    <option value="pending_review">Pending Review</option>
                    <option value="active">Active</option>
                    <option value="monitoring">Monitoring</option>
                    <option value="resolved">Resolved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-500 font-bold">Tanggal Temuan / Kejadian</label>
                  <input
                    type="date"
                    className="w-full bg-slate-50/50 border border-slate-200 py-2 px-3 rounded-lg focus:outline-none focus:border-blue-400 focus:bg-white font-bold text-slate-800 text-xs"
                    value={formDateOccurred}
                    onChange={(e) => setFormDateOccurred(e.target.value)}
                  />
                </div>

                {/* Project association & Activity association */}
                <div className="space-y-1">
                  <label className="text-slate-500 font-bold">Proyek Terkait</label>
                  <select
                    className="w-full bg-slate-50/50 border border-slate-200 py-2 px-3 rounded-lg focus:outline-none focus:border-blue-400 focus:bg-white font-bold"
                    value={formProjectId}
                    onChange={(e) => {
                      setFormProjectId(e.target.value);
                      setFormActivityId(''); // reset activity when project changes
                    }}
                  >
                    <option value="">-- Luar Proyek (Umum / Nasional) --</option>
                    {nonArchivedProjects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-500 font-bold">
                    Aktivitas Mitra Terkait
                    {!formProjectId && <span className="text-[10px] text-slate-400 font-normal"> (Wajib pilih proyek dulu)</span>}
                  </label>
                  <select
                    className="w-full bg-slate-50/50 border border-slate-200 py-2 px-3 rounded-lg focus:outline-none focus:border-blue-400 focus:bg-white font-bold disabled:opacity-50"
                    value={formActivityId}
                    onChange={(e) => setFormActivityId(e.target.value)}
                    disabled={!formProjectId}
                  >
                    <option value="">-- Pilih Aktivitas (Opsional) --</option>
                    {activities
                      .filter((act) => act.projectId === formProjectId)
                      .map((act) => (
                        <option key={act.id} value={act.id}>{act.title}</option>
                      ))
                    }
                  </select>
                </div>

                {/* Description */}
                <div className="col-span-full space-y-1">
                  <label className="text-slate-500 font-bold">Deskripsi Kronologi &amp; Detail Kasus</label>
                  <textarea
                    rows={3}
                    className="w-full bg-slate-50/50 border border-slate-200 py-2 px-3 rounded-lg focus:outline-none focus:border-blue-400 focus:bg-white text-xs text-slate-800"
                    placeholder="Tuliskan kronologis pengamatan di lapangan, tuntutan korban pelaut, koordinat kapal, atau data verifikasi..."
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                  />
                </div>

                {/* Source Type & Source Link */}
                <div className="space-y-1">
                  <label className="text-slate-500 font-bold">Tipe Sumber Laporan</label>
                  <select
                    className="w-full bg-slate-50/50 border border-slate-200 py-2 px-3 rounded-lg focus:outline-none focus:border-blue-400 focus:bg-white font-bold"
                    value={formSourceType}
                    onChange={(e) => setFormSourceType(e.target.value as any)}
                  >
                    <option value="MANUAL">Manual (Laporan Staff / Nelayan)</option>
                    <option value="GDRIVE">Google Drive (Berkas Kasus)</option>
                    <option value="RSS">Warta Berita / RSS Feed</option>
                    <option value="IMPORT">Import Spreadsheets</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-500 font-bold">Tautan Media / Sumber Dokumen</label>
                  <input
                    type="url"
                    className="w-full bg-slate-50/50 border border-slate-200 py-2 px-3 rounded-lg focus:outline-none focus:border-blue-400 focus:bg-white text-xs"
                    placeholder="https://contoh-tautan.com/dokumen_kasus"
                    value={formSourceLink}
                    onChange={(e) => setFormSourceLink(e.target.value)}
                  />
                </div>

                {/* Tags */}
                <div className="col-span-full space-y-1">
                  <label className="text-slate-500 font-bold">Tags / Label Kasus <span className="text-[10px] text-slate-400 font-normal">(dipisahkan koma)</span></label>
                  <input
                    type="text"
                    className="w-full bg-slate-50/50 border border-slate-200 py-2 px-3 rounded-lg focus:outline-none focus:border-blue-400 focus:bg-white text-xs font-bold"
                    placeholder="gaji ditahan, akp lokal, nelayan dobo, trawl asing"
                    value={formTags}
                    onChange={(e) => setFormTags(e.target.value)}
                  />
                </div>
              </div>

              {/* Actions Footer */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs py-2 px-4 rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs py-2 px-5 rounded-xl shadow-xs cursor-pointer inline-flex items-center gap-1"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Simpan Data Temuan Isu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL: DETAIL ISSUE & FOLLOW-UP LOGS
         ========================================== */}
      {isDetailOpen && selectedIssue && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-100 max-w-3xl w-full max-h-[92vh] overflow-y-auto shadow-2xl font-medium text-slate-700 text-xs">
            {/* Header branding */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/40">
              <div className="space-y-1 flex-1">
                <span className="text-[9px] font-extrabold text-slate-450 uppercase tracking-widest block">Kajian Status Isu Lapangan</span>
                <h3 className="text-sm font-extrabold text-slate-800 leading-tight">
                  {selectedIssue.title}
                </h3>
              </div>
              <button 
                onClick={() => setIsDetailOpen(false)} 
                className="p-1.5 hover:bg-slate-100 border border-slate-150 rounded-lg cursor-pointer shrink-0 ml-3"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Left detail grid card column */}
              <div className="md:col-span-1 space-y-4 border-r border-slate-100 pr-0 md:pr-6">
                <div>
                  <h4 className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-2">Metode Klasifikasi</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center py-1 border-b border-slate-50">
                      <span className="text-slate-450">Kategori:</span>
                      <span className="font-bold text-slate-700">{selectedIssue.category}</span>
                    </div>

                    <div className="flex justify-between items-center py-1 border-b border-slate-50">
                      <span className="text-slate-450">Tingkat:</span>
                      <span className={`inline-block py-0.5 px-2 rounded-md border text-[9px] font-bold uppercase tracking-wider ${
                        selectedIssue.severity === 'critical' ? 'bg-rose-50 text-rose-800 border-rose-200' :
                        selectedIssue.severity === 'high' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                        'bg-blue-50 text-blue-800 border-blue-100'
                      }`}>
                        {selectedIssue.severity}
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-1 border-b border-slate-50">
                      <span className="text-slate-450">Status:</span>
                      <span className={`inline-block py-0.5 px-2 rounded-full border text-[9px] font-bold uppercase tracking-wider ${
                        selectedIssue.status === 'resolved' ? 'bg-emerald-50 text-emerald-800 border-emerald-150' :
                        selectedIssue.status === 'active' ? 'bg-rose-50 text-rose-800 border-rose-150' :
                        selectedIssue.status === 'monitoring' ? 'bg-purple-50 text-purple-800 border-purple-150' :
                        'bg-amber-50 text-amber-800 border-amber-150'
                      }`}>
                        {selectedIssue.status.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-1 border-b border-slate-50">
                      <span className="text-slate-450">Tanggal:</span>
                      <span className="font-mono text-slate-705 font-bold">{selectedIssue.dateOccurred || '—'}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1.5">Proyek &amp; Program</h4>
                  {selectedIssue.projectId ? (
                    (() => {
                      const p = projects.find(proj => proj.id === selectedIssue.projectId);
                      const act = activities.find(a => a.id === selectedIssue.activityId);
                      return (
                        <div className="bg-blue-50/40 border border-blue-100/40 p-3 rounded-xl space-y-1.5">
                          <p className="font-bold text-slate-800 text-[11px] leading-snug">
                            {p ? p.name : 'Proyek Berlangsung'}
                          </p>
                          {act && (
                            <p className="text-[10px] text-slate-500 font-semibold leading-normal">
                              📌 Kegiatan: <span className="text-slate-700">{act.title}</span>
                            </p>
                          )}
                        </div>
                      );
                    })()
                  ) : (
                    <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-xl text-slate-450 italic">
                      Luar program kualitatif (Umum / Global)
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1.5">Sumber &amp; Referensi</h4>
                  <div className="space-y-1 text-[11px] text-slate-500 font-semibold breakdown-words">
                    <p>Tipe: <span className="font-bold text-slate-700">{selectedIssue.sourceType}</span></p>
                    {selectedIssue.sourceLink && (
                      <a 
                        href={selectedIssue.sourceLink} 
                        target="_blank" 
                        referrerPolicy="no-referrer"
                        className="text-blue-600 hover:underline flex items-center gap-1 mt-1 font-bold"
                      >
                        <ExternalLink className="w-3" /> Dokumen Sumber
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Right content column (Description and Updates Logs) */}
              <div className="md:col-span-2 space-y-6 flex flex-col justify-between">
                <div className="space-y-5">
                  <div className="space-y-1.5">
                    <h4 className="text-[10px] font-extrabold uppercase text-slate-450 tracking-wider flex items-center gap-1">
                      <Info className="w-3.5 h-3.5 text-blue-500" /> Kronologi Detailing
                    </h4>
                    <p className="text-slate-650 bg-slate-50 border border-slate-100 rounded-xl p-3.5 leading-relaxed text-xs">
                      {selectedIssue.description || 'Tidak ada deskripsi detail kronologi untuk kasus ini.'}
                    </p>
                  </div>

                  {/* Updates logs list timeline */}
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-extrabold uppercase text-slate-450 tracking-wider">
                      Histori Perkembangan Isu ({selectedIssue.updates ? selectedIssue.updates.length : 0})
                    </h4>

                    {(!selectedIssue.updates || selectedIssue.updates.length === 0) ? (
                      <div className="bg-slate-50/50 border border-dashed border-slate-200 text-center py-6 px-4 rounded-xl text-slate-400 italic">
                        Belum ada tindak lanjut kasus terdokumentasi. Tambahkan log baru di bawah ini.
                      </div>
                    ) : (
                      <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                        {[...selectedIssue.updates].reverse().map((upd) => (
                          <div key={upd.id} className="p-3 bg-slate-50 border border-slate-100/85 border-l-4 border-l-blue-500 rounded-r-xl space-y-1">
                            <p className="text-slate-755 text-xs leading-relaxed font-semibold">
                              {upd.text}
                            </p>
                            <div className="flex items-center justify-between text-[9px] text-slate-400 font-mono mt-1">
                              <span>📅 Selesai: {upd.date}</span>
                              {upd.evidenceUrl && (
                                <a 
                                  href={upd.evidenceUrl} 
                                  target="_blank" 
                                  referrerPolicy="no-referrer"
                                  className="text-blue-600 hover:underline flex items-center gap-0.5 font-bold uppercase"
                                >
                                  <Link className="w-2.5 h-2.5" /> Bukti Lapangan
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Form to submit a new update log */}
                <form onSubmit={handleAddUpdateLog} className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 mt-4 space-y-3">
                  <span className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider block">
                    ✍️ Catat Tindakan Perkembangan Baru
                  </span>
                  
                  <div className="space-y-1.5">
                    <textarea
                      required
                      rows={2}
                      className="w-full bg-white border border-slate-200 py-2 px-3 rounded-xl focus:outline-none focus:border-blue-400 text-xs text-slate-800 font-medium"
                      placeholder="Beri simpulan atau aksi taktis terbaru (misal: Pelaut diundang mediasi dinas perikanan...)"
                      value={newUpdateText}
                      onChange={(e) => setNewUpdateText(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="url"
                      className="w-full bg-white border border-slate-205/80 py-1.5 px-3 rounded-lg focus:outline-none focus:border-blue-400 text-xs font-semibold placeholder:font-normal"
                      placeholder="Tautan bukti / berita acara (Opsional)"
                      value={newUpdateEvidence}
                      onChange={(e) => setNewUpdateEvidence(e.target.value)}
                    />
                    <button
                      type="submit"
                      className="bg-slate-900 border border-slate-850 hover:bg-black text-white font-extrabold text-xs py-1.5 px-4 rounded-xl shadow-xs cursor-pointer text-center flex items-center justify-center gap-1.5 transition-all"
                    >
                      <MessageSquare className="w-3.5 h-3.5" /> Rekam Perkembangan
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Footer control */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
              <button
                onClick={() => setIsDetailOpen(false)}
                className="bg-slate-200 hover:bg-slate-300 border border-slate-300 text-slate-700 font-bold text-xs py-2 px-4 rounded-xl cursor-pointer"
              >
                Tutup Jendela Detail
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

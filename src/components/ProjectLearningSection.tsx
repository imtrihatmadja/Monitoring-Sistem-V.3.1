import React, { useState } from 'react';
import { ProjectReflection } from '../types';
import {
  BookOpen, Plus, Trash2, Calendar, User, Search,
  Filter, Sparkles, CheckCircle2, AlertTriangle, Lightbulb,
  Copy, ClipboardCheck, ArrowUpDown, FileDown
} from 'lucide-react';

interface ProjectLearningSectionProps {
  projectId: string;
  reflections: ProjectReflection[];
  staffList: string[];
  onAddReflection: (reflection: Partial<ProjectReflection>) => void;
  onDeleteReflection: (refId: string) => void;
}

export const ProjectLearningSection: React.FC<ProjectLearningSectionProps> = ({
  projectId,
  reflections,
  staffList,
  onAddReflection,
  onDeleteReflection
}) => {
  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc'>('date-desc');

  // Form states
  const [isOpenForm, setIsOpenForm] = useState(false);
  const [refType, setRefType] = useState<'lesson' | 'success' | 'challenge' | 'recommendation'>('lesson');
  const [refTitle, setRefTitle] = useState('');
  const [refDate, setRefDate] = useState(new Date().toISOString().split('T')[0]);
  const [refContributor, setRefContributor] = useState('');
  const [refHappened, setRefHappened] = useState('');
  const [refWorked, setRefWorked] = useState('');
  const [refDidnt, setRefDidnt] = useState('');
  const [refLesson, setRefLesson] = useState('');
  const [refNext, setRefNext] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Markdown Export Modal State
  const [showExportModal, setShowExportModal] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // Statistics
  const stats = {
    total: reflections.length,
    lesson: reflections.filter(r => r.type === 'lesson').length,
    success: reflections.filter(r => r.type === 'success').length,
    challenge: reflections.filter(r => r.type === 'challenge').length,
    recommendation: reflections.filter(r => r.type === 'recommendation').length
  };

  const handleCreateReflection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!refLesson.trim()) {
      setErrorMsg('Kolom Pelajaran Utama wajib diisi.');
      return;
    }

    onAddReflection({
      projectId,
      title: refTitle.trim() || undefined,
      type: refType,
      date: refDate,
      contributor: refContributor || undefined,
      whatHappened: refHappened.trim() || undefined,
      whatWorked: refWorked.trim() || undefined,
      whatDidnt: refDidnt.trim() || undefined,
      lesson: refLesson.trim(),
      nextSteps: refNext.trim() || undefined,
    });

    setSuccessMsg('Refleksi & pembelajaran berhasil ditambahkan!');
    setErrorMsg('');

    // Clear form
    setRefTitle('');
    setRefHappened('');
    setRefWorked('');
    setRefDidnt('');
    setRefLesson('');
    setRefNext('');
    setRefContributor('');

    setTimeout(() => {
      setSuccessMsg('');
      setIsOpenForm(false);
    }, 2000);
  };

  // Filter & Search Logic
  const filteredReflections = reflections
    .filter(r => {
      const matchSearch =
        (r.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.lesson || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.contributor || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      if (activeFilter === 'all') return matchSearch;
      return r.type === activeFilter && matchSearch;
    })
    .sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortBy === 'date-desc' ? dateB - dateA : dateA - dateB;
    });

  // Generate Report Markdown
  const generateMarkdownReport = () => {
    let report = `## LAPORAN REFLEKSI & PEMBELAJARAN PROGRAM (MONEV)\n`;
    report += `Generasi Laporan: ${new Intl.DateTimeFormat('id-ID', { dateStyle: 'full' }).format(new Date())}\n\n`;
    
    if (reflections.length === 0) {
      report += `*Belum ada data refleksi terdaftar*\n`;
      return report;
    }

    const categories = {
      success: '🎉 Keberhasilan Kerja',
      challenge: '⚠️ Hambatan / Isu Lapangan',
      lesson: '💡 Pelajaran Utama (Lesson Learned)',
      recommendation: '📌 Rekomendasi Taktis'
    };

    Object.entries(categories).forEach(([type, label]) => {
      const list = reflections.filter(r => r.type === type);
      if (list.length > 0) {
        report += `### ${label}\n`;
        list.forEach((item, index) => {
          report += `${index + 1}. **${item.title || 'Catatan Refleksi'}** (${item.date})\n`;
          if (item.contributor) report += `   - Kontributor: ${item.contributor}\n`;
          if (item.whatHappened) report += `   - Konteks: ${item.whatHappened}\n`;
          if (item.whatWorked) report += `   - Faktor Penunjang: ${item.whatWorked}\n`;
          if (item.whatDidnt) report += `   - Hambatan: ${item.whatDidnt}\n`;
          report += `   - **Pelajaran Utama: "${item.lesson}"**\n`;
          if (item.nextSteps) report += `   - Strategi Selanjutnya: ${item.nextSteps}\n`;
          report += `\n`;
        });
      }
    });

    return report;
  };

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(generateMarkdownReport());
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* SECTION HEADER & STATS CARDS */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
          <div>
            <h3 className="text-sm font-black text-slate-800 tracking-tight flex items-center gap-1.5 uppercase">
              <BookOpen className="w-5 h-5 text-emerald-600" /> Modul Pembelajaran &amp; Refleksi
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">
              Manajemen siklus pembelajaran program (*Learning Loop*), pencatatan taktis hambatan, hikmah pembelajaran, dan aksi korektif.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start md:self-center">
            <button
              onClick={() => setShowExportModal(true)}
              className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-extrabold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
              title="Ekspor Laporan MONEV"
            >
              <FileDown className="w-3.5 h-3.5 text-blue-600" /> Rapot Pembelajaran
            </button>
            <button
              onClick={() => setIsOpenForm(!isOpenForm)}
              className={`px-3 py-1.5 border font-extrabold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
                isOpenForm 
                ? 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100' 
                : 'bg-emerald-600 border-emerald-700 text-white hover:bg-emerald-700 shadow-xs'
              }`}
            >
              <Plus className={`w-3.5 h-3.5 transition-transform ${isOpenForm ? 'rotate-45' : ''}`} />
              {isOpenForm ? 'Tutup Formulir' : 'Tulis Refleksi'}
            </button>
          </div>
        </div>

        {/* METRICS GRID */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="bg-slate-50 border border-slate-100/80 rounded-xl p-3 text-center">
            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Total Catatan</span>
            <span className="text-xl font-black text-slate-800 block mt-0.5">{stats.total}</span>
          </div>
          <div className="bg-violet-50 border border-violet-100 rounded-xl p-3 text-center">
            <span className="text-[10px] text-violet-500 font-extrabold uppercase tracking-wider block">Lesson Learned</span>
            <div className="flex items-center justify-center gap-1 mt-0.5">
              <Lightbulb className="w-3.5 h-3.5 text-violet-600" />
              <span className="text-lg font-black text-violet-800">{stats.lesson}</span>
            </div>
          </div>
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-center">
            <span className="text-[10px] text-emerald-500 font-extrabold uppercase tracking-wider block">Keberhasilan</span>
            <div className="flex items-center justify-center gap-1 mt-0.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-lg font-black text-emerald-800">{stats.success}</span>
            </div>
          </div>
          <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 text-center">
            <span className="text-[10px] text-rose-500 font-extrabold uppercase tracking-wider block">Hambatan</span>
            <div className="flex items-center justify-center gap-1 mt-0.5">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
              <span className="text-lg font-black text-rose-800">{stats.challenge}</span>
            </div>
          </div>
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 text-center col-span-2 sm:col-span-1">
            <span className="text-[10px] text-indigo-500 font-extrabold uppercase tracking-wider block">Rekomendasi</span>
            <div className="flex items-center justify-center gap-1 mt-0.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span className="text-lg font-black text-indigo-800">{stats.recommendation}</span>
            </div>
          </div>
        </div>
      </div>

      {/* COLLAPSIBLE ADD REFLECTION FORM */}
      {isOpenForm && (
        <form onSubmit={handleCreateReflection} className="bg-slate-50 border border-slate-200/60 rounded-xl p-5 space-y-4 shadow-inner-sm">
          <span className="text-xs font-black text-slate-800 uppercase tracking-widest block">
            ✍️ Catat Hikmah Pembelajaran / Refleksi Baru
          </span>

          {successMsg && (
            <div className="bg-emerald-50 border border-emerald-150 text-emerald-800 text-xs font-semibold py-2 px-3 rounded-lg">
              {successMsg}
            </div>
          )}
          {errorMsg && (
            <div className="bg-rose-50 border border-rose-150 text-rose-700 text-xs font-semibold py-2 px-3 rounded-lg">
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-bold text-slate-700">
            <div className="space-y-1.5">
              <label className="text-slate-500">Tipe Refleksi</label>
              <select
                value={refType}
                onChange={(e) => setRefType(e.target.value as any)}
                className="w-full bg-white border border-slate-200 py-1.5 px-3 rounded-lg font-medium cursor-pointer"
              >
                <option value="lesson">💡 Lesson Learned (Pelajaran Utama)</option>
                <option value="success">🎉 Success (Keberhasilan Kerja)</option>
                <option value="challenge">⚠️ Challenge (Hambatan / Isu)</option>
                <option value="recommendation">📌 Recommendation (Strategis)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-500">Tanggal Pencatatan</label>
              <input
                type="date"
                value={refDate}
                onChange={(e) => setRefDate(e.target.value)}
                className="w-full bg-white border border-slate-200 py-1.5 px-3 rounded-lg font-mono font-medium"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-slate-500">Judul Catatan</label>
              <input
                type="text"
                placeholder="Contoh: Hambatan logistik Kepulauan Tanimbar..."
                value={refTitle}
                onChange={(e) => setRefTitle(e.target.value)}
                className="w-full bg-white border border-slate-200 py-1.5 px-3 rounded-lg font-medium text-slate-800"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-slate-500">Staf Pembawa Pembelajaran / Penanggung Jawab (Optional)</label>
              <select
                value={refContributor}
                onChange={(e) => setRefContributor(e.target.value)}
                className="w-full bg-white border border-slate-200 py-1.5 px-3 rounded-lg font-medium cursor-pointer"
              >
                <option value="">— Pilih nama staf penanggungjawab —</option>
                {staffList.map((s, idx) => (
                  <option key={idx} value={s}>{s}</option>
                ))}
                {refContributor && !staffList.includes(refContributor) && (
                  <option value={refContributor}>{refContributor}</option>
                )}
              </select>
            </div>

            <div className="col-span-full grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="text-slate-500">Bagaimana Kronologi / Masalah Terjadi?</label>
                <textarea
                  placeholder="Ceritakan latar belakang/konten kejadian..."
                  rows={2}
                  value={refHappened}
                  onChange={(e) => setRefHappened(e.target.value)}
                  className="w-full bg-white border border-slate-200 py-1.5 px-3 rounded-lg font-medium text-slate-800"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-500">Faktor Penunjang (Bila Sukses)</label>
                <textarea
                  placeholder="Apa yang berjalan baik / taktik pendukung..."
                  rows={2}
                  value={refWorked}
                  onChange={(e) => setRefWorked(e.target.value)}
                  className="w-full bg-white border border-slate-200 py-1.5 px-3 rounded-lg font-medium text-slate-800"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-500">Kendala Lapangan (Bila Menghambat)</label>
                <textarea
                  placeholder="Apa hal yang salah / tantangan mendasar..."
                  rows={2}
                  value={refDidnt}
                  onChange={(e) => setRefDidnt(e.target.value)}
                  className="w-full bg-white border border-slate-200 py-1.5 px-3 rounded-lg font-medium text-slate-800"
                />
              </div>
            </div>

            <div className="col-span-full space-y-1.5">
              <label className="text-slate-700 flex items-center gap-1">
                Pelajaran Utama (Hikmah Singkat) <span className="text-rose-500">*</span>
              </label>
              <textarea
                placeholder="Pelajaran bermakna apa yang diperoleh dari rangkaian kejadian ini..."
                rows={2}
                value={refLesson}
                onChange={(e) => setRefLesson(e.target.value)}
                className="w-full bg-white border border-slate-250 py-1.5 px-3 rounded-lg font-semibold text-slate-800"
              />
            </div>

            <div className="col-span-full space-y-1.5">
              <label className="text-slate-500">Rencana/Rekomendasi Langkah Kedepan</label>
              <textarea
                placeholder="Strategi aksi taktis atau mitigasi agar tidak terulang kembali..."
                rows={2}
                value={refNext}
                onChange={(e) => setRefNext(e.target.value)}
                className="w-full bg-white border border-slate-200 py-1.5 px-3 rounded-lg font-medium text-slate-800"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsOpenForm(false)}
              className="bg-slate-200 hover:bg-slate-350 text-slate-700 font-extrabold text-xs py-2 px-4 rounded-lg cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs py-2 px-5 rounded-lg shadow-xs transition-all cursor-pointer"
            >
              Simpan Catatan
            </button>
          </div>
        </form>
      )}

      {/* FILTER & SEARCH BAR */}
      <div className="bg-slate-55 rounded-2xl border border-slate-100 p-4 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          {/* Categories Tab Pill Filters */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1.5 font-extrabold rounded-xl transition-all cursor-pointer border ${
                activeFilter === 'all'
                ? 'bg-slate-900 border-slate-950 text-white'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              Semua ({stats.total})
            </button>
            <button
              onClick={() => setActiveFilter('lesson')}
              className={`px-3 py-1.5 font-extrabold rounded-xl transition-all cursor-pointer border flex items-center gap-1 ${
                activeFilter === 'lesson'
                ? 'bg-violet-650 border-violet-700 text-white'
                : 'bg-white border-slate-250 text-slate-600 hover:bg-violet-50/50'
              }`}
            >
              <Lightbulb className="w-3.5 h-3.5" />
              Lesson Learned ({stats.lesson})
            </button>
            <button
              onClick={() => setActiveFilter('success')}
              className={`px-3 py-1.5 font-extrabold rounded-xl transition-all cursor-pointer border flex items-center gap-1 ${
                activeFilter === 'success'
                ? 'bg-emerald-650 border-emerald-700 text-white'
                : 'bg-white border-slate-250 text-slate-600 hover:bg-emerald-50/50'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Keberhasilan ({stats.success})
            </button>
            <button
              onClick={() => setActiveFilter('challenge')}
              className={`px-3 py-1.5 font-extrabold rounded-xl transition-all cursor-pointer border flex items-center gap-1 ${
                activeFilter === 'challenge'
                ? 'bg-rose-650 border-rose-700 text-white'
                : 'bg-white border-slate-250 text-slate-600 hover:bg-rose-50/50'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Hambatan ({stats.challenge})
            </button>
            <button
              onClick={() => setActiveFilter('recommendation')}
              className={`px-3 py-1.5 font-extrabold rounded-xl transition-all cursor-pointer border flex items-center gap-1 ${
                activeFilter === 'recommendation'
                ? 'bg-indigo-650 border-indigo-700 text-white'
                : 'bg-white border-slate-250 text-slate-600 hover:bg-indigo-50/50'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Rekomendasi ({stats.recommendation})
            </button>
          </div>

          {/* Search Box Inputs */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari kata kunci atau staf..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white border border-slate-200 pl-9 pr-3 py-1.5 rounded-xl font-medium focus:outline-none focus:ring-1 focus:ring-slate-400"
              />
            </div>
            {/* Sorting control */}
            <button
              onClick={() => setSortBy(prev => prev === 'date-desc' ? 'date-asc' : 'date-desc')}
              className="p-1.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
              title={sortBy === 'date-desc' ? 'Terlama dahulu' : 'Terbaru dahulu'}
            >
              <ArrowUpDown className="w-4 h-4 text-slate-500" />
            </button>
          </div>
        </div>
      </div>

      {/* FILTERED LISTING CARDS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredReflections.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-white border border-slate-100 rounded-2xl text-slate-400 font-medium text-xs">
            Tidak ditemukan catatan refleksi yang cocok dengan filter atau kata kunci di atas.
          </div>
        ) : (
          filteredReflections.map((ref) => {
            let label = 'Lesson Learned';
            let badgeStyle = 'bg-violet-50 text-violet-700 border-violet-100';
            let labelIcon = <Lightbulb className="w-3 h-3 shrink-0" />;

            if (ref.type === 'success') {
              label = 'Keberhasilan';
              badgeStyle = 'bg-emerald-50 text-emerald-700 border-emerald-100';
              labelIcon = <CheckCircle2 className="w-3 h-3 shrink-0" />;
            } else if (ref.type === 'challenge') {
              label = 'Hambatan / Isu';
              badgeStyle = 'bg-rose-50 text-rose-700 border-rose-100';
              labelIcon = <AlertTriangle className="w-3 h-3 shrink-0" />;
            } else if (ref.type === 'recommendation') {
              label = 'Rekomendasi Taktis';
              badgeStyle = 'bg-indigo-50 text-indigo-700 border-indigo-100';
              labelIcon = <Sparkles className="w-3 h-3 shrink-0" />;
            }

            return (
              <div 
                key={ref.id} 
                className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs space-y-3 hover:shadow-xs transition-shadow relative group text-xs leading-relaxed"
              >
                {/* Heading info row */}
                <div className="flex items-center justify-between gap-4">
                  <span className={`inline-flex items-center gap-1.5 py-0.5 px-2 rounded-lg border text-[9px] font-extrabold ${badgeStyle}`}>
                    {labelIcon}
                    {label}
                  </span>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-450 font-mono font-bold flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {ref.date}
                    </span>
                    
                    {/* Delete handler */}
                    <button
                      onClick={() => {
                        if (window.confirm(`Hapus catatan refleksi pembelajaran ini?`)) {
                          onDeleteReflection(ref.id);
                        }
                      }}
                      className="p-1 text-slate-350 hover:text-rose-600 rounded-lg opacity-0 group-hover:opacity-100 focus:opacity-100 hover:bg-rose-50 transition-all cursor-pointer"
                      title="Hapus Catatan"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {ref.title && (
                  <h4 className="font-extrabold text-slate-800 text-xs tracking-tight">
                    {ref.title}
                  </h4>
                )}

                {/* Substantive notes content */}
                <div className="space-y-2 text-slate-600 font-medium">
                  {ref.whatHappened && (
                    <div className="text-[11px] leading-relaxed bg-slate-50/50 p-2 rounded-lg border border-slate-100">
                      <span className="text-[9px] font-extrabold text-slate-400 block uppercase tracking-wider mb-0.5">Konteks / Kejadian</span>
                      <p>{ref.whatHappened}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                    {ref.whatWorked && (
                      <div className="bg-emerald-50/20 border border-emerald-50 p-2 rounded-lg">
                        <span className="text-[9px] font-extrabold text-emerald-500 block uppercase tracking-wider mb-0.5">Berjalan Baik</span>
                        <p className="text-slate-600">{ref.whatWorked}</p>
                      </div>
                    )}
                    {ref.whatDidnt && (
                      <div className="bg-rose-50/20 border border-rose-50 p-2 rounded-lg">
                        <span className="text-[9px] font-extrabold text-rose-500 block uppercase tracking-wider mb-0.5">Hambatan Kunci</span>
                        <p className="text-slate-600">{ref.whatDidnt}</p>
                      </div>
                    )}
                  </div>

                  {/* Core Lessons Learned container (highly emphasized) */}
                  <div className="bg-gradient-to-r from-violet-50/70 to-fuchsia-50/40 p-3 rounded-xl border border-violet-100/70">
                    <span className="text-[9px] font-extrabold text-violet-650 block uppercase tracking-wider mb-1">
                      💡 Pelajaran Utama (Insight Kunci)
                    </span>
                    <p className="font-black text-slate-900 leading-relaxed text-xs">
                      "{ref.lesson}"
                    </p>
                  </div>

                  {ref.nextSteps && (
                    <div className="text-[11px] leading-relaxed bg-indigo-50/20 p-2.5 rounded-lg border border-indigo-100/60 text-slate-700">
                      <span className="text-[9px] font-extrabold text-indigo-600 block uppercase tracking-wider mb-0.5">Langkah Korektif Kedepan</span>
                      <p className="font-semibold text-slate-800">{ref.nextSteps}</p>
                    </div>
                  )}
                </div>

                {/* Contributor badge */}
                {ref.contributor && (
                  <div className="flex items-center gap-1.5 pt-2 border-t border-slate-50 text-[10px] text-slate-500 font-bold">
                    <div className="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 text-[8px] font-black shrink-0">
                      <User className="w-2.5 h-2.5" />
                    </div>
                    <span>Dicatat oleh: </span>
                    <span className="text-slate-800 font-extrabold">{ref.contributor}</span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* EXPORT MARKDOWN OVERLAY DIALOG */}
      {showExportModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 text-xs">
          <div className="bg-white rounded-2xl border border-slate-100 max-w-2xl w-full h-[70vh] shadow-2xl flex flex-col justify-between overflow-hidden text-slate-700">
            {/* Toolbar Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="min-w-0">
                <span className="text-[9px] font-extrabold text-emerald-600 uppercase tracking-widest block">Format MONEV Standard</span>
                <h3 className="font-black text-slate-800 text-xs leading-snug mt-0.5">Rapot &amp; Pembelajaran Program DFW</h3>
              </div>
              <button
                onClick={() => setShowExportModal(false)}
                className="px-2 py-1 text-xs hover:bg-slate-150 border border-slate-250 text-slate-500 rounded-lg cursor-pointer"
              >
                ✕ Close
              </button>
            </div>

            {/* Markdown Text Area Container */}
            <div className="flex-1 p-5 overflow-auto bg-slate-50">
              <div className="bg-white rounded-xl border border-slate-200/80 p-4 font-mono text-[11px] text-slate-800 whitespace-pre-wrap leading-relaxed select-all">
                {generateMarkdownReport()}
              </div>
            </div>

            {/* Actions Footer */}
            <div className="p-4 border-t border-slate-100 bg-white flex justify-end gap-2">
              <button
                onClick={handleCopyMarkdown}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-950 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
              >
                {isCopied ? (
                  <>
                    <ClipboardCheck className="w-4 h-4 text-emerald-400" /> Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" /> Copy Laporan
                  </>
                )}
              </button>
              <button
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2 bg-slate-105 hover:bg-slate-150 border border-slate-200 text-slate-700 font-black text-xs rounded-xl cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

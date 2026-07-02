import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Project, Activity, Indicator, Beneficiary, Issue, Staff, SubActivity, ActivityFile, ActivityNote } from '../types';
import { X, Upload, Download, Trash2, Edit2, AlertTriangle, FileText, CheckCircle2, Check, Plus, Tag, HelpCircle, Users, Eye } from 'lucide-react';
import { SupabaseSync } from '../lib/supabaseSync';
import { FormattedText } from './FormattedText';

// ==========================================
// 1. ADD / EDIT ACTIVITY MODAL
// ==========================================
interface ActivityModalProps {
  isOpen: boolean;
  activity?: Activity;
  projectId: string;
  staffList: string[];
  onClose: () => void;
  onSave: (activityData: Partial<Activity>, rawFiles?: File[]) => void;
  onOpenSubActivities: (activityId: string) => void;
}

export const ActivityModal: React.FC<ActivityModalProps> = ({
  isOpen,
  activity,
  projectId,
  staffList,
  onClose,
  onSave,
  onOpenSubActivities,
}) => {
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [pic, setPic] = useState('');
  const [status, setStatus] = useState<'Belum Mulai' | 'Sedang Berjalan' | 'Selesai' | 'Tertunda'>('Belum Mulai');
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [progress, setProgress] = useState(0);

  // Notes
  const [notes, setNotes] = useState<ActivityNote[]>([]);
  const [newNote, setNewNote] = useState('');

  // Upload Files staging
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const [savedFiles, setSavedFiles] = useState<ActivityFile[]>([]);

  useEffect(() => {
    if (isOpen) {
      if (activity) {
        setTitle(activity.title || '');
        setDesc(activity.desc || '');
        setPic(activity.pic || '');
        setStatus(activity.status || 'Belum Mulai');
        setStartDate(activity.startDate || '');
        setDueDate(activity.dueDate || '');
        setProgress(activity.progress || 0);
        setNotes(activity.notes || []);
        setSavedFiles(activity.files || []);
        setStagedFiles([]);
        setNewNote('');
      } else {
        setTitle('');
        setDesc('');
        setPic('');
        setStatus('Belum Mulai');
        setStartDate(new Date().toISOString().split('T')[0]);
        setDueDate('');
        setProgress(0);
        setNotes([]);
        setSavedFiles([]);
        setStagedFiles([]);
        setNewNote('');
      }
    }
  }, [isOpen, activity]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const arr = Array.from(e.target.files);
      setStagedFiles((prev) => [...prev, ...arr]);
    }
  };

  const handleRemoveStaged = (index: number) => {
    setStagedFiles(stagedFiles.filter((_, idx) => idx !== index));
  };

  const handleRemoveSaved = (fileId: string) => {
    setSavedFiles(savedFiles.filter((f) => f.id !== fileId));
  };

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    const item: ActivityNote = {
      id: `n-${Date.now()}`,
      text: newNote,
      date: new Date().toISOString().split('T')[0],
      author: 'Imam Trihatmadja', // defaults
    };
    setNotes([...notes, item]);
    setNewNote('');
  };

  const handleSaveActivityLocal = () => {
    if (!title.trim()) {
      alert('Judul Aktivitas wajib diisi!');
      return;
    }

    const savedData: Partial<Activity> = {
      projectId,
      title,
      desc: desc || undefined,
      pic: pic || undefined,
      status,
      startDate: startDate || undefined,
      dueDate: dueDate || undefined,
      progress,
      notes,
      files: savedFiles,
    };

    onSave(savedData, stagedFiles);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-100 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl font-medium text-slate-700 text-xs">
        {/* Header */}
        <div className="p-4 border-b border-slate-50 flex items-center justify-between">
          <span className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">
            {activity ? '✏️ Edit Detail Aktivitas' : '➕ Tambah Aktivitas Acara'}
          </span>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg cursor-pointer">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="col-span-full space-y-1">
              <label className="text-slate-500 font-bold">Judul Kegiatan / Aktivitas *</label>
              <input
                type="text"
                className="w-full bg-slate-50/50 border border-slate-200 py-2 px-3 rounded-lg focus:outline-none focus:border-blue-400 focus:bg-white font-bold text-slate-800 text-xs"
                placeholder="Pemberian Sertifikasi BPJS Ketenagakerjaan Nelayan"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="col-span-full space-y-1">
              <label className="text-slate-500 font-bold">Deskripsi Penjelasan</label>
              <textarea
                className="w-full bg-slate-50/50 border border-slate-200 py-2 px-3 rounded-lg focus:outline-none focus:border-blue-400 focus:bg-white text-xs"
                rows={2}
                placeholder="Tulis ringkasan jalannya kegiatan..."
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-500 font-bold">Penanggung Jawab PIC</label>
              <select
                className="w-full bg-slate-50/50 border border-slate-200 py-2 px-3 rounded-lg focus:outline-none focus:border-blue-400 cursor-pointer"
                value={pic}
                onChange={(e) => setPic(e.target.value)}
              >
                <option value="">-- Pilih Staff --</option>
                {staffList.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
                {pic && !staffList.includes(pic) && (
                  <option value={pic}>
                    {pic}
                  </option>
                )}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-slate-500 font-bold">Status Milestones</label>
              <select
                className="w-full bg-slate-50/50 border border-slate-200 py-2 px-3 rounded-lg focus:outline-none focus:border-blue-400 cursor-pointer"
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
              >
                <option value="Belum Mulai">Belum Mulai</option>
                <option value="Sedang Berjalan">Sedang Berjalan</option>
                <option value="Selesai">Selesai</option>
                <option value="Tertunda">Tertunda</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-slate-500 font-bold">Tanggal Mulai</label>
              <input
                type="date"
                className="w-full bg-slate-50/50 border border-slate-200 py-1.5 px-3 rounded-lg font-mono"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-500 font-bold">Jatuh Tempo (Deadline)</label>
              <input
                type="date"
                className="w-full bg-slate-50/50 border border-slate-200 py-1.5 px-3 rounded-lg font-mono"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>

            <div className="col-span-full space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-200/40">
              <div className="flex items-center justify-between font-bold">
                <span className="text-slate-500">Tingkat Penyelesaian (Progress)</span>
                <span className="text-blue-600 font-extrabold text-sm">{progress}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                className="w-full accent-blue-600 h-2 rounded cursor-pointer"
                value={progress}
                onChange={(e) => setProgress(Number(e.target.value))}
              />
            </div>
          </div>

          {/* Staging notes / Challenges */}
          <div className="space-y-3 pt-2">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-rose-500 block">
              ⚠️ Hambatan, Tantangan &amp; Tindakan Mitigasi
            </span>
            <div className="max-h-[140px] overflow-y-auto space-y-2 border border-slate-50 p-2.5 rounded-lg bg-slate-50/30">
              {notes.length === 0 ? (
                <p className="text-slate-400 italic text-[11px] text-center">Belum ada rincian tantangan terdaftar di kegiatan ini.</p>
              ) : (
                notes.map((n) => (
                  <div key={n.id} className="p-2 border border-slate-100 bg-white rounded-lg flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <p className="font-bold text-slate-800 leading-snug">"{n.text}"</p>
                      <span className="text-[9px] text-slate-400 block font-mono">
                        Oleh {n.author} | {n.date}
                      </span>
                    </div>
                    <button
                      onClick={() => setNotes(notes.filter((item) => item.id !== n.id))}
                      className="text-slate-300 hover:text-rose-500 p-0.5"
                    >
                      ✕
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Tulis kendala baru atau rincian penyelesaian..."
                className="flex-1 bg-slate-50 border border-slate-200 rounded-lg py-1 px-3 text-xs font-semibold text-slate-800 focus:outline-none focus:bg-white"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
              />
              <button
                type="button"
                onClick={handleAddNote}
                className="bg-slate-800 hover:bg-slate-950 text-white font-bold py-1 px-4 rounded-lg cursor-pointer text-[10px]"
              >
                Tambah
              </button>
            </div>
          </div>

          {/* Files dropzone support */}
          <div className="space-y-3 pt-2">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 block">
              📂 Berkas Lampiran Pendukung
            </span>

            {/* Dropzone container */}
            <label className="border-2 border-dashed border-slate-200 p-6 rounded-xl hover:border-blue-400 hover:bg-blue-50/5 transition-all text-center flex flex-col items-center justify-center cursor-pointer gap-1 text-slate-400">
              <Upload className="w-6 h-6 text-slate-300" />
              <p className="font-bold text-slate-600 text-xs mt-1">Pilih Lampiran Berkas Baru</p>
              <span className="text-[10px] text-slate-400">Dimungkinkan PDF, XLSX, JPG (Maks. 10MB)</span>
              <input type="file" multiple className="hidden" onChange={handleFileChange} />
            </label>

            {/* Staging file indicator list */}
            {stagedFiles.length > 0 && (
              <div className="space-y-1 bg-blue-50/30 p-2 border border-blue-100/30 rounded-lg">
                <span className="text-[9px] font-bold text-blue-800">Berkas akan Diupload:</span>
                {stagedFiles.map((f, index) => (
                  <div key={index} className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
                    <span className="truncate max-w-[400px]">📎 {f.name}</span>
                    <button onClick={() => handleRemoveStaged(index)} className="text-rose-500 font-bold hover:underline cursor-pointer">
                      Hapus
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Existing files */}
            {savedFiles.length > 0 && (
              <div className="space-y-1 border border-slate-50 p-2.5 rounded-lg bg-slate-50/30">
                <span className="text-[9px] font-bold text-slate-400">Berkas yang Tersimpan:</span>
                {savedFiles.map((f) => (
                  <div key={f.id} className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
                    <span className="truncate max-w-[400px]">📄 {f.name}</span>
                    <button onClick={() => handleRemoveSaved(f.id)} className="text-rose-500 hover:underline cursor-pointer text-[10px] font-bold">
                      Hapus
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Form actions */}
        <div className="p-4 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between gap-2">
          {activity && (
            <button
              onClick={() => onOpenSubActivities(activity.id)}
              className="bg-blue-600 hover:bg-blue-700 text-white py-1.5 px-3.5 rounded-xl font-bold cursor-pointer transition-all"
            >
              🛠️ Lihat Sub-Aktivitas ({activity.id ? 'Kelola' : '0'})
            </button>
          )}
          <div className="flex gap-2 ml-auto">
            <button
              onClick={onClose}
              className="bg-white border border-slate-200 text-slate-500 py-1.5 px-4 rounded-xl font-bold transition-all hover:bg-slate-100 cursor-pointer"
            >
              Batal
            </button>
            <button
              onClick={handleSaveActivityLocal}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-1.5 px-5 rounded-xl transition-all cursor-pointer inline-flex items-center gap-1"
            >
              <Check className="w-4 h-4" /> Simpan Aktivitas
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


// ==========================================
// 2. DETAILED PRINT OPTIONS CONFIGURATION
// ==========================================
interface PrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGeneratePrint: (lang: 'id' | 'en', fromDate: string, toDate: string) => void;
}

export const PrintModal: React.FC<PrintModalProps> = ({ isOpen, onClose, onGeneratePrint }) => {
  const [preset, setPreset] = useState<'month' | 'quarter' | 'year' | 'custom'>('month');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  useEffect(() => {
    if (isOpen) {
      const today = new Date();
      setToDate(today.toISOString().split('T')[0]);

      if (preset === 'month') {
        const lastMonth = new Date();
        lastMonth.setMonth(today.getMonth() - 1);
        setFromDate(lastMonth.toISOString().split('T')[0]);
      } else if (preset === 'quarter') {
        const lastQuarter = new Date();
        lastQuarter.setMonth(today.getMonth() - 3);
        setFromDate(lastQuarter.toISOString().split('T')[0]);
      } else if (preset === 'year') {
        const lastYear = new Date();
        lastYear.setFullYear(today.getFullYear() - 1);
        setFromDate(lastYear.toISOString().split('T')[0]);
      }
    }
  }, [isOpen, preset]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl border border-slate-100 max-w-md w-full shadow-xl font-semibold text-slate-600 text-xs">
        <div className="p-4 border-b border-slate-50 flex items-center justify-between">
          <span className="text-sm font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            🖨️ Generate Laporan Print Proyek
          </span>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg cursor-pointer">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Metode Rentang Tanggal</label>
            <div className="grid grid-cols-4 gap-1.5 text-center">
              {['month', 'quarter', 'year', 'custom'].map((item) => (
                <button
                  key={item}
                  onClick={() => setPreset(item as any)}
                  className={`py-1.5 rounded-lg border text-[10px] font-bold cursor-pointer transition-all ${
                    preset === item
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-600'
                  }`}
                >
                  {item === 'month' ? '1 Bulan' : item === 'quarter' ? '3 Bulan' : item === 'year' ? '1 Tahun' : 'Kustom'}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-slate-400 font-bold">Dari Tanggal</label>
              <input
                type="date"
                className="w-full bg-slate-50 border border-slate-200 py-1.5 px-3 rounded-lg font-mono text-slate-800 focus:outline-none"
                value={fromDate}
                disabled={preset !== 'custom'}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-slate-400 font-bold">Ke Tanggal</label>
              <input
                type="date"
                className="w-full bg-slate-50 border border-slate-200 py-1.5 px-3 rounded-lg font-mono text-slate-800 focus:outline-none"
                value={toDate}
                disabled={preset !== 'custom'}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
          </div>

          <p className="bg-sky-50 border border-sky-100 text-sky-800 text-[11px] p-2.5 rounded-lg leading-relaxed">
            Laporan ini mencakup seluruh update performance, aktivitas baru dilaporkan, penyerapan budget sementara, dan lesson-learned dalam rentang tanggal yang dipilih.
          </p>

          <div className="space-y-2 pt-2 border-t border-slate-50">
            <label className="text-slate-400 font-bold uppercase text-[9px] tracking-wider block">Pilih Versi Bahasa</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onGeneratePrint('id', fromDate, toDate)}
                className="bg-emerald-600 hover:bg-emerald-700 font-extrabold text-white py-2 rounded-xl text-[10px] cursor-pointer text-center"
              >
                🇮🇩 Bahasa Indonesia
              </button>
              <button
                onClick={() => onGeneratePrint('en', fromDate, toDate)}
                className="bg-blue-600 hover:bg-blue-700 font-extrabold text-white py-2 rounded-xl text-[10px] cursor-pointer text-center"
              >
                🇬🇧 English Vers.
              </button>
            </div>
          </div>
        </div>

        <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="bg-white border border-slate-200 text-slate-500 py-1 px-3 rounded-lg font-bold hover:bg-slate-100 cursor-pointer text-[10px]"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};


// ==========================================
// 3. EXCEL / CSV PROJECTS IMPORT MODAL
// ==========================================
interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportDone: (importedProjects: Project[], importedIndicators: Indicator[]) => void;
}

interface ParsedProjectRow {
  name: string;
  location: string;
  owner: string;
  donor?: string;
  startDate?: string;
  deadline?: string;
  status: 'Aktif' | 'On Track' | 'Terlambat' | 'Selesai' | 'Ditangguhkan';
  goal?: string;
  desc?: string;
  note?: string;
  budgetApproved: number;
  budgetActual: number;
  rowNumber: number;
  isValid: boolean;
  errors: string[];
}

interface ParsedIndicatorRow {
  projectName: string;
  title: string;
  target: number;
  unit: string;
  current: number;
  rowNumber: number;
  isValid: boolean;
  errors: string[];
}

function resolveField(row: any, aliases: string[]): string {
  for (const alias of aliases) {
    if (row[alias] !== undefined && row[alias] !== null && row[alias] !== '') {
      return String(row[alias]).trim();
    }
  }
  return '';
}

function parseRawDate(val: string): string | null {
  if (!val) return null;
  const str = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
    const [d, m, y] = str.split('/');
    return `${y}-${m}-${d}`;
  }
  if (/^\d{2}-\d{2}-\d{4}$/.test(str)) {
    const [d, m, y] = str.split('-');
    return `${y}-${m}-${d}`;
  }
  
  try {
    const date = new Date(str);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  } catch (_) {}
  return null;
}

function parseNum(val: any): number {
  if (val === '' || val === null || val === undefined) return 0;
  return Number(String(val).replace(/[^0-9.-]/g, '')) || 0;
}

function sheetToRows(ws: any): any[] {
  const raw: any[] = XLSX.utils.sheet_to_json(ws, { defval: '', raw: false });
  if (!raw.length) return [];
  return raw.map((row: any) => {
    const norm: any = {};
    Object.keys(row).forEach((k) => {
      const key = k.toLowerCase().trim().replace(/[\s\-\/]+/g, '_');
      norm[key] = row[k] !== undefined && row[k] !== null ? String(row[k]).trim() : '';
    });
    return norm;
  });
}

export const ImportModal: React.FC<ImportModalProps> = ({ isOpen, onClose, onImportDone }) => {
  const [stagedFile, setStagedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [parsedProjects, setParsedProjects] = useState<ParsedProjectRow[]>([]);
  const [parsedIndicators, setParsedIndicators] = useState<ParsedIndicatorRow[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activePreviewTab, setActivePreviewTab] = useState<'proyek' | 'indikator'>('proyek');

  if (!isOpen) return null;

  const handleDownloadTemplate = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Proyek
    const projData = [
      [
        'Nama Proyek*',
        'Lokasi*',
        'Penanggung Jawab*',
        'Donor/Funder',
        'Tanggal Mulai',
        'Deadline',
        'Status',
        'Tujuan Proyek',
        'Deskripsi',
        'Catatan',
        'Anggaran Disetujui',
        'Realisasi Anggaran',
      ],
      [
        'USAID — Perlindungan Hak Asasi AKP Domestik',
        'Tanjung Priok & Pelabuhan Benoa',
        'Siti Nurul',
        'USAID Oceans',
        '2026-06-12',
        '2026-11-20',
        'Aktif',
        'Evaluasi adopsi keselamatan operasional oleh syahbandar perikanan.',
        'Meningkatkan kapasitas pengawasan kepatuhan di pelabuhan utama.',
        'Fokus pada perlindungan HAM pelaut perikanan.',
        '600000000',
        '60000000',
      ],
      [
        'DFW — Pemberdayaan Ekonomi Nelayan Kecil',
        'Kepulauan Tanimbar',
        'Imam Trihatmadja',
        'EJF',
        '2026-02-01',
        '2026-10-31',
        'Aktif',
        'Meningkatkan kapasitas melaut pembudidaya rumput laut.',
        '',
        '',
        '350000000',
        '0',
      ],
    ];
    const wsProj = XLSX.utils.aoa_to_sheet(projData);
    wsProj['!cols'] = [35, 25, 25, 20, 15, 15, 15, 40, 40, 30, 20, 20].map((w) => ({ wch: w }));
    XLSX.utils.book_append_sheet(wb, wsProj, 'Proyek');

    // Sheet 2: Indikator
    const indData = [
      ['Nama Proyek*', 'Nama Indikator*', 'Target*', 'Satuan', 'Capaian Awal'],
      ['USAID — Perlindungan Hak Asasi AKP Domestik', 'Jumlah nelayan terlatih', '100', 'Orang', '10'],
      ['USAID — Perlindungan Hak Asasi AKP Domestik', 'Jumlah kebijakan keselamatan dirumuskan', '2', 'Dokumen', '0'],
      ['DFW — Pemberdayaan Ekonomi Nelayan Kecil', 'Laporan pemetaan wilayah tangkap', '5', 'Laporan', '0'],
    ];
    const wsInd = XLSX.utils.aoa_to_sheet(indData);
    wsInd['!cols'] = [35, 35, 12, 12, 12].map((w) => ({ wch: w }));
    XLSX.utils.book_append_sheet(wb, wsInd, 'Indikator');

    XLSX.writeFile(wb, 'Template_Import_Proyek_DFW.xlsx');
  };

  const processFile = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !['xlsx', 'xls', 'csv'].includes(ext)) {
      setError('Format file tidak didukung. Sila unggah berkas berekstensi .xlsx, .xls, atau .csv');
      setSuccess('');
      setStagedFile(null);
      setParsedProjects([]);
      setParsedIndicators([]);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) throw new Error('Berkas kosong atau tidak dapat dibaca.');
        const workbook = XLSX.read(data, { type: 'array' });
        
        let projectSheetName = '';
        let indicatorSheetName = '';

        workbook.SheetNames.forEach((sheetName) => {
          const lSheet = sheetName.toLowerCase().trim();
          if (lSheet.includes('proyek') || lSheet.includes('project')) {
            projectSheetName = sheetName;
          } else if (lSheet.includes('indikator') || lSheet.includes('indicator')) {
            indicatorSheetName = sheetName;
          }
        });

        if (!projectSheetName) {
          if (workbook.SheetNames.length === 1) {
            projectSheetName = workbook.SheetNames[0];
          } else {
            throw new Error('Sheet "Proyek" atau "Projects" tidak ditemukan di file Excel.');
          }
        }

        // Parse Projects Sheet
        const projWs = workbook.Sheets[projectSheetName];
        const projRawRows = sheetToRows(projWs);

        if (projRawRows.length === 0) {
          throw new Error('Tidak ada data proyek yang ditemukan di file.');
        }

        const projectAliases = {
          name: ['nama_proyek', 'nama', 'project_name', 'judul_proyek', 'judul'],
          location: ['location', 'lokasi', 'wilayah', 'area'],
          owner: ['owner', 'pic', 'penanggung_jawab', 'pelaksana', 'pj', 'staf'],
          donor: ['donor', 'funder', 'pemberi_dana', 'funding'],
          startDate: ['start_date', 'tanggal_mulai', 'mulai', 'start', 'tgl_mulai'],
          deadline: ['deadline', 'tanggal_selesai', 'end_date', 'selesai', 'akhir', 'tgl_selesai'],
          status: ['status'],
          goal: ['goal', 'tujuan', 'tujuan_proyek'],
          desc: ['desc', 'description', 'deskripsi', 'keterangan'],
          note: ['note', 'catatan'],
          budgetApproved: ['budget_approved', 'anggaran_disetujui', 'anggaran', 'budget', 'pagu'],
          budgetActual: ['budget_actual', 'realisasi_anggaran', 'realisasi', 'actual_budget'],
        };

        const validatedProjects: ParsedProjectRow[] = projRawRows.map((raw, idx) => {
          const name = resolveField(raw, projectAliases.name);
          const location = resolveField(raw, projectAliases.location);
          const owner = resolveField(raw, projectAliases.owner);
          const donor = resolveField(raw, projectAliases.donor);
          const rawStart = resolveField(raw, projectAliases.startDate);
          const rawDeadline = resolveField(raw, projectAliases.deadline);
          const rawStatus = resolveField(raw, projectAliases.status);
          const goal = resolveField(raw, projectAliases.goal);
          const desc = resolveField(raw, projectAliases.desc);
          const note = resolveField(raw, projectAliases.note);
          const rawApproved = resolveField(raw, projectAliases.budgetApproved);
          const rawActual = resolveField(raw, projectAliases.budgetActual);

          const rowErrors: string[] = [];
          if (!name) rowErrors.push('Nama Proyek wajib diisi');
          if (!location) rowErrors.push('Lokasi wajib diisi');
          if (!owner) rowErrors.push('Penanggung Jawab (PIC) wajib diisi');

          let status: any = 'Aktif';
          const normalizedStatusStr = rawStatus.toLowerCase();
          if (normalizedStatusStr.includes('track') || normalizedStatusStr.includes('on')) status = 'On Track';
          else if (normalizedStatusStr.includes('lambat') || normalizedStatusStr.includes('late')) status = 'Terlambat';
          else if (normalizedStatusStr.includes('selesai') || normalizedStatusStr.includes('done') || normalizedStatusStr.includes('finish')) status = 'Selesai';
          else if (normalizedStatusStr.includes('tangguh') || normalizedStatusStr.includes('hold') || normalizedStatusStr.includes('suspend')) status = 'Ditangguhkan';
          else if (normalizedStatusStr === 'aktif') status = 'Aktif';

          const budgetApproved = parseNum(rawApproved);
          const budgetActual = parseNum(rawActual);

          return {
            name,
            location,
            owner,
            donor: donor || undefined,
            startDate: parseRawDate(rawStart) || undefined,
            deadline: parseRawDate(rawDeadline) || undefined,
            status,
            goal: goal || undefined,
            desc: desc || undefined,
            note: note || undefined,
            budgetApproved,
            budgetActual,
            rowNumber: idx + 2,
            isValid: rowErrors.length === 0,
            errors: rowErrors,
          };
        });

        let validatedIndicators: ParsedIndicatorRow[] = [];
        if (indicatorSheetName) {
          const indWs = workbook.Sheets[indicatorSheetName];
          const indRawRows = sheetToRows(indWs);

          const indicatorAliases = {
            projectName: ['project_name', 'nama_proyek', 'proyek', 'project'],
            title: ['indicator_name', 'nama_indikator', 'indikator', 'indicator', 'title', 'nama'],
            target: ['target', 'nilai_target'],
            unit: ['unit', 'satuan'],
            current: ['actual', 'capaian', 'capaian_awal', 'realisasi', 'current', 'nilai'],
          };

          validatedIndicators = indRawRows.map((raw, idx) => {
            const projectName = resolveField(raw, indicatorAliases.projectName);
            const title = resolveField(raw, indicatorAliases.title);
            const rawTarget = resolveField(raw, indicatorAliases.target);
            const unit = resolveField(raw, indicatorAliases.unit) || 'Orang';
            const rawCurrent = resolveField(raw, indicatorAliases.current);

            const rowErrors: string[] = [];
            if (!projectName) rowErrors.push('Nama Proyek rujukan wajib diisi');
            if (!title) rowErrors.push('Nama Indikator wajib diisi');

            const targetVal = parseNum(rawTarget);
            const currentVal = parseNum(rawCurrent);

            const projectExistsInSheet = validatedProjects.some(
              (p) => p.name.toLowerCase() === projectName.toLowerCase()
            );
            if (projectName && !projectExistsInSheet) {
              rowErrors.push(`Rujukan proyek "${projectName}" tidak ditemukan dalam lembar Proyek.`);
            }

            return {
              projectName,
              title,
              target: targetVal,
              unit,
              current: currentVal,
              rowNumber: idx + 2,
              isValid: rowErrors.length === 0,
              errors: rowErrors,
            };
          });
        }

        setParsedProjects(validatedProjects);
        setParsedIndicators(validatedIndicators);
        setSuccess(`File "${file.name}" berhasil di-parse.`);
        setError('');
        setStagedFile(file);
        
        if (validatedProjects.length === 0 && validatedIndicators.length > 0) {
          setActivePreviewTab('indikator');
        } else {
          setActivePreviewTab('proyek');
        }
      } catch (err: any) {
        setError(err.message || 'Gagal mengurai file Excel/CSV.');
        setSuccess('');
        setStagedFile(null);
        setParsedProjects([]);
        setParsedIndicators([]);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleExecuteImport = () => {
    if (parsedProjects.length === 0) return;

    const validProjs = parsedProjects.filter((p) => p.isValid);
    
    const importedProjects: Project[] = validProjs.map((p) => {
      const generatedId = `p-imp-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      return {
        id: generatedId,
        name: p.name,
        location: p.location,
        owner: p.owner,
        donor: p.donor,
        status: p.status,
        startDate: p.startDate,
        deadline: p.deadline,
        progress: 0,
        budgetApproved: p.budgetApproved,
        budgetActual: p.budgetActual,
        desc: p.desc,
        note: p.note,
        goal: p.goal,
        isArchived: false,
      };
    });

    const importedIndicators: Indicator[] = [];

    parsedIndicators.filter((ind) => ind.isValid).forEach((ind) => {
      const matchedProj = importedProjects.find(
        (p) => p.name.toLowerCase() === ind.projectName.toLowerCase()
      );
      
      if (matchedProj) {
        importedIndicators.push({
          id: `ind-imp-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          projectId: matchedProj.id,
          title: ind.title,
          target: ind.target,
          current: ind.current,
          unit: ind.unit,
        });
      }
    });

    onImportDone(importedProjects, importedIndicators);
    setStagedFile(null);
    setSuccess('');
    setParsedProjects([]);
    setParsedIndicators([]);
    onClose();
  };

  const handleReset = () => {
    setStagedFile(null);
    setSuccess('');
    setError('');
    setParsedProjects([]);
    setParsedIndicators([]);
  };

  // Warning metrics
  const totalWarnings = 
    parsedProjects.filter(p => !p.isValid).length + 
    parsedIndicators.filter(i => !i.isValid).length;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl border border-slate-100 max-w-2xl w-full h-[85vh] shadow-2xl flex flex-col justify-between overflow-hidden font-medium text-slate-600 text-xs text-left">
        {/* Header toolbar */}
        <div className="p-4 border-b border-slate-50 flex items-center justify-between bg-slate-50">
          <span className="text-sm font-black text-slate-800 uppercase tracking-tight flex items-center gap-1.5">
            📥 Import Proposal Data Proyek dari Excel/CSV
          </span>
          <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-lg cursor-pointer">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {/* Modal body (scrollable content) */}
        <div className="flex-1 p-5 overflow-y-auto space-y-4">
          <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100/30 text-[11px] text-blue-800 leading-relaxed flex items-center justify-between gap-4">
            <span>
              <strong>Format wajib:</strong> Memiliki sheet <strong>Proyek</strong> (kolom Name, Location, PIC wajib) dan sheet <strong>Indikator</strong> (opsional).
            </span>
            <button 
              onClick={handleDownloadTemplate}
              className="bg-white hover:bg-blue-50 text-blue-700 font-extrabold py-1 px-2 border border-blue-200 rounded-md shrink-0 cursor-pointer text-[10px] flex items-center gap-1"
            >
              <Download className="w-3.5 h-3.5" /> Unduh Format
            </button>
          </div>

          {/* DRAG & DROP ZONE */}
          {!stagedFile && (
            <div 
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed py-10 px-4 rounded-xl transition-all text-center flex flex-col items-center justify-center gap-2 cursor-pointer ${
                dragActive 
                ? 'border-emerald-500 bg-emerald-50/20 text-emerald-600' 
                : 'border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/5 text-slate-400'
              }`}
              onClick={() => document.getElementById('projectFileInput')?.click()}
            >
              <FileText className={`w-10 h-10 transition-colors ${dragActive ? 'text-emerald-500' : 'text-slate-300'}`} />
              <p className="font-bold text-slate-700 text-xs">Geser/Drop atau Klik untuk Pilih File Excel M&amp;E Laporan</p>
              <span className="text-[10px]">Mendukung berkas berekstensi .xlsx, .xls, .csv</span>
              <input 
                id="projectFileInput"
                type="file" 
                accept=".xlsx,.xls,.csv" 
                className="hidden" 
                onChange={handleFileChange} 
              />
            </div>
          )}

          {error && (
            <div className="bg-rose-50 border border-rose-100 text-rose-700 text-[11px] font-bold py-2.5 px-3.5 rounded-lg flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 text-[11px] font-bold py-2.5 px-3.5 rounded-lg flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{success}</span>
              {stagedFile && (
                <button 
                  onClick={handleReset} 
                  className="bg-white hover:bg-slate-100 text-slate-500 border border-slate-200 font-extrabold px-1.5 py-0.5 rounded text-[9px] ml-auto cursor-pointer"
                >
                  Pilih File Lain
                </button>
              )}
            </div>
          )}

          {/* DATA PREVIEW TAB BLOCK ONCE STAGED */}
          {stagedFile && (
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              {/* Tab selector and metadata header */}
              <div className="bg-slate-50 border-b border-slate-200 p-3 flex flex-all justify-between items-center gap-3">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setActivePreviewTab('proyek')}
                    className={`px-3 py-1 font-bold rounded-lg transition-all cursor-pointer ${
                      activePreviewTab === 'proyek'
                      ? 'bg-slate-900 text-white'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Proyek ({parsedProjects.length})
                  </button>
                  {parsedIndicators.length > 0 && (
                    <button
                      onClick={() => setActivePreviewTab('indikator')}
                      className={`px-3 py-1 font-bold rounded-lg transition-all cursor-pointer ${
                        activePreviewTab === 'indikator'
                        ? 'bg-slate-900 text-white'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      Indikator ({parsedIndicators.length})
                    </button>
                  )}
                </div>
                {totalWarnings > 0 && (
                  <span className="text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-100 py-0.5 px-2 rounded-lg flex items-center gap-1 animate-pulse">
                    <AlertTriangle className="w-3 h-3 text-rose-500" /> {totalWarnings} Baris Bermasalah
                  </span>
                )}
              </div>

              {/* Data listing viewport */}
              <div className="max-h-[35vh] overflow-auto">
                {activePreviewTab === 'proyek' ? (
                  <table className="w-full text-left border-collapse text-[11px] font-medium text-slate-600">
                    <thead>
                      <tr className="bg-slate-100/80 font-bold border-b border-slate-200 text-slate-700">
                        <th className="p-2 w-10">Baris</th>
                        <th className="p-2">Nama Proyek</th>
                        <th className="p-2">Lokasi</th>
                        <th className="p-2">PIC (Owner)</th>
                        <th className="p-2">Donor</th>
                        <th className="p-2 text-right">Pagu Anggaran</th>
                        <th className="p-2">Validasi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedProjects.map((p) => (
                        <tr 
                          key={p.rowNumber} 
                          className={`border-b border-slate-100 hover:bg-slate-50/50 ${!p.isValid ? 'bg-rose-50/40 text-rose-700' : ''}`}
                        >
                          <td className="p-2 font-mono text-slate-400">{p.rowNumber}</td>
                          <td className="p-2 font-bold">{p.name || <span className="text-rose-500 italic">[Kosong]</span>}</td>
                          <td className="p-2">{p.location || <span className="text-rose-500 italic">[Kosong]</span>}</td>
                          <td className="p-2">{p.owner || <span className="text-rose-500 italic">[Kosong]</span>}</td>
                          <td className="p-2 text-slate-450">{p.donor || '-'}</td>
                          <td className="p-2 text-right font-mono font-bold">
                            Rp {new Intl.NumberFormat('id-ID').format(p.budgetApproved)}
                          </td>
                          <td className="p-2 font-semibold">
                            {p.isValid ? (
                              <span className="text-emerald-600">OK</span>
                            ) : (
                              <span className="text-rose-600 flex flex-col gap-0.5" title={p.errors.join(', ')}>
                                ❌ {p.errors[0]}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <table className="w-full text-left border-collapse text-[11px] font-medium text-slate-600">
                    <thead>
                      <tr className="bg-slate-100/80 font-bold border-b border-slate-200 text-slate-700">
                        <th className="p-2 w-10">Baris</th>
                        <th className="p-2">Nama Proyek Rujukan</th>
                        <th className="p-2">Nama Indikator</th>
                        <th className="p-2 text-right">Target</th>
                        <th className="p-2">Satuan</th>
                        <th className="p-2 text-right">Capaian</th>
                        <th className="p-2">Validasi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedIndicators.map((ind) => (
                        <tr 
                          key={ind.rowNumber} 
                          className={`border-b border-slate-100 hover:bg-slate-50/50 ${!ind.isValid ? 'bg-rose-50/40 text-rose-700' : ''}`}
                        >
                          <td className="p-2 font-mono text-slate-400">{ind.rowNumber}</td>
                          <td className="p-2 font-semibold">{ind.projectName || <span className="text-rose-500 italic">[Kosong]</span>}</td>
                          <td className="p-2 font-bold">{ind.title || <span className="text-rose-500 italic">[Kosong]</span>}</td>
                          <td className="p-2 text-right font-mono font-bold">{ind.target}</td>
                          <td className="p-2 text-slate-500">{ind.unit}</td>
                          <td className="p-2 text-right font-mono text-slate-500">{ind.current}</td>
                          <td className="p-2 font-semibold">
                            {ind.isValid ? (
                              <span className="text-emerald-600">OK</span>
                            ) : (
                              <span className="text-rose-600 flex flex-col gap-0.5" title={ind.errors.join(', ')}>
                                ❌ {ind.errors[0]}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Actions inside footer */}
        <div className="p-4 bg-slate-50/70 border-t border-slate-100 flex justify-between gap-2">
          {stagedFile && (
            <div className="text-[10px] text-slate-450 font-bold flex items-center gap-1">
              <span>* Hanya baris bertuliskan <strong className="text-emerald-600">OK</strong> yang akan dimasukkan ke database MONEV.</span>
            </div>
          )}
          <div className="flex gap-2 ml-auto">
            <button
              onClick={onClose}
              className="bg-white border border-slate-205 text-slate-500 py-1.5 px-4 rounded-xl font-bold transition-all hover:bg-slate-100 cursor-pointer"
            >
              Batal
            </button>
            <button
              onClick={handleExecuteImport}
              disabled={parsedProjects.filter(p => p.isValid).length === 0}
              className="disabled:opacity-50 disabled:cursor-not-allowed bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-1.5 px-5 rounded-xl transition-all cursor-pointer inline-flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" /> Mulai Import ({parsedProjects.filter(p => p.isValid).length} Proyek)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


// ==========================================
// 4. ADD / EDIT BENEFICIARY MODAL
// ==========================================
interface BeneficiaryModalProps {
  isOpen: boolean;
  beneficiary?: Beneficiary;
  projectsList: { id: string; name: string }[];
  onClose: () => void;
  onSave: (benData: Partial<Beneficiary>) => void;
  defaultProjectId?: string;
}

export const BeneficiaryModal: React.FC<BeneficiaryModalProps> = ({
  isOpen,
  beneficiary,
  projectsList,
  onClose,
  onSave,
  defaultProjectId,
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState<'Laki-laki' | 'Perempuan'>('Laki-laki');
  const [birthyear, setBirthyear] = useState<number | undefined>(undefined);
  const [location, setLocation] = useState('');
  const [occupation, setOccupation] = useState('');
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');

  // Optional project/activity registration on creation
  const [regProjectId, setRegProjectId] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (beneficiary) {
        setName(beneficiary.name || '');
        setPhone(beneficiary.phone || '');
        setGender(beneficiary.gender || 'Laki-laki');
        setBirthyear(beneficiary.birthyear);
        setLocation(beneficiary.location || '');
        setOccupation(beneficiary.occupation || '');
        setEmail(beneficiary.email || '');
        setNote(beneficiary.note || '');
        setRegProjectId('');
      } else {
        setName('');
        setPhone('');
        setGender('Laki-laki');
        setBirthyear(1985);
        setLocation('');
        setOccupation('');
        setEmail('');
        setNote('');
        setRegProjectId(defaultProjectId || '');
      }
    }
  }, [isOpen, beneficiary, defaultProjectId]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (!name.trim()) {
      alert('Nama Penerima Manfaat harus diisi!');
      return;
    }

    const data: Partial<Beneficiary> = {
      name,
      phone: phone || undefined,
      gender,
      birthyear: birthyear ? Number(birthyear) : undefined,
      location: location || undefined,
      occupation: occupation || undefined,
      email: email || undefined,
      note: note || undefined,
      registrations: beneficiary?.registrations || [],
    };

    // If new registration project is chosen
    if (regProjectId && !beneficiary) {
      data.registrations = [
        {
          projectId: regProjectId,
          attendedDate: new Date().toISOString().split('T')[0],
          note: 'Daftar manual via form',
        },
      ];
    }

    onSave(data);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-100 max-w-lg w-full shadow-xl font-medium text-slate-700 text-xs">
        <div className="p-4 border-b border-slate-50 flex items-center justify-between">
          <span className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">
            {beneficiary ? '✏️ Edit Data Penerima Manfaat' : '👤 Tambah Penerima Manfaat Baru'}
          </span>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg cursor-pointer">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1">
              <label className="text-slate-500 font-bold">Nama Lengkap *</label>
              <input
                type="text"
                className="w-full bg-slate-50/50 border border-slate-200 py-1.5 px-3 rounded-lg focus:outline-none focus:border-blue-400 font-bold"
                placeholder="Halimah binti Yusuf"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-500 font-bold">Nomor WhatsApp/Kontak</label>
              <input
                type="text"
                className="w-full bg-slate-50/50 border border-slate-200 py-1.5 px-3 rounded-lg focus:outline-none focus:border-blue-400 font-mono"
                placeholder="08xxxxxxxxxx"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-500 font-bold">Jenis Kelamin</label>
              <select
                className="w-full bg-slate-50/50 border border-slate-200 py-1.5 px-3 rounded-lg focus:outline-none focus:border-blue-400 cursor-pointer"
                value={gender}
                onChange={(e) => setGender(e.target.value as any)}
              >
                <option value="Laki-laki">Laki-laki</option>
                <option value="Perempuan">Perempuan</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-slate-500 font-bold">Tahun Kelahiran</label>
              <input
                type="number"
                className="w-full bg-slate-50/50 border border-slate-200 py-1.5 px-3 rounded-lg focus:outline-none focus:border-blue-400 font-mono"
                placeholder="Contoh: 1982"
                value={birthyear || ''}
                onChange={(e) => setBirthyear(e.target.value ? Number(e.target.value) : undefined)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-500 font-bold">Pekerjaan Utama</label>
              <input
                type="text"
                className="w-full bg-slate-50/50 border border-slate-200 py-1.5 px-3 rounded-lg focus:outline-none focus:border-blue-400"
                placeholder="Nelayan / Ibu Rumah Tangga"
                value={occupation}
                onChange={(e) => setOccupation(e.target.value)}
              />
            </div>

            <div className="col-span-2 space-y-1">
              <label className="text-slate-500 font-bold">Alamat Asal / Desa / Kecamatan</label>
              <input
                type="text"
                className="w-full bg-slate-50/50 border border-slate-200 py-1.5 px-3 rounded-lg focus:outline-none focus:border-blue-400"
                placeholder="Kelurahan Wamar, Kepulauan Aru"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>

            <div className="col-span-2 space-y-1">
              <label className="text-slate-500 font-bold">Alamat Email</label>
              <input
                type="email"
                className="w-full bg-slate-50/50 border border-slate-200 py-1.5 px-3 rounded-lg focus:outline-none focus:border-blue-400 font-mono"
                placeholder="halimah@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="col-span-2 space-y-1">
              <label className="text-slate-500 font-bold">Catatan Keterangan</label>
              <textarea
                className="w-full bg-slate-50/50 border border-slate-200 py-1.5 px-3 rounded-lg focus:outline-none focus:border-blue-400"
                rows={2}
                placeholder="Anggota aktif koperasi nelayan setempat..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>

            {/* Optional associate project creation on new */}
            {!beneficiary && (
              <div className="col-span-2 p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                  Daftarkan ke Proyek/Program Nelayan Binaaan
                </span>
                <select
                  className="w-full bg-white border border-slate-200 py-1.5 px-3 rounded-lg focus:outline-none focus:border-blue-400 cursor-pointer"
                  value={regProjectId}
                  onChange={(e) => setRegProjectId(e.target.value)}
                >
                  <option value="">-- Pilihlah Proyek Terkait (Kemitraan) --</option>
                  {projectsList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 bg-slate-50/70 border-t border-slate-100 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="bg-white border border-slate-200 text-slate-500 py-1.5 px-4 rounded-xl font-bold transition-all hover:bg-slate-100 cursor-pointer"
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-1.5 px-5 rounded-xl transition-all cursor-pointer"
          >
            Simpan Data
          </button>
        </div>
      </div>
    </div>
  );
};


// ==========================================
// 5. BENEFICIARY DETAILS TIMELINE MODAL
// ==========================================
interface BenDetailModalProps {
  isOpen: boolean;
  beneficiary?: Beneficiary;
  projects: Project[];
  activities: Activity[];
  onClose: () => void;
}

export const BenDetailModal: React.FC<BenDetailModalProps> = ({
  isOpen,
  beneficiary,
  projects,
  activities,
  onClose,
}) => {
  if (!isOpen || !beneficiary) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl border border-slate-100 max-w-lg w-full shadow-xl font-medium text-slate-700 text-xs">
        <div className="p-4 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="font-extrabold text-slate-800 text-sm">{beneficiary.name}</h3>
            <span className="text-[10px] text-slate-400">Pekerjaan Utama: {beneficiary.occupation || '—'}</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 border border-slate-200 rounded-lg cursor-pointer">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Metadata Card */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-150 grid grid-cols-2 gap-3 text-[11px] leading-relaxed">
            <div>
              <span className="text-slate-400 font-bold block">Jenis Kelamin</span>
              <span className="font-extrabold text-slate-800">{beneficiary.gender}</span>
            </div>
            <div>
              <span className="text-slate-400 font-bold block">Tahun Kelahiran / Usia</span>
              <span className="font-extrabold text-slate-800">
                {beneficiary.birthyear 
                  ? `${beneficiary.birthyear} (${new Date().getFullYear() - beneficiary.birthyear} tahun)` 
                  : '—'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 font-bold block">Nomor WhatsApp</span>
              <span className="font-extrabold text-slate-800 font-mono">{beneficiary.phone || '—'}</span>
            </div>
            <div>
              <span className="text-slate-400 font-bold block">Alamat / Asal Wilayah</span>
              <span className="font-extrabold text-slate-800">{beneficiary.location || '—'}</span>
            </div>
            <div className="col-span-2">
              <span className="text-slate-400 font-bold block">E-mail</span>
              <span className="font-extrabold text-slate-800 font-mono">{beneficiary.email || '—'}</span>
            </div>
            {beneficiary.note && (
              <div className="col-span-2 pt-1 border-t border-slate-200">
                <span className="text-slate-400 font-bold block">Catatan Internal Staff</span>
                <p className="text-slate-600 font-semibold italic">"{beneficiary.note}"</p>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <span className="text-[10px] font-extrabold text-slate-800 uppercase tracking-widest block">
              📋 Riwayat Kehadiran dan Partisipasi Program ({beneficiary.registrations.length})
            </span>

            <div className="space-y-2">
              {beneficiary.registrations.length === 0 ? (
                <p className="text-slate-400 italic text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  Belum terdaftar di aktivitas program atau kemitraan mana pun.
                </p>
              ) : (
                beneficiary.registrations.map((reg, idx) => {
                  const associatedProj = projects.find((p) => p.id === reg.projectId || SupabaseSync.getOriginalId(reg.projectId) === p.id || SupabaseSync.getUuid(reg.projectId) === SupabaseSync.getUuid(p.id));
                  
                  // Resolve activity title
                  let actTitle = reg.activityName || 'Aktivitas Umum';
                  if (reg.activityId) {
                    const actObj = activities.find((a) => a.id === reg.activityId);
                    if (actObj) actTitle = actObj.title;
                  }

                  const badgeStyle = reg.isFreeLog || !reg.activityId
                    ? 'bg-amber-50 text-amber-700 border-amber-200 text-[9px]'
                    : 'bg-blue-50 text-blue-700 border-blue-200 text-[9px]';

                  return (
                    <div
                      key={idx}
                      className="p-3 bg-white hover:bg-slate-50/50 rounded-xl border border-slate-150 flex items-start justify-between gap-4 transition-all"
                    >
                      <div className="space-y-1 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-extrabold text-slate-800 text-[11px] leading-snug">
                            📁 {associatedProj ? associatedProj.name : 'Program Umum DFW Indonesia'}
                          </span>
                          <span className={`py-0.2 px-1.5 rounded-md border font-extrabold inline-block ${badgeStyle}`}>
                            {reg.isFreeLog || !reg.activityId ? 'Log Bebas' : 'Sistem'}
                          </span>
                        </div>
                        <p className="text-slate-600 font-bold text-[11px]">
                          📍 Kehadiran: <strong className="text-blue-700">{actTitle}</strong>
                          {reg.subActivityName && (
                            <span className="text-slate-500 font-medium"> (Sub-Kegiatan: <strong className="text-emerald-700">{reg.subActivityName}</strong>)</span>
                          )}
                        </p>
                        {reg.note && (
                          <p className="text-[10px] text-slate-550 pl-2.5 border-l border-slate-200 font-medium whitespace-pre-line py-0.5 mt-1 text-slate-500">
                            Keterangan: "{reg.note}"
                          </p>
                        )}
                      </div>
                      <span className="text-[9.5px] text-slate-500 font-bold font-mono shrink-0 whitespace-nowrap bg-slate-100 border border-slate-200 py-0.5 px-2 rounded-lg">
                        📅 {reg.attendedDate || '—'}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="bg-slate-800 text-white font-extrabold py-1.5 px-5 rounded-lg hover:bg-slate-900 cursor-pointer text-xs transition-colors"
          >
            Tutup Jendela Detail
          </button>
        </div>
      </div>
    </div>
  );
};


// ==========================================
// 6. STAFF WORKLOADS SUMMARY MODAL
// ==========================================
interface StaffTasksModalProps {
  isOpen: boolean;
  staffName: string;
  activities: Activity[];
  projects: Project[];
  onClose: () => void;
}

export const StaffTasksModal: React.FC<StaffTasksModalProps> = ({
  isOpen,
  staffName,
  activities,
  projects,
  onClose,
}) => {
  if (!isOpen) return null;

  const staffActivities = activities.filter((a) => a.pic === staffName);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl border border-slate-100 max-w-xl w-full shadow-xl font-medium text-slate-700 text-xs">
        <div className="p-4 border-b border-slate-50 flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-slate-800 text-sm">📋 Daftar Tugas Penugasan Lapangan</h3>
            <span className="text-[10px] text-slate-400">Personel: <strong className="text-slate-600">{staffName}</strong></span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg cursor-pointer">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        <div className="p-5 max-h-[60vh] overflow-y-auto space-y-3">
          {staffActivities.length === 0 ? (
            <div className="text-center py-10 text-slate-400 bg-slate-50 rounded-xl p-4">
              <p className="italic">Belum ada tanggung jawab aktivitas program assigned ke staf ini saat ini.</p>
            </div>
          ) : (
            staffActivities.map((act) => {
              const proj = projects.find((p) => p.id === act.projectId);
              let statusStyle = 'bg-slate-100 text-slate-600 border-slate-200';
              if (act.status === 'Selesai') {
                statusStyle = 'bg-emerald-50 text-emerald-800 border-emerald-100';
              } else if (act.status === 'Sedang Berjalan') {
                statusStyle = 'bg-sky-50 text-sky-800 border-sky-100';
              } else if (act.status === 'Tertunda') {
                statusStyle = 'bg-rose-50 text-rose-800 border-rose-100';
              }

              return (
                <div key={act.id} className="p-4 bg-slate-50/60 border border-slate-150 rounded-xl space-y-2 text-xs">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-0.5">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                        🏛️ Proyek: {proj ? proj.name : 'Proyek Umum DFW'}
                      </span>
                      <h4 className="font-bold text-slate-800 text-xs leading-normal">{act.title}</h4>
                    </div>
                    <span className={`py-0.5 px-2 rounded-full border text-[9px] uppercase tracking-wider font-extrabold shrink-0 ${statusStyle}`}>
                      {act.status}
                    </span>
                  </div>

                  {act.desc && (
                    <div className="text-slate-500 font-medium text-[11px] leading-relaxed italic bg-slate-100/40 p-2 rounded-lg">
                      <FormattedText text={act.desc} className="text-slate-500 font-medium italic text-[11px]" italic />
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 font-semibold">
                    <span>Due: {act.dueDate || '—'}</span>
                    <span className="text-slate-600 font-bold">Pencapaian: {act.progress}% Dan Terpantau</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="bg-white border border-slate-200 text-slate-500 py-1.5 px-4 rounded-xl font-bold hover:bg-slate-100 cursor-pointer text-xs"
          >
            Tutup Windows
          </button>
        </div>
      </div>
    </div>
  );
};


// ==========================================
// 7. SUB-ACTIVITIES MANAGER MODAL
// ==========================================
interface SubActivitiesModalProps {
  isOpen: boolean;
  parentActivityId: string;
  subActivities: SubActivity[];
  staffList: string[];
  onClose: () => void;
  onSaveSubActivity: (subAct: Partial<SubActivity>) => void;
  onDeleteSubActivity: (subId: string) => void;
}

export const SubActivitiesModal: React.FC<SubActivitiesModalProps> = ({
  isOpen,
  parentActivityId,
  subActivities,
  staffList,
  onClose,
  onSaveSubActivity,
  onDeleteSubActivity,
}) => {
  const [subTitle, setSubTitle] = useState('');
  const [subDesc, setSubDesc] = useState('');
  const [subPic, setSubPic] = useState('');
  const [subStatus, setSubStatus] = useState<'Belum Mulai' | 'Sedang Dikerjakan' | 'Tertunda' | 'Selesai'>('Belum Mulai');
  const [subPriority, setSubPriority] = useState<'Low' | 'Normal' | 'High'>('Normal');
  const [subDue, setSubDue] = useState('');

  if (!isOpen) return null;

  const relevantSubs = subActivities.filter((item) => item.parentActivityId === parentActivityId);

  const handleCreate = () => {
    if (!subTitle.trim()) {
      alert('Judul Sub-Aktivitas harus diisi!');
      return;
    }

    onSaveSubActivity({
      parentActivityId,
      title: subTitle,
      desc: subDesc || undefined,
      pic: subPic || undefined,
      status: subStatus,
      priority: subPriority,
      due: subDue || undefined,
    });

    // Reset inputs
    setSubTitle('');
    setSubDesc('');
    setSubPic('');
    setSubStatus('Belum Mulai');
    setSubPriority('Normal');
    setSubDue('');
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-100 max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-xl font-medium text-slate-700 text-xs">
        <div className="p-4 border-b border-slate-50 flex items-center justify-between">
          <span className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">
            🛠️ Pengawasan Detail Sub-Aktivitas (Breakdown)
          </span>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg cursor-pointer">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* List existing */}
          <div className="space-y-3">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
              Daftar Terdaftar ({relevantSubs.length})
            </span>

            <div className="space-y-2.5 max-h-[220px] overflow-y-auto p-0.5">
              {relevantSubs.length === 0 ? (
                <p className="text-center italic text-slate-400 text-xs bg-slate-50/50 py-6 rounded-xl border border-slate-100">
                  Belum ada penugasan sub-aktivitas.
                </p>
              ) : (
                relevantSubs.map((item) => {
                  let priorityColor = 'bg-slate-50 text-slate-500 border-slate-150';
                  if (item.priority === 'High') {
                    priorityColor = 'bg-rose-50 text-rose-700 border-rose-150';
                  } else if (item.priority === 'Normal') {
                    priorityColor = 'bg-emerald-50 text-emerald-700 border-emerald-150';
                  } else if (item.priority === 'Low') {
                    priorityColor = 'bg-amber-100 text-amber-700 border-amber-150';
                  }

                  let statusText = item.status;
                  let statusBg = 'bg-slate-50 text-slate-500 border-slate-150';
                  if (item.status === 'Belum Mulai') {
                    statusBg = 'bg-rose-50 text-rose-700 border-rose-150';
                  } else if (item.status === 'Sedang Dikerjakan' || item.status === 'Sedang Berjalan') {
                    statusBg = 'bg-amber-50 text-amber-700 border-amber-200';
                  } else if (item.status === 'Selesai') {
                    statusBg = 'bg-emerald-50 text-emerald-800 border-emerald-100';
                  } else if (item.status === 'Tertunda') {
                    statusBg = 'bg-slate-100 text-slate-600 border-slate-200';
                  }

                  return (
                    <div
                      key={item.id}
                      className="p-3 bg-slate-50/60 rounded-xl border border-slate-100 flex items-start justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <h5 className="font-bold text-slate-800 text-[11px] leading-snug">{item.title}</h5>
                        {item.desc && (
                          <div className="text-slate-500 text-[11px] leading-normal">
                            <FormattedText text={item.desc} className="text-slate-500 text-[11px]" />
                          </div>
                        )}
                        <div className="flex flex-wrap items-center gap-2 pt-0.5 text-[10px] text-slate-400 font-semibold">
                          <span>PIC: <strong className="text-slate-600">{item.pic || 'Belum Diatur'}</strong></span>
                          <span>•</span>
                          <span>Priority: <span className={`py-0.2 px-1.5 rounded-md border inline ${priorityColor}`}>{item.priority}</span></span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className={`py-0.2 px-2.5 rounded-full border text-[9px] font-bold ${statusBg}`}>
                          {statusText}
                        </span>
                        <button
                          onClick={() => onDeleteSubActivity(item.id)}
                          className="text-slate-300 hover:text-rose-600 p-1 mt-1 transition-colors"
                          title="Hapus Sub-Aktivitas"
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

          {/* Create form */}
          <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200/50 space-y-4">
            <span className="text-[10px] font-extrabold text-slate-800 uppercase tracking-widest block">
              ＋ Tambahkan Sub-Aktivitas Baru
            </span>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <label className="text-slate-500 font-bold">Judul Sub-Aktivitas *</label>
                <input
                  type="text"
                  placeholder="Koleksi foto berkas kapal di syahbandar"
                  className="w-full bg-white border border-slate-200 py-1.5 px-3 rounded-lg focus:outline-none focus:border-blue-450"
                  value={subTitle}
                  onChange={(e) => setSubTitle(e.target.value)}
                />
              </div>

              <div className="col-span-2 space-y-1">
                <label className="text-slate-500 font-bold">Deskripsi Ringkas</label>
                <textarea
                  placeholder="Instruksi pengerjaan..."
                  rows={2}
                  className="w-full bg-white border border-slate-200 py-1 px-3 rounded-lg focus:outline-none focus:border-blue-450 text-xs"
                  value={subDesc}
                  onChange={(e) => setSubDesc(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-500 font-bold">Pilih PIC Lapangan</label>
                <select
                  className="w-full bg-white border border-slate-200 py-1.5 px-3 rounded-lg focus:outline-none cursor-pointer"
                  value={subPic}
                  onChange={(e) => setSubPic(e.target.value)}
                >
                  <option value="">-- Pilih PIC --</option>
                  {staffList.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                  {subPic && !staffList.includes(subPic) && (
                    <option value={subPic}>
                      {subPic}
                    </option>
                  )}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-500 font-bold">Kategori Prioritas</label>
                <select
                  className="w-full bg-white border border-slate-200 py-1.5 px-3 rounded-lg focus:outline-none cursor-pointer"
                  value={subPriority}
                  onChange={(e) => setSubPriority(e.target.value as any)}
                >
                  <option value="Low">Low</option>
                  <option value="Normal">Normal</option>
                  <option value="High">High</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-500 font-bold">Status Kerja</label>
                <select
                  className="w-full bg-white border border-slate-200 py-1.5 px-3 rounded-lg focus:outline-none cursor-pointer"
                  value={subStatus}
                  onChange={(e) => setSubStatus(e.target.value as any)}
                >
                  <option value="Belum Mulai">Belum Mulai</option>
                  <option value="Sedang Dikerjakan">Sedang Dikerjakan</option>
                  <option value="Tertunda">Tertunda</option>
                  <option value="Selesai">Selesai</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-500 font-bold">Jatuh Tempo</label>
                <input
                  type="date"
                  className="w-full bg-white border border-slate-200 py-1 px-3 rounded-lg font-mono"
                  value={subDue}
                  onChange={(e) => setSubDue(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleCreate}
                className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-[10px] py-1.5 px-4 rounded-lg shadow-xs cursor-pointer inline-flex items-center gap-1 transition-all"
              >
                <Plus className="w-3.5 h-3.5" /> Tambah Sub-Aktivitas
              </button>
            </div>
          </div>
        </div>

        <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="bg-slate-800 text-white font-extrabold py-1.5 px-5 rounded-lg hover:bg-slate-900 cursor-pointer text-xs"
          >
            Selesai Pengaturan
          </button>
        </div>
      </div>
    </div>
  );
};

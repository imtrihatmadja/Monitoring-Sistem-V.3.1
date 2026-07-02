import React, { useState, useEffect } from 'react';
import { Project, ProjectStatus, Indicator, Outcome } from '../types';
import { ArrowLeft, ArrowRight, Save, Trash2, HelpCircle } from 'lucide-react';

interface ProjectFormProps {
  initialProject?: Project;
  initialIndicators?: Indicator[];
  initialOutcomes?: Outcome[];
  staffList: string[];
  onSubmit: (projectData: Partial<Project>, indicators: Partial<Indicator>[], outcomes: Partial<Outcome>[]) => void;
  onCancel: () => void;
}

export const ProjectForm: React.FC<ProjectFormProps> = ({
  initialProject,
  initialIndicators,
  initialOutcomes,
  staffList,
  onSubmit,
  onCancel,
}) => {
  const [step, setStep] = useState<1 | 2>(1);

  // Step 1 states: Project Info
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [owner, setOwner] = useState('');
  const [donor, setDonor] = useState('');
  const [status, setStatus] = useState<ProjectStatus>('Aktif');
  const [startDate, setStartDate] = useState('');
  const [deadline, setDeadline] = useState('');
  const [budgetApproved, setBudgetApproved] = useState(0);
  const [budgetActual, setBudgetActual] = useState(0);
  const [desc, setDesc] = useState('');
  const [note, setNote] = useState('');
  const [goal, setGoal] = useState('');

  // Step 1 outcomes list
  const [outcomes, setOutcomes] = useState<{ id: string; title: string }[]>([]);

  // Step 2 states: Indicators
  const [indicators, setIndicators] = useState<{ id: string; title: string; target: number; current: number; unit: string }[]>([]);

  // Messages error helper
  const [errorMsg, setErrorMsg] = useState('');

  // Initialize form options if editing
  useEffect(() => {
    if (initialProject) {
      setName(initialProject.name || '');
      setLocation(initialProject.location || '');
      setOwner(initialProject.owner || '');
      setDonor(initialProject.donor || '');
      setStatus(initialProject.status || 'Aktif');
      setStartDate(initialProject.startDate || '');
      setDeadline(initialProject.deadline || '');
      setBudgetApproved(initialProject.budgetApproved || 0);
      setBudgetActual(initialProject.budgetActual || 0);
      setDesc(initialProject.desc || '');
      setNote(initialProject.note || '');
      setGoal(initialProject.goal || '');
    } else {
      // Defaults
      setName('');
      setLocation('');
      setOwner('');
      setDonor('');
      setStatus('Aktif');
      setStartDate('');
      setDeadline('');
      setBudgetApproved(0);
      setBudgetActual(0);
      setDesc('');
      setNote('');
      setGoal('');
    }

    if (initialOutcomes && initialOutcomes.length > 0) {
      setOutcomes(initialOutcomes.map((o) => ({ id: o.id, title: o.title })));
    } else {
      setOutcomes([{ id: `temp-${Date.now()}-1`, title: '' }]);
    }

    if (initialIndicators && initialIndicators.length > 0) {
      setIndicators(
        initialIndicators.map((i) => ({
          id: i.id,
          title: i.title,
          target: i.target,
          current: i.current,
          unit: i.unit,
        }))
      );
    } else {
      setIndicators([
        { id: `t-ind-${Date.now()}-1`, title: 'Jumlah kelompok usaha baru yang didampingi', target: 5, current: 0, unit: 'Kelompok' },
        { id: `t-ind-${Date.now()}-2`, title: 'Jumlah nelayan kecil peserta modul tangkap ramah lingkungan', target: 100, current: 0, unit: 'Nelayan' },
      ]);
    }
  }, [initialProject, initialIndicators, initialOutcomes]);

  const handleAddOutcome = () => {
    setOutcomes([...outcomes, { id: `out-${Date.now()}`, title: '' }]);
  };

  const handleRemoveOutcome = (id: string) => {
    setOutcomes(outcomes.filter((o) => o.id !== id));
  };

  const handleOutcomeChange = (id: string, value: string) => {
    setOutcomes(outcomes.map((o) => (o.id === id ? { ...o, title: value } : o)));
  };

  const handleAddIndicator = () => {
    setIndicators([
      ...indicators,
      { id: `ind-${Date.now()}`, title: '', target: 0, current: 0, unit: 'Orang' },
    ]);
  };

  const handleRemoveIndicator = (id: string) => {
    setIndicators(indicators.filter((ind) => ind.id !== id));
  };

  const handleIndicatorChange = (id: string, field: 'title' | 'target' | 'current' | 'unit', value: any) => {
    setIndicators(indicators.map((ind) => (ind.id === id ? { ...ind, [field]: value } : ind)));
  };

  // Step 1 Validation before changing tabs
  const handleNextStep = () => {
    if (!name.trim()) {
      setErrorMsg('Nama Proyek wajib diisi.');
      return;
    }
    if (!location.trim()) {
      setErrorMsg('Lokasi Proyek wajib diisi.');
      return;
    }
    if (!owner) {
      setErrorMsg('Penanggung Jawab PIC wajib dipilih/diisi.');
      return;
    }
    setErrorMsg('');
    setStep(2);
  };

  const handleSaveAll = () => {
    // Basic validations
    if (indicators.some((ind) => !ind.title.trim())) {
      setErrorMsg('Semua judul indikator wajib diisi.');
      return;
    }

    // Filter out blank outcomes
    const filteredOutcomes = outcomes.filter((o) => o.title.trim() !== '');

    const projectData: Partial<Project> = {
      name,
      location,
      owner,
      donor: donor || undefined,
      status,
      startDate: startDate || undefined,
      deadline: deadline || undefined,
      budgetApproved,
      budgetActual,
      desc: desc || undefined,
      note: note || undefined,
      goal: goal || undefined,
      progress: initialProject?.progress || 0,
    };

    onSubmit(projectData, indicators, filteredOutcomes);
  };

  return (
    <div id="project-wizard-container" className="space-y-6">
      {/* Step Indicators */}
      <div className="flex items-center justify-center max-w-lg mx-auto py-2 select-none">
        <div className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border transition-all ${
              step >= 1
                ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                : 'bg-white border-slate-200 text-slate-400'
            }`}
          >
            1
          </div>
          <span className={`text-xs font-bold ${step === 1 ? 'text-blue-600' : 'text-slate-400'}`}>Informasi Proyek</span>
        </div>
        <div className={`flex-1 h-[2px] mx-4 ${step === 2 ? 'bg-blue-600' : 'bg-slate-200'}`} />
        <div className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border transition-all ${
              step === 2
                ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                : 'bg-white border-slate-200 text-slate-400'
            }`}
          >
            2
          </div>
          <span className={`text-xs font-bold ${step === 2 ? 'text-blue-600' : 'text-slate-400'}`}>Indikator &amp; Capaian</span>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-rose-50 border border-rose-100 text-rose-700 text-xs font-semibold py-2.5 px-4 rounded-xl">
          ⚠️ {errorMsg}
        </div>
      )}

      {/* STEP 1: General Project Information */}
      {step === 1 && (
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs space-y-6">
          <div className="border-b border-slate-50 pb-3">
            <h3 className="font-extrabold text-slate-800 text-sm tracking-wide uppercase">📋 Formulir Pengisian Informasi Proyek</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs text-slate-700 font-semibold">
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-slate-500">Nama Proyek <span className="text-red-500">*</span></label>
              <input
                type="text"
                className="w-full bg-slate-50/50 border border-slate-200 py-2 px-3 rounded-lg focus:outline-none focus:border-blue-400 focus:bg-white text-xs text-slate-800 font-medium"
                placeholder="Fisheries Improvement Project (FIP) - WPP 718"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-500">Lokasi <span className="text-red-500">*</span></label>
              <input
                type="text"
                className="w-full bg-slate-50/50 border border-slate-200 py-2 px-3 rounded-lg focus:outline-none focus:border-blue-400 focus:bg-white text-xs text-slate-800 font-medium"
                placeholder="Merauke, Dobo, Tual (WPP 718)"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-500">Penanggung Jawab PIC <span className="text-red-500">*</span></label>
              <select
                className="w-full bg-slate-50/50 border border-slate-200 py-2 px-3 rounded-lg focus:outline-none focus:border-blue-400 focus:bg-white text-xs text-slate-800 font-medium cursor-pointer"
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
              >
                <option value="">-- Pilih PIC --</option>
                {staffList.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
                {owner && !staffList.includes(owner) && (
                  <option value={owner}>
                    {owner}
                  </option>
                )}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-500">Donor / Mitra Kerjasama</label>
              <input
                type="text"
                className="w-full bg-slate-50/50 border border-slate-200 py-2 px-3 rounded-lg focus:outline-none focus:border-blue-400 focus:bg-white text-xs text-slate-800 font-medium"
                placeholder="USAID / ILO / Yayasan Kehati"
                value={donor}
                onChange={(e) => setDonor(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-500">Status Awal</label>
              <select
                className="w-full bg-slate-50/50 border border-slate-200 py-2 px-3 rounded-lg focus:outline-none focus:border-blue-400 focus:bg-white text-xs text-slate-800 font-medium cursor-pointer"
                value={status}
                onChange={(e) => setStatus(e.target.value as ProjectStatus)}
              >
                <option value="Aktif">Aktif</option>
                <option value="On Track">On Track</option>
                <option value="Terlambat">Terlambat</option>
                <option value="Selesai">Selesai</option>
                <option value="Ditangguhkan">Ditangguhkan</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-500">Tanggal Pelaksanaan Mulai</label>
              <input
                type="date"
                className="w-full bg-slate-50/50 border border-slate-200 py-2 px-3 rounded-lg focus:outline-none focus:border-blue-400 focus:bg-white text-xs text-slate-800 font-medium font-mono"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-500">Deadline Akhir</label>
              <input
                type="date"
                className="w-full bg-slate-50/50 border border-slate-200 py-2 px-3 rounded-lg focus:outline-none focus:border-blue-400 focus:bg-white text-xs text-slate-800 font-medium font-mono"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-500">Anggaran Disetujui (Rupiah Rp)</label>
              <input
                type="number"
                className="w-full bg-slate-50/50 border border-slate-200 py-2 px-3 rounded-lg focus:outline-none focus:border-blue-400 focus:bg-white text-xs text-slate-800 font-medium"
                placeholder="750000000"
                value={budgetApproved || ''}
                onChange={(e) => setBudgetApproved(Number(e.target.value))}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-500">Realisasi Sementara (Rupiah Rp)</label>
              <input
                type="number"
                className="w-full bg-slate-50/50 border border-slate-200 py-2 px-3 rounded-lg focus:outline-none focus:border-blue-400 focus:bg-white text-xs text-slate-800 font-medium"
                placeholder="250000000"
                value={budgetActual || ''}
                onChange={(e) => setBudgetActual(Number(e.target.value))}
              />
            </div>

            <div className="md:col-span-2 space-y-1.5">
              <label className="text-slate-500">Tujuan Utama (Goal) Proyek</label>
              <textarea
                className="w-full bg-slate-50/50 border border-slate-200 py-2 px-3 rounded-lg focus:outline-none focus:border-blue-400 focus:bg-white text-xs text-slate-800 font-medium"
                rows={2}
                placeholder="Tulis tujuan kunci proyek..."
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
              />
            </div>

            <div className="md:col-span-2 space-y-1.5">
              <label className="text-slate-500">Deskripsi Proyek</label>
              <textarea
                className="w-full bg-slate-50/50 border border-slate-200 py-2 px-3 rounded-lg focus:outline-none focus:border-blue-400 focus:bg-white text-xs text-slate-800 font-medium"
                rows={3}
                placeholder="Tulis latar belakang atau rincian pelaksanaan..."
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
              />
            </div>

            <div className="md:col-span-2 space-y-1.5">
              <label className="text-slate-500">Catatan/ Kendala Lapangan</label>
              <textarea
                className="w-full bg-slate-50/50 border border-slate-200 py-2 px-3 rounded-lg focus:outline-none focus:border-blue-400 focus:bg-white text-xs text-slate-800 font-medium"
                rows={2}
                placeholder="Tulis catatan atau hambatan yang ditemui..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>

            {/* outcomes list container */}
            <div className="md:col-span-2 space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <label className="text-slate-500">Hasil yang Diharapkan (Project Outcomes list)</label>
                <button
                  type="button"
                  onClick={handleAddOutcome}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 py-1 px-2.5 rounded-lg text-[10px] font-bold cursor-pointer"
                >
                  ＋ Tambah Baris Outcome
                </button>
              </div>

              <div id="outcomes-inputs" className="space-y-2">
                {outcomes.map((o, index) => (
                  <div key={o.id} className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-300 w-4">{index + 1}</span>
                    <input
                      type="text"
                      className="flex-1 bg-slate-50/50 border border-slate-200 py-1.5 px-3 rounded-lg focus:outline-none focus:border-blue-400 focus:bg-white text-xs text-slate-800 font-medium"
                      placeholder="Terwujudnya perlindungan sosial bagi AKP..."
                      value={o.title}
                      onChange={(e) => handleOutcomeChange(o.id, e.target.value)}
                    />
                    {outcomes.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveOutcome(o.id)}
                        className="p-1.5 hover:bg-rose-50 border border-slate-100 rounded-lg text-rose-500 hover:text-rose-700 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-slate-50 pt-5 pt-3">
            <button
              type="button"
              onClick={onCancel}
              className="bg-slate-50 text-slate-500 border border-slate-200 py-2 px-4 rounded-xl text-xs font-bold transition-all hover:bg-slate-100 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleNextStep}
              className="bg-blue-600 hover:bg-blue-700 font-bold text-xs py-2 px-4 rounded-xl text-white shadow-xs transition-all flex items-center gap-1 cursor-pointer"
            >
              Lanjut → Pilih Indikator <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: KPI & Indicators Setup */}
      {step === 2 && (
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs space-y-6 animate-fade-in">
          <div className="border-b border-slate-50 pb-3 flex justify-between items-center">
            <h3 className="font-extrabold text-slate-800 text-sm tracking-wide uppercase">📊 Indikator Kinerja &amp; Target Capaian</h3>
            <button
              type="button"
              onClick={handleAddIndicator}
              className="bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold py-1 px-3 rounded-lg text-[10px] cursor-pointer"
            >
              ＋ Tambah Indikator Baru
            </button>
          </div>

          <div id="indicators-list-container" className="space-y-4">
            {indicators.map((ind, index) => (
              <div
                key={ind.id}
                className="bg-slate-50/50 p-4 rounded-xl border border-slate-200/50 text-xs text-slate-700 font-semibold space-y-3"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-1">
                    <label className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                      Uraian Indikator Kinerja #{index + 1}
                    </label>
                    <input
                      type="text"
                      className="w-full bg-white border border-slate-200 py-1.5 px-3 rounded-lg focus:outline-none focus:border-blue-400 text-xs text-slate-800 font-bold"
                      placeholder="Contoh: Jumlah kapal nelayan tangkap kakap merah mandiri ber-logbook"
                      value={ind.title}
                      onChange={(e) => handleIndicatorChange(ind.id, 'title', e.target.value)}
                    />
                  </div>
                  {indicators.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveIndicator(ind.id)}
                      className="p-2 hover:bg-rose-50 border border-slate-200 rounded-lg text-rose-500 hover:text-rose-700 cursor-pointer mt-5"
                      title="Hapus Indikator"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-slate-400 text-[10px] uppercase font-bold">Target</label>
                    <input
                      type="number"
                      className="w-full bg-white border border-slate-200 py-1.5 px-3 rounded-lg focus:outline-none focus:border-blue-400 text-xs font-bold text-slate-700"
                      value={ind.target}
                      onChange={(e) => handleIndicatorChange(ind.id, 'target', Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-400 text-[10px] uppercase font-bold">Capaian Saat Ini</label>
                    <input
                      type="number"
                      className="w-full bg-white border border-slate-200 py-1.5 px-3 rounded-lg focus:outline-none focus:border-blue-400 text-xs font-bold text-emerald-600"
                      value={ind.current}
                      onChange={(e) => handleIndicatorChange(ind.id, 'current', Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-400 text-[10px] uppercase font-bold">Satuan / Unit</label>
                    <input
                      type="text"
                      className="w-full bg-white border border-slate-200 py-1.5 px-3 rounded-lg focus:outline-none focus:border-blue-400 text-xs font-medium text-slate-800"
                      placeholder="Desa / Kapal / Orang"
                      value={ind.unit}
                      onChange={(e) => handleIndicatorChange(ind.id, 'unit', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between border-t border-slate-50 pt-5 pt-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="bg-slate-50 text-slate-500 border border-slate-200 py-2 px-4 rounded-xl text-xs font-bold transition-all hover:bg-slate-100 cursor-pointer flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Kembali ke Info Proyek
            </button>
            <button
              type="button"
              onClick={handleSaveAll}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs py-2 px-5 rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-4 h-4" /> Simpan &amp; Verifikasi Data
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

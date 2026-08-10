import React, { useState, useEffect } from 'react';
import { Project, ProjectStatus, Indicator, Outcome, Staff, ProjectMember, UserRoleType } from '../types';
import { USER_ROLES } from '../lib/rbac';
import { ArrowLeft, ArrowRight, Save, Trash2, HelpCircle, Users, UserPlus, ShieldCheck } from 'lucide-react';

interface ProjectFormProps {
  initialProject?: Project;
  initialIndicators?: Indicator[];
  initialOutcomes?: Outcome[];
  staffList: string[];
  staffObjects?: Staff[];
  onSubmit: (projectData: Partial<Project>, indicators: Partial<Indicator>[], outcomes: Partial<Outcome>[]) => void;
  onCancel: () => void;
}

export const ProjectForm: React.FC<ProjectFormProps> = ({
  initialProject,
  initialIndicators,
  initialOutcomes,
  staffList,
  staffObjects = [],
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

  // Step 1: Multi-User Project Members & Roles
  const [assignedMembers, setAssignedMembers] = useState<ProjectMember[]>([]);
  const [selectedStaffToAdd, setSelectedStaffToAdd] = useState<string>('');
  const [selectedRoleToAdd, setSelectedRoleToAdd] = useState<UserRoleType>('field_officer');

  // Step 1 outcomes list
  const [outcomes, setOutcomes] = useState<{ id: string; title: string }[]>([]);

  // Step 2 states: Indicators
  const [indicators, setIndicators] = useState<Partial<Indicator>[]>([]);

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
      setAssignedMembers(initialProject.assignedMembers || []);
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
      setAssignedMembers([]);
    }

    if (initialOutcomes && initialOutcomes.length > 0) {
      setOutcomes(initialOutcomes.map((o) => ({ id: o.id, title: o.title })));
    } else {
      setOutcomes([{ id: `temp-${Date.now()}-1`, title: '' }]);
    }

    if (initialIndicators && initialIndicators.length > 0) {
      setIndicators(
        initialIndicators.map((i) => ({ ...i }))
      );
    } else {
      setIndicators([
        { id: `t-ind-${Date.now()}-1`, title: 'Jumlah kelompok usaha baru yang didampingi', target: 5, current: 0, unit: 'Kelompok' },
        { id: `t-ind-${Date.now()}-2`, title: 'Jumlah nelayan kecil peserta modul tangkap ramah lingkungan', target: 100, current: 0, unit: 'Nelayan' },
      ]);
    }
  }, [initialProject, initialIndicators, initialOutcomes]);

  const handleAddTeamMember = () => {
    if (!selectedStaffToAdd) return;
    const stObj = staffObjects.find((s) => s.id === selectedStaffToAdd) || {
      id: selectedStaffToAdd,
      name: selectedStaffToAdd,
    };

    // Check if already assigned
    if (assignedMembers.some((m) => m.staffId === stObj.id)) {
      alert('Personel ini sudah ditambahkan ke tim proyek!');
      return;
    }

    setAssignedMembers([
      ...assignedMembers,
      {
        staffId: stObj.id,
        staffName: stObj.name,
        projectRole: selectedRoleToAdd,
      },
    ]);
    setSelectedStaffToAdd('');
  };

  const handleRemoveTeamMember = (staffId: string) => {
    setAssignedMembers(assignedMembers.filter((m) => m.staffId !== staffId));
  };

  const handleUpdateMemberRole = (staffId: string, newRole: UserRoleType) => {
    setAssignedMembers(
      assignedMembers.map((m) => (m.staffId === staffId ? { ...m, projectRole: newRole } : m))
    );
  };

  const handleAddOutcome = () => {
    setOutcomes([...outcomes, { id: `out-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`, title: '' }]);
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
      { id: `ind-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`, title: '', target: 0, current: 0, unit: 'Orang' },
    ]);
  };

  // Bulk Add Indicators State
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkText, setBulkText] = useState('');

  const handleProcessBulkIndicators = () => {
    if (!bulkText.trim()) return;
    const lines = bulkText.split('\n').map((l) => l.trim()).filter(Boolean);
    const parsed: { id: string; title: string; target: number; current: number; unit: string }[] = [];
    
    lines.forEach((line, idx) => {
      const parts = line.includes('\t') 
        ? line.split('\t') 
        : line.includes('|') 
          ? line.split('|') 
          : [line];

      const title = parts[0]?.trim() || '';
      if (!title) return;

      let target = 0;
      let current = 0;
      let unit = 'Orang';

      if (parts[1]) {
        const parsedTarget = parseFloat(parts[1].replace(/[^0-9.]/g, ''));
        if (!isNaN(parsedTarget)) target = parsedTarget;
      }
      if (parts[2]) {
        const num = parseFloat(parts[2].replace(/[^0-9.]/g, ''));
        if (!isNaN(num)) {
          current = num;
          if (parts[3]) unit = parts[3].trim() || 'Orang';
        } else {
          unit = parts[2].trim() || 'Orang';
        }
      }

      parsed.push({
        id: `ind-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 9)}`,
        title,
        target,
        current,
        unit,
      });
    });

    if (parsed.length > 0) {
      const cleaned = indicators.filter((i) => i.title.trim() !== '');
      setIndicators([...cleaned, ...parsed]);
      setBulkText('');
      setShowBulkModal(false);
    }
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
      assignedMembers,
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

            {/* Multi-User Team Assignment Section */}
            <div className="md:col-span-2 space-y-3 pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-slate-800 font-extrabold text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-blue-600" />
                    Penugasan Tim &amp; Hak Akses Khusus Proyek Ini (Multi-User)
                  </label>
                  <p className="text-[10px] text-slate-400 font-medium">
                    Setiap staf yang ditambahkan hanya bisa melihat &amp; mengelola proyek ini sesuai peran spesifik yang ditentukan.
                  </p>
                </div>
              </div>

              {/* Add Staff Controls */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 flex flex-wrap sm:flex-nowrap items-center gap-2">
                <select
                  value={selectedStaffToAdd}
                  onChange={(e) => setSelectedStaffToAdd(e.target.value)}
                  className="flex-1 bg-white border border-slate-200 text-xs font-semibold rounded-lg py-1.5 px-2.5 focus:outline-none focus:border-blue-500 text-slate-800 cursor-pointer min-w-[160px]"
                >
                  <option value="">-- Pilih Staf / Personel --</option>
                  {staffObjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.role})
                    </option>
                  ))}
                  {/* Fallback for staffList if staffObjects empty */}
                  {staffObjects.length === 0 && staffList.map((stName) => (
                    <option key={stName} value={stName}>
                      {stName}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedRoleToAdd}
                  onChange={(e) => setSelectedRoleToAdd(e.target.value as UserRoleType)}
                  className="bg-white border border-slate-200 text-xs font-semibold rounded-lg py-1.5 px-2.5 focus:outline-none focus:border-blue-500 text-slate-800 cursor-pointer"
                >
                  <option value="project_coordinator">📊 Project Coordinator</option>
                  <option value="field_officer">📑 Field Officer / PIC Lapangan</option>
                  <option value="donor_viewer">👁️ Donor / Viewer (Read-Only)</option>
                  <option value="super_admin">👑 Super Admin</option>
                </select>

                <button
                  type="button"
                  onClick={handleAddTeamMember}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-1.5 px-3 rounded-lg text-xs cursor-pointer inline-flex items-center gap-1 shrink-0 shadow-xs"
                >
                  <UserPlus className="w-3.5 h-3.5" /> Tambah ke Tim
                </button>
              </div>

              {/* Assigned Members Table/List */}
              {assignedMembers.length === 0 ? (
                <div className="p-3 bg-amber-50/60 border border-amber-200/60 rounded-xl text-[11px] text-amber-800 font-medium">
                  💡 <strong>Catatan:</strong> Jika tidak ada staf spesifik yang ditambahkan, proyek ini dapat diakses oleh semua pengguna sesuai hak akses globalnya.
                </div>
              ) : (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                    Anggota Tim Terdaftar ({assignedMembers.length}):
                  </p>
                  <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden bg-white">
                    {assignedMembers.map((m) => {
                      const stName = m.staffName || staffObjects.find((s) => s.id === m.staffId)?.name || m.staffId;
                      const roleCfg = USER_ROLES[m.projectRole] || USER_ROLES.field_officer;

                      return (
                        <div key={m.staffId} className="p-2.5 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 font-extrabold text-xs flex items-center justify-center shrink-0">
                              {stName.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-800 truncate">{stName}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <select
                              value={m.projectRole}
                              onChange={(e) => handleUpdateMemberRole(m.staffId, e.target.value as UserRoleType)}
                              className={`py-1 px-2 rounded-lg text-[10px] font-extrabold border cursor-pointer focus:outline-none ${roleCfg.badgeBg} ${roleCfg.badgeText} ${roleCfg.badgeBorder}`}
                            >
                              <option value="super_admin">👑 Super Admin</option>
                              <option value="project_coordinator">📊 Project Coordinator</option>
                              <option value="field_officer">📑 Field Officer / PIC Lapangan</option>
                              <option value="donor_viewer">👁️ Donor / Viewer</option>
                            </select>

                            <button
                              type="button"
                              onClick={() => handleRemoveTeamMember(m.staffId)}
                              className="p-1 hover:bg-rose-50 text-rose-500 rounded-md cursor-pointer transition-colors"
                              title="Hapus dari tim"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
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
          <div className="border-b border-slate-50 pb-3 flex justify-between items-center flex-wrap gap-2">
            <div>
              <h3 className="font-extrabold text-slate-800 text-sm tracking-wide uppercase">📊 Indikator Kinerja &amp; Target Capaian</h3>
              <p className="text-[10px] text-slate-400">Total {indicators.length} indikator terdaftar</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowBulkModal(true)}
                className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold py-1 px-3 rounded-lg text-[10px] cursor-pointer border border-emerald-200"
              >
                📋 Input Banyak Indikator Sekaligus
              </button>
              <button
                type="button"
                onClick={handleAddIndicator}
                className="bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold py-1 px-3 rounded-lg text-[10px] cursor-pointer border border-blue-200"
              >
                ＋ Tambah Indikator Baru
              </button>
            </div>
          </div>

          {/* Bulk Add Modal */}
          {showBulkModal && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
              <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl border border-slate-100">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide">📋 Input Banyak Indikator Sekaligus</h3>
                    <p className="text-xs text-slate-500">Paste baris teks/tabel Excel langsung ke dalam kotak di bawah ini.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowBulkModal(false)}
                    className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer px-2"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-600">
                    Format (1 Indikator per baris):
                  </label>
                  <p className="text-[10px] text-slate-400 bg-slate-50 p-2 rounded-lg border border-slate-100">
                    Contoh format tab/Excel atau pipa (|):<br/>
                    <code className="text-blue-600">Jumlah kelompok usaha | 100 | 0 | Kelompok</code><br/>
                    Atau cukup teks nama indikator per baris.
                  </p>
                  <textarea
                    rows={8}
                    className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-800 font-mono focus:outline-none focus:border-blue-500"
                    placeholder={`Jumlah nelayan binaan | 100 | 0 | Orang\nJumlah kapal bersertifikasi | 50 | 12 | Kapal\nJumlah kelompok usaha baru | 10 | 2 | Kelompok`}
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowBulkModal(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleProcessBulkIndicators}
                    className="px-5 py-2 text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs cursor-pointer"
                  >
                    Tambahkan ke Daftar Indikator
                  </button>
                </div>
              </div>
            </div>
          )}

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

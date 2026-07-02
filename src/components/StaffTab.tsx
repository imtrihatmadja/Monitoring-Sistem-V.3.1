import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Staff, Activity, Project } from '../types';
import { 
  Users, 
  ClipboardList, 
  TrendingUp, 
  AlertOctagon, 
  Eye, 
  CheckCircle2, 
  UserPlus, 
  FileSpreadsheet, 
  X, 
  Download 
} from 'lucide-react';

interface StaffTabProps {
  staffList: Staff[];
  activities: Activity[];
  projects: Project[];
  onOpenTasksModal: (staffName: string) => void;
  onUpdateStaffList?: (newList: Staff[]) => void;
}

export const StaffTab: React.FC<StaffTabProps> = ({
  staffList,
  activities,
  projects,
  onOpenTasksModal,
  onUpdateStaffList,
}) => {
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  
  // Modals visibility states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Manual Add Form states
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffRole, setNewStaffRole] = useState('');
  const [newStaffStatus, setNewStaffStatus] = useState<'active' | 'inactive'>('active');

  // Excel Import states
  const [stagedRows, setStagedRows] = useState<any[] | null>(null);
  const [importError, setImportError] = useState('');

  // Filter staff by status
  const filteredStaff = useMemo(() => {
    if (selectedStatus === 'all') return staffList;
    return staffList.filter((s) => s.status === selectedStatus);
  }, [staffList, selectedStatus]);

  // Identify active staff names for precise mapping
  const activeStaffNames = useMemo(() => {
    return staffList
      .filter((s) => s.status === 'active')
      .map((s) => s.name.toLowerCase().trim());
  }, [staffList]);

  // Filter activities assigned to the active registered staff members
  const activeStaffActivities = useMemo(() => {
    return activities.filter((a) => {
      if (!a.pic) return false;
      return activeStaffNames.includes(a.pic.toLowerCase().trim());
    });
  }, [activities, activeStaffNames]);

  // Aggregate stats across all active staff assignments
  const totalInvolvedStaff = staffList.filter((s) => s.status === 'active').length;
  const totalAssignedActivities = activeStaffActivities.length;
  
  const pendingTasksCount = useMemo(() => {
    return activeStaffActivities.filter((a) => {
      if (a.status === 'Tertunda') return true;
      if (a.status !== 'Selesai' && a.dueDate) {
        const due = new Date(a.dueDate).getTime();
        const now = new Date().getTime();
        return due < now;
      }
      return false;
    }).length;
  }, [activeStaffActivities]);

  const averageActivitiesProgress = useMemo(() => {
    if (activeStaffActivities.length === 0) return 0;
    const sum = activeStaffActivities.reduce((acc, a) => acc + (a.progress || 0), 0);
    return Math.round(sum / activeStaffActivities.length);
  }, [activeStaffActivities]);

  // Compile individual staff workloads sheet
  const staffWorkloads = useMemo(() => {
    return filteredStaff.map((staff) => {
      const staffActs = activities.filter((a) => a.pic === staff.name);
      
      const totalCount = staffActs.length;
      const completedCount = staffActs.filter((a) => a.status === 'Selesai').length;
      const runningCount = staffActs.filter((a) => a.status === 'Sedang Berjalan').length;
      const delayedCount = staffActs.filter((a) => a.status === 'Tertunda').length;
      const notStartedCount = staffActs.filter((a) => a.status === 'Belum Mulai').length;

      const meanProgress = totalCount
        ? Math.round(staffActs.reduce((sum, a) => sum + a.progress, 0) / totalCount)
        : 0;

      const criticalOverdues = staffActs.filter((a) => {
        // Simple logic for pending delays
        if (a.status === 'Tertunda') return true;
        
        // checking if deadline is passed to simulate overdue workloads
        if (a.status !== 'Selesai' && a.dueDate) {
          const due = new Date(a.dueDate).getTime();
          const now = new Date().getTime();
          return due < now;
        }
        return false;
      }).length;

      return {
        ...staff,
        totalCount,
        completedCount,
        runningCount,
        delayedCount,
        notStartedCount,
        meanProgress,
        criticalOverdues,
      };
    });
  }, [filteredStaff, activities]);

  // Handlers for manual add
  const handleSaveManual = () => {
    if (!newStaffName.trim()) {
      alert('Nama Lengkap tidak boleh kosong!');
      return;
    }

    const nameTrimmed = newStaffName.trim();
    const isDuplicate = staffList.some(s => s.name.toLowerCase().trim() === nameTrimmed.toLowerCase());
    if (isDuplicate) {
      alert('Staff dengan nama ini sudah terdaftar!');
      return;
    }

    const newStaff: Staff = {
      id: `staff-${Date.now()}`,
      name: nameTrimmed,
      role: newStaffRole.trim() || 'Staff Anggota',
      status: newStaffStatus,
    };

    if (onUpdateStaffList) {
      onUpdateStaffList([...staffList, newStaff]);
    }

    // Reset and close
    setNewStaffName('');
    setNewStaffRole('');
    setNewStaffStatus('active');
    setIsAddModalOpen(false);
  };

  // Handlers for excel import
  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const headers = ['Nama Lengkap', 'Peran/Jabatan', 'Status (Aktif/Tidak Aktif)'];
    const sampleRows = [
      ['Imam Trihatmadja', 'Program Coordinator', 'Aktif'],
      ['Moh Abdi Suhufan', 'Director', 'Aktif'],
      ['Andi Wijaya', 'Field Officer', 'Tidak Aktif']
    ];
    const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
    ws['!cols'] = [{ wch: 25 }, { wch: 25 }, { wch: 25 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Template Staff');
    XLSX.writeFile(wb, 'Template_Import_Staff_DFW.xlsx');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: 'binary', raw: false });
        const sheetName = workbook.SheetNames[0];
        const ws = workbook.Sheets[sheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });
        
        const mapped = rawJson.map((row) => {
          const keys = Object.keys(row);
          const findVal = (possibleHeaders: string[]) => {
            const match = keys.find(k => possibleHeaders.includes(k.toLowerCase().trim()));
            return match ? row[match] : '';
          };
          
          const name = String(findVal(['nama', 'nama lengkap', 'nama_lengkap', 'name', 'full name', 'personel', 'nama personel'])).trim();
          const role = String(findVal(['peran', 'jabatan', 'role', 'peran/jabatan', 'position', 'status staff', 'peran staff', 'job', 'peran/jabatan*'])).trim();
          const statusStr = String(findVal(['status', 'keanggotaan', 'status (aktif/tidak aktif)', 'status*'])).toLowerCase().trim();
          
          const status: 'active' | 'inactive' = (statusStr === 'tidak aktif' || statusStr === 'inactive' || statusStr === 'nonaktif') ? 'inactive' : 'active';
          
          return { name, role, status };
        }).filter(item => item.name);
        
        if (mapped.length === 0) {
          setImportError('Tidak ditemukan data personel yang valid (pastikan kolom "Nama Lengkap" atau "Nama" terisi).');
          setStagedRows(null);
        } else {
          setStagedRows(mapped);
          setImportError('');
        }
      } catch (err) {
        console.error(err);
        setImportError('Gagal membaca file Excel. Pastikan format file sesuai.');
        setStagedRows(null);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleExecuteImport = () => {
    if (!stagedRows || stagedRows.length === 0) return;
    const newList = [...staffList];
    let addedCount = 0;

    stagedRows.forEach((item) => {
      const exists = newList.some(s => s.name.toLowerCase().trim() === item.name.toLowerCase().trim());
      if (!exists) {
        newList.push({
          id: `staff-auto-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          name: item.name.trim(),
          role: item.role.trim() || 'Staff Anggota',
          status: item.status,
        });
        addedCount++;
      }
    });

    if (onUpdateStaffList) {
      onUpdateStaffList(newList);
    }

    setStagedRows(null);
    setIsImportModalOpen(false);
    alert(`Berhasil mengintegrasikan ${addedCount} personel baru.`);
  };

  return (
    <div id="staff-tab-container" className="space-y-6">
      {/* Visual Workload banner */}
      <div id="staff-dashboard-stats" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Staff Aktif</p>
            <p className="text-xl font-bold text-slate-800">{totalInvolvedStaff} Anggota</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-sky-50 text-sky-600 rounded-xl shrink-0">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Kegiatan</p>
            <p className="text-xl font-bold text-slate-800">{totalAssignedActivities} Ditugaskan</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Rata-rata Progress</p>
            <p className="text-xl font-bold text-slate-800">{averageActivitiesProgress}% Tuntas</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl shrink-0">
            <AlertOctagon className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Hambatan/Delay Aktif</p>
            <p className="text-xl font-bold text-slate-800">{pendingTasksCount} Tertunda</p>
          </div>
        </div>
      </div>

      {/* Grid container tables */}
      <div id="staff-table-card" className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-slate-800 text-sm">📊 Distribusi Beban Kerja Personel</h3>
            <p className="text-xs text-slate-400">Metrik pengawasan tingkat penyelesaian program dan penugasan per staff</p>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-center">
            {/* Action Buttons to Add Personnel */}
            <button
              onClick={() => setIsAddModalOpen(true)}
              title="Tambah Staff Manual"
              className="py-1.5 px-3.5 bg-blue-50 hover:bg-blue-100 text-blue-650 hover:text-blue-700 border border-blue-200 rounded-xl font-bold text-[11px] transition-all cursor-pointer inline-flex items-center gap-1.5 active:scale-95 shadow-2xs"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Tambah Manual</span>
            </button>

            <button
              onClick={() => setIsImportModalOpen(true)}
              title="Import Staff dari Excel"
              className="py-1.5 px-3.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-750 hover:text-emerald-800 border border-emerald-200 rounded-xl font-bold text-[11px] transition-all cursor-pointer inline-flex items-center gap-1.5 active:scale-95 shadow-2xs"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Import Excel</span>
            </button>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-xs font-semibold rounded-xl py-1.5 px-3 focus:outline-none focus:border-blue-400 cursor-pointer text-slate-700"
            >
              <option value="all">Semua Status Staff</option>
              <option value="active">Aktif</option>
              <option value="inactive">Tidak Aktif</option>
            </select>
          </div>
        </div>

        {/* Workloads details matrix */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Nama Personel</th>
                <th className="py-3 px-4">Status Staff</th>
                <th className="py-3 px-4 text-center">Total Penugasan</th>
                <th className="py-3 px-4 text-center text-emerald-600">Selesai</th>
                <th className="py-3 px-4 text-center text-sky-600">Sedang Berjalan</th>
                <th className="py-3 px-4 text-center text-rose-600">Tertunda</th>
                <th className="py-3 px-4 text-center text-slate-400">Belum Mulai</th>
                <th className="py-3 px-4">Efisiensi Progress</th>
                <th className="py-3 px-4 text-center text-amber-600">Overdue/Hambatan</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-xs font-semibold text-slate-700">
              {staffWorkloads.map((sw) => {
                let badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-100';
                if (sw.status === 'inactive') {
                  badgeClass = 'bg-slate-50 text-slate-400 border-slate-100';
                }

                return (
                  <tr key={sw.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-4">
                      <div>
                        <p className="font-bold text-slate-800">{sw.name}</p>
                        <p className="text-[10px] text-slate-400 font-medium">{sw.role}</p>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`py-0.5 px-2 rounded-full border text-[9px] uppercase tracking-wider font-bold ${badgeClass}`}>
                        {sw.status === 'active' ? 'Aktif' : 'Tidak Aktif'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center text-slate-800 font-bold">{sw.totalCount}</td>
                    <td className="py-3.5 px-4 text-center text-emerald-600 bg-emerald-50/10 font-bold">{sw.completedCount}</td>
                    <td className="py-3.5 px-4 text-center text-sky-600 bg-sky-50/10 font-bold">{sw.runningCount}</td>
                    <td className="py-3.5 px-4 text-center text-rose-600 bg-rose-50/10 font-bold">{sw.delayedCount}</td>
                    <td className="py-3.5 px-4 text-center text-slate-400 font-bold">{sw.notStartedCount}</td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2 max-w-[100px]">
                        <div className="w-full bg-slate-100 rounded-full h-1.5">
                          <div
                            className="bg-emerald-500 h-1.5 rounded-full"
                            style={{ width: `${sw.meanProgress}%` }}
                          />
                        </div>
                        <span className="font-bold text-slate-600 text-[11px]">{sw.meanProgress}%</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`py-0.5 px-2 rounded-full font-bold text-[10px] ${
                          sw.criticalOverdues > 0 ? 'bg-red-50 text-red-700' : 'bg-slate-50 text-slate-400'
                        }`}
                      >
                        {sw.criticalOverdues} Kasus
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => onOpenTasksModal(sw.name)}
                        className="py-1 px-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-blue-600 rounded-lg text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer transition-all"
                      >
                        <Eye className="w-3 h-3" /> Lihat Tugas
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tambah Staff Manual Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4 z-50 text-xs">
          <div className="bg-white rounded-2xl border border-slate-100 max-w-md w-full shadow-2xl flex flex-col justify-between overflow-hidden text-slate-600 font-medium">
            <div className="p-4 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
              <span className="text-sm font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                👤 Tambah Personel Baru (Manual)
              </span>
              <button 
                onClick={() => {
                  setIsAddModalOpen(false);
                  setNewStaffName('');
                  setNewStaffRole('');
                  setNewStaffStatus('active');
                }} 
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Nama Lengkap *</label>
                <input
                  type="text"
                  value={newStaffName}
                  onChange={(e) => setNewStaffName(e.target.value)}
                  placeholder="Contoh: Andi Wijaya"
                  className="w-full bg-slate-50 border border-slate-200 text-xs font-semibold rounded-xl py-2 px-3 focus:outline-none focus:border-blue-500 text-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Peran / Jabatan</label>
                <input
                  type="text"
                  value={newStaffRole}
                  onChange={(e) => setNewStaffRole(e.target.value)}
                  placeholder="Contoh: Field Officer"
                  className="w-full bg-slate-50 border border-slate-200 text-xs font-semibold rounded-xl py-2 px-3 focus:outline-none focus:border-blue-500 text-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Status Keanggotaan</label>
                <select
                  value={newStaffStatus}
                  onChange={(e) => setNewStaffStatus(e.target.value as 'active' | 'inactive')}
                  className="w-full bg-slate-50 border border-slate-200 text-xs font-semibold rounded-xl py-2 px-3 focus:outline-none focus:border-blue-500 text-slate-800 cursor-pointer"
                >
                  <option value="active">Aktif</option>
                  <option value="inactive">Tidak Keanggotaan / Nonaktif</option>
                </select>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2 shrink-0">
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setNewStaffName('');
                  setNewStaffRole('');
                  setNewStaffStatus('active');
                }}
                className="bg-white border border-slate-200 text-slate-500 py-2 px-4 rounded-xl font-bold transition-all hover:bg-slate-100 cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleSaveManual}
                className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-2 px-5 rounded-xl transition-all cursor-pointer inline-flex items-center gap-1"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Simpan Staff
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Excel Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4 z-50 text-xs">
          <div className="bg-white rounded-2xl border border-slate-100 max-w-2xl w-full max-h-[85vh] shadow-2xl flex flex-col justify-between overflow-hidden text-slate-600 font-medium">
            <div className="p-4 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
              <span className="text-sm font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                📥 Import Data Personel (Excel / CSV)
              </span>
              <button 
                onClick={() => {
                  setStagedRows(null);
                  setIsImportModalOpen(false);
                  setImportError('');
                }} 
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 max-h-[55vh]">
              <div className="p-4 bg-slate-50 border border-slate-200/60 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="space-y-1">
                  <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider block">Format Template Standard</span>
                  <p className="text-[11px] text-slate-400">Gunakan template yang telah disediakan agar proses pembacaan data berjalan lancar.</p>
                </div>
                <button
                  onClick={downloadTemplate}
                  className="bg-white border border-slate-200 text-slate-700 font-bold py-1.5 px-3 rounded-xl transition-all hover:bg-slate-50 cursor-pointer flex items-center gap-1 hover:text-emerald-600"
                >
                  <Download className="w-3.5 h-3.5" />
                  Unduh Template Excel
                </button>
              </div>

              <div className="space-y-2">
                <span className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 block">Pilih File Unggahan:</span>
                <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center hover:bg-slate-50/50 transition-all cursor-pointer relative">
                  <input
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <div className="space-y-2 flex flex-col items-center">
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-full w-12 h-12 flex items-center justify-center">
                      <FileSpreadsheet className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="font-extrabold text-slate-800 text-xs block">Seret &amp; Letakkan File atau Klik untuk Memilih</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">Mendukung format .xlsx, .xls, .csv</span>
                    </div>
                  </div>
                </div>
              </div>

              {importError && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-700 text-[11px] font-bold">
                  ⚠️ {importError}
                </div>
              )}

              {stagedRows && stagedRows.length > 0 && (
                <div className="space-y-2 pt-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">Pratinjau Hasil Pembacaan Sheet (Baris Terpilih):</span>
                  <div className="border border-slate-150 rounded-xl overflow-hidden max-h-[160px] overflow-y-auto">
                    <table className="w-full text-left border-collapse text-[10px]">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-150 text-[10px] text-slate-400 font-bold">
                          <th className="py-2 px-3 text-center">#</th>
                          <th className="py-2 px-3">Nama Lengkap</th>
                          <th className="py-2 px-3">Peran/Jabatan</th>
                          <th className="py-2 px-3 text-center">Status Keanggotaan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-semibold text-slate-700 bg-white">
                        {stagedRows.slice(0, 15).map((row, index) => {
                          const isDuplicate = staffList.some(s => s.name.toLowerCase().trim() === row.name.toLowerCase().trim());
                          return (
                            <tr key={index} className={isDuplicate ? 'bg-amber-50/15' : ''}>
                              <td className="py-1.5 px-3 text-center text-slate-400">{index + 1}</td>
                              <td className="py-1.5 px-3">
                                <div>
                                  <span className="font-bold text-slate-800">{row.name}</span>
                                  {isDuplicate && <span className="text-[8px] bg-amber-100 text-amber-800 rounded px-1 ml-1 font-extrabold inline-block">MERGE/SKIP</span>}
                                </div>
                              </td>
                              <td className="py-1.5 px-3">{row.role || '—'}</td>
                              <td className="py-1.5 px-3 text-center">
                                <span className={`py-0.5 px-2 rounded-full border text-[9px] uppercase tracking-wider font-bold ${
                                  row.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-100'
                                }`}>
                                  {row.status === 'active' ? 'Aktif' : 'Tidak Aktif'}
                                </span>
                              </td>
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
                  setImportError('');
                }}
                className="bg-white border border-slate-200 text-slate-500 py-2 px-4 rounded-xl font-bold transition-all hover:bg-slate-100 cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleExecuteImport}
                disabled={!stagedRows || stagedRows.length === 0}
                className="disabled:opacity-50 disabled:cursor-not-allowed bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-2 px-5 rounded-xl transition-all cursor-pointer inline-flex items-center gap-1"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Import Sekarang
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

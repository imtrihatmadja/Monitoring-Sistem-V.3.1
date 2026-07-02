import { Indicator } from '../types';

export function getImpactIcon(unit: string): string {
  const u = (unit || '').toLowerCase().trim();
  if (['orang','jiwa','nelayan','peserta','benefisiari','perempuan',
       'laki-laki','anak','pekerja','buruh','anggota','komunitas',
       'keluarga','rumah tangga'].some(k => u.includes(k))) return '👥';
  if (['dokumen','laporan','modul','publikasi','buku','panduan',
       'kebijakan','regulasi','peraturan', 'tor', 'sop'].some(k => u.includes(k))) return '📄';
  if (['kapal','perahu','alat','unit'].some(k => u.includes(k))) return '🚢';
  if (['hektar','ha','km','wilayah','lokasi','desa','kawasan','area'].some(k => u.includes(k))) return '🗺️';
  if (['kegiatan','event','pelatihan','workshop','pertemuan','sosialisasi','seminar'].some(k => u.includes(k))) return '📅';
  if (['kg','ton','gram','kwintal'].some(k => u.includes(k))) return '⚖️';
  if (['mou','perjanjian','kontrak','kesepakatan'].some(k => u.includes(k))) return '🤝';
  return '🎯';
}

export interface ImpactGroup {
  unitDisplay: string;
  total: number;
  count: number;
}

export function calcProjectImpact(projectIndicators: Indicator[]): Record<string, ImpactGroup> {
  const grouped: Record<string, ImpactGroup> = {};
  
  projectIndicators.forEach((ind) => {
    const rawUnit = (ind.unit || '').trim();
    if (!rawUnit) return;
    const k = rawUnit.toLowerCase();
    
    const actVal = Number(ind.current) || 0;
    
    if (!grouped[k]) {
      grouped[k] = { unitDisplay: rawUnit, total: 0, count: 0 };
    }
    grouped[k].total += actVal;
    grouped[k].count += 1;
  });
  
  return grouped;
}

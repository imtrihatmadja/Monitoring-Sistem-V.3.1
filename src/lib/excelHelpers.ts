import * as XLSX from 'xlsx';
import { Project, Indicator } from '../types';

export const downloadProjectTemplate = () => {
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

export const exportProjectsToExcel = (projects: Project[], indicators: Indicator[]) => {
  const wb = XLSX.utils.book_new();

  // Create Projects data sheet
  const projHeaders = [
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
  ];

  const projRows = projects.map((p) => [
    p.name,
    p.location,
    p.owner,
    p.donor || '',
    p.startDate || '',
    p.deadline || '',
    p.status || 'Aktif',
    p.goal || '',
    p.desc || '',
    p.note || '',
    p.budgetApproved !== undefined ? p.budgetApproved.toString() : '0',
    p.budgetActual !== undefined ? p.budgetActual.toString() : '0',
  ]);

  const wsProj = XLSX.utils.aoa_to_sheet([projHeaders, ...projRows]);
  wsProj['!cols'] = [35, 25, 25, 20, 15, 15, 15, 40, 40, 30, 20, 20].map((w) => ({ wch: w }));
  XLSX.utils.book_append_sheet(wb, wsProj, 'Proyek');

  // Create Indicators data sheet
  const indHeaders = ['Nama Proyek*', 'Nama Indikator*', 'Target*', 'Satuan', 'Capaian Awal/Saat Ini'];
  const indRows: any[][] = [];

  indicators.forEach((ind) => {
    const parentProj = projects.find((p) => p.id === ind.projectId);
    if (parentProj) {
      indRows.push([
        parentProj.name,
        ind.title,
        ind.target.toString(),
        ind.unit || 'Orang',
        ind.current !== undefined ? ind.current.toString() : '0',
      ]);
    }
  });

  const wsInd = XLSX.utils.aoa_to_sheet([indHeaders, ...indRows]);
  wsInd['!cols'] = [35, 35, 12, 12, 12].map((w) => ({ wch: w }));
  XLSX.utils.book_append_sheet(wb, wsInd, 'Indikator');

  const timestamp = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `Ekspor_Proyek_DFW_${timestamp}.xlsx`);
};

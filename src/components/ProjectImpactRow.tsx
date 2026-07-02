import React from 'react';
import { Indicator } from '../types';
import { calcProjectImpact, getImpactIcon } from '../lib/impact';

interface ProjectImpactRowProps {
  projectIndicators: Indicator[];
}

export const ProjectImpactRow: React.FC<ProjectImpactRowProps> = ({ projectIndicators }) => {
  const grouped = calcProjectImpact(projectIndicators);
  const entries = Object.entries(grouped).sort((a, b) => b[1].total - a[1].total);
  
  if (entries.length === 0) return null;
  
  const displayedEntries = entries.slice(0, 4);
  const remainingCount = entries.length - displayedEntries.length;
  
  return (
    <div className="border-t border-slate-100 pt-3 mt-2 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider flex items-center gap-1.5">
          🌱 Dampak &amp; Capaian Program
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {displayedEntries.map(([unitKey, data]) => {
          const icon = getImpactIcon(unitKey);
          const formattedTotal = data.total.toLocaleString('id-ID');
          return (
            <div
              key={unitKey}
              className="inline-flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-100 text-emerald-700/90 rounded-lg px-2 py-0.5 text-[10px] font-extrabold whitespace-nowrap transition-colors"
              title={`${data.total} ${data.unitDisplay} (${data.count} indikator)`}
            >
              <span className="text-xs shrink-0">{icon}</span>
              <span className="text-emerald-800 font-black">{formattedTotal}</span>
              <span className="text-emerald-600 font-semibold">{data.unitDisplay}</span>
            </div>
          );
        })}
        {remainingCount > 0 && (
          <span className="text-[9px] font-bold text-slate-400 bg-slate-50 border border-slate-100 rounded px-1.5 py-0.5 self-center">
            +{remainingCount} lainnya
          </span>
        )}
      </div>
    </div>
  );
};

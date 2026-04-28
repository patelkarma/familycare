import { motion } from 'framer-motion';
import { Search, Pin, FlaskConical, ScanLine, Pill, FileText, Syringe, Shield, Stethoscope, MoreHorizontal, LayoutGrid } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const REPORT_TYPES = [
  { value: 'ALL', label: 'All', icon: LayoutGrid, color: 'text-gray-600' },
  { value: 'LAB', label: 'Lab', icon: FlaskConical, color: 'text-purple-600' },
  { value: 'IMAGING', label: 'Imaging', icon: ScanLine, color: 'text-blue-600' },
  { value: 'PRESCRIPTION', label: 'Rx', icon: Pill, color: 'text-amber-600' },
  { value: 'DISCHARGE', label: 'Discharge', icon: FileText, color: 'text-green-600' },
  { value: 'VACCINATION', label: 'Vaccine', icon: Syringe, color: 'text-cyan-600' },
  { value: 'INSURANCE', label: 'Insurance', icon: Shield, color: 'text-indigo-600' },
  { value: 'CONSULTATION', label: 'Consult', icon: Stethoscope, color: 'text-rose-600' },
  { value: 'OTHER', label: 'Other', icon: MoreHorizontal, color: 'text-gray-500' },
];

const ReportFilterBar = ({
  activeType,
  onTypeChange,
  query,
  onQueryChange,
  pinnedOnly,
  onPinnedToggle,
}) => {
  const { t } = useTranslation();
  return (
    <div className="space-y-3">
      {/* Search + pin toggle */}
      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder={t('common.search')}
            className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm bg-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
          />
        </div>
        <motion.button
          onClick={onPinnedToggle}
          className={`shrink-0 flex items-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
            pinnedOnly
              ? 'bg-amber-500 text-white shadow-md shadow-amber-500/25'
              : 'bg-white text-gray-600 border border-gray-200 hover:border-amber-300'
          }`}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
        >
          <Pin className={`w-4 h-4 ${pinnedOnly ? 'fill-white' : ''}`} />
          Pinned
        </motion.button>
      </div>

      {/* Type chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {REPORT_TYPES.map((t) => {
          const Icon = t.icon;
          const active = activeType === t.value;
          return (
            <motion.button
              key={t.value}
              onClick={() => onTypeChange(t.value)}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-medium sm:font-semibold whitespace-nowrap transition-all ${
                active
                  ? 'bg-gray-900 text-white shadow-sm'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
              }`}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
            >
              <Icon className={`w-4 h-4 ${active ? 'text-white' : t.color}`} />
              {t.label}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

export default ReportFilterBar;

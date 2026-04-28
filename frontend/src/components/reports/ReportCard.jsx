import { motion } from 'framer-motion';
import { Eye, Share2, Pin, Trash2, FileText, Image as ImageIcon, Stethoscope, Building2, Calendar } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { REPORT_TYPES } from './ReportFilterBar';

const formatDate = (d) => {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const formatSize = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const typeMeta = (type) =>
  REPORT_TYPES.find((t) => t.value === type) || REPORT_TYPES[REPORT_TYPES.length - 1];

const IMAGE_TYPES = new Set(['JPG', 'JPEG', 'PNG', 'GIF', 'WEBP']);

const ReportCard = ({ report, onView, onShare, onPin, onDelete, canEdit }) => {
  const { t } = useTranslation();
  const meta = typeMeta(report.reportType);
  const TypeIcon = meta.icon;
  const fileType = (report.fileType || '').toUpperCase();
  const isPdf = fileType === 'PDF';
  const isImage = IMAGE_TYPES.has(fileType);
  const isPinned = report.isPinnedForEmergency;

  return (
    <motion.div
      layout
      className="group relative bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg hover:border-primary/20 transition-all"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -3 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
    >
      {/* Pinned ribbon */}
      {isPinned && (
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1 bg-amber-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-md shadow-amber-500/30">
          <Pin className="w-3 h-3 fill-white" />
          EMERGENCY
        </div>
      )}

      <div className="flex flex-col sm:flex-row">
        {/* Thumbnail */}
        <button
          onClick={() => onView(report)}
          className="relative shrink-0 w-full sm:w-32 h-32 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center overflow-hidden"
        >
          {isPdf ? (
            <div className="flex flex-col items-center gap-1.5 text-red-500">
              <FileText className="w-10 h-10" />
              <span className="text-[10px] font-bold tracking-wider">PDF</span>
            </div>
          ) : isImage && report.thumbnailUrl ? (
            <img
              src={report.thumbnailUrl}
              alt={report.title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : isImage ? (
            <ImageIcon className="w-10 h-10 text-gray-300" />
          ) : (
            <div className="flex flex-col items-center gap-1.5 text-gray-500">
              <FileText className="w-10 h-10" />
              {fileType && (
                <span className="text-[10px] font-bold tracking-wider">{fileType}</span>
              )}
            </div>
          )}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
            <motion.div
              className="opacity-0 group-hover:opacity-100 transition-opacity w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center"
              whileHover={{ scale: 1.1 }}
            >
              <Eye className="w-5 h-5 text-gray-700" />
            </motion.div>
          </div>
        </button>

        {/* Content */}
        <div className="flex-1 p-4 flex flex-col gap-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={`inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider ${meta.color}`}>
                  <TypeIcon className="w-3.5 h-3.5" />
                  {meta.label}
                </span>
                {report.fileSizeBytes && (
                  <span className="text-[10px] text-gray-400">
                    • {formatSize(report.fileSizeBytes)}
                  </span>
                )}
              </div>
              <h3 className="text-base font-bold text-gray-900 leading-snug truncate pr-6">
                {report.title}
              </h3>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
            {report.reportDate && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {formatDate(report.reportDate)}
              </span>
            )}
            {report.doctorName && (
              <span className="flex items-center gap-1">
                <Stethoscope className="w-3 h-3" />
                {report.doctorName}
              </span>
            )}
            {report.hospital && (
              <span className="flex items-center gap-1 truncate max-w-[160px]">
                <Building2 className="w-3 h-3" />
                {report.hospital}
              </span>
            )}
          </div>

          {report.tags && (
            <div className="flex flex-wrap gap-1">
              {report.tags.split(',').filter(Boolean).slice(0, 4).map((tag, i) => (
                <span
                  key={i}
                  className="text-[10px] font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full"
                >
                  {tag.trim()}
                </span>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-1 mt-auto pt-1">
            <motion.button
              onClick={() => onView(report)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-primary bg-primary-light hover:bg-primary/20 transition-colors"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
            >
              <Eye className="w-3.5 h-3.5" />
              View
            </motion.button>
            {canEdit && (
              <>
                <motion.button
                  onClick={() => onShare(report)}
                  className="p-2 rounded-lg text-gray-400 hover:text-primary hover:bg-primary-light transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  title={t('reportsExtra.shareReport')}
                >
                  <Share2 className="w-4 h-4" />
                </motion.button>
                <motion.button
                  onClick={() => onPin(report)}
                  className={`p-2 rounded-lg transition-colors ${
                    isPinned
                      ? 'text-amber-600 bg-amber-50 hover:bg-amber-100'
                      : 'text-gray-400 hover:text-amber-500 hover:bg-amber-50'
                  }`}
                  whileHover={{ scale: 1.1, rotate: isPinned ? -15 : 15 }}
                  whileTap={{ scale: 0.9 }}
                  title={isPinned ? 'Unpin' : 'Pin for emergency'}
                >
                  <Pin className={`w-4 h-4 ${isPinned ? 'fill-amber-600' : ''}`} />
                </motion.button>
                <motion.button
                  onClick={() => onDelete(report)}
                  className="p-2 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors ml-auto"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  title={t('common.delete')}
                >
                  <Trash2 className="w-4 h-4" />
                </motion.button>
              </>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ReportCard;

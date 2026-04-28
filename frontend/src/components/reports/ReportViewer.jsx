import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  X,
  Download,
  Share2,
  Pin,
  Trash2,
  Calendar,
  Stethoscope,
  Building2,
  FileText,
  Paperclip,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { REPORT_TYPES } from './ReportFilterBar';

const formatDate = (d) => {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
};

const typeMeta = (type) =>
  REPORT_TYPES.find((t) => t.value === type) || REPORT_TYPES[REPORT_TYPES.length - 1];

const IMAGE_TYPES = new Set(['JPG', 'JPEG', 'PNG', 'GIF', 'WEBP']);

const buildFilename = (title, fileType) => {
  const safeBase =
    (title || 'report').trim().replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 80) || 'report';
  const ext = (fileType || '').toLowerCase();
  return ext ? `${safeBase}.${ext}` : safeBase;
};

const ReportViewer = ({ report, onClose, onShare, onPin, onDelete, canEdit }) => {
  const { t } = useTranslation();
  const [downloading, setDownloading] = useState(false);
  if (!report) return null;
  const meta = typeMeta(report.reportType);
  const TypeIcon = meta.icon;
  const fileType = (report.fileType || '').toUpperCase();
  const isPdf = fileType === 'PDF';
  const isImage = IMAGE_TYPES.has(fileType);
  const isPinned = report.isPinnedForEmergency;

  // Cross-origin downloads from Cloudinary ignore the HTML `download`
  // attribute, so the browser opens the file inline instead of saving it.
  // Cloudinary's `fl_attachment` URL flag is image/video-only — it 400s on
  // `raw` URLs (PDFs, docs). The reliable workaround is to fetch the file
  // as a blob, then trigger a save through a same-origin object URL.
  const handleDownload = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      const response = await fetch(report.fileUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = buildFilename(report.title, fileType);
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (err) {
      toast.error(t('toast.somethingWrong'));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="relative bg-white w-full h-full sm:h-[92vh] sm:max-w-6xl sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row"
        initial={{ scale: 0.95, y: 30 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 30 }}
        transition={{ type: 'spring', damping: 28, stiffness: 260 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button (mobile overlay) */}
        <motion.button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-white/95 backdrop-blur-md shadow-lg flex items-center justify-center text-gray-700 hover:text-red-500 transition-colors"
          whileHover={{ scale: 1.1, rotate: 90 }}
          whileTap={{ scale: 0.9 }}
        >
          <X className="w-5 h-5" />
        </motion.button>

        {/* Preview pane */}
        <div className="flex-1 bg-gray-900 flex items-center justify-center min-h-[50vh] md:min-h-0 relative">
          {isPdf ? (
            <>
              <object
                data={report.fileUrl}
                type="application/pdf"
                className="w-full h-full bg-white"
                aria-label={report.title}
              >
                <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-300 px-6 text-center">
                  <div className="w-24 h-24 rounded-2xl bg-white/10 backdrop-blur-sm flex flex-col items-center justify-center">
                    <FileText className="w-10 h-10 text-white/70" />
                    <span className="text-[10px] font-bold tracking-wider mt-1 text-white/80">PDF</span>
                  </div>
                  <div>
                    <p className="font-semibold text-white">Preview not available in this browser</p>
                    <p className="text-xs text-gray-400 mt-1">Open the file in a new tab to view it.</p>
                  </div>
                </div>
              </object>
              <a
                href={report.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute top-3 left-3 inline-flex items-center gap-1.5 bg-black/70 hover:bg-black/90 text-white text-xs font-semibold px-3 py-2 rounded-lg backdrop-blur-md shadow-lg transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open in new tab
              </a>
            </>
          ) : isImage ? (
            <motion.img
              src={report.fileUrl}
              alt={report.title}
              className="max-w-full max-h-full object-contain"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            />
          ) : (
            <motion.div
              className="flex flex-col items-center gap-4 text-gray-300 px-6 text-center"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="w-24 h-24 rounded-2xl bg-white/10 backdrop-blur-sm flex flex-col items-center justify-center">
                <FileText className="w-10 h-10 text-white/70" />
                {fileType && (
                  <span className="text-[10px] font-bold tracking-wider mt-1 text-white/80">
                    {fileType}
                  </span>
                )}
              </div>
              <div>
                <p className="font-semibold text-white">Preview not available</p>
                <p className="text-xs text-gray-400 mt-1">
                  Download the file to view it on your device.
                </p>
              </div>
              <a
                href={report.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-primary text-white rounded-xl px-4 py-2 text-sm font-semibold shadow-lg shadow-primary/25 hover:bg-primary-dark transition-colors"
              >
                <Download className="w-4 h-4" />
                Open file
              </a>
            </motion.div>
          )}
        </div>

        {/* Sidebar */}
        <div className="w-full md:w-96 bg-white border-t md:border-t-0 md:border-l border-gray-100 flex flex-col overflow-y-auto">
          <div className="p-6 space-y-5">
            {/* Header */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className={`inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider ${meta.color}`}>
                  <TypeIcon className="w-4 h-4" />
                  {meta.label}
                </span>
                {isPinned && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                    <Pin className="w-3 h-3 fill-amber-600" />
                    EMERGENCY
                  </span>
                )}
              </div>
              <h2 className="text-xl font-bold text-gray-900 leading-tight">
                {report.title}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                for <span className="font-semibold text-gray-700">{report.familyMemberName}</span>
              </p>
            </div>

            {/* Meta list */}
            <div className="space-y-2.5 text-sm">
              {report.reportDate && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
                  <span>{formatDate(report.reportDate)}</span>
                </div>
              )}
              {report.doctorName && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Stethoscope className="w-4 h-4 text-gray-400 shrink-0" />
                  <span>{report.doctorName}</span>
                </div>
              )}
              {report.hospital && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Building2 className="w-4 h-4 text-gray-400 shrink-0" />
                  <span>{report.hospital}</span>
                </div>
              )}
              {report.specialty && (
                <div className="flex items-center gap-2 text-gray-600">
                  <FileText className="w-4 h-4 text-gray-400 shrink-0" />
                  <span>{report.specialty}</span>
                </div>
              )}
              {report.linkedAppointmentLabel && (
                <div className="flex items-center gap-2 text-primary-dark bg-primary-light/60 px-3 py-2 rounded-xl">
                  <Paperclip className="w-4 h-4 shrink-0" />
                  <span className="font-medium">{report.linkedAppointmentLabel}</span>
                </div>
              )}
            </div>

            {/* Tags */}
            {report.tags && (
              <div className="flex flex-wrap gap-1.5">
                {report.tags.split(',').filter(Boolean).map((tag, i) => (
                  <span
                    key={i}
                    className="text-xs font-semibold bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full"
                  >
                    {tag.trim()}
                  </span>
                ))}
              </div>
            )}

            {/* Notes */}
            {report.notes && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">Notes</h4>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{report.notes}</p>
              </div>
            )}

            {/* Uploaded by */}
            {report.uploadedByName && (
              <p className="text-xs text-gray-400">
                Uploaded by {report.uploadedByName}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="mt-auto p-4 border-t border-gray-100 bg-gray-50 flex items-center gap-2">
            <motion.button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              className="flex-1 flex items-center justify-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              whileHover={{ scale: downloading ? 1 : 1.02 }}
              whileTap={{ scale: downloading ? 1 : 0.98 }}
            >
              {downloading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Downloading…
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Download
                </>
              )}
            </motion.button>
            {canEdit && (
              <>
                <motion.button
                  onClick={() => onShare(report)}
                  className="flex-1 flex items-center justify-center gap-2 bg-primary text-white rounded-xl px-4 py-2.5 text-sm font-semibold shadow-md shadow-primary/25 hover:bg-primary-dark transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Share2 className="w-4 h-4" />
                  Share
                </motion.button>
                <motion.button
                  onClick={() => onPin(report)}
                  className={`p-2.5 rounded-xl transition-colors ${
                    isPinned
                      ? 'bg-amber-500 text-white'
                      : 'bg-white border border-gray-200 text-gray-400 hover:text-amber-500'
                  }`}
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.92 }}
                  title={isPinned ? 'Unpin' : 'Pin for emergency'}
                >
                  <Pin className={`w-4 h-4 ${isPinned ? 'fill-white' : ''}`} />
                </motion.button>
                <motion.button
                  onClick={() => onDelete(report)}
                  className="p-2.5 rounded-xl bg-white border border-gray-200 text-gray-300 hover:text-red-500 hover:border-red-200 transition-colors"
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.92 }}
                  title={t('common.delete')}
                >
                  <Trash2 className="w-4 h-4" />
                </motion.button>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ReportViewer;

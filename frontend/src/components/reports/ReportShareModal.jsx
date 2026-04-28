import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { X, Copy, Check, MessageCircle, Mail, LinkIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { reportsApi } from '../../api/reports.api';

const ReportShareModal = ({ report, onClose }) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['report-share', report?.id],
    queryFn: () => reportsApi.getShareUrl(report.id),
    enabled: !!report?.id,
  });

  const shareData = data?.data || {};
  const shareUrl = shareData.url || report?.fileUrl || '';
  const expiresAt = shareData.expiresAt
    ? new Date(shareData.expiresAt * 1000).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : null;

  const message = `Here's ${report?.title || 'the report'} for ${
    report?.familyMemberName || ''
  }${report?.doctorName ? `, from ${report.doctorName}` : ''}${
    report?.hospital ? ` (${report.hospital})` : ''
  }.\n\n${shareUrl}${expiresAt ? `\n\nValid until ${expiresAt}` : ''}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success(t('toast.saved'));
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      toast.error(t('toast.somethingWrong'));
    }
  };

  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(message)}`;
  const mailtoHref = `mailto:?subject=${encodeURIComponent(
    report?.title || 'Medical Report'
  )}&body=${encodeURIComponent(message)}`;

  return (
    <AnimatePresence>
      {report && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            initial={{ scale: 0.9, y: 30, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 30, opacity: 0 }}
            transition={{ type: 'spring', damping: 26, stiffness: 280 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-primary-light flex items-center justify-center">
                  <LinkIcon className="w-4 h-4 text-primary" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">Share Report</h2>
              </div>
              <motion.button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
              >
                <X className="w-5 h-5 text-gray-400" />
              </motion.button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">Sharing</p>
                <p className="text-base font-bold text-gray-900 truncate">{report.title}</p>
              </div>

              {/* URL box */}
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl p-2">
                <div className="flex-1 text-xs text-gray-600 px-2 truncate font-mono">
                  {isLoading ? 'Generating link...' : shareUrl}
                </div>
                <motion.button
                  onClick={handleCopy}
                  disabled={isLoading}
                  className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs font-bold text-gray-700 hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied' : 'Copy'}
                </motion.button>
              </div>

              {expiresAt && (
                <p className="text-xs text-gray-400 text-center">
                  Shareable until <span className="font-semibold text-gray-600">{expiresAt}</span>
                </p>
              )}

              {/* Share targets */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <motion.a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 bg-green-500 text-white rounded-xl px-4 py-3 font-semibold text-sm shadow-lg shadow-green-500/25 hover:bg-green-600 transition-colors"
                  whileHover={{ scale: 1.04, y: -2 }}
                  whileTap={{ scale: 0.96 }}
                >
                  <MessageCircle className="w-4 h-4" />
                  WhatsApp
                </motion.a>
                <motion.a
                  href={mailtoHref}
                  className="flex items-center justify-center gap-2 bg-gray-800 text-white rounded-xl px-4 py-3 font-semibold text-sm shadow-lg shadow-gray-800/25 hover:bg-gray-900 transition-colors"
                  whileHover={{ scale: 1.04, y: -2 }}
                  whileTap={{ scale: 0.96 }}
                >
                  <Mail className="w-4 h-4" />
                  Email
                </motion.a>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ReportShareModal;

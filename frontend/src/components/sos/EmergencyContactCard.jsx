import { motion } from 'framer-motion';
import {
  Phone,
  Star,
  Pencil,
  Trash2,
  StarOff,
  MessageCircle,
  Copy,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

// Detect mobile (where tel: actually opens the dialer).
const isMobile =
  typeof navigator !== 'undefined' &&
  /Android|iPhone|iPad|iPod|Opera Mini|IEMobile/i.test(navigator.userAgent);

// Build a wa.me URL — works on both mobile (opens WhatsApp app) and desktop
// (opens web.whatsapp.com).
const waUrl = (phone) => {
  const digits = (phone || '').replace(/[^0-9]/g, '');
  if (!digits) return null;
  const withCountry = digits.length === 10 ? `91${digits}` : digits;
  return `https://wa.me/${withCountry}`;
};

const EmergencyContactCard = ({ contact, onEdit, onDelete, onSetPrimary, canEdit = true }) => {
  const { t } = useTranslation();
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(contact.phone);
      toast.success(t('toast.saved'));
    } catch {
      toast.error(t('toast.somethingWrong'));
    }
  };

  const handleCall = (e) => {
    if (!isMobile) {
      // On desktop the tel: link does nothing useful. Copy the number instead
      // and tell the user how to actually call.
      e.preventDefault();
      handleCopy();
      toast(
        'Calls work on mobile. Number copied — dial it from your phone, or use WhatsApp.',
        { icon: '📱', duration: 4500 }
      );
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      whileHover={{ y: -2 }}
      className={`bg-white rounded-2xl p-4 sm:p-5 shadow-sm border ${
        contact.isPrimary ? 'border-primary/40 ring-2 ring-primary/10' : 'border-gray-100'
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-gray-900 truncate">{contact.name}</h3>
            {contact.isPrimary && (
              <span className="text-[10px] font-bold bg-primary text-white px-2 py-0.5 rounded-full uppercase tracking-wider flex-shrink-0">
                Primary
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 capitalize">{contact.relationship}</p>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <a
            href={waUrl(contact.phone) || '#'}
            target="_blank"
            rel="noreferrer"
            className="w-10 h-10 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center shadow-md transition-colors"
            title="Open WhatsApp chat"
          >
            <MessageCircle className="w-4 h-4" />
          </a>
          <a
            href={`tel:${contact.phone}`}
            onClick={handleCall}
            className="w-10 h-10 rounded-full bg-green-500 hover:bg-green-600 text-white flex items-center justify-center shadow-md transition-colors"
            title={isMobile ? 'Call now' : 'Copy number (open phone to call)'}
          >
            <Phone className="w-4 h-4" />
          </a>
        </div>
      </div>

      <button
        onClick={handleCopy}
        className="w-full bg-gray-50 hover:bg-gray-100 rounded-xl px-3 py-2 mb-3 flex items-center justify-between group transition-colors"
        title="Click to copy"
      >
        <p className="text-sm font-mono font-semibold text-gray-700 tracking-wider">
          {contact.phone}
        </p>
        <Copy className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600" />
      </button>

      {canEdit && (
        <div className="flex items-center gap-2 pt-2 border-t border-gray-50">
          {!contact.isPrimary && (
            <motion.button
              onClick={() => onSetPrimary(contact)}
              className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-primary px-2 py-1.5 rounded-lg hover:bg-primary-light transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Star className="w-3.5 h-3.5" />
              Set primary
            </motion.button>
          )}
          {contact.isPrimary && (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-primary px-2 py-1.5">
              <StarOff className="w-3.5 h-3.5" />
              Primary contact
            </span>
          )}
          <div className="ml-auto flex items-center gap-1">
            <motion.button
              onClick={() => onEdit(contact)}
              className="w-8 h-8 rounded-lg text-gray-400 hover:text-primary hover:bg-primary-light flex items-center justify-center transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              title={t('common.edit')}
            >
              <Pencil className="w-3.5 h-3.5" />
            </motion.button>
            <motion.button
              onClick={() => onDelete(contact)}
              className="w-8 h-8 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              title={t('common.delete')}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </motion.button>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default EmergencyContactCard;

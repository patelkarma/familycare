import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, Phone, X, MessageSquare, MessageCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

const isMobile =
  typeof navigator !== 'undefined' &&
  /Android|iPhone|iPad|iPod|Opera Mini|IEMobile/i.test(navigator.userAgent);

const waUrl = (phone) => {
  const digits = (phone || '').replace(/[^0-9]/g, '');
  if (!digits) return null;
  const withCountry = digits.length === 10 ? `91${digits}` : digits;
  return `https://wa.me/${withCountry}`;
};

const handleDesktopCall = (e, phone) => {
  if (isMobile) return; // mobile dialer handles it
  e.preventDefault();
  navigator.clipboard
    ?.writeText(phone)
    .then(() => toast('Number copied. Dial from your phone.', { icon: '📱', duration: 4000 }))
    .catch(() => toast.error('Could not copy number.'));
};

/**
 * Shown after the SOS trigger completes. Lists each contact and the
 * WhatsApp delivery status. Always offers a one-tap "Call 108"
 * fallback for life-threatening situations.
 */
const SOSResultModal = ({ isOpen, result, onClose }) => {
  const { t } = useTranslation();
  if (!isOpen) return null;

  const deliveries = result?.deliveryByContact || [];
  const totalContacts = result?.contactsNotified || deliveries.length;
  const anyChannelSent = deliveries.some((d) => d.whatsapp === 'SENT');

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          <motion.div
            className="relative bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-md max-h-[90vh] flex flex-col"
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', damping: 22, stiffness: 280 }}
          >
            {/* Header */}
            <div
              className={`px-6 pt-6 pb-5 rounded-t-3xl text-white ${
                anyChannelSent
                  ? 'bg-gradient-to-br from-green-500 to-green-600'
                  : 'bg-gradient-to-br from-amber-500 to-amber-600'
              }`}
            >
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-white/80 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
              <motion.div
                className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center mb-3"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 12, delay: 0.1 }}
              >
                {anyChannelSent ? (
                  <CheckCircle2 className="w-8 h-8" />
                ) : (
                  <XCircle className="w-8 h-8" />
                )}
              </motion.div>
              <h2 className="text-2xl font-extrabold">
                {anyChannelSent ? 'Alert sent' : 'Delivery failed'}
              </h2>
              <p className="text-white/90 text-sm mt-1">
                {anyChannelSent
                  ? `Notified ${totalContacts} emergency ${
                      totalContacts === 1 ? 'contact' : 'contacts'
                    }`
                  : 'No channels confirmed delivery — please call directly.'}
              </p>
            </div>

            {/* Per-contact list */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
              {deliveries.map((d, i) => (
                <motion.div
                  key={d.contactId || i}
                  className="rounded-2xl border border-gray-100 p-4 bg-gray-50"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 * i }}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <p className="font-bold text-gray-900 truncate flex items-center gap-2">
                        {d.name}
                        {d.isPrimary && (
                          <span className="text-[10px] font-bold bg-primary text-white px-2 py-0.5 rounded-full uppercase">
                            Primary
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {d.relationship} · {d.phone}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <a
                        href={waUrl(d.phone) || '#'}
                        target="_blank"
                        rel="noreferrer"
                        className="w-9 h-9 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md hover:bg-emerald-600"
                        title="WhatsApp"
                        aria-label="WhatsApp"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </a>
                      <a
                        href={`tel:${d.phone}`}
                        onClick={(e) => handleDesktopCall(e, d.phone)}
                        className="w-9 h-9 rounded-full bg-green-500 text-white flex items-center justify-center shadow-md hover:bg-green-600"
                        title={isMobile ? 'Call now' : 'Copy number (call from phone)'}
                      >
                        <Phone className="w-4 h-4" />
                      </a>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <DeliveryBadge channel="WhatsApp" status={d.whatsapp} />
                  </div>
                </motion.div>
              ))}

              {deliveries.length === 0 && (
                <p className="text-center text-sm text-gray-400 py-6">
                  No delivery details available.
                </p>
              )}
            </div>

            {/* Footer: 108 + Done */}
            <div className="border-t border-gray-100 p-4 space-y-3">
              <a
                href="tel:108"
                className="flex items-center justify-center gap-3 w-full bg-red-500 hover:bg-red-600 text-white font-extrabold text-lg rounded-2xl py-4 shadow-lg shadow-red-500/30"
              >
                <Phone className="w-5 h-5" />
                Call 108 (Ambulance)
              </a>
              <button
                onClick={onClose}
                className="w-full text-gray-500 hover:text-gray-700 text-sm font-medium py-2"
              >
                Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const DeliveryBadge = ({ channel, status }) => {
  const styles = {
    SENT: 'bg-green-100 text-green-700',
    FAILED: 'bg-red-100 text-red-700',
    PENDING: 'bg-amber-100 text-amber-700',
    SKIPPED: 'bg-gray-100 text-gray-500',
  };
  const Icon = status === 'SENT' ? CheckCircle2 : status === 'FAILED' ? XCircle : MessageSquare;
  return (
    <div
      className={`flex-1 flex items-center justify-center gap-1.5 text-[11px] font-bold rounded-full py-1.5 ${
        styles[status] || styles.PENDING
      }`}
    >
      <Icon className="w-3 h-3" />
      {channel} · {status || 'PENDING'}
    </div>
  );
};

export default SOSResultModal;

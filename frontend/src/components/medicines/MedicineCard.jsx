import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Sun,
  Cloud,
  Moon,
  Check,
  SkipForward,
  Pencil,
  Trash2,
  Package,
  AlertTriangle,
  Clock,
  MessageSquare,
  MapPin,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { medicinesApi } from '../../api/medicines.api';

const formIcons = {
  Tablet: '💊',
  Capsule: '💊',
  Syrup: '🧴',
  Injection: '💉',
  Drops: '💧',
  Cream: '🧴',
  Inhaler: '🌬️',
};

const formColors = {
  Tablet: 'bg-blue-500',
  Capsule: 'bg-purple-500',
  Syrup: 'bg-amber-500',
  Injection: 'bg-red-500',
  Drops: 'bg-cyan-500',
  Cream: 'bg-pink-500',
  Inhaler: 'bg-teal-500',
};

const timingConfig = {
  morning: { icon: Sun, label: 'Morning', color: 'bg-amber-100 text-amber-700' },
  afternoon: { icon: Cloud, label: 'Afternoon', color: 'bg-sky-100 text-sky-700' },
  night: { icon: Moon, label: 'Night', color: 'bg-indigo-100 text-indigo-700' },
};


const MedicineCard = ({ medicine, onEdit, onDelete, memberId, doseStatuses = {} }) => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [resendingTiming, setResendingTiming] = useState(null);

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['medicines', memberId] });
    queryClient.invalidateQueries({ queryKey: ['memberSchedule', memberId] });
    queryClient.invalidateQueries({ queryKey: ['familyOverview'] });
    queryClient.invalidateQueries({ queryKey: ['mySchedule'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
  };

  const resendMutation = useMutation({
    mutationFn: ({ timing }) =>
      medicinesApi.resendReminder(medicine.id, timing),
    onSuccess: () => {
      setResendingTiming(null);
      invalidateAll();
      toast.success(t('toast.saved'));
    },
    onError: (err) => {
      setResendingTiming(null);
      const msg = err.response?.data?.message || 'Failed to resend reminder';
      toast.error(msg);
    },
  });

  const timing = medicine.timing || {};
  const activeTimings = Object.entries(timing).filter(([, time]) => time);
  const stockPercent = medicine.stockCount > 0
    ? Math.min((medicine.stockCount / Math.max(medicine.lowStockAlert * 3, 30)) * 100, 100)
    : 0;
  const isLowStock = medicine.stockCount <= medicine.lowStockAlert && medicine.stockCount > 0;
  const isOutOfStock = medicine.stockCount === 0;

  const formColor = formColors[medicine.form] || 'bg-gray-500';
  const formIcon = formIcons[medicine.form] || '💊';

  // Determine next dose
  const now = new Date();
  const currentHour = now.getHours();
  let nextDose = null;
  if (timing.morning && currentHour < 12) nextDose = 'morning';
  else if (timing.afternoon && currentHour < 17) nextDose = 'afternoon';
  else if (timing.night) nextDose = 'night';

  return (
    <motion.div
      className="bg-white rounded-2xl p-5 shadow-sm border-2 border-gray-50 hover:border-primary-light transition-colors relative overflow-hidden"
      layout
      whileHover={{ y: -6 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
    >

      {/* Header */}
      <div className="flex items-start gap-4 mb-4">
        <div className={`w-12 h-12 ${formColor} rounded-xl flex items-center justify-center text-2xl shadow-sm`}>
          {formIcon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-gray-900 text-lg truncate">{medicine.name}</h3>
          <p className="text-sm text-gray-500">
            {medicine.dosage} &middot; {medicine.frequency}
          </p>
          {medicine.genericName && (
            <p className="text-xs text-gray-400 mt-0.5">{medicine.genericName}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-1">
          <motion.button
            onClick={() => onEdit(medicine)}
            className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <Pencil className="w-4 h-4" />
          </motion.button>
          <motion.button
            onClick={() => onDelete(medicine.id)}
            className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <Trash2 className="w-4 h-4" />
          </motion.button>
        </div>
      </div>

      {/* Timing badges with dose status */}
      {activeTimings.length > 0 && (
        <div className="space-y-2 mb-4">
          <div className="flex flex-wrap gap-2">
            {activeTimings.map(([key, time]) => {
              const config = timingConfig[key];
              if (!config) return null;
              const Icon = config.icon;
              const isNext = key === nextDose;
              const slotData = doseStatuses[key];
              const status = slotData?.status;

              const statusStyles = {
                TAKEN: 'bg-green-100 text-green-700 ring-green-200',
                MISSED: 'bg-red-50 text-red-600 ring-red-200',
                SKIPPED: 'bg-gray-100 text-gray-500 ring-gray-200',
              };
              const statusIcons = {
                TAKEN: <Check className="w-3 h-3" />,
                MISSED: <AlertTriangle className="w-3 h-3" />,
                SKIPPED: <SkipForward className="w-3 h-3" />,
              };

              const badgeStyle = status && statusStyles[status]
                ? `${statusStyles[status]} ring-1`
                : `${config.color} ${isNext ? 'ring-2 ring-primary/30' : ''}`;

              return (
                <motion.div
                  key={key}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${badgeStyle}`}
                  animate={isNext && !status ? { scale: [1, 1.03, 1] } : {}}
                  transition={isNext ? { duration: 2, repeat: Infinity, ease: 'easeInOut' } : {}}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {config.label} {time}
                  {status && statusIcons[status] && (
                    <span className="ml-0.5">{statusIcons[status]}</span>
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Dose action details */}
          {Object.entries(doseStatuses).some(([, s]) => s?.status === 'TAKEN' && s?.takenAt) && (
            <div className="space-y-1">
              {activeTimings.map(([key]) => {
                const slotData = doseStatuses[key];
                if (!slotData || slotData.status !== 'TAKEN' || !slotData.takenAt) return null;
                const timingLabel = timingConfig[key]?.label || key;
                const takenTime = new Date(slotData.takenAt).toLocaleTimeString('en-IN', {
                  hour: '2-digit',
                  minute: '2-digit',
                });
                return (
                  <motion.p
                    key={key}
                    className="text-xs text-green-600 flex items-center gap-1"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Clock className="w-3 h-3" />
                    {timingLabel} taken at {takenTime}
                    {slotData.markedByName && (
                      <span className="text-gray-400"> by {slotData.markedByName}</span>
                    )}
                  </motion.p>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Stock bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Package className="w-3.5 h-3.5" />
            <span>Stock: {medicine.stockCount} doses</span>
          </div>
          {isLowStock && (
            <motion.span
              className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1"
              animate={{ opacity: [1, 0.6, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <AlertTriangle className="w-3 h-3" />
              Low
            </motion.span>
          )}
          {isOutOfStock && (
            <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">
              Out of stock
            </span>
          )}
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${
              isOutOfStock ? 'bg-red-400' : isLowStock ? 'bg-amber-400' : 'bg-green-400'
            }`}
            initial={{ width: 0 }}
            animate={{ width: `${stockPercent}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
        {(isLowStock || isOutOfStock) && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-2"
          >
            <Link
              to="/pharmacy"
              className="inline-flex items-center gap-1.5 text-xs bg-primary-light text-primary-dark px-2.5 py-1 rounded-full font-semibold hover:bg-primary hover:text-white transition-colors"
            >
              <MapPin className="w-3 h-3" />
              Find pharmacy nearby
            </Link>
          </motion.div>
        )}
      </div>

      {/* Today's dose status timeline */}
      {activeTimings.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Today's Doses</p>
          {activeTimings.map(([key, time]) => {
            const config = timingConfig[key];
            if (!config) return null;
            const Icon = config.icon;
            const slotData = doseStatuses[key];
            const status = slotData?.status;

            return (
              <motion.div
                key={key}
                className="flex items-center justify-between py-2 border-t border-gray-50 first:border-t-0"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon className="w-4 h-4 text-gray-400 shrink-0" />
                  <span className="text-sm font-medium text-gray-700">{config.label}</span>

                  {status === 'TAKEN' && (
                    <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                      <Check className="w-3 h-3" />
                      Taken{slotData.takenAt && ` at ${new Date(slotData.takenAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`}
                      {slotData.markedByName && <span className="text-gray-400">by {slotData.markedByName}</span>}
                    </span>
                  )}

                  {status === 'PENDING' && (
                    <span className="flex items-center gap-1.5 text-xs text-amber-600 font-medium">
                      <motion.span
                        className="w-2 h-2 rounded-full bg-amber-400"
                        animate={{ opacity: [1, 0.4, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      />
                      Reminder sent - Awaiting
                    </span>
                  )}

                  {status === 'MISSED' && (
                    <span className="flex items-center gap-1 text-xs text-red-500 font-medium">
                      <AlertTriangle className="w-3 h-3" />
                      Missed - No response
                    </span>
                  )}

                  {status === 'SKIPPED' && (
                    <span className="flex items-center gap-1 text-xs text-gray-400 font-medium">
                      <SkipForward className="w-3 h-3" />
                      Skipped
                    </span>
                  )}

                  {!status && (
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <Clock className="w-3 h-3" />
                      Scheduled at {time}
                    </span>
                  )}
                </div>

                {/* Resend button for PENDING or MISSED */}
                {(status === 'PENDING' || status === 'MISSED') && (
                  <motion.button
                    onClick={() => {
                      setResendingTiming(key.toUpperCase());
                      resendMutation.mutate({ timing: key.toUpperCase() });
                    }}
                    disabled={resendingTiming !== null}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 text-green-700 text-xs font-semibold hover:bg-green-100 transition-colors disabled:opacity-50 shrink-0"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    title={t('common.continue')}
                  >
                    {resendingTiming === key.toUpperCase() ? (
                      <motion.div
                        className="w-3 h-3 border-2 border-green-300 border-t-green-700 rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      />
                    ) : (
                      <MessageSquare className="w-3.5 h-3.5" />
                    )}
                    Resend
                  </motion.button>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* With food note */}
      {medicine.withFood && (
        <p className="text-xs text-gray-400 mt-3 text-center">{t('medicineForm.withFood')}</p>
      )}
    </motion.div>
  );
};

export default MedicineCard;

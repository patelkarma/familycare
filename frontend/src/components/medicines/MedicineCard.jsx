import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Pill,
  Sun,
  Cloud,
  Moon,
  Check,
  SkipForward,
  Pencil,
  Trash2,
  Package,
  AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';
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

const doseStatusDot = {
  TAKEN: 'bg-green-500',
  PENDING: 'bg-amber-400',
  MISSED: 'bg-red-500',
  SKIPPED: 'bg-gray-400',
};

const MedicineCard = ({ medicine, onEdit, onDelete, memberId, doseStatuses = {} }) => {
  const [showSuccess, setShowSuccess] = useState(false);
  const queryClient = useQueryClient();

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['medicines', memberId] });
    queryClient.invalidateQueries({ queryKey: ['memberSchedule', memberId] });
    queryClient.invalidateQueries({ queryKey: ['familyOverview'] });
    queryClient.invalidateQueries({ queryKey: ['mySchedule'] });
  };

  const takenMutation = useMutation({
    mutationFn: ({ timing }) =>
      medicinesApi.markTaken(medicine.id, { doseTiming: timing, notes: '' }),
    onSuccess: () => {
      invalidateAll();
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
      toast.success('Dose marked as taken!');
    },
    onError: (err) => {
      const msg = err.response?.data?.message || 'Failed to mark dose';
      toast.error(msg);
    },
  });

  const skippedMutation = useMutation({
    mutationFn: ({ timing }) =>
      medicinesApi.markSkipped(medicine.id, { doseTiming: timing, notes: '' }),
    onSuccess: () => {
      invalidateAll();
      toast('Dose skipped', { icon: '⏭️' });
    },
    onError: (err) => {
      const msg = err.response?.data?.message || 'Failed to skip dose';
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
      className={`bg-white rounded-2xl p-5 shadow-sm border-2 transition-colors relative overflow-hidden ${
        showSuccess ? 'border-green-300' : 'border-gray-50 hover:border-primary-light'
      }`}
      layout
      whileHover={{ y: -6 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
    >
      {/* Success overlay */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            className="absolute inset-0 bg-green-50/90 flex items-center justify-center z-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 400 }}
            >
              <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center">
                <Check className="w-8 h-8 text-white" strokeWidth={3} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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

      {/* Timing badges */}
      {activeTimings.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {activeTimings.map(([key, time]) => {
            const config = timingConfig[key];
            if (!config) return null;
            const Icon = config.icon;
            const isNext = key === nextDose;

            const doseStatus = doseStatuses[key];
            const dotColor = doseStatus ? doseStatusDot[doseStatus] : null;

            return (
              <motion.div
                key={key}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${config.color} ${
                  isNext ? 'ring-2 ring-primary/30' : ''
                }`}
                animate={isNext ? { scale: [1, 1.03, 1] } : {}}
                transition={isNext ? { duration: 2, repeat: Infinity, ease: 'easeInOut' } : {}}
              >
                <Icon className="w-3.5 h-3.5" />
                {config.label} {time}
                {dotColor && (
                  <span className={`w-2 h-2 rounded-full ${dotColor} ml-1`} />
                )}
              </motion.div>
            );
          })}
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
      </div>

      {/* Quick actions */}
      <div className="flex gap-2">
        <motion.button
          onClick={() => {
            const currentTiming = nextDose || (activeTimings[0] && activeTimings[0][0]) || 'MORNING';
            takenMutation.mutate({ timing: currentTiming.toUpperCase() });
          }}
          disabled={takenMutation.isPending}
          className="flex-1 flex items-center justify-center gap-2 bg-primary text-white rounded-xl px-4 py-3 font-semibold text-sm shadow-lg shadow-primary/20 hover:bg-primary-dark transition-colors disabled:opacity-60"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
        >
          {takenMutation.isPending ? (
            <motion.div
              className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
          ) : (
            <>
              <Check className="w-4 h-4" />
              Take Now
            </>
          )}
        </motion.button>
        <motion.button
          onClick={() => {
            const currentTiming = nextDose || (activeTimings[0] && activeTimings[0][0]) || 'MORNING';
            skippedMutation.mutate({ timing: currentTiming.toUpperCase() });
          }}
          disabled={skippedMutation.isPending}
          className="px-4 py-3 rounded-xl border border-gray-200 text-gray-600 font-medium text-sm hover:bg-gray-50 transition-colors disabled:opacity-60"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
        >
          <SkipForward className="w-4 h-4" />
        </motion.button>
      </div>

      {/* With food note */}
      {medicine.withFood && (
        <p className="text-xs text-gray-400 mt-3 text-center">Take with food</p>
      )}
    </motion.div>
  );
};

export default MedicineCard;

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Cloud, Moon, Check, SkipForward, Clock, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { scheduleApi } from '../api/schedule.api';
import { medicinesApi } from '../api/medicines.api';
import LoadingSpinner from '../components/shared/LoadingSpinner';

const formIcons = {
  Tablet: '💊',
  Capsule: '💊',
  Syrup: '🧴',
  Injection: '💉',
  Drops: '💧',
  Cream: '🧴',
  Inhaler: '🌬️',
};

const timingIcons = {
  morning: Sun,
  afternoon: Cloud,
  night: Moon,
};

const timingLabels = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  night: 'Night',
};

const statusConfig = {
  PENDING: { color: 'bg-amber-100 text-amber-700', label: 'Pending' },
  TAKEN: { color: 'bg-green-100 text-green-700', label: 'Taken' },
  SKIPPED: { color: 'bg-gray-100 text-gray-500', label: 'Skipped' },
  MISSED: { color: 'bg-red-100 text-red-700', label: 'Missed' },
};

const PatientMedicines = () => {
  const queryClient = useQueryClient();
  const today = new Date().toISOString().split('T')[0];
  const [actioningSlot, setActioningSlot] = useState(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['mySchedule', today],
    queryFn: () => scheduleApi.getMyDaily(today),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    refetchInterval: 60_000,
  });

  const markTakenMutation = useMutation({
    mutationFn: ({ medicineId, doseTiming }) =>
      medicinesApi.markTaken(medicineId, { doseTiming, notes: '' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mySchedule'] });
      toast.success('Dose marked as taken!');
      setActioningSlot(null);
    },
    onError: (err) => {
      const msg = err.response?.data?.message || 'Failed to mark dose';
      toast.error(msg);
      setActioningSlot(null);
    },
  });

  const markSkippedMutation = useMutation({
    mutationFn: ({ medicineId, doseTiming }) =>
      medicinesApi.markSkipped(medicineId, { doseTiming, notes: '' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mySchedule'] });
      toast.success('Dose skipped');
      setActioningSlot(null);
    },
    onError: (err) => {
      const msg = err.response?.data?.message || 'Failed to skip dose';
      toast.error(msg);
      setActioningSlot(null);
    },
  });

  if (isLoading) return <LoadingSpinner />;

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-red-500">Failed to load schedule. Please try again.</p>
      </div>
    );
  }

  const schedule = data?.data;
  const slots = schedule?.slots || [];

  // Group slots by timing
  const grouped = { morning: [], afternoon: [], night: [] };
  slots.forEach((slot) => {
    const key = slot.timingKey?.toLowerCase();
    if (grouped[key]) {
      grouped[key].push(slot);
    }
  });

  const totalSlots = slots.length;
  const takenSlots = slots.filter((s) => s.status === 'TAKEN').length;

  const formatDate = () => {
    return new Date().toLocaleDateString('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <motion.div
      className="max-w-2xl mx-auto px-4 py-6 pb-24 lg:pb-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Header */}
      <div className="mb-6">
        <motion.h1
          className="text-2xl font-bold text-gray-900"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          My Medicines
        </motion.h1>
        <p className="text-sm text-gray-500 mt-1">{formatDate()}</p>
        {totalSlots > 0 && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-gray-600">
                {takenSlots} of {totalSlots} doses taken
              </span>
              <span className="font-semibold text-primary">
                {Math.round((takenSlots / totalSlots) * 100)}%
              </span>
            </div>
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-primary rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${(takenSlots / totalSlots) * 100}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Empty State */}
      {totalSlots === 0 && (
        <motion.div
          className="text-center py-16 bg-white rounded-2xl shadow-sm"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          <div className="text-5xl mb-4">🎉</div>
          <h3 className="text-lg font-semibold text-gray-900">No medicines scheduled</h3>
          <p className="text-sm text-gray-500 mt-1">You're all clear for today!</p>
        </motion.div>
      )}

      {/* Dose Groups */}
      {['morning', 'afternoon', 'night'].map((timeOfDay) => {
        const groupSlots = grouped[timeOfDay];
        if (groupSlots.length === 0) return null;

        const TimingIcon = timingIcons[timeOfDay];

        return (
          <motion.div
            key={timeOfDay}
            className="mb-6"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center gap-2 mb-3">
              <TimingIcon className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-gray-900">
                {timingLabels[timeOfDay]}
              </h2>
              <span className="text-xs text-gray-400 ml-1">
                {groupSlots[0]?.scheduledTime}
              </span>
            </div>

            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {groupSlots.map((slot) => {
                  const slotKey = `${slot.medicineId}-${slot.timingKey}`;
                  const isActioning = actioningSlot === slotKey;
                  const config = statusConfig[slot.status] || statusConfig.PENDING;

                  return (
                    <motion.div
                      key={slotKey}
                      layout
                      className="bg-white rounded-2xl shadow-sm p-4 border border-gray-50"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      whileHover={{ y: -2 }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">
                            {formIcons[slot.form] || '💊'}
                          </span>
                          <div>
                            <h3 className="font-semibold text-gray-900">
                              {slot.medicineName}
                            </h3>
                            <p className="text-sm text-gray-500">{slot.dosage}</p>
                            {slot.withFood && (
                              <p className="text-xs text-amber-600 mt-0.5">
                                Take with food
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {slot.status === 'TAKEN' && (
                            <motion.div
                              className="flex items-center gap-1.5 bg-green-100 text-green-700 px-3 py-1.5 rounded-xl"
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ type: 'spring', stiffness: 300 }}
                            >
                              <Check className="w-4 h-4" />
                              <span className="text-sm font-medium">Taken</span>
                            </motion.div>
                          )}

                          {slot.status === 'SKIPPED' && (
                            <div className="flex items-center gap-1.5 bg-gray-100 text-gray-500 px-3 py-1.5 rounded-xl">
                              <SkipForward className="w-4 h-4" />
                              <span className="text-sm font-medium">Skipped</span>
                            </div>
                          )}

                          {slot.status === 'MISSED' && (
                            <div className="flex items-center gap-1.5 bg-red-100 text-red-700 px-3 py-1.5 rounded-xl">
                              <AlertTriangle className="w-4 h-4" />
                              <span className="text-sm font-medium">Missed</span>
                            </div>
                          )}

                          {(slot.status === 'PENDING' || slot.status === 'MISSED') && (
                            <div className="flex items-center gap-2">
                              <motion.button
                                onClick={() => {
                                  setActioningSlot(slotKey);
                                  markTakenMutation.mutate({
                                    medicineId: slot.medicineId,
                                    doseTiming: slot.timingKey,
                                  });
                                }}
                                disabled={isActioning}
                                className="flex items-center gap-1.5 bg-primary text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.97 }}
                              >
                                <Check className="w-4 h-4" />
                                Take Now
                              </motion.button>
                              {slot.status === 'PENDING' && (
                                <motion.button
                                  onClick={() => {
                                    setActioningSlot(slotKey);
                                    markSkippedMutation.mutate({
                                      medicineId: slot.medicineId,
                                      doseTiming: slot.timingKey,
                                    });
                                  }}
                                  disabled={isActioning}
                                  className="flex items-center gap-1 text-gray-400 hover:text-gray-600 px-2 py-2 rounded-xl text-sm transition-colors disabled:opacity-50"
                                  whileTap={{ scale: 0.97 }}
                                >
                                  <SkipForward className="w-4 h-4" />
                                </motion.button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Taken timestamp */}
                      {slot.status === 'TAKEN' && slot.takenAt && (
                        <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Taken at{' '}
                          {new Date(slot.takenAt).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                          {slot.markedByName && ` by ${slot.markedByName}`}
                        </p>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
};

export default PatientMedicines;

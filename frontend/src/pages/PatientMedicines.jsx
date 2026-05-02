import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Cloud, Moon, Check, SkipForward, Clock, AlertTriangle, Phone } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { scheduleApi } from '../api/schedule.api';
import { medicinesApi } from '../api/medicines.api';
import { sosApi } from '../api/sos.api';
import { useAuth } from '../hooks/useAuth';
import DoseSkeleton from '../components/shared/DoseSkeleton';
import ErrorState from '../components/shared/ErrorState';
import SOSButton from '../components/sos/SOSButton';
import SOSCountdownModal from '../components/sos/SOSCountdownModal';
import SOSResultModal from '../components/sos/SOSResultModal';

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
  const { t } = useTranslation();
  const { user } = useAuth();
  const today = new Date().toISOString().split('T')[0];
  const [actioningSlot, setActioningSlot] = useState(null);
  const [showCountdown, setShowCountdown] = useState(false);
  const [triggerResult, setTriggerResult] = useState(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['mySchedule', today],
    queryFn: () => scheduleApi.getMyDaily(today),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    refetchInterval: 60_000,
  });

  // Helper used by both mark-taken and mark-skipped to flip a slot's status
  // in the cached query data without waiting for the server round-trip.
  // Marking a dose taken on a phone in a clinic with bad signal should feel
  // instant — the rollback path covers the rare failure case.
  const applyOptimisticStatus = ({ medicineId, doseTiming, status }) => {
    queryClient.setQueryData(['mySchedule', today], (cached) => {
      if (!cached?.data?.slots) return cached;
      return {
        ...cached,
        data: {
          ...cached.data,
          slots: cached.data.slots.map((s) =>
            s.medicineId === medicineId && s.timingKey === doseTiming
              ? { ...s, status, takenAt: status === 'TAKEN' ? new Date().toISOString() : s.takenAt }
              : s
          ),
        },
      };
    });
  };

  const { data: contactsData } = useQuery({
    queryKey: ['sos-contacts', user?.familyMemberId],
    queryFn: () => sosApi.getContacts(user.familyMemberId),
    enabled: !!user?.familyMemberId,
  });
  const contacts = contactsData?.data || [];

  const triggerMutation = useMutation({
    mutationFn: (location) =>
      sosApi.trigger({
        memberId: user.familyMemberId,
        latitude: location.latitude,
        longitude: location.longitude,
        accuracyMeters: location.accuracyMeters,
      }),
    onSuccess: (res) => {
      setShowCountdown(false);
      setTriggerResult(res?.data);
      toast.success(t('toast.saved'));
    },
    onError: (err) => {
      setShowCountdown(false);
      toast.error(err?.response?.data?.message || t('toast.somethingWrong'));
    },
  });

  const markTakenMutation = useMutation({
    mutationFn: ({ medicineId, doseTiming }) =>
      medicinesApi.markTaken(medicineId, { doseTiming, notes: '' }),
    onMutate: async ({ medicineId, doseTiming }) => {
      // Cancel any in-flight refetch so it doesn't overwrite our optimistic update.
      await queryClient.cancelQueries({ queryKey: ['mySchedule', today] });
      const previous = queryClient.getQueryData(['mySchedule', today]);
      applyOptimisticStatus({ medicineId, doseTiming, status: 'TAKEN' });
      return { previous };
    },
    onSuccess: () => {
      toast.success(t('status.doseTaken'));
      setActioningSlot(null);
    },
    onError: (err, _vars, context) => {
      // Roll back to the snapshot we took in onMutate.
      if (context?.previous) {
        queryClient.setQueryData(['mySchedule', today], context.previous);
      }
      const msg = err.response?.data?.message || 'Failed to mark dose';
      toast.error(msg);
      setActioningSlot(null);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['mySchedule'] });
    },
  });

  const markSkippedMutation = useMutation({
    mutationFn: ({ medicineId, doseTiming }) =>
      medicinesApi.markSkipped(medicineId, { doseTiming, notes: '' }),
    onMutate: async ({ medicineId, doseTiming }) => {
      await queryClient.cancelQueries({ queryKey: ['mySchedule', today] });
      const previous = queryClient.getQueryData(['mySchedule', today]);
      applyOptimisticStatus({ medicineId, doseTiming, status: 'SKIPPED' });
      return { previous };
    },
    onSuccess: () => {
      toast.success(t('status.doseSkipped'));
      setActioningSlot(null);
    },
    onError: (err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['mySchedule', today], context.previous);
      }
      const msg = err.response?.data?.message || 'Failed to skip dose';
      toast.error(msg);
      setActioningSlot(null);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['mySchedule'] });
    },
  });

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 pb-24 lg:pb-6">
        <DoseSkeleton rows={3} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 pb-24 lg:pb-6">
        <ErrorState
          title="Could not load today's doses"
          description="Check your connection and try again. Your previously marked doses are safe."
          onRetry={() => refetch()}
          retryLabel="Try again"
        />
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
      {/* Emergency SOS */}
      <motion.div
        className="mb-6 bg-gradient-to-br from-red-50 to-amber-50 rounded-3xl p-5 border border-red-100"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-5">
          <SOSButton
            size="sm"
            onClick={() => {
              if (contacts.length === 0) {
                toast.error(t('emptyDesc.addContactDesc'));
                return;
              }
              setShowCountdown(true);
            }}
            disabled={triggerMutation.isPending || contacts.length === 0}
          />
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-extrabold text-gray-900 mb-1">
              Need urgent help?
            </h2>
            <p className="text-sm text-gray-600 mb-2">
              {contacts.length === 0
                ? 'Ask your family to add emergency contacts first.'
                : `Press to alert ${contacts.length} ${
                    contacts.length === 1 ? 'contact' : 'contacts'
                  } with your location and medical info.`}
            </p>
            <a
              href="tel:108"
              className="inline-flex items-center gap-1.5 text-red-600 hover:text-red-700 font-bold text-sm"
            >
              <Phone className="w-4 h-4" />
              Or call 108
            </a>
          </div>
        </div>
      </motion.div>

      {/* Header */}
      <div className="mb-6">
        <motion.h1
          className="text-3xl font-bold text-gray-900"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          My Medicines
        </motion.h1>
        <p className="text-base text-gray-500 mt-1">{formatDate()}</p>
        {totalSlots > 0 && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-base mb-1.5">
              <span className="text-gray-600">
                {takenSlots} of {totalSlots} doses taken
              </span>
              <span className="font-semibold text-primary">
                {Math.round((takenSlots / totalSlots) * 100)}%
              </span>
            </div>
            <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
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
          <h3 className="text-xl font-semibold text-gray-900">{t('status.noMedicinesScheduled')}</h3>
          <p className="text-base text-gray-500 mt-1">{t('status.allClearToday')}</p>
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
              <TimingIcon className="w-6 h-6 text-primary" />
              <h2 className="text-xl font-semibold text-gray-900">
                {timingLabels[timeOfDay]}
              </h2>
              <span className="text-sm text-gray-400 ml-1">
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
                      className="bg-white rounded-2xl shadow-sm p-5 border border-gray-50"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      whileHover={{ y: -2 }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-3xl">
                            {formIcons[slot.form] || '💊'}
                          </span>
                          <div>
                            <h3 className="text-lg font-bold text-gray-900">
                              {slot.medicineName}
                            </h3>
                            <p className="text-base text-gray-500">{slot.dosage}</p>
                            {slot.withFood && (
                              <p className="text-sm text-amber-600 mt-0.5">
                                Take with food
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {slot.status === 'TAKEN' && (
                            <motion.div
                              className="flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-xl"
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ type: 'spring', stiffness: 300 }}
                            >
                              <Check className="w-5 h-5" />
                              <span className="text-base font-medium">{t('status.taken')}</span>
                            </motion.div>
                          )}

                          {slot.status === 'SKIPPED' && (
                            <div className="flex items-center gap-2 bg-gray-100 text-gray-500 px-4 py-2 rounded-xl">
                              <SkipForward className="w-5 h-5" />
                              <span className="text-base font-medium">{t('status.skipped')}</span>
                            </div>
                          )}

                          {slot.status === 'MISSED' && (
                            <div className="flex items-center gap-2 bg-red-100 text-red-700 px-4 py-2 rounded-xl">
                              <AlertTriangle className="w-5 h-5" />
                              <span className="text-base font-medium">{t('status.missed')}</span>
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
                                className="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-xl text-base font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50 shadow-lg shadow-primary/25"
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.97 }}
                              >
                                <Check className="w-5 h-5" />
                                {t('status.markTaken')}
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
                                  className="flex items-center gap-1 text-gray-400 hover:text-gray-600 px-3 py-3 rounded-xl text-base transition-colors disabled:opacity-50"
                                  whileTap={{ scale: 0.97 }}
                                >
                                  <SkipForward className="w-5 h-5" />
                                </motion.button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Taken timestamp */}
                      {slot.status === 'TAKEN' && slot.takenAt && (
                        <p className="text-sm text-gray-400 mt-2 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
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

      <SOSCountdownModal
        isOpen={showCountdown}
        memberName={user?.name}
        onCancel={() => setShowCountdown(false)}
        onConfirm={(location) => triggerMutation.mutate(location)}
      />
      <SOSResultModal
        isOpen={!!triggerResult}
        result={triggerResult}
        onClose={() => setTriggerResult(null)}
      />
    </motion.div>
  );
};

export default PatientMedicines;

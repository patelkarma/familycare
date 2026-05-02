import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Pill,
  Sun,
  Cloud,
  Moon,
  Check,
  AlertTriangle,
  Clock,
  ArrowLeft,
  Activity,
  CalendarDays,
  ChevronDown,
  BarChart3,
  SkipForward,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { scheduleApi } from '../api/schedule.api';
import Avatar from '../components/shared/Avatar';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import DoseSkeleton from '../components/shared/DoseSkeleton';
import ErrorState from '../components/shared/ErrorState';
import EmptyState from '../components/shared/EmptyState';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

const timingConfig = {
  morning: { icon: Sun, label: 'Morning' },
  afternoon: { icon: Cloud, label: 'Afternoon' },
  night: { icon: Moon, label: 'Night' },
};

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const getAdherenceColor = (percent) => {
  if (percent >= 80) return { bar: 'bg-green-500', text: 'text-green-600', bg: 'bg-green-50', label: 'Good' };
  if (percent >= 50) return { bar: 'bg-amber-500', text: 'text-amber-600', bg: 'bg-amber-50', label: 'Average' };
  return { bar: 'bg-red-500', text: 'text-red-600', bg: 'bg-red-50', label: 'Needs Attention' };
};

const DosesToday = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const today = new Date().toISOString().split('T')[0];
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const { data: overviewData, isLoading, error: overviewError, refetch } = useQuery({
    queryKey: ['familyOverview', today],
    queryFn: () => scheduleApi.getFamilyOverview(today),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    refetchInterval: 60_000,
  });

  const { data: adherenceData, isLoading: adherenceLoading } = useQuery({
    queryKey: ['adherenceSummary', selectedMonth, selectedYear],
    queryFn: () => scheduleApi.getAdherenceSummary(selectedMonth, selectedYear),
    staleTime: 60_000,
  });

  const adherenceSummaries = adherenceData?.data || [];

  const familySchedules = overviewData?.data || [];

  const allSlots = familySchedules.flatMap((s) => s.slots || []);
  const totalDoses = allSlots.length;
  const takenCount = allSlots.filter((s) => s.status === 'TAKEN').length;
  const missedCount = allSlots.filter((s) => s.status === 'MISSED').length;
  const pendingCount = allSlots.filter((s) => s.status === 'PENDING').length;

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="h-8 w-64 bg-gray-200 rounded animate-pulse" />
        <DoseSkeleton rows={3} />
      </div>
    );
  }

  if (overviewError) {
    return (
      <ErrorState
        title="Could not load today's doses"
        description="Check your connection and try again. Your data is safe."
        onRetry={() => refetch()}
        retryLabel="Try again"
      />
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
      >
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-primary transition-colors mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('common.back')}
        </button>
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
          {t('doses.title')}
        </h1>
        <p className="text-gray-500 mt-1">
          {new Date().toLocaleDateString('en-IN', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </p>
      </motion.div>

      {totalDoses === 0 ? (
        <EmptyState
          icon={Pill}
          title="No doses scheduled today"
          description="Add medicines to family members to see their daily dose schedule here."
          actionLabel="Go to Medicines"
          onAction={() => navigate('/medicines')}
        />
      ) : (
        <>
          {/* Summary stat cards */}
          <motion.div
            className="grid grid-cols-2 lg:grid-cols-4 gap-4"
            variants={container}
            initial="hidden"
            animate="show"
          >
            {[
              { label: 'Total Doses', value: totalDoses, icon: Pill, color: 'bg-blue-500', textColor: 'text-blue-600' },
              { label: 'Taken', value: takenCount, icon: Check, color: 'bg-green-500', textColor: 'text-green-600' },
              { label: 'Missed', value: missedCount, icon: AlertTriangle, color: 'bg-red-500', textColor: 'text-red-600' },
              { label: 'Pending', value: pendingCount, icon: Clock, color: 'bg-amber-500', textColor: 'text-amber-600' },
            ].map((stat) => (
              <motion.div
                key={stat.label}
                className="bg-white rounded-2xl p-5 shadow-sm border border-gray-50"
                variants={item}
              >
                <div className={`w-10 h-10 ${stat.color} rounded-xl flex items-center justify-center mb-3`}>
                  <stat.icon className="w-5 h-5 text-white" />
                </div>
                <p className={`text-2xl font-bold ${stat.textColor}`}>{stat.value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* Progress bar */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                <Activity className="w-4 h-4" />
                Overall Progress
              </div>
              <span className="text-sm font-bold text-gray-600">
                {totalDoses > 0 ? Math.round((takenCount / totalDoses) * 100) : 0}%
              </span>
            </div>
            <div className="h-4 bg-gray-100 rounded-full overflow-hidden flex">
              {takenCount > 0 && (
                <motion.div
                  className="bg-green-500 h-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${(takenCount / totalDoses) * 100}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                />
              )}
              {missedCount > 0 && (
                <motion.div
                  className="bg-red-400 h-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${(missedCount / totalDoses) * 100}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
                />
              )}
              {pendingCount > 0 && (
                <motion.div
                  className="bg-amber-400 h-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${(pendingCount / totalDoses) * 100}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut', delay: 0.4 }}
                />
              )}
            </div>
            <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" /> Taken</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" /> Missed</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" /> Pending</span>
            </div>
          </div>

          {/* Per-member dose details */}
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-5">By Family Member</h2>
            <motion.div
              className="space-y-4"
              variants={container}
              initial="hidden"
              animate="show"
            >
              {familySchedules.map((schedule) => {
                const slots = schedule.slots || [];
                const memberTaken = slots.filter((s) => s.status === 'TAKEN').length;
                const memberMissed = slots.filter((s) => s.status === 'MISSED').length;
                const memberTotal = slots.length;

                // Group slots by medicine
                const byMedicine = {};
                slots.forEach((slot) => {
                  if (!byMedicine[slot.medicineId]) {
                    byMedicine[slot.medicineId] = {
                      name: slot.medicineName,
                      dosage: slot.dosage,
                      form: slot.form,
                      timings: [],
                    };
                  }
                  byMedicine[slot.medicineId].timings.push(slot);
                });

                return (
                  <motion.div
                    key={schedule.memberId}
                    className="bg-white rounded-2xl p-5 shadow-sm border border-gray-50"
                    variants={item}
                  >
                    {/* Member header */}
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex items-center gap-3">
                        <Avatar name={schedule.memberName} imageUrl={schedule.memberAvatarUrl} size="lg" />
                        <div>
                          <h3 className="font-bold text-gray-900 text-lg">
                            {schedule.memberName}
                          </h3>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-xs text-green-600 font-medium">{memberTaken} taken</span>
                            {memberMissed > 0 && (
                              <span className="text-xs text-red-500 font-medium">{memberMissed} missed</span>
                            )}
                            <span className="text-xs text-gray-400">
                              {memberTotal} total
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`text-xl font-bold ${
                          memberTaken === memberTotal && memberTotal > 0
                            ? 'text-green-600'
                            : memberTaken > 0
                            ? 'text-amber-500'
                            : 'text-gray-400'
                        }`}>
                          {memberTotal > 0 ? Math.round((memberTaken / memberTotal) * 100) : 0}%
                        </span>
                        <p className="text-xs text-gray-400">completed</p>
                      </div>
                    </div>

                    {/* Member progress bar */}
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden flex mb-5">
                      {memberTaken > 0 && (
                        <motion.div
                          className="bg-green-500 h-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${(memberTaken / memberTotal) * 100}%` }}
                          transition={{ duration: 0.6, ease: 'easeOut' }}
                        />
                      )}
                      {memberMissed > 0 && (
                        <motion.div
                          className="bg-red-400 h-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${(memberMissed / memberTotal) * 100}%` }}
                          transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
                        />
                      )}
                    </div>

                    {/* Medicine rows */}
                    <div className="space-y-4">
                      {Object.values(byMedicine).map((med) => (
                        <div
                          key={med.name}
                          className="flex items-center justify-between py-3 border-t border-gray-50 first:border-t-0 first:pt-0"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <Pill className="w-4.5 h-4.5 text-gray-400 shrink-0" />
                            <div className="min-w-0">
                              <span className="text-sm font-medium text-gray-800 block truncate">
                                {med.name}
                              </span>
                              <span className="text-xs text-gray-400">{med.dosage}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {med.timings.map((slot) => {
                              const config = timingConfig[slot.timingKey] || {
                                icon: Clock,
                                label: slot.timingKey,
                              };
                              const TimingIcon = config.icon;
                              const statusColor =
                                slot.status === 'TAKEN'
                                  ? 'bg-green-100 text-green-600'
                                  : slot.status === 'MISSED'
                                  ? 'bg-red-100 text-red-600'
                                  : slot.status === 'SKIPPED'
                                  ? 'bg-gray-100 text-gray-400'
                                  : 'bg-amber-100 text-amber-600';
                              const StatusIcon =
                                slot.status === 'TAKEN'
                                  ? Check
                                  : slot.status === 'MISSED'
                                  ? AlertTriangle
                                  : null;

                              const tooltipParts = [config.label, slot.status];
                              if (slot.takenAt) {
                                tooltipParts.push(
                                  `at ${new Date(slot.takenAt).toLocaleTimeString('en-IN', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}`
                                );
                              }
                              if (slot.markedByName) {
                                tooltipParts.push(`by ${slot.markedByName}`);
                              }

                              return (
                                <motion.div
                                  key={slot.timingKey}
                                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium ${statusColor}`}
                                  whileHover={{ scale: 1.1 }}
                                  title={tooltipParts.join(' — ')}
                                >
                                  <TimingIcon className="w-3.5 h-3.5" />
                                  <span className="hidden sm:inline">{config.label}</span>
                                  {StatusIcon && <StatusIcon className="w-3 h-3" />}
                                </motion.div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        </>
      )}

      {/* Monthly Adherence Summary */}
      <div>
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-gray-900">{t('doses.monthlyAdherence')}</h2>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="appearance-none bg-white border border-gray-200 rounded-xl px-3 py-2 pr-8 text-sm font-medium text-gray-700 focus:ring-2 focus:ring-primary focus:outline-none cursor-pointer"
              >
                {MONTHS.map((m, i) => (
                  <option key={m} value={i + 1}>{m}</option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            <div className="relative">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="appearance-none bg-white border border-gray-200 rounded-xl px-3 py-2 pr-8 text-sm font-medium text-gray-700 focus:ring-2 focus:ring-primary focus:outline-none cursor-pointer"
              >
                {[now.getFullYear() - 1, now.getFullYear()].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {adherenceLoading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="md" />
          </div>
        ) : adherenceSummaries.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-50 text-center">
            <CalendarDays className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-400">No medication data for {MONTHS[selectedMonth - 1]} {selectedYear}</p>
          </div>
        ) : (
          <motion.div
            className="space-y-4"
            variants={container}
            initial="hidden"
            animate="show"
            key={`${selectedMonth}-${selectedYear}`}
          >
            {adherenceSummaries.map((summary) => {
              const colors = getAdherenceColor(summary.adherencePercent);
              return (
                <motion.div
                  key={summary.memberId}
                  className={`bg-white rounded-2xl p-5 shadow-sm border border-gray-50`}
                  variants={item}
                >
                  {/* Member header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Avatar name={summary.memberName} imageUrl={summary.memberAvatarUrl} size="md" />
                      <div>
                        <h3 className="font-semibold text-gray-900">{summary.memberName}</h3>
                        <p className="text-xs text-gray-400">{summary.totalExpected} doses expected</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-xl font-bold ${colors.text}`}>
                        {summary.adherencePercent}%
                      </span>
                      <span className={`block text-[10px] font-medium mt-0.5 px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>
                        {colors.label}
                      </span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden mb-4">
                    <motion.div
                      className={`h-full rounded-full ${colors.bar}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${summary.adherencePercent}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                    />
                  </div>

                  {/* Stats row */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="flex items-center gap-2 bg-green-50 rounded-xl px-3 py-2">
                      <Check className="w-4 h-4 text-green-600" />
                      <div>
                        <p className="text-sm font-bold text-green-700">{summary.taken}</p>
                        <p className="text-[10px] text-green-500">{t('status.taken')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 bg-red-50 rounded-xl px-3 py-2">
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                      <div>
                        <p className="text-sm font-bold text-red-600">{summary.missed}</p>
                        <p className="text-[10px] text-red-400">{t('status.missed')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
                      <SkipForward className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-sm font-bold text-gray-600">{summary.skipped}</p>
                        <p className="text-[10px] text-gray-400">{t('status.skipped')}</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default DosesToday;

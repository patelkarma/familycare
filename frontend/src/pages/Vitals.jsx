import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart,
  Plus,
  Trash2,
  Activity,
  Droplets,
  Wind,
  Thermometer,
  Weight,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { familyApi } from '../api/family.api';
import { vitalsApi } from '../api/vitals.api';
import VitalsChart from '../components/vitals/VitalsChart';
import VitalsLogForm from '../components/vitals/VitalsLogForm';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import EmptyState from '../components/shared/EmptyState';
import ConfirmModal from '../components/shared/ConfirmModal';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

const vitalTypeTabs = [
  { value: 'BP', label: 'Blood Pressure', icon: Heart, color: 'text-red-500' },
  { value: 'SUGAR', label: 'Sugar', icon: Droplets, color: 'text-purple-500' },
  { value: 'PULSE', label: 'Pulse', icon: Activity, color: 'text-orange-500' },
  { value: 'SPO2', label: 'SpO2', icon: Wind, color: 'text-blue-500' },
  { value: 'TEMP', label: 'Temp', icon: Thermometer, color: 'text-amber-500' },
  { value: 'WEIGHT', label: 'Weight', icon: Weight, color: 'text-green-500' },
];

const formatValue = (v) => {
  if (v.type === 'BP') return `${v.valuePrimary}/${v.valueSecondary}`;
  return `${v.valuePrimary}`;
};

// Derived from the loaded readings — same thresholds as AlertService on the
// backend. Surfacing this as a UI banner makes the trend-alert feature visible
// at a glance instead of only via the outbound WhatsApp message. The `vitals`
// array is sorted DESC by recordedAt, so [0] is the most recent reading.
const computeTrendAlert = (vitals, type) => {
  if (!vitals || vitals.length === 0) return null;

  if (type === 'BP') {
    if (vitals.length < 3) return null;
    const last3 = vitals.slice(0, 3);
    const systolicAllHigh = last3.every((v) => (v.valuePrimary ?? 0) > 140);
    const diastolicAllHigh = last3.every((v) => (v.valueSecondary ?? 0) > 90);
    if (!systolicAllHigh && !diastolicAllHigh) return null;
    const readings = last3.map((v) => `${v.valuePrimary}/${v.valueSecondary}`).join(' · ');
    return {
      title: '3 consecutive high BP readings',
      detail: `${readings} mmHg — family head notified via WhatsApp with the actual numbers.`,
    };
  }

  if (type === 'SUGAR') {
    if (vitals.length < 2) return null;
    const last2 = vitals.slice(0, 2);
    if (!last2.every((v) => (v.valuePrimary ?? 0) > 126)) return null;
    const readings = last2.map((v) => v.valuePrimary).join(' · ');
    return {
      title: '2 consecutive high blood sugar readings',
      detail: `${readings} mg/dL — family head notified via WhatsApp.`,
    };
  }

  if (type === 'PULSE') {
    const latest = vitals[0];
    const v = latest.valuePrimary ?? 0;
    if (v >= 50 && v <= 110) return null;
    return {
      title: v < 50 ? 'Low pulse detected' : 'High pulse detected',
      detail: `${v} bpm — family head notified via WhatsApp.`,
    };
  }

  if (type === 'SPO2') {
    const latest = vitals[0];
    const v = latest.valuePrimary ?? 0;
    if (v >= 92) return null;
    return {
      title: 'Low oxygen saturation',
      detail: `SpO2 ${v}% — family head notified via WhatsApp.`,
    };
  }

  return null;
};

const Vitals = () => {
  const { user } = useAuth();
  const isPatient = user?.role === 'MEMBER';
  const [selectedMemberId, setSelectedMemberId] = useState(null);
  const [selectedType, setSelectedType] = useState('BP');
  const [showForm, setShowForm] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  // Fetch family members (only for family head)
  const { data: membersData, isLoading: membersLoading } = useQuery({
    queryKey: ['familyMembers'],
    queryFn: () => familyApi.getMembers(),
    enabled: !isPatient,
  });

  const members = membersData?.data || [];
  const activeMemberId = isPatient
    ? user.familyMemberId
    : selectedMemberId || (members.length > 0 ? members[0].id : null);

  // Fetch vitals for selected member + type
  const { data: vitalsData, isLoading: vitalsLoading } = useQuery({
    queryKey: ['vitals', activeMemberId, selectedType],
    queryFn: () => vitalsApi.getByMember(activeMemberId, selectedType, 30),
    enabled: !!activeMemberId,
  });

  const vitals = vitalsData?.data || [];

  // Fetch latest vitals for summary cards
  const { data: latestData } = useQuery({
    queryKey: ['vitalsLatest', activeMemberId],
    queryFn: () => vitalsApi.getLatest(activeMemberId),
    enabled: !!activeMemberId,
  });

  const latestVitals = latestData?.data || [];

  const deleteMutation = useMutation({
    mutationFn: (id) => vitalsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vitals'] });
      queryClient.invalidateQueries({ queryKey: ['vitalsLatest'] });
      toast.success(t('toast.deleted'));
      setDeletingId(null);
    },
    onError: () => toast.error(t('toast.somethingWrong')),
  });

  if (!isPatient && membersLoading) return <LoadingSpinner size="lg" />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        className="flex items-center justify-between gap-3"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{isPatient ? t('vitals.myTitle') : t('vitals.title')}</h1>
          <p className="text-gray-500 text-xs sm:text-sm mt-0.5">
            {isPatient ? 'Track your health readings' : 'Track health vitals and get alerts for dangerous patterns'}
          </p>
        </div>
        <motion.button
          onClick={() => setShowForm(true)}
          disabled={!activeMemberId}
          className="shrink-0 flex items-center gap-1.5 sm:gap-2 bg-primary text-white rounded-xl px-3.5 sm:px-5 py-2 sm:py-2.5 font-semibold text-xs sm:text-sm shadow-lg shadow-primary/25 hover:bg-primary-dark transition-colors disabled:opacity-50"
          whileHover={{ scale: activeMemberId ? 1.05 : 1 }}
          whileTap={{ scale: activeMemberId ? 0.95 : 1 }}
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">{t('vitals.logReading')}</span>
          <span className="sm:hidden">{t('vitals.log')}</span>
        </motion.button>
      </motion.div>

      {!isPatient && members.length === 0 ? (
        <EmptyState
          icon={Heart}
          title={t('empty.addFamilyFirst')}
          description={t('emptyDesc.needFamily')}
          actionLabel={t('empty.goToFamily')}
          onAction={() => window.location.href = '/family'}
        />
      ) : (
        <>
          {/* Member selector (family head only) */}
          {!isPatient && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {members.map((member) => (
                  <motion.button
                    key={member.id}
                    onClick={() => setSelectedMemberId(member.id)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                      activeMemberId === member.id
                        ? 'bg-primary text-white shadow-md shadow-primary/20'
                        : 'bg-white text-gray-600 border border-gray-200 hover:border-primary-light'
                    }`}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    {member.name}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Latest vitals summary */}
          {latestVitals.length > 0 && (
            <motion.div
              className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3"
              variants={container}
              initial="hidden"
              animate="show"
            >
              {vitalTypeTabs.map((tab) => {
                const latest = latestVitals.find((v) => v.type === tab.value);
                const Icon = tab.icon;
                return (
                  <motion.div
                    key={tab.value}
                    className={`bg-white rounded-xl p-3 shadow-sm border cursor-pointer transition-all ${
                      selectedType === tab.value ? 'border-primary ring-1 ring-primary/20' : 'border-gray-50 hover:border-gray-200'
                    }`}
                    variants={item}
                    onClick={() => setSelectedType(tab.value)}
                    whileHover={{ y: -2 }}
                  >
                    <Icon className={`w-4 h-4 ${tab.color} mb-1.5`} />
                    <p className="text-lg font-bold text-gray-900">
                      {latest ? formatValue(latest) : '--'}
                    </p>
                    <p className="text-[10px] text-gray-400">{latest?.unit || tab.label}</p>
                  </motion.div>
                );
              })}
            </motion.div>
          )}

          {/* Type tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {vitalTypeTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <motion.button
                  key={tab.value}
                  onClick={() => setSelectedType(tab.value)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                    selectedType === tab.value
                      ? 'bg-gray-900 text-white shadow-sm'
                      : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'
                  }`}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </motion.button>
              );
            })}
          </div>

          {/* Trend alert banner — fires when the loaded readings cross the same
              thresholds AlertService uses on the backend. */}
          {(() => {
            const trendAlert = computeTrendAlert(vitals, selectedType);
            if (!trendAlert) return null;
            return (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl p-4"
                role="alert"
              >
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-red-900">{trendAlert.title}</p>
                  <p className="text-xs text-red-700 mt-0.5">{trendAlert.detail}</p>
                </div>
              </motion.div>
            );
          })()}

          {/* Chart */}
          {vitalsLoading ? (
            <LoadingSpinner />
          ) : (
            <VitalsChart data={vitals} type={selectedType} />
          )}

          {/* Recent readings */}
          {vitals.length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-3">{t('vitals.recentReadings')}</h2>
              <motion.div
                className="space-y-2"
                variants={container}
                initial="hidden"
                animate="show"
                key={selectedType}
              >
                {vitals.map((v) => (
                  <motion.div
                    key={v.id}
                    className="flex items-center justify-between bg-white rounded-xl p-4 shadow-sm border border-gray-50"
                    variants={item}
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-lg font-bold text-gray-900">
                        {formatValue(v)}
                        <span className="text-xs text-gray-400 font-normal ml-1">{v.unit}</span>
                      </div>
                      {v.notes && (
                        <p className="text-xs text-gray-400 hidden sm:block">{v.notes}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Clock className="w-3 h-3" />
                        {new Date(v.recordedAt).toLocaleString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <motion.button
                        onClick={() => setDeletingId(v.id)}
                        className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </motion.button>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          )}
        </>
      )}

      {/* Log form modal */}
      <AnimatePresence>
        {showForm && activeMemberId && (
          <VitalsLogForm
            memberId={activeMemberId}
            selectedType={selectedType}
            onClose={() => setShowForm(false)}
          />
        )}
      </AnimatePresence>

      {/* Delete confirmation */}
      <ConfirmModal
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={() => deleteMutation.mutate(deletingId)}
        title={t('confirm.deleteVital')}
        message="This vital record will be permanently removed."
        confirmText={t('common.delete')}
      />
    </div>
  );
};

export default Vitals;

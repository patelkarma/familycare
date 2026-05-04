import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, Heart, Pill, Clock, Check, AlertTriangle, Sun, Cloud, Moon, FileText, Pin, ChevronRight, Calendar, PackageX, MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { dashboardApi } from '../api/dashboard.api';
import { formatRelationship, formatDate } from '../utils/formatters';
import Avatar from '../components/shared/Avatar';
import LoadingSpinner from '../components/shared/LoadingSpinner';
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

const formatDoctorName = (name) => {
  const trimmed = (name || '').trim();
  if (!trimmed) return 'Visit';
  const lower = trimmed.toLowerCase();
  if (lower.startsWith('dr.') || lower.startsWith('dr ')) return trimmed;
  return `Dr. ${trimmed}`;
};

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? t('dashboard.greetingMorning')
    : hour < 17 ? t('dashboard.greetingAfternoon')
    : t('dashboard.greetingEvening');
  const localeTag =
    i18n.resolvedLanguage === 'hi' ? 'hi-IN'
    : i18n.resolvedLanguage === 'gu' ? 'gu-IN'
    : i18n.resolvedLanguage === 'mr' ? 'mr-IN'
    : i18n.resolvedLanguage === 'bn' ? 'bn-IN'
    : i18n.resolvedLanguage === 'ta' ? 'ta-IN'
    : i18n.resolvedLanguage === 'te' ? 'te-IN'
    : i18n.resolvedLanguage === 'kn' ? 'kn-IN'
    : i18n.resolvedLanguage === 'pa' ? 'pa-IN'
    : 'en-IN';

  const { data: summaryData, isLoading } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => dashboardApi.getSummary(),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    refetchInterval: 60_000,
  });

  const summary = summaryData?.data || {};
  const members = summary.members || [];
  const familySchedules = summary.familySchedules || [];
  const recentReports = summary.recentReports || [];
  const lowStockMedicines = summary.lowStockMedicines || [];
  const upcomingAppointments = summary.upcomingAppointments || [];
  const alerts = summary.alerts || [];
  const stats = summary.todayDoseStats || { total: 0, taken: 0, missed: 0, pending: 0, skipped: 0 };
  const totalDoses = stats.total;
  const takenCount = stats.taken;
  const missedCount = stats.missed;
  const pendingCount = stats.pending;
  const activeMedicineCount = summary.activeMedicineCount || 0;

  if (isLoading) return <LoadingSpinner size="lg" />;

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
          {greeting}, {user?.name?.split(' ')[0]}
        </h1>
        <p className="text-gray-500 mt-1">
          {new Date().toLocaleDateString(localeTag, {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </p>
      </motion.div>

      {/* Alerts banner */}
      {alerts.length > 0 && (
        <motion.div
          className="space-y-2"
          variants={container}
          initial="hidden"
          animate="show"
        >
          {alerts.slice(0, 4).map((alert, idx) => {
            // Missed doses always read as a red alert (yellow is reserved for "pending"
            // throughout the app) — distinct from severity, which only drives wording.
            const palette =
              alert.type === 'MISSED_DOSE' || alert.severity === 'CRITICAL'
                ? 'bg-red-50 border-red-200 text-red-800'
                : alert.severity === 'WARNING'
                ? 'bg-amber-50 border-amber-200 text-amber-800'
                : 'bg-blue-50 border-blue-200 text-blue-800';
            const Icon =
              alert.type === 'LOW_STOCK' ? PackageX :
              alert.type === 'MISSED_DOSE' ? AlertTriangle :
              alert.type === 'UPCOMING_APPOINTMENT' ? Calendar : AlertTriangle;
            return (
              <motion.div
                key={`${alert.type}-${idx}`}
                variants={item}
                className={`flex items-center gap-3 border rounded-xl px-4 py-3 text-sm font-medium ${palette}`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="flex-1">{alert.message}</span>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Quick stats */}
      <motion.div
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {[
          { label: t('dashboard.familyMembers'), value: summary.memberCount ?? members.length, icon: Users, color: 'bg-blue-500', to: '/family' },
          { label: t('dashboard.activeMedicines'), value: activeMedicineCount, icon: Pill, color: 'bg-green-500', to: '/medicines' },
          { label: t('dashboard.dosesToday'), value: totalDoses, icon: Clock, color: 'bg-amber-500', to: '/doses-today' },
          { label: t('dashboard.vitalsLogged'), value: summary.vitalsLoggedThisWeek ?? 0, icon: Heart, color: 'bg-rose-500', to: '/vitals' },
        ].map((stat) => (
          <motion.div
            key={stat.label}
            className="bg-white rounded-2xl p-5 shadow-sm border border-gray-50 cursor-pointer group"
            variants={item}
            whileHover={{ y: -6, scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate(stat.to)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') navigate(stat.to); }}
            role="button"
            tabIndex={0}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            <div className={`w-10 h-10 ${stat.color} rounded-xl flex items-center justify-center mb-3`}>
              <stat.icon className="w-5 h-5 text-white" />
            </div>
            <p className="text-2xl font-bold text-gray-900 group-hover:text-primary transition-colors">{stat.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{stat.label}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Today's Dose Summary */}
      {familySchedules.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-gray-900">{t('dashboard.todaysDoseSummary')}</h2>
            <div className="flex items-center gap-3 text-xs font-medium">
              <span className="flex items-center gap-1 text-green-600">
                <Check className="w-3.5 h-3.5" /> {takenCount} {t('dashboard.taken')}
              </span>
              <span className="flex items-center gap-1 text-red-500">
                <AlertTriangle className="w-3.5 h-3.5" /> {missedCount} {t('dashboard.missed')}
              </span>
              <span className="flex items-center gap-1 text-amber-500">
                <Clock className="w-3.5 h-3.5" /> {pendingCount} {t('dashboard.pending')}
              </span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden flex mb-6">
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

          {/* Per-member dose details */}
          <motion.div
            className="space-y-4"
            variants={container}
            initial="hidden"
            animate="show"
          >
            {familySchedules.map((schedule) => {
              const slots = schedule.slots || [];
              const memberTaken = slots.filter((s) => s.status === 'TAKEN').length;
              const memberTotal = slots.length;

              // Group slots by medicine
              const byMedicine = {};
              slots.forEach((slot) => {
                if (!byMedicine[slot.medicineId]) {
                  byMedicine[slot.medicineId] = { name: slot.medicineName, dosage: slot.dosage, form: slot.form, timings: [] };
                }
                byMedicine[slot.medicineId].timings.push(slot);
              });

              return (
                <motion.div
                  key={schedule.memberId}
                  className="bg-white rounded-2xl p-5 shadow-sm border border-gray-50 cursor-pointer group hover:border-primary-light transition-colors"
                  variants={item}
                  whileHover={{ y: -4 }}
                  onClick={() => navigate('/medicines')}
                  transition={{ type: 'spring', stiffness: 300 }}
                >
                  {/* Member header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Avatar name={schedule.memberName} imageUrl={schedule.memberAvatarUrl} size="md" />
                      <div>
                        <h3 className="font-semibold text-gray-900 group-hover:text-primary transition-colors">
                          {schedule.memberName}
                        </h3>
                        <p className="text-xs text-gray-400">
                          {memberTaken}/{memberTotal} doses completed
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-sm font-bold ${
                        memberTaken === memberTotal && memberTotal > 0
                          ? 'text-green-600'
                          : memberTaken > 0
                          ? 'text-amber-500'
                          : 'text-gray-400'
                      }`}>
                        {memberTotal > 0 ? Math.round((memberTaken / memberTotal) * 100) : 0}%
                      </span>
                    </div>
                  </div>

                  {/* Medicine rows */}
                  <div className="space-y-3">
                    {Object.values(byMedicine).map((med) => (
                      <div key={med.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <Pill className="w-4 h-4 text-gray-400 shrink-0" />
                          <span className="text-sm text-gray-700 truncate">{med.name}</span>
                          <span className="text-xs text-gray-400">{med.dosage}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {med.timings.map((slot) => {
                            const TimingIcon =
                              slot.timingKey === 'morning' ? Sun :
                              slot.timingKey === 'afternoon' ? Cloud : Moon;
                            const statusColor =
                              slot.status === 'TAKEN' ? 'bg-green-100 text-green-600' :
                              slot.status === 'MISSED' ? 'bg-red-100 text-red-600' :
                              slot.status === 'SKIPPED' ? 'bg-gray-100 text-gray-400' :
                              'bg-amber-100 text-amber-600';
                            const StatusIcon =
                              slot.status === 'TAKEN' ? Check :
                              slot.status === 'MISSED' ? AlertTriangle : null;

                            return (
                              <motion.div
                                key={slot.timingKey}
                                className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusColor}`}
                                whileHover={{ scale: 1.1 }}
                                title={`${slot.timingKey} — ${slot.status}${slot.takenAt ? ` at ${new Date(slot.takenAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}` : ''}`}
                              >
                                <TimingIcon className="w-3 h-3" />
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
      )}

      {/* Low stock + Upcoming appointments */}
      {(lowStockMedicines.length > 0 || upcomingAppointments.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {lowStockMedicines.length > 0 && (
            <motion.div
              className="bg-white rounded-2xl p-5 shadow-sm border border-gray-50"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
                    <PackageX className="w-4 h-4" />
                  </div>
                  <h2 className="text-base font-bold text-gray-900">Low Stock</h2>
                </div>
                <motion.button
                  onClick={() => navigate('/pharmacy')}
                  className="flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-dark"
                  whileHover={{ x: 3 }}
                >
                  <MapPin className="w-3.5 h-3.5" /> Find pharmacy
                </motion.button>
              </div>
              <ul className="space-y-2">
                {lowStockMedicines.slice(0, 5).map((m) => (
                  <li
                    key={m.medicineId}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-amber-50 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{m.medicineName}</p>
                      <p className="text-xs text-gray-400 truncate">{m.memberName}</p>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                      m.stockCount === 0 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {m.stockCount === 0 ? 'Out' : `${m.stockCount} left`}
                    </span>
                  </li>
                ))}
              </ul>
            </motion.div>
          )}

          {upcomingAppointments.length > 0 && (
            <motion.div
              className="bg-white rounded-2xl p-5 shadow-sm border border-gray-50"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <h2 className="text-base font-bold text-gray-900">Upcoming Appointments</h2>
                </div>
                <motion.button
                  onClick={() => navigate('/appointments')}
                  className="flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-dark"
                  whileHover={{ x: 3 }}
                >
                  View all <ChevronRight className="w-3.5 h-3.5" />
                </motion.button>
              </div>
              <ul className="space-y-2">
                {upcomingAppointments.slice(0, 4).map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer"
                    onClick={() => navigate('/appointments')}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {formatDoctorName(a.doctorName)} <span className="text-gray-400 font-normal">· {a.familyMemberName}</span>
                      </p>
                      <p className="text-xs text-gray-400 truncate">
                        {a.speciality || a.hospital || 'Checkup'}
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-1 rounded-full whitespace-nowrap">
                      {new Date(a.appointmentDate).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short',
                      })}
                    </span>
                  </li>
                ))}
              </ul>
            </motion.div>
          )}
        </div>
      )}

      {/* Recent Reports */}
      {user?.role !== 'MEMBER' && recentReports.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-gray-900">Recent Reports</h2>
            <motion.button
              onClick={() => navigate('/reports')}
              className="flex items-center gap-1 text-sm font-medium text-primary hover:text-primary-dark transition-colors"
              whileHover={{ x: 4 }}
            >
              View all
              <ChevronRight className="w-4 h-4" />
            </motion.button>
          </div>

          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            variants={container}
            initial="hidden"
            animate="show"
          >
            {recentReports.map((report) => (
              <motion.div
                key={report.id}
                className="relative bg-white rounded-2xl p-4 shadow-sm border border-gray-50 cursor-pointer group"
                variants={item}
                whileHover={{ y: -4, scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/reports')}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                {report.isPinnedForEmergency && (
                  <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
                    <Pin className="w-3 h-3" />
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary-light flex items-center justify-center shrink-0 overflow-hidden">
                    {report.fileType !== 'PDF' && report.thumbnailUrl ? (
                      <img
                        src={report.thumbnailUrl}
                        alt={report.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <FileText className="w-6 h-6 text-primary-dark" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm text-gray-900 truncate group-hover:text-primary transition-colors">
                      {report.title}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <span className="text-[10px] font-semibold bg-primary-light text-primary-dark rounded-full px-2 py-0.5">
                        {report.familyMemberName}
                      </span>
                      <span className="text-[10px] font-semibold bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">
                        {report.reportType}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1.5">
                      {formatDate(report.reportDate)}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      )}

      {/* Family members section */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900">Your Family</h2>
          <motion.button
            onClick={() => navigate('/family')}
            className="flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-dark transition-colors"
            whileHover={{ x: 4 }}
          >
            <Plus className="w-4 h-4" />
            Add Member
          </motion.button>
        </div>

        {members.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No family members yet"
            description="Start by adding your family members to track their health and medicines."
            actionLabel="Add First Member"
            onAction={() => navigate('/family')}
          />
        ) : (
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            variants={container}
            initial="hidden"
            animate="show"
          >
            {members.map((member) => (
              <motion.div
                key={member.id}
                className="bg-white rounded-2xl p-5 shadow-sm border border-gray-50 cursor-pointer group"
                variants={item}
                whileHover={{ y: -6, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate(`/family`)}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                <div className="flex items-center gap-4">
                  <Avatar
                    name={member.name}
                    imageUrl={member.avatarUrl}
                    relationship={member.relationship}
                    size="lg"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate group-hover:text-primary transition-colors">
                      {member.name}
                    </h3>
                    <p className="text-sm text-gray-400">
                      {formatRelationship(member.relationship)}
                    </p>
                    {member.bloodGroup && (
                      <span className="inline-block mt-1.5 text-xs bg-red-50 text-red-500 px-2 py-0.5 rounded-full font-medium">
                        {member.bloodGroup}
                      </span>
                    )}
                  </div>
                </div>

                {/* Health summary placeholder */}
                <div className="mt-4 pt-4 border-t border-gray-50 flex items-center gap-4">
                  <div className="flex items-center gap-1.5 text-xs text-gray-400">
                    <Pill className="w-3.5 h-3.5" />
                    <span>{t('dashboard.noMedicinesYet')}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-400">
                    <Heart className="w-3.5 h-3.5" />
                    <span>{t('emptyDesc.noVitalsYet')}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;

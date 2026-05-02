import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Plus,
  Pencil,
  Trash2,
  Clock,
  MapPin,
  Stethoscope,
  StickyNote,
  CalendarCheck,
  CalendarClock,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { familyApi } from '../api/family.api';
import { appointmentsApi } from '../api/appointments.api';
import AppointmentForm from '../components/appointments/AppointmentForm';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import EmptyState from '../components/shared/EmptyState';
import ConfirmModal from '../components/shared/ConfirmModal';

const Appointments = () => {
  const { user } = useAuth();
  const isPatient = user?.role === 'MEMBER';
  const [selectedMemberId, setSelectedMemberId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [filter, setFilter] = useState('upcoming');
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  // Fetch family members (family head only)
  const { data: membersData, isLoading: membersLoading } = useQuery({
    queryKey: ['familyMembers'],
    queryFn: () => familyApi.getMembers(),
    enabled: !isPatient,
  });

  const members = membersData?.data || [];
  const activeMemberId = isPatient
    ? user.familyMemberId
    : selectedMemberId || (members.length > 0 ? members[0].id : null);

  // Fetch appointments
  const { data: appointmentsData, isLoading: appointmentsLoading } = useQuery({
    queryKey: ['appointments', activeMemberId],
    queryFn: () => appointmentsApi.getByMember(activeMemberId),
    enabled: !!activeMemberId,
  });

  const allAppointments = appointmentsData?.data || [];
  const now = new Date();

  const upcoming = allAppointments.filter((a) => new Date(a.appointmentDate) >= now);
  const past = allAppointments.filter((a) => new Date(a.appointmentDate) < now);
  const displayed = filter === 'upcoming' ? upcoming : past;

  const deleteMutation = useMutation({
    mutationFn: (id) => appointmentsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments', activeMemberId] });
      toast.success(t('toast.appointmentDeleted'));
      setDeletingId(null);
    },
    onError: () => toast.error(t('toast.somethingWrong')),
  });

  const handleEdit = (appt) => {
    setEditingAppointment(appt);
    setShowForm(true);
  };

  const handleAdd = () => {
    setEditingAppointment(null);
    setShowForm(true);
  };

  if (!isPatient && membersLoading) return <LoadingSpinner size="lg" />;

  const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  const isToday = (dateStr) => {
    const d = new Date(dateStr);
    return d.toDateString() === now.toDateString();
  };

  const isTomorrow = (dateStr) => {
    const d = new Date(dateStr);
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return d.toDateString() === tomorrow.toDateString();
  };

  const getDaysUntil = (dateStr) => {
    const d = new Date(dateStr);
    const diff = Math.ceil((d - now) / (1000 * 60 * 60 * 24));
    return diff;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        className="flex items-center justify-between gap-3"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            {t('appointments.title')}
          </h1>
          <p className="text-gray-500 text-xs sm:text-sm mt-0.5">
            {t('subtitle.appointments')}
          </p>
        </div>
        <motion.button
          onClick={handleAdd}
          disabled={!activeMemberId}
          className="shrink-0 flex items-center gap-1.5 sm:gap-2 bg-primary text-white rounded-xl px-3.5 sm:px-5 py-2 sm:py-2.5 font-semibold text-xs sm:text-sm shadow-lg shadow-primary/25 hover:bg-primary-dark transition-colors disabled:opacity-50"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">{t('appointments.newAppointment')}</span>
          <span className="sm:hidden">{t('appointments.new')}</span>
        </motion.button>
      </motion.div>

      {/* Member selector (family head only) */}
      {!isPatient && members.length > 0 && (
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

      {/* Filter tabs */}
      <div className="flex gap-2">
        <motion.button
          onClick={() => setFilter('upcoming')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            filter === 'upcoming'
              ? 'bg-primary text-white shadow-sm'
              : 'bg-white text-gray-600 border border-gray-200'
          }`}
          whileTap={{ scale: 0.97 }}
        >
          <CalendarClock className="w-4 h-4" />
          Upcoming ({upcoming.length})
        </motion.button>
        <motion.button
          onClick={() => setFilter('past')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            filter === 'past'
              ? 'bg-primary text-white shadow-sm'
              : 'bg-white text-gray-600 border border-gray-200'
          }`}
          whileTap={{ scale: 0.97 }}
        >
          <CalendarCheck className="w-4 h-4" />
          Past ({past.length})
        </motion.button>
      </div>

      {/* Appointments list */}
      {appointmentsLoading ? (
        <LoadingSpinner />
      ) : !activeMemberId ? (
        <EmptyState
          icon={Calendar}
          title={t('empty.addFamilyFirst')}
          description={t('emptyDesc.needFamily')}
          actionLabel={t('empty.goToFamily')}
          onAction={() => (window.location.href = '/family')}
        />
      ) : displayed.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title={filter === 'upcoming' ? 'No upcoming appointments' : 'No past appointments'}
          description={filter === 'upcoming' ? 'Schedule a doctor visit to keep track.' : 'Past appointments will appear here.'}
          actionLabel={filter === 'upcoming' ? 'Add Appointment' : undefined}
          onAction={filter === 'upcoming' ? handleAdd : undefined}
        />
      ) : (
        <motion.div
          className="space-y-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <AnimatePresence>
            {displayed.map((appt, i) => {
              const daysUntil = getDaysUntil(appt.appointmentDate);
              const isPast = new Date(appt.appointmentDate) < now;
              const today = isToday(appt.appointmentDate);
              const tomorrow = isTomorrow(appt.appointmentDate);

              return (
                <motion.div
                  key={appt.id}
                  className={`bg-white rounded-2xl p-5 shadow-sm border-2 transition-colors ${
                    today
                      ? 'border-primary/40 bg-primary-light/20'
                      : tomorrow
                      ? 'border-amber-200'
                      : isPast
                      ? 'border-gray-100 opacity-75'
                      : 'border-gray-50 hover:border-primary-light'
                  }`}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ delay: i * 0.05 }}
                  whileHover={!isPast ? { y: -3 } : {}}
                >
                  <div className="flex items-start gap-3 sm:gap-4">
                    {/* Date block */}
                    <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-xl flex flex-col items-center justify-center shrink-0 ${
                      today
                        ? 'bg-primary text-white'
                        : tomorrow
                        ? 'bg-amber-100 text-amber-700'
                        : isPast
                        ? 'bg-gray-100 text-gray-500'
                        : 'bg-blue-50 text-blue-700'
                    }`}>
                      <span className="text-lg font-bold leading-none">
                        {new Date(appt.appointmentDate).getDate()}
                      </span>
                      <span className="text-[10px] font-semibold uppercase">
                        {new Date(appt.appointmentDate).toLocaleDateString('en-IN', { month: 'short' })}
                      </span>
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-gray-900">{appt.doctorName}</h3>
                        {today && (
                          <motion.span
                            className="text-xs bg-primary text-white px-2 py-0.5 rounded-full font-semibold"
                            animate={{ scale: [1, 1.05, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                          >
                            Today
                          </motion.span>
                        )}
                        {tomorrow && (
                          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">
                            Tomorrow
                          </span>
                        )}
                        {!isPast && !today && !tomorrow && daysUntil <= 7 && (
                          <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium">
                            In {daysUntil} days
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {formatTime(appt.appointmentDate)}
                        </span>
                        {appt.speciality && (
                          <span className="flex items-center gap-1">
                            <Stethoscope className="w-3.5 h-3.5" />
                            {appt.speciality}
                          </span>
                        )}
                        {appt.hospital && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />
                            {appt.hospital}
                          </span>
                        )}
                      </div>

                      {appt.notes && (
                        <p className="text-xs text-gray-400 mt-2 flex items-start gap-1">
                          <StickyNote className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          {appt.notes}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-1 shrink-0">
                      <motion.button
                        onClick={() => handleEdit(appt)}
                        className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <Pencil className="w-4 h-4" />
                      </motion.button>
                      <motion.button
                        onClick={() => setDeletingId(appt.id)}
                        className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Add/Edit form modal */}
      <AnimatePresence>
        {showForm && (
          <AppointmentForm
            appointment={editingAppointment}
            memberId={activeMemberId}
            onClose={() => {
              setShowForm(false);
              setEditingAppointment(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* Delete confirmation */}
      <ConfirmModal
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={() => deleteMutation.mutate(deletingId)}
        title={t('confirm.deleteAppointment')}
        message="This appointment will be permanently removed."
        confirmText={t('common.delete')}
      />
    </div>
  );
};

export default Appointments;

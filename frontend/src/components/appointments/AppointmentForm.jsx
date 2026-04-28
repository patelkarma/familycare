import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { X, Save, CalendarPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { appointmentsApi } from '../../api/appointments.api';

const specialities = [
  'General Physician',
  'Cardiologist',
  'Diabetologist',
  'Orthopedic',
  'Neurologist',
  'Dermatologist',
  'ENT',
  'Ophthalmologist',
  'Dentist',
  'Gynecologist',
  'Pediatrician',
  'Psychiatrist',
  'Urologist',
  'Pulmonologist',
  'Oncologist',
  'Other',
];

const AppointmentForm = ({ appointment, memberId, onClose }) => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const isEditing = !!appointment;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: appointment
      ? {
          doctorName: appointment.doctorName,
          speciality: appointment.speciality || '',
          hospital: appointment.hospital || '',
          appointmentDate: appointment.appointmentDate
            ? appointment.appointmentDate.slice(0, 16)
            : '',
          notes: appointment.notes || '',
        }
      : {},
  });

  const mutation = useMutation({
    mutationFn: (data) => {
      const payload = { ...data, familyMemberId: memberId };
      return isEditing
        ? appointmentsApi.update(appointment.id, payload)
        : appointmentsApi.add(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments', memberId] });
      toast.success(t('toast.appointmentSaved'));
      onClose();
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || t('toast.somethingWrong'));
    },
  });

  const onSubmit = (data) => mutation.mutate(data);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />

      <motion.div
        className="relative bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
      >
        <div className="sticky top-0 bg-white/90 backdrop-blur-lg px-6 py-4 border-b border-gray-100 flex items-center justify-between rounded-t-3xl sm:rounded-t-2xl z-10">
          <h2 className="text-lg font-bold text-gray-900">
            {isEditing ? t('appointmentForm.editTitle') : t('appointmentForm.addTitle')}
          </h2>
          <motion.button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            whileTap={{ scale: 0.9 }}
          >
            <X className="w-5 h-5" />
          </motion.button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
          {/* Doctor Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('appointmentForm.doctorName')} *</label>
            <input
              type="text"
              {...register('doctorName', { required: 'Doctor name is required' })}
              placeholder={t('appointmentForm.doctorNamePlaceholder')}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
            />
            {errors.doctorName && <p className="text-red-500 text-xs mt-1">{t(errors.doctorName.message, errors.doctorName.message)}</p>}
          </div>

          {/* Speciality */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('appointmentForm.speciality')}</label>
            <select
              {...register('speciality')}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all bg-white"
            >
              <option value="">{t('form.select')}</option>
              {specialities.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Hospital */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('appointmentForm.hospital')}</label>
            <input
              type="text"
              {...register('hospital')}
              placeholder={t('appointmentForm.hospitalPlaceholder')}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
            />
          </div>

          {/* Date & Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('appointmentForm.appointmentDate')} *</label>
            <input
              type="datetime-local"
              {...register('appointmentDate', { required: 'Date & time is required' })}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
            />
            {errors.appointmentDate && <p className="text-red-500 text-xs mt-1">{t(errors.appointmentDate.message, errors.appointmentDate.message)}</p>}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('appointmentForm.notes')}</label>
            <textarea
              {...register('notes')}
              placeholder={t('appointmentForm.notesPlaceholder')}
              rows={2}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all resize-none"
            />
          </div>

          {/* Submit */}
          <motion.button
            type="submit"
            disabled={mutation.isPending}
            className="w-full bg-primary text-white rounded-xl px-4 py-3.5 font-semibold text-base shadow-lg shadow-primary/25 hover:bg-primary-dark transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            whileHover={{ scale: mutation.isPending ? 1 : 1.02 }}
            whileTap={{ scale: mutation.isPending ? 1 : 0.98 }}
          >
            {mutation.isPending ? (
              <motion.div
                className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              />
            ) : (
              <>
                {isEditing ? <Save className="w-5 h-5" /> : <CalendarPlus className="w-5 h-5" />}
                {isEditing ? t('form.saveChanges') : t('appointments.newAppointment')}
              </>
            )}
          </motion.button>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default AppointmentForm;

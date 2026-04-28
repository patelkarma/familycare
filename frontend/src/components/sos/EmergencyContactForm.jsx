import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { X, Save, UserPlus, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { emergencyContactSchema } from '../../utils/validators';
import { sosApi } from '../../api/sos.api';

const relationshipSuggestions = [
  'Son',
  'Daughter',
  'Spouse',
  'Father',
  'Mother',
  'Brother',
  'Sister',
  'Doctor',
  'Neighbour',
  'Friend',
  'Other',
];

const EmergencyContactForm = ({ memberId, contact, onClose }) => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const isEditing = !!contact;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(emergencyContactSchema),
    defaultValues: contact
      ? {
          familyMemberId: contact.familyMemberId || memberId,
          name: contact.name,
          relationship: contact.relationship,
          phone: contact.phone,
          isPrimary: contact.isPrimary,
        }
      : {
          familyMemberId: memberId,
          name: '',
          relationship: '',
          phone: '',
          isPrimary: false,
        },
  });

  const mutation = useMutation({
    mutationFn: (data) =>
      isEditing ? sosApi.updateContact(contact.id, data) : sosApi.createContact(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sos-contacts', memberId] });
      toast.success(t('toast.contactSaved'));
      onClose();
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || t('toast.somethingWrong'));
    },
  });

  const onSubmit = (data) => {
    mutation.mutate({
      familyMemberId: memberId,
      name: data.name.trim(),
      relationship: data.relationship.trim(),
      phone: data.phone.trim(),
      isPrimary: !!data.isPrimary,
    });
  };

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
      />

      <motion.div
        className="relative bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-md max-h-[92vh] overflow-y-auto"
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ type: 'spring', damping: 22, stiffness: 280 }}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-3xl z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-light flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {isEditing ? t('contactForm.editTitle') : t('contactForm.addTitle')}
              </h2>
              <p className="text-xs text-gray-500">
                {t('contactForm.primaryHint')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          {/* Name */}
          <div>
            <label className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5 block">
              {t('form.name')}
            </label>
            <input
              {...register('name')}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
              placeholder="e.g. Rohit Sharma"
            />
            {errors.name && (
              <p className="text-xs text-red-500 mt-1">{t(errors.name.message, errors.name.message)}</p>
            )}
          </div>

          {/* Relationship */}
          <div>
            <label className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5 block">
              {t('form.relationship')}
            </label>
            <input
              {...register('relationship')}
              list="relationship-options"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
              placeholder="e.g. Son, Doctor, Neighbour"
            />
            <datalist id="relationship-options">
              {relationshipSuggestions.map((r) => (
                <option key={r} value={r} />
              ))}
            </datalist>
            {errors.relationship && (
              <p className="text-xs text-red-500 mt-1">{t(errors.relationship.message, errors.relationship.message)}</p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5 block">
              {t('form.phone')}
            </label>
            <input
              {...register('phone')}
              type="tel"
              inputMode="tel"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base font-mono tracking-wider focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
              placeholder="9876543210"
            />
            {errors.phone && (
              <p className="text-xs text-red-500 mt-1">{t(errors.phone.message, errors.phone.message)}</p>
            )}
            <p className="text-xs text-gray-400 mt-1">
              10-digit mobile starting with 6, 7, 8 or 9
            </p>
          </div>

          {/* Primary toggle */}
          <label className="flex items-center gap-3 p-4 rounded-xl bg-primary-light/40 cursor-pointer hover:bg-primary-light/60 transition-colors">
            <input
              type="checkbox"
              {...register('isPrimary')}
              className="w-5 h-5 rounded text-primary focus:ring-primary"
            />
            <Star className="w-5 h-5 text-primary" />
            <div className="flex-1">
              <p className="text-sm font-bold text-gray-900">{t('contactForm.primaryContact')}</p>
              <p className="text-xs text-gray-500">
                {t('contactForm.primaryHint')}
              </p>
            </div>
          </label>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50"
            >
              {t('common.cancel')}
            </button>
            <motion.button
              type="submit"
              disabled={mutation.isPending}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary hover:bg-primary-dark text-white font-semibold shadow-lg shadow-primary/20 disabled:opacity-50"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Save className="w-4 h-4" />
              {mutation.isPending ? 'Saving…' : isEditing ? 'Save' : 'Add contact'}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default EmergencyContactForm;

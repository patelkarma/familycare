import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { X, Save, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { familyMemberSchema } from '../../utils/validators';
import { familyApi } from '../../api/family.api';
import AvatarUploader from './AvatarUploader';
import WhatsAppJoinCard from './WhatsAppJoinCard';

const relationships = ['Father', 'Mother', 'Spouse', 'Son', 'Daughter', 'Grandfather', 'Grandmother', 'Brother', 'Sister', 'Other'];
const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const genders = ['Male', 'Female', 'Other'];

const FamilyMemberForm = ({ member, isSelf, onClose }) => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const isEditing = !!member;
  const [pendingAvatar, setPendingAvatar] = useState(null);
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState(member?.avatarUrl || null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(familyMemberSchema),
    defaultValues: member
      ? {
          name: member.name,
          relationship: member.relationship,
          dateOfBirth: member.dateOfBirth || '',
          bloodGroup: member.bloodGroup || '',
          gender: member.gender || '',
          phone: member.phone || '',
          whatsappPhone: member.whatsappPhone || '',
          allergies: member.allergies || '',
          chronicDiseases: member.chronicDiseases || '',
        }
      : {},
  });

  // Refresh every screen that shows a member avatar
  const invalidateMemberCaches = () => {
    queryClient.invalidateQueries({ queryKey: ['familyMembers'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    queryClient.invalidateQueries({ queryKey: ['familyOverview'] });
    queryClient.invalidateQueries({ queryKey: ['adherenceSummary'] });
  };

  const mutation = useMutation({
    mutationFn: async (data) => {
      const res = isEditing
        ? await familyApi.updateMember(member.id, data)
        : await familyApi.addMember(data);
      const savedId = res?.data?.id || member?.id;
      if (!isEditing && pendingAvatar && savedId) {
        await familyApi.uploadAvatar(savedId, pendingAvatar);
      }
      return res;
    },
    onSuccess: () => {
      invalidateMemberCaches();
      toast.success(isEditing ? t('family.memberUpdated') : t('family.memberAdded'));
      onClose();
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || t('common.error'));
    },
  });

  // For edit flow: upload immediately on file pick; for add flow: stash file until form submit.
  const handleAvatarUpload = async (file) => {
    if (isEditing && member?.id) {
      const res = await familyApi.uploadAvatar(member.id, file);
      const newUrl = res?.data?.avatarUrl;
      setCurrentAvatarUrl(newUrl);
      invalidateMemberCaches();
      toast.success(t('profile.photoUpdated'));
    } else {
      setPendingAvatar(file);
      setCurrentAvatarUrl(URL.createObjectURL(file));
    }
  };

  // Mirror of handleAvatarUpload: edit flow hits the API; add flow just clears
  // the locally stashed pending file (no member exists yet to delete from).
  const handleAvatarRemove = async () => {
    if (isEditing && member?.id) {
      await familyApi.removeAvatar(member.id);
      setCurrentAvatarUrl(null);
      invalidateMemberCaches();
      toast.success(t('profile.photoRemoved'));
    } else {
      setPendingAvatar(null);
      setCurrentAvatarUrl(null);
    }
  };

  const onSubmit = (data) => {
    const cleaned = {
      ...data,
      relationship: isSelf ? 'Self' : data.relationship,
      dateOfBirth: data.dateOfBirth || null,
      bloodGroup: data.bloodGroup || null,
      gender: data.gender || null,
      phone: data.phone || null,
      whatsappPhone: data.whatsappPhone || null,
      allergies: data.allergies || null,
      chronicDiseases: data.chronicDiseases || null,
    };
    mutation.mutate(cleaned);
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />

      {/* Form panel */}
      <motion.div
        className="relative bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white/90 backdrop-blur-lg px-6 py-4 border-b border-gray-100 flex items-center justify-between rounded-t-3xl sm:rounded-t-2xl z-10">
          <h2 className="text-lg font-bold text-gray-900">
            {isEditing ? t('family.editMember') : t('family.addFamilyMember')}
          </h2>
          <motion.button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            whileTap={{ scale: 0.9 }}
          >
            <X className="w-5 h-5" />
          </motion.button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-2">
            <AvatarUploader
              name={member?.name || 'New member'}
              currentUrl={currentAvatarUrl}
              relationship={isSelf ? 'Self' : member?.relationship}
              size="xl"
              onUpload={handleAvatarUpload}
              onRemove={handleAvatarRemove}
            />
            <p className="text-xs text-gray-400">
              {isEditing ? t('family.tapPhotoToChange') : t('family.tapToAddPhoto')}
            </p>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('form.name')} *</label>
            <input
              type="text"
              {...register('name')}
              placeholder={t('form.namePlaceholder')}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{t(errors.name.message, errors.name.message)}</p>}
          </div>

          {/* Relationship */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('form.relationship')} *</label>
            {isSelf ? (
              <>
                <input type="hidden" {...register('relationship')} value="Self" />
                <div className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base bg-gray-50 text-gray-500 cursor-not-allowed">
                  {t('family.self')}
                </div>
              </>
            ) : (
              <select
                {...register('relationship')}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all bg-white"
              >
                <option value="">{t('form.selectRelationship')}</option>
                {relationships.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            )}
            {errors.relationship && <p className="text-red-500 text-xs mt-1">{t(errors.relationship.message, errors.relationship.message)}</p>}
          </div>

          {/* Two columns */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('form.dateOfBirth')}</label>
              <input
                type="date"
                {...register('dateOfBirth')}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('form.bloodGroup')}</label>
              <select
                {...register('bloodGroup')}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all bg-white"
              >
                <option value="">{t('form.select')}</option>
                {bloodGroups.map((bg) => (
                  <option key={bg} value={bg}>{bg}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('form.gender')}</label>
              <select
                {...register('gender')}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all bg-white"
              >
                <option value="">{t('form.select')}</option>
                {genders.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {t('form.phone')} <span className="text-gray-400 font-normal">{t('form.phoneEmergencyHint')}</span>
              </label>
              <input
                type="tel"
                {...register('phone')}
                placeholder={t('form.phonePlaceholder')}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              />
            </div>
          </div>

          {/* WhatsApp Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('auth.whatsappNumber')}</label>
            <input
              type="tel"
              {...register('whatsappPhone')}
              placeholder={t('form.phonePlaceholder')}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
            />
            <p className="text-xs text-gray-400 mt-1">{t('form.whatsappHint')}</p>
            {errors.whatsappPhone && <p className="text-red-500 text-xs mt-1">{t(errors.whatsappPhone.message, errors.whatsappPhone.message)}</p>}
          </div>

          {/* WhatsApp Join QR — so the family member can opt in to receive reminders */}
          <WhatsAppJoinCard compact />

          {/* Allergies */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('form.allergies')}</label>
            <textarea
              {...register('allergies')}
              placeholder={t('form.allergiesPlaceholder')}
              rows={2}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all resize-none"
            />
          </div>

          {/* Chronic Diseases */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('form.chronicConditions')}</label>
            <textarea
              {...register('chronicDiseases')}
              placeholder={t('form.chronicPlaceholder')}
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
                {isEditing ? <Save className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                {isEditing ? t('form.saveChanges') : t('family.addMember')}
              </>
            )}
          </motion.button>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default FamilyMemberForm;

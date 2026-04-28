import { motion } from 'framer-motion';
import {
  Mail,
  Shield,
  User,
  ChevronLeft,
  Phone,
  MessageCircle,
  Calendar,
  Droplet,
  UserCircle2,
  AlertTriangle,
  HeartPulse,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import { authApi } from '../api/auth.api';
import AvatarUploader from '../components/shared/AvatarUploader';
import WhatsAppJoinCard from '../components/shared/WhatsAppJoinCard';

const formatDate = (iso) => {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return iso;
  }
};

const Profile = () => {
  const { user, setUser } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleAvatarUpload = async (file) => {
    const res = await authApi.uploadAvatar(file);
    const newUrl = res?.data?.avatarUrl;
    setUser((u) => (u ? { ...u, avatarUrl: newUrl } : u));
    queryClient.invalidateQueries({ queryKey: ['familyMembers'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    queryClient.invalidateQueries({ queryKey: ['familyOverview'] });
    queryClient.invalidateQueries({ queryKey: ['adherenceSummary'] });
    toast.success(t('profile.photoUpdated'));
  };

  const compactItems = [
    { icon: User, label: t('profile.fullName'), value: user?.name },
    { icon: Mail, label: t('profile.emailAddress'), value: user?.email },
    { icon: Shield, label: t('profile.role'), value: user?.role === 'FAMILY_HEAD' ? t('auth.familyHead') : t('auth.familyMember') },
    { icon: Phone, label: t('auth.phoneEmergency'), value: user?.phone },
    { icon: MessageCircle, label: t('auth.whatsappNumber'), value: user?.whatsappPhone || user?.phone },
    { icon: Calendar, label: t('profile.dateOfBirth'), value: formatDate(user?.dateOfBirth) },
    { icon: Droplet, label: t('profile.bloodGroup'), value: user?.bloodGroup },
    { icon: UserCircle2, label: t('profile.gender'), value: user?.gender },
  ];

  const longItems = [
    { icon: AlertTriangle, label: t('profile.allergies'), value: user?.allergies },
    { icon: HeartPulse, label: t('profile.chronicConditions'), value: user?.chronicDiseases },
  ];

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      {/* Back button */}
      <motion.button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        whileHover={{ x: -3 }}
      >
        <ChevronLeft className="w-4 h-4" />
        {t('common.back')}
      </motion.button>

      {/* Profile card */}
      <motion.div
        className="bg-white rounded-2xl shadow-sm border border-gray-50 overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', damping: 25 }}
      >
        {/* Header with gradient */}
        <div className="relative h-28 bg-gradient-to-br from-primary via-primary-dark to-amber-600">
          <motion.div
            className="absolute -bottom-12 left-0 right-0 flex justify-center"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          >
            <AvatarUploader
              name={user?.name}
              currentUrl={user?.avatarUrl}
              relationship="Self"
              size="xl"
              onUpload={handleAvatarUpload}
            />
          </motion.div>
        </div>

        {/* Name section */}
        <div className="pt-16 pb-4 text-center px-6">
          <motion.h1
            className="text-2xl font-bold text-gray-900"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {user?.name}
          </motion.h1>
          <motion.p
            className="text-sm text-gray-400 mt-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            {user?.role === 'FAMILY_HEAD' ? t('auth.familyHead') : t('auth.familyMember')}
          </motion.p>
          {user?.role === 'FAMILY_HEAD' && (
            <motion.button
              onClick={() => navigate('/family')}
              className="mt-3 inline-flex items-center gap-1 text-xs text-primary-dark hover:text-primary font-semibold"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
            >
              {t('profile.editInFamily')}
            </motion.button>
          )}
        </div>

        {/* Info items */}
        <div className="px-6 pb-6 space-y-3">
          {compactItems.map((item, i) => (
            <motion.div
              key={item.label}
              className="flex items-center gap-4 p-4 rounded-xl bg-surface-muted"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.05 }}
            >
              <div className="w-10 h-10 rounded-xl bg-primary-light flex items-center justify-center flex-shrink-0">
                <item.icon className="w-5 h-5 text-primary-dark" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-400 font-medium">{item.label}</p>
                <p className="text-sm font-semibold text-gray-900 truncate">{item.value || '—'}</p>
              </div>
            </motion.div>
          ))}

          {longItems.map((item, i) => (
            <motion.div
              key={item.label}
              className="flex items-start gap-4 p-4 rounded-xl bg-surface-muted"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + (compactItems.length + i) * 0.05 }}
            >
              <div className="w-10 h-10 rounded-xl bg-primary-light flex items-center justify-center flex-shrink-0">
                <item.icon className="w-5 h-5 text-primary-dark" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-gray-400 font-medium">{item.label}</p>
                <p className="text-sm font-semibold text-gray-900 whitespace-pre-wrap break-words">
                  {item.value || '—'}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* WhatsApp re-join helper — for the 72h sandbox expiry */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <WhatsAppJoinCard />
      </motion.div>
    </div>
  );
};

export default Profile;

import { motion } from 'framer-motion';
import { Mail, Shield, User, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Avatar from '../components/shared/Avatar';

const Profile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const infoItems = [
    { icon: User, label: 'Full Name', value: user?.name },
    { icon: Mail, label: 'Email Address', value: user?.email },
    { icon: Shield, label: 'Role', value: user?.role === 'FAMILY_HEAD' ? 'Family Head' : user?.role },
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
        Back
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
            className="absolute -bottom-12 left-1/2 -translate-x-1/2"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          >
            <div className="ring-4 ring-white rounded-full shadow-lg">
              <Avatar name={user?.name} relationship="Self" size="xl" />
            </div>
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
            {user?.role === 'FAMILY_HEAD' ? 'Family Head' : user?.role}
          </motion.p>
        </div>

        {/* Info items */}
        <div className="px-6 pb-6 space-y-3">
          {infoItems.map((item, i) => (
            <motion.div
              key={item.label}
              className="flex items-center gap-4 p-4 rounded-xl bg-surface-muted"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.1 }}
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
        </div>
      </motion.div>
    </div>
  );
};

export default Profile;

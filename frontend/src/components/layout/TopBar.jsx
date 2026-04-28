import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import Avatar from '../shared/Avatar';
import ThemeToggle from '../shared/ThemeToggle';
import LanguageSwitcher from '../shared/LanguageSwitcher';

const TopBar = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="lg:hidden">
      <div className="fixed top-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-lg border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <motion.div
          className="flex items-center gap-2 min-w-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <img src="/familycare_icon.png" alt="" className="w-8 h-8 rounded-lg shadow-sm shrink-0" />
          <h1 className="text-lg font-bold text-gray-900 leading-none truncate">
            Family<span className="text-primary">Care</span>
          </h1>
        </motion.div>

        <div className="flex items-center gap-1">
          <LanguageSwitcher compact />
          <ThemeToggle />
          <motion.button
            onClick={() => navigate('/profile')}
            className="rounded-full focus:outline-none focus:ring-2 focus:ring-primary/30"
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.94 }}
            aria-label="Open profile"
          >
            <Avatar name={user?.name} imageUrl={user?.avatarUrl} relationship="Self" size="sm" />
          </motion.button>
        </div>
      </div>
    </div>
  );
};

export default TopBar;

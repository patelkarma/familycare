import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogOut } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import Avatar from '../shared/Avatar';
import ThemeToggle from '../shared/ThemeToggle';
import LanguageSwitcher from '../shared/LanguageSwitcher';
import { navItemsForRole } from './navItems';

const Sidebar = () => {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const navItems = navItemsForRole(user?.role);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <motion.aside
      className="hidden lg:flex flex-col w-60 h-screen bg-white border-r border-gray-100 fixed left-0 top-0 z-30"
      initial={{ x: -240 }}
      animate={{ x: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
    >
      {/* Logo */}
      <div className="px-5 pt-5 pb-3 flex items-center justify-between">
        <motion.div
          className="flex items-center gap-2.5 min-w-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <img src="/familycare_icon.png" alt="" className="w-9 h-9 rounded-xl shadow-sm shrink-0" />
          <h1 className="text-xl font-bold text-gray-900 leading-none truncate">
            Family<span className="text-primary">Care</span>
          </h1>
        </motion.div>
        <ThemeToggle />
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item, i) => (
          <motion.div
            key={item.to}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 + i * 0.05 }}
          >
            <NavLink
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-primary-light text-primary-dark shadow-sm'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              {item.labelKey ? t(item.labelKey, item.label) : item.label}
            </NavLink>
          </motion.div>
        ))}

        {/* Language picker — sits as a nav row, opens an upward dropdown */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 + navItems.length * 0.05 }}
        >
          <LanguageSwitcher variant="navItem" />
        </motion.div>
      </nav>

      {/* User section */}
      <div className="p-4 border-t border-gray-100">
        <motion.div
          className="flex items-center gap-3 mb-3 p-2 -mx-2 rounded-xl cursor-pointer hover:bg-primary-light/50 transition-colors"
          onClick={() => navigate('/profile')}
          whileHover={{ x: 4 }}
          whileTap={{ scale: 0.97 }}
        >
          <Avatar name={user?.name} imageUrl={user?.avatarUrl} relationship="Self" size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{user?.name}</p>
            <p className="text-xs text-gray-400 truncate">{user?.email}</p>
          </div>
        </motion.div>
        <motion.button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full px-4 py-2 rounded-xl text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
          whileHover={{ x: 4 }}
          whileTap={{ scale: 0.97 }}
        >
          <LogOut className="w-4 h-4" />
          {t('auth.signOut', 'Sign out')}
        </motion.button>
      </div>
    </motion.aside>
  );
};

export default Sidebar;

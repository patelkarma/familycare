import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Menu,
  X,
  LayoutDashboard,
  Users,
  Pill,
  Heart,
  FileText,
  ShieldAlert,
  LogOut,
  Calendar,
  User,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import Avatar from '../shared/Avatar';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, enabled: true },
  { to: '/family', label: 'Family', icon: Users, enabled: true },
  { to: '/medicines', label: 'Medicines', icon: Pill, enabled: true },
  { to: '/vitals', label: 'Vitals', icon: Heart, enabled: false },
  { to: '/appointments', label: 'Appointments', icon: Calendar, enabled: false },
  { to: '/reports', label: 'Reports', icon: FileText, enabled: false },
  { to: '/sos', label: 'SOS Setup', icon: ShieldAlert, enabled: false },
];

const TopBar = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
    setMenuOpen(false);
  };

  return (
    <div className="lg:hidden">
      {/* Top bar */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-lg border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <motion.h1
          className="text-xl font-bold text-gray-900"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          Family<span className="text-primary">Care</span>
        </motion.h1>

        <div className="flex items-center gap-3">
          <Avatar name={user?.name} relationship="Self" size="sm" />
          <motion.button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
            whileTap={{ scale: 0.9 }}
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </motion.button>
        </div>
      </div>

      {/* Mobile menu overlay */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            className="fixed inset-0 z-30 bg-black/30 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Mobile menu drawer */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            className="fixed top-0 right-0 z-40 w-72 h-full bg-white shadow-2xl p-6 pt-20"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 250 }}
          >
            <nav className="space-y-1">
              {navItems.map((item, i) => (
                <motion.div
                  key={item.to}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  {item.enabled ? (
                    <NavLink
                      to={item.to}
                      onClick={() => setMenuOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                          isActive
                            ? 'bg-primary-light text-primary-dark'
                            : 'text-gray-600 hover:bg-gray-50'
                        }`
                      }
                    >
                      <item.icon className="w-5 h-5" />
                      {item.label}
                    </NavLink>
                  ) : (
                    <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-300 cursor-not-allowed">
                      <item.icon className="w-5 h-5" />
                      {item.label}
                    </div>
                  )}
                </motion.div>
              ))}
            </nav>

            <div className="absolute bottom-8 left-6 right-6 space-y-2">
              <motion.button
                onClick={() => { navigate('/profile'); setMenuOpen(false); }}
                className="flex items-center gap-2 w-full px-4 py-3 rounded-xl text-sm font-medium text-gray-600 hover:bg-primary-light hover:text-primary-dark transition-colors"
                whileTap={{ scale: 0.97 }}
              >
                <User className="w-4 h-4" />
                My Profile
              </motion.button>
              <motion.button
                onClick={handleLogout}
                className="flex items-center gap-2 w-full px-4 py-3 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
                whileTap={{ scale: 0.97 }}
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TopBar;

import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  Pill,
  Clock,
  Heart,
  FileText,
  ShieldAlert,
  LogOut,
  Calendar,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import Avatar from '../shared/Avatar';

const caregiverNavItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, enabled: true },
  { to: '/family', label: 'Family', icon: Users, enabled: true },
  { to: '/medicines', label: 'Medicines', icon: Pill, enabled: true },
  { to: '/doses-today', label: 'Doses Today', icon: Clock, enabled: true },
  { to: '/vitals', label: 'Vitals', icon: Heart, enabled: false },
  { to: '/appointments', label: 'Appointments', icon: Calendar, enabled: false },
  { to: '/reports', label: 'Reports', icon: FileText, enabled: false },
  { to: '/sos', label: 'SOS Setup', icon: ShieldAlert, enabled: false },
];

const patientNavItems = [
  { to: '/my-medicines', label: 'My Medicines', icon: Pill, enabled: true },
];

const Sidebar = () => {
  const { user, logout } = useAuth();
  const navItems = user?.role === 'MEMBER' ? patientNavItems : caregiverNavItems;
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
      <div className="p-6 pb-4">
        <motion.h1
          className="text-2xl font-bold text-gray-900"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          Family<span className="text-primary">Care</span>
        </motion.h1>
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
            {item.enabled ? (
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
                {item.label}
              </NavLink>
            ) : (
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-300 cursor-not-allowed">
                <item.icon className="w-5 h-5" />
                {item.label}
                <span className="ml-auto text-[10px] bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">Soon</span>
              </div>
            )}
          </motion.div>
        ))}
      </nav>

      {/* User section */}
      <div className="p-4 border-t border-gray-100">
        <motion.div
          className="flex items-center gap-3 mb-3 p-2 -mx-2 rounded-xl cursor-pointer hover:bg-primary-light/50 transition-colors"
          onClick={() => navigate('/profile')}
          whileHover={{ x: 4 }}
          whileTap={{ scale: 0.97 }}
        >
          <Avatar name={user?.name} relationship="Self" size="sm" />
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
          Sign out
        </motion.button>
      </div>
    </motion.aside>
  );
};

export default Sidebar;

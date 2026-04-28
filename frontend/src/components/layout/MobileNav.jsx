import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Pill,
  Heart,
  Calendar,
  FileText,
  Sparkles,
  MoreHorizontal,
  Users,
  Clock,
  Camera,
  MapPin,
  ShieldAlert,
  LogOut,
  X,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';

const MobileNav = () => {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setMoreOpen(false);
    navigate('/');
  };

  const isPatient = user?.role === 'MEMBER';

  const caregiverPrimary = [
    { to: '/dashboard', label: t('mobileNav.home'), icon: LayoutDashboard },
    { to: '/medicines', label: t('mobileNav.meds'), icon: Pill },
    { to: '/assistant', label: t('mobileNav.ai'), icon: Sparkles },
    { to: '/vitals', label: t('nav.vitals'), icon: Heart },
  ];
  const caregiverMore = [
    { to: '/family', label: t('nav.family'), icon: Users },
    { to: '/doses-today', label: t('nav.dosesToday'), icon: Clock },
    { to: '/identify-pill', label: t('nav.identifyPill'), icon: Camera },
    { to: '/appointments', label: t('nav.appointments'), icon: Calendar },
    { to: '/reports', label: t('nav.reports'), icon: FileText },
    { to: '/pharmacy', label: t('nav.pharmacy'), icon: MapPin },
    { to: '/sos', label: t('nav.sos'), icon: ShieldAlert },
  ];
  const patientPrimary = [
    { to: '/my-medicines', label: t('mobileNav.meds'), icon: Pill },
    { to: '/vitals', label: t('nav.vitals'), icon: Heart },
    { to: '/assistant', label: t('mobileNav.ai'), icon: Sparkles },
    { to: '/appointments', label: t('mobileNav.appts'), icon: Calendar },
  ];
  const patientMore = [
    { to: '/reports', label: t('nav.reports'), icon: FileText },
  ];

  const primary = isPatient ? patientPrimary : caregiverPrimary;
  const more = isPatient ? patientMore : caregiverMore;

  const goTo = (to) => {
    setMoreOpen(false);
    navigate(to);
  };

  return (
    <>
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-lg border-t border-gray-100 px-2 pb-safe">
        <div className="flex items-center justify-around py-2">
          {primary.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all ${
                  isActive ? 'text-primary' : 'text-gray-400'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <motion.div
                    animate={isActive ? { scale: 1.15, y: -2 } : { scale: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                  >
                    <tab.icon className="w-5 h-5" />
                  </motion.div>
                  <span className="text-[10px] font-medium">{tab.label}</span>
                  {isActive && (
                    <motion.div
                      className="w-1 h-1 rounded-full bg-primary"
                      layoutId="mobileNavDot"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                </>
              )}
            </NavLink>
          ))}

          {more.length > 0 && (
            <button
              onClick={() => setMoreOpen(true)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all ${
                moreOpen ? 'text-primary' : 'text-gray-400'
              }`}
            >
              <motion.div
                animate={moreOpen ? { scale: 1.15, y: -2 } : { scale: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              >
                <MoreHorizontal className="w-5 h-5" />
              </motion.div>
              <span className="text-[10px] font-medium">{t('mobileNav.more')}</span>
            </button>
          )}
        </div>
      </nav>

      <AnimatePresence>
        {moreOpen && (
          <motion.div
            className="lg:hidden fixed inset-0 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setMoreOpen(false)}
            />
            <motion.div
              className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl pb-safe"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-5 bg-primary rounded-full" />
                  <h3 className="text-base font-bold text-gray-900">{t('mobileNav.more')}</h3>
                </div>
                <motion.button
                  onClick={() => setMoreOpen(false)}
                  className="p-1.5 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                  whileTap={{ scale: 0.9 }}
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>

              <div className="grid grid-cols-3 gap-2 p-4">
                {more.map((item, i) => (
                  <motion.button
                    key={item.to}
                    onClick={() => goTo(item.to)}
                    className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-gray-50 hover:bg-primary-light active:scale-95 transition-all"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                  >
                    <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center">
                      <item.icon className="w-5 h-5 text-primary-dark" />
                    </div>
                    <span className="text-[11px] font-medium text-gray-700 text-center leading-tight">
                      {item.label}
                    </span>
                  </motion.button>
                ))}
              </div>

              {/* Sign out — full-width row at the bottom of the sheet */}
              <div className="border-t border-gray-100 px-4 py-3">
                <motion.button
                  onClick={handleLogout}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 active:bg-red-100 transition-colors"
                  whileTap={{ scale: 0.97 }}
                >
                  <LogOut className="w-4 h-4" />
                  {t('auth.signOut', 'Sign out')}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default MobileNav;

import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LayoutDashboard, Users, Pill, Heart, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const caregiverTabs = [
  { to: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { to: '/family', label: 'Family', icon: Users },
  { to: '/medicines', label: 'Meds', icon: Pill },
  { to: '/vitals', label: 'Vitals', icon: Heart },
  { to: '/sos', label: 'SOS', icon: ShieldAlert },
];

const patientTabs = [
  { to: '/my-medicines', label: 'My Meds', icon: Pill },
];

const MobileNav = () => {
  const { user } = useAuth();
  const tabs = user?.role === 'MEMBER' ? patientTabs : caregiverTabs;
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-lg border-t border-gray-100 px-2 pb-safe">
      <div className="flex items-center justify-around py-2">
        {tabs.map((tab) => (
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
      </div>
    </nav>
  );
};

export default MobileNav;

import {
  LayoutDashboard,
  Users,
  Pill,
  Clock,
  Heart,
  FileText,
  ShieldAlert,
  Calendar,
  MapPin,
  Sparkles,
  Camera,
} from 'lucide-react';

// `labelKey` resolves through i18n; `label` is the fallback if a translation is missing.
export const caregiverNavItems = [
  { to: '/dashboard', label: 'Dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard },
  { to: '/family', label: 'Family', labelKey: 'nav.family', icon: Users },
  { to: '/medicines', label: 'Medicines', labelKey: 'nav.medicines', icon: Pill },
  { to: '/doses-today', label: 'Doses Today', labelKey: 'nav.dosesToday', icon: Clock },
  { to: '/vitals', label: 'Vitals', labelKey: 'nav.vitals', icon: Heart },
  { to: '/assistant', label: 'AI Assistant', labelKey: 'nav.aiAssistant', icon: Sparkles },
  { to: '/identify-pill', label: 'Identify Pill', labelKey: 'nav.identifyPill', icon: Camera },
  { to: '/appointments', label: 'Appointments', labelKey: 'nav.appointments', icon: Calendar },
  { to: '/reports', label: 'Reports', labelKey: 'nav.reports', icon: FileText },
  { to: '/pharmacy', label: 'Pharmacy', labelKey: 'nav.pharmacy', icon: MapPin },
  { to: '/sos', label: 'SOS Setup', labelKey: 'nav.sos', icon: ShieldAlert },
];

export const patientNavItems = [
  { to: '/my-medicines', label: 'My Medicines', labelKey: 'nav.myMedicines', icon: Pill },
  { to: '/vitals', label: 'My Vitals', labelKey: 'nav.vitals', icon: Heart },
  { to: '/assistant', label: 'AI Assistant', labelKey: 'nav.aiAssistant', icon: Sparkles },
  { to: '/appointments', label: 'Appointments', labelKey: 'nav.appointments', icon: Calendar },
];

export const navItemsForRole = (role) =>
  role === 'MEMBER' ? patientNavItems : caregiverNavItems;

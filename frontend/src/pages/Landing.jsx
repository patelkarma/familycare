import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, Pill, Shield, Users, Bell, FileText, Activity } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import ThemeToggle from '../components/shared/ThemeToggle';
import LanguageSwitcher from '../components/shared/LanguageSwitcher';

const Landing = () => {
  const { t } = useTranslation();
  const features = [
    { icon: Bell, title: t('landing.feature1Title'), desc: t('landing.feature1Desc'), color: 'bg-amber-100 text-amber-600' },
    { icon: Users, title: t('landing.feature2Title'), desc: t('landing.feature2Desc'), color: 'bg-blue-100 text-blue-600' },
    { icon: Activity, title: t('landing.feature3Title'), desc: t('landing.feature3Desc'), color: 'bg-red-100 text-red-600' },
    { icon: Pill, title: t('landing.feature4Title'), desc: t('landing.feature4Desc'), color: 'bg-green-100 text-green-600' },
    { icon: FileText, title: t('landing.feature5Title'), desc: t('landing.feature5Desc'), color: 'bg-purple-100 text-purple-600' },
    { icon: Shield, title: t('landing.feature6Title'), desc: t('landing.feature6Desc'), color: 'bg-rose-100 text-rose-600' },
  ];
  return (
    <div className="min-h-screen bg-surface-page overflow-hidden">
      {/* Navbar */}
      <motion.nav
        className="flex items-center justify-between px-6 lg:px-16 py-4 bg-white/80 dark:bg-[rgba(11,15,26,0.85)] backdrop-blur-lg sticky top-0 z-50 border-b border-gray-100 dark:border-white/10 shadow-sm dark:shadow-black/30"
        initial={{ y: -60 }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', damping: 20 }}
      >
        <Link to="/" className="flex items-center gap-2.5">
          <img src="/familycare_icon.png" alt="" className="w-9 h-9 rounded-xl shadow-sm" />
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
            Family<span className="text-primary">Care</span>
          </h1>
        </Link>
        <div className="flex items-center gap-2 sm:gap-3">
          <LanguageSwitcher compact />
          <ThemeToggle />
          <Link
            to="/login"
            className="hidden sm:inline-flex px-5 py-2 text-sm font-semibold text-gray-700 dark:text-gray-100 hover:text-gray-900 dark:hover:text-white rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
          >
            {t('auth.signIn')}
          </Link>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Link
              to="/register"
              className="px-4 sm:px-5 py-2 sm:py-2.5 bg-primary text-white rounded-xl text-xs sm:text-sm font-semibold shadow-lg shadow-primary/25 hover:bg-primary-dark transition-colors"
            >
              {t('auth.getStarted')}
            </Link>
          </motion.div>
        </div>
      </motion.nav>

      {/* Hero */}
      <section className="relative px-6 lg:px-16 pt-20 pb-24 lg:pt-32 lg:pb-36 text-center">
        {/* Floating decorative circles — vibrant, elder-visible */}
        <motion.div
          className="absolute top-16 left-8 w-28 h-28 rounded-full bg-gradient-to-br from-primary/30 to-amber-300/40"
          animate={{ y: [0, -30, 0], x: [0, 10, 0], rotate: [0, 15, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute top-32 right-12 w-22 h-22 rounded-full bg-gradient-to-br from-blue-300/50 to-sky-200/60"
          style={{ width: '88px', height: '88px' }}
          animate={{ y: [0, 25, 0], x: [0, -12, 0], rotate: [0, -12, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
        />
        <motion.div
          className="absolute bottom-16 left-1/4 w-18 h-18 rounded-full bg-gradient-to-br from-rose-300/50 to-pink-200/60"
          style={{ width: '72px', height: '72px' }}
          animate={{ y: [0, -20, 0], x: [0, 15, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
        />
        <motion.div
          className="absolute top-52 left-2/3 w-14 h-14 rounded-full bg-gradient-to-br from-emerald-300/40 to-green-200/50"
          animate={{ y: [0, 18, 0], rotate: [0, 20, 0] }}
          transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut', delay: 1.2 }}
        />
        <motion.div
          className="absolute bottom-32 right-1/4 w-10 h-10 rounded-full bg-gradient-to-br from-violet-300/45 to-purple-200/55"
          animate={{ y: [0, -15, 0], x: [0, -8, 0] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay: 0.6 }}
        />

        <motion.div
          className="relative z-10"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <motion.div
            className="inline-flex items-center gap-2 bg-primary-light text-primary-dark px-4 py-2 rounded-full text-sm font-medium mb-8"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: 'spring' }}
          >
            <Heart className="w-4 h-4" />
            {t('landing.tagline')}
          </motion.div>

          <h2 className="text-4xl lg:text-6xl font-bold text-gray-900 leading-tight max-w-3xl mx-auto">
            {t('landing.heroLine')}{' '}
            <span className="text-primary relative">
              {t('landing.heroEmphasis')}
              <motion.svg
                className="absolute -bottom-2 left-0 w-full"
                viewBox="0 0 300 12"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ delay: 1, duration: 0.8 }}
              >
                <motion.path
                  d="M2 8 Q75 2 150 8 Q225 14 298 6"
                  stroke="#F5A623"
                  strokeWidth="3"
                  fill="none"
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ delay: 1, duration: 0.8 }}
                />
              </motion.svg>
            </span>
          </h2>

          <motion.p
            className="text-lg text-gray-500 mt-6 max-w-xl mx-auto leading-relaxed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            {t('landing.heroSub')}
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link
                to="/register"
                className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-white rounded-2xl text-lg font-bold shadow-xl shadow-primary/30 hover:bg-primary-dark transition-colors"
              >
                {t('landing.startFree')}
                <motion.span
                  animate={{ x: [0, 4, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  &rarr;
                </motion.span>
              </Link>
            </motion.div>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-8 py-4 text-gray-600 hover:text-gray-900 font-medium transition-colors"
            >
              {t('auth.haveAccount')}
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* Features grid */}
      <section className="px-6 lg:px-16 pb-24">
        <motion.h3
          className="text-2xl lg:text-3xl font-bold text-center text-gray-900 mb-12"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          {t('landing.everythingTitle')}
        </motion.h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-lg transition-shadow border border-gray-50 cursor-default"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ y: -4 }}
            >
              <div className={`w-12 h-12 rounded-xl ${feature.color} flex items-center justify-center mb-4`}>
                <feature.icon className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-1">{feature.title}</h4>
              <p className="text-sm text-gray-500">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 px-6 py-8 text-center text-sm text-gray-400">
        &copy; {new Date().getFullYear()} FamilyCare. Built with care for Indian families.
      </footer>
    </div>
  );
};

export default Landing;

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES } from '../../i18n';

/**
 * Language picker with two render modes:
 *  - default (compact icon button) — used in TopBar / Landing
 *  - variant="navItem" — full-width row that matches Sidebar nav items
 */
const LanguageSwitcher = ({ compact = false, variant }) => {
  const { i18n, t } = useTranslation();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  const current =
    SUPPORTED_LANGUAGES.find((l) => l.code === i18n.resolvedLanguage) ||
    SUPPORTED_LANGUAGES.find((l) => l.code === i18n.language?.split('-')[0]) ||
    SUPPORTED_LANGUAGES[0];

  useEffect(() => {
    const onClick = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const change = (code) => {
    i18n.changeLanguage(code);
    setOpen(false);
  };

  const isNavItem = variant === 'navItem';

  return (
    <div ref={wrapperRef} className="relative">
      {isNavItem ? (
        <motion.button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
            open ? 'bg-primary-light text-primary-dark shadow-sm' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          }`}
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          <Globe className="w-5 h-5" />
          <span className="flex-1 text-left">{t('language', 'Language')}</span>
          <span className="text-xs text-gray-400">{current.native}</span>
          <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
        </motion.button>
      ) : (
        <motion.button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="inline-flex items-center gap-1.5 rounded-xl px-2 py-1.5 text-gray-600 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          aria-label="Change language"
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          <Globe className="w-4 h-4" />
          {!compact && <span className="text-xs font-semibold">{current.native}</span>}
        </motion.button>
      )}

      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            className={`absolute ${
              isNavItem
                ? 'left-0 right-0 bottom-full mb-2 w-auto'
                : 'right-0 mt-2 w-56'
            } max-h-72 overflow-y-auto bg-white dark:bg-[#131826] border border-gray-100 dark:border-white/10 rounded-xl shadow-lg dark:shadow-black/40 z-50 py-1`}
            initial={{ opacity: 0, y: isNavItem ? 6 : -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: isNavItem ? 6 : -6, scale: 0.97 }}
            transition={{ duration: 0.12 }}
          >
            {SUPPORTED_LANGUAGES.map((lang) => {
              const isActive = lang.code === current.code;
              return (
                <li key={lang.code} role="option" aria-selected={isActive}>
                  <button
                    type="button"
                    onClick={() => change(lang.code)}
                    className={`flex items-center justify-between w-full text-left px-3 py-2 text-sm hover:bg-primary-light/40 transition-colors ${
                      isActive ? 'text-primary-dark font-semibold' : 'text-gray-700'
                    }`}
                  >
                    <span className="flex flex-col">
                      <span>{lang.native}</span>
                      <span className="text-[10px] text-gray-400">{lang.label}</span>
                    </span>
                    {isActive && <Check className="w-4 h-4 text-primary" />}
                  </button>
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LanguageSwitcher;

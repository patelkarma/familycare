import { motion } from 'framer-motion';
import { ShieldAlert } from 'lucide-react';

/**
 * The big red panic button. Sized for elderly users — 200×200 by default,
 * scales down on the smallest screens. Pulses gently to draw the eye.
 */
const SOSButton = ({ onClick, disabled = false, size = 'lg', label = 'SOS' }) => {
  const dimensions =
    size === 'lg'
      ? 'w-48 h-48 sm:w-52 sm:h-52'
      : size === 'md'
      ? 'w-32 h-32'
      : 'w-24 h-24';

  return (
    <div className="relative flex items-center justify-center">
      {/* Outer pulse ring */}
      <motion.div
        className={`absolute ${dimensions} rounded-full bg-red-500/30`}
        animate={{ scale: [1, 1.25, 1], opacity: [0.6, 0, 0.6] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
      />
      {/* Inner pulse ring */}
      <motion.div
        className={`absolute ${dimensions} rounded-full bg-red-500/40`}
        animate={{ scale: [1, 1.12, 1], opacity: [0.7, 0.2, 0.7] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
      />

      <motion.button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={`relative ${dimensions} rounded-full bg-gradient-to-br from-red-500 to-red-700 text-white font-extrabold flex flex-col items-center justify-center shadow-2xl shadow-red-500/40 ring-8 ring-white disabled:opacity-50 disabled:cursor-not-allowed`}
        whileHover={{ scale: disabled ? 1 : 1.04 }}
        whileTap={{ scale: disabled ? 1 : 0.92 }}
        animate={
          disabled
            ? {}
            : {
                boxShadow: [
                  '0 25px 50px -12px rgba(239,68,68,0.4)',
                  '0 25px 60px -8px rgba(239,68,68,0.7)',
                  '0 25px 50px -12px rgba(239,68,68,0.4)',
                ],
              }
        }
        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
      >
        <ShieldAlert className="w-12 h-12 sm:w-14 sm:h-14 mb-1" />
        <span className="text-3xl sm:text-4xl tracking-wider">{label}</span>
        <span className="text-[10px] sm:text-xs font-medium opacity-90 mt-1 px-2 text-center">
          Press for help
        </span>
      </motion.button>
    </div>
  );
};

export default SOSButton;

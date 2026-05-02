import { motion } from 'framer-motion';
import { AlertTriangle, RotateCw } from 'lucide-react';

/**
 * Recoverable error UI for failed data fetches.
 *
 * Why a button instead of a toast: toasts vanish. A user who looked away
 * during the fetch needs to see *what* failed and *how to recover* still on
 * the page when they look back. Icon + clear message + retry CTA = no
 * dead-end states.
 */
const ErrorState = ({
  title = 'Could not load this',
  description = 'Check your connection and try again.',
  onRetry,
  retryLabel = 'Retry',
}) => {
  return (
    <motion.div
      role="alert"
      className="flex flex-col items-center justify-center py-12 px-6 text-center bg-red-50 border border-red-100 rounded-2xl"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mb-4">
        <AlertTriangle className="w-7 h-7 text-red-500" />
      </div>
      <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
      <p className="text-sm text-gray-500 mt-1 max-w-sm">{description}</p>
      {onRetry && (
        <motion.button
          onClick={onRetry}
          className="mt-5 inline-flex items-center gap-2 bg-primary text-white rounded-xl px-5 py-2.5 font-semibold shadow-sm hover:bg-primary-dark transition-colors"
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
        >
          <RotateCw className="w-4 h-4" />
          {retryLabel}
        </motion.button>
      )}
    </motion.div>
  );
};

export default ErrorState;

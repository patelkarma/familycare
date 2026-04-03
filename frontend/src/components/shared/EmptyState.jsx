import { motion } from 'framer-motion';

const EmptyState = ({ icon: Icon, title, description, actionLabel, onAction }) => {
  return (
    <motion.div
      className="flex flex-col items-center justify-center py-16 px-6 text-center"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, type: 'spring' }}
    >
      {Icon && (
        <motion.div
          className="w-20 h-20 rounded-full bg-primary-light flex items-center justify-center mb-6"
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Icon className="w-10 h-10 text-primary" />
        </motion.div>
      )}
      <h3 className="text-xl font-semibold text-gray-800 mb-2">{title}</h3>
      <p className="text-gray-500 mb-6 max-w-sm">{description}</p>
      {actionLabel && onAction && (
        <motion.button
          onClick={onAction}
          className="bg-primary text-white rounded-xl px-6 py-3 font-semibold text-lg shadow-lg shadow-primary/25 hover:bg-primary-dark transition-colors"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {actionLabel}
        </motion.button>
      )}
    </motion.div>
  );
};

export default EmptyState;

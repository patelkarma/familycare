import { motion } from 'framer-motion';
import { FileText, Upload } from 'lucide-react';

const EmptyReportsState = ({ onUpload, memberName }) => {
  return (
    <motion.div
      className="flex flex-col items-center justify-center py-16 px-6 text-center"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, type: 'spring' }}
    >
      <motion.div
        className="relative mb-6"
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary-light to-amber-50 flex items-center justify-center shadow-lg shadow-primary/10">
          <FileText className="w-12 h-12 text-primary" />
        </div>
        <motion.div
          className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center"
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        >
          <span className="text-lg">📄</span>
        </motion.div>
      </motion.div>

      <h3 className="text-2xl font-bold text-gray-900 mb-2">
        No reports yet{memberName ? ` for ${memberName}` : ''}
      </h3>
      <p className="text-gray-500 mb-8 max-w-sm">
        Upload lab reports, prescriptions, X-rays and discharge summaries here.
        Find everything in one tap when you need it.
      </p>

      {onUpload && (
        <motion.button
          onClick={onUpload}
          className="flex items-center gap-2 bg-primary text-white rounded-2xl px-6 py-3.5 font-semibold text-base shadow-lg shadow-primary/30 hover:bg-primary-dark transition-colors"
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.95 }}
        >
          <Upload className="w-5 h-5" />
          Upload First Report
        </motion.button>
      )}
    </motion.div>
  );
};

export default EmptyReportsState;

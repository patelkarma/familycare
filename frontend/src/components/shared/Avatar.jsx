import { motion } from 'framer-motion';
import { getInitials } from '../../utils/formatters';

const colorMap = {
  Father: 'bg-blue-500',
  Mother: 'bg-pink-500',
  Spouse: 'bg-purple-500',
  Son: 'bg-emerald-500',
  Daughter: 'bg-rose-400',
  Grandfather: 'bg-amber-600',
  Grandmother: 'bg-orange-500',
  Self: 'bg-primary',
};

const Avatar = ({ name, imageUrl, relationship, size = 'md' }) => {
  const sizes = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-12 h-12 text-sm',
    lg: 'w-16 h-16 text-lg',
    xl: 'w-24 h-24 text-2xl',
  };

  const bgColor = colorMap[relationship] || 'bg-gray-400';

  if (imageUrl) {
    return (
      <motion.img
        src={imageUrl}
        alt={name}
        className={`${sizes[size]} rounded-full object-cover ring-2 ring-white shadow-md`}
        whileHover={{ scale: 1.1 }}
        transition={{ type: 'spring', stiffness: 300 }}
      />
    );
  }

  return (
    <motion.div
      className={`${sizes[size]} ${bgColor} rounded-full flex items-center justify-center text-white font-bold ring-2 ring-white shadow-md`}
      whileHover={{ scale: 1.1 }}
      transition={{ type: 'spring', stiffness: 300 }}
    >
      {getInitials(name)}
    </motion.div>
  );
};

export default Avatar;

import { motion } from 'framer-motion';

const shimmer = {
  animate: {
    backgroundPosition: ['200% 0', '-200% 0'],
  },
  transition: { duration: 1.6, repeat: Infinity, ease: 'linear' },
};

const baseLine =
  'rounded-md bg-[linear-gradient(90deg,#f3f4f6_0%,#e5e7eb_50%,#f3f4f6_100%)] bg-[length:200%_100%]';

const Line = ({ width = 'w-full', height = 'h-3', className = '' }) => (
  <motion.div
    className={`${baseLine} ${width} ${height} ${className}`}
    animate={shimmer.animate}
    transition={shimmer.transition}
  />
);

export const SkeletonCard = ({ rows = 2 }) => (
  <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-50">
    <div className="flex items-start gap-4">
      <Line width="w-12" height="h-12" className="rounded-full shrink-0" />
      <div className="flex-1 space-y-2">
        <Line width="w-2/3" height="h-4" />
        <Line width="w-1/3" height="h-3" />
        {Array.from({ length: Math.max(0, rows - 1) }).map((_, i) => (
          <Line key={i} width={i % 2 === 0 ? 'w-5/6' : 'w-3/4'} height="h-3" />
        ))}
      </div>
    </div>
  </div>
);

export const SkeletonStat = () => (
  <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-50">
    <Line width="w-10" height="h-10" className="rounded-xl mb-3" />
    <Line width="w-16" height="h-7" className="mb-1.5" />
    <Line width="w-24" height="h-3" />
  </div>
);

export const SkeletonList = ({ count = 3, rows = 2 }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonCard key={i} rows={rows} />
    ))}
  </div>
);

export const SkeletonStatGrid = ({ count = 4 }) => (
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonStat key={i} />
    ))}
  </div>
);

export const SkeletonChart = () => (
  <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-50">
    <Line width="w-32" height="h-4" className="mb-4" />
    <Line width="w-full" height="h-48" />
  </div>
);

export default SkeletonCard;

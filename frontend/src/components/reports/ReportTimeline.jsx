import { motion } from 'framer-motion';
import ReportCard from './ReportCard';

const MONTH_FMT = new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' });

const groupByMonth = (reports) => {
  const groups = new Map();
  for (const r of reports) {
    const key = r.reportDate
      ? MONTH_FMT.format(new Date(r.reportDate))
      : 'Undated';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  }
  return Array.from(groups.entries());
};

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const ReportTimeline = ({ reports, onView, onShare, onPin, onDelete, canEdit }) => {
  const groups = groupByMonth(reports);

  return (
    <motion.div
      className="relative space-y-8"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {/* Left gutter line (desktop) */}
      <div className="hidden md:block absolute left-[11px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-primary/30 via-gray-200 to-transparent" />

      {groups.map(([month, items], groupIdx) => (
        <motion.div
          key={month}
          className="relative"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: groupIdx * 0.05 }}
        >
          {/* Month header with dot */}
          <div className="flex items-center gap-3 mb-4 md:pl-8">
            <motion.div
              className="hidden md:block absolute left-0 w-6 h-6 rounded-full bg-white border-4 border-primary shadow-md shadow-primary/20"
              whileHover={{ scale: 1.2 }}
              transition={{ type: 'spring', stiffness: 400 }}
            />
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500">
              {month}
            </h3>
            <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
              {items.length}
            </span>
          </div>

          {/* Cards grid */}
          <div className="md:pl-8 grid grid-cols-1 lg:grid-cols-2 gap-4">
            {items.map((r) => (
              <ReportCard
                key={r.id}
                report={r}
                onView={onView}
                onShare={onShare}
                onPin={onPin}
                onDelete={onDelete}
                canEdit={canEdit}
              />
            ))}
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
};

export default ReportTimeline;

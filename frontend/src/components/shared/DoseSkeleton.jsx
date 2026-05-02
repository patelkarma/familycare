/**
 * Skeleton loader matching the shape of the daily dose schedule.
 *
 * Why a skeleton instead of a spinner: a centered spinner gives the user no
 * idea what's about to load. A skeleton signals "a list of doses is coming"
 * before the network call completes, which feels faster and reduces layout
 * shift when the data arrives.
 */
const DoseSkeleton = ({ rows = 3 }) => {
  return (
    <div className="space-y-4 animate-pulse" role="status" aria-label="Loading doses">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-2xl p-5 shadow-sm border border-gray-50"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-200" />
              <div className="space-y-2">
                <div className="h-4 w-32 bg-gray-200 rounded" />
                <div className="h-3 w-20 bg-gray-100 rounded" />
              </div>
            </div>
            <div className="h-8 w-24 bg-gray-200 rounded-xl" />
          </div>
          <div className="space-y-2 pt-3 border-t border-gray-50">
            <div className="h-3 w-full bg-gray-100 rounded" />
            <div className="h-3 w-3/4 bg-gray-100 rounded" />
          </div>
        </div>
      ))}
      <span className="sr-only">Loading…</span>
    </div>
  );
};

export default DoseSkeleton;

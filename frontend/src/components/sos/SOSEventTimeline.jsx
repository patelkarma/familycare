import { motion } from 'framer-motion';
import { ShieldAlert, MapPin, Users, Clock } from 'lucide-react';

const formatDateTime = (iso) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
};

const parseDeliverySummary = (raw) => {
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
};

const SOSEventTimeline = ({ events = [] }) => {
  if (events.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center border border-dashed border-gray-200">
        <ShieldAlert className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 text-sm font-medium">No SOS alerts yet</p>
        <p className="text-gray-400 text-xs mt-1">
          When you trigger SOS, every alert appears here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {events.map((e, i) => {
        const deliveries = parseDeliverySummary(e.deliverySummary);
        const sentCount = deliveries.filter((d) => d.whatsapp === 'SENT').length;

        return (
          <motion.div
            key={e.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-gray-100"
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                  <ShieldAlert className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-sm">
                    SOS triggered for {e.familyMemberName}
                  </p>
                  <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3" />
                    {formatDateTime(e.triggeredAt)}
                  </p>
                </div>
              </div>

              <div className="text-right flex-shrink-0">
                <p className="text-xs font-bold text-gray-700">
                  {sentCount}/{e.contactsNotified} delivered
                </p>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider">
                  contacts
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 text-xs">
              <div className="flex items-center gap-1 bg-gray-50 px-2.5 py-1 rounded-full text-gray-600">
                <Users className="w-3 h-3" />
                Triggered by {e.triggeredByName}
              </div>
              {e.mapsUrl && (
                <a
                  href={e.mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 bg-blue-50 hover:bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full font-semibold transition-colors"
                >
                  <MapPin className="w-3 h-3" />
                  View location
                </a>
              )}
            </div>

            {deliveries.length > 0 && (
              <details className="mt-3 group">
                <summary className="text-xs font-semibold text-gray-500 hover:text-gray-700 cursor-pointer list-none flex items-center gap-1">
                  <span className="group-open:rotate-90 transition-transform inline-block">
                    ▶
                  </span>
                  Per-contact delivery
                </summary>
                <div className="mt-2 space-y-1.5">
                  {deliveries.map((d, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-xs bg-gray-50 rounded-lg px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-700 truncate">
                          {d.name}{' '}
                          {d.isPrimary && (
                            <span className="text-[9px] bg-primary text-white px-1.5 py-0.5 rounded-full ml-1">
                              PRIMARY
                            </span>
                          )}
                        </p>
                        <p className="text-gray-400 text-[10px]">{d.phone}</p>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <Pill status={d.whatsapp} channel="WA" />
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </motion.div>
        );
      })}
    </div>
  );
};

const Pill = ({ status, channel }) => {
  const styles = {
    SENT: 'bg-green-100 text-green-700',
    FAILED: 'bg-red-100 text-red-700',
    PENDING: 'bg-amber-100 text-amber-700',
    SKIPPED: 'bg-gray-100 text-gray-500',
  };
  return (
    <span
      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
        styles[status] || styles.PENDING
      }`}
    >
      {channel} {status || 'PENDING'}
    </span>
  );
};

export default SOSEventTimeline;

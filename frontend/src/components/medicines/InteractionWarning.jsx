import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, ShieldCheck, Loader2, ChevronDown } from 'lucide-react';
import { interactionsApi } from '../../api/interactions.api';

/**
 * Looks up interactions for `drugName` against the member's other active medicines
 * via RxNav + OpenFDA. Renders nothing while empty/loading; renders a warning
 * banner when interactions or general warnings are found.
 */
const InteractionWarning = ({ memberId, drugName }) => {
  const [debounced, setDebounced] = useState('');
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const trimmed = (drugName || '').trim();
    if (trimmed.length < 3) {
      setDebounced('');
      return;
    }
    const t = setTimeout(() => setDebounced(trimmed), 700);
    return () => clearTimeout(t);
  }, [drugName]);

  const { data, isFetching } = useQuery({
    queryKey: ['interactions', memberId, debounced],
    queryFn: () => interactionsApi.check({ memberId, drugName: debounced }),
    enabled: !!memberId && debounced.length >= 3,
    staleTime: 1000 * 60 * 10,
    retry: 0,
  });

  if (!debounced) return null;

  if (isFetching) {
    return (
      <div className="flex items-center gap-2 text-xs text-gray-400 mt-2">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        Checking interactions…
      </div>
    );
  }

  if (!data || !data.dataAvailable) {
    return (
      <div className="flex items-center gap-2 text-xs text-gray-400 mt-2">
        <ShieldCheck className="w-3.5 h-3.5" />
        No public-label interaction data found for this name.
      </div>
    );
  }

  const matches = data.interactionsWithExisting || [];
  const warnings = data.generalWarnings || [];
  if (matches.length === 0 && warnings.length === 0) {
    return (
      <div className="flex items-center gap-2 text-xs text-emerald-600 mt-2">
        <ShieldCheck className="w-3.5 h-3.5" />
        No matching interactions with current medicines.
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-3 border border-amber-200 bg-amber-50 rounded-xl overflow-hidden"
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left"
      >
        <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
        <span className="text-xs font-semibold text-amber-900 flex-1">
          {matches.length > 0
            ? `${matches.length} possible interaction${matches.length === 1 ? '' : 's'} with current medicines`
            : 'Read warnings before adding'}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-amber-700 transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-2 text-xs text-amber-900">
              {matches.map((m, i) => (
                <div key={i} className="bg-white/70 rounded-lg p-2">
                  <p className="font-semibold mb-0.5">⚠ With {m.withDrug}</p>
                  <p className="text-amber-800 leading-relaxed">{m.snippet}</p>
                </div>
              ))}
              {warnings.length > 0 && matches.length === 0 && (
                <div>
                  <p className="font-semibold mb-1">General warnings</p>
                  <ul className="list-disc list-inside space-y-1 text-amber-800">
                    {warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}
              <p className="text-[10px] text-amber-700 italic pt-1">{data.disclaimer}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default InteractionWarning;

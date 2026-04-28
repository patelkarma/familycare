import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, X } from 'lucide-react';

/**
 * Full-screen 5-second countdown that the user can cancel.
 * In parallel, it requests GPS so it's already resolved by the time
 * the timer fires. When the timer hits 0, it calls onConfirm with
 * { latitude, longitude, accuracyMeters } (any may be null on failure).
 */
const COUNTDOWN_SECONDS = 5;

const SOSCountdownModal = ({ isOpen, memberName, onCancel, onConfirm }) => {
  const [secondsLeft, setSecondsLeft] = useState(COUNTDOWN_SECONDS);
  const [locationStatus, setLocationStatus] = useState('pending'); // pending|ready|failed
  const locationRef = useRef({ latitude: null, longitude: null, accuracyMeters: null });
  const firedRef = useRef(false);

  // Reset on open
  useEffect(() => {
    if (!isOpen) return;
    setSecondsLeft(COUNTDOWN_SECONDS);
    setLocationStatus('pending');
    locationRef.current = { latitude: null, longitude: null, accuracyMeters: null };
    firedRef.current = false;

    // Kick off geolocation immediately, in parallel with the countdown
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          locationRef.current = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracyMeters: pos.coords.accuracy,
          };
          setLocationStatus('ready');
        },
        () => setLocationStatus('failed'),
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
      );
    } else {
      setLocationStatus('failed');
    }
  }, [isOpen]);

  // Countdown timer
  useEffect(() => {
    if (!isOpen) return;
    if (secondsLeft <= 0) {
      if (!firedRef.current) {
        firedRef.current = true;
        onConfirm(locationRef.current);
      }
      return;
    }
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [isOpen, secondsLeft, onConfirm]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-red-700/95 backdrop-blur-sm p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="relative w-full max-w-md text-center text-white"
            initial={{ scale: 0.7, y: 30 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.7, y: 30 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          >
            <motion.div
              className="mx-auto mb-6 w-20 h-20 rounded-full bg-white/20 flex items-center justify-center"
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              <ShieldAlert className="w-10 h-10 text-white" />
            </motion.div>

            <h2 className="text-3xl sm:text-4xl font-extrabold mb-2">
              Sending SOS alert
            </h2>
            {memberName && (
              <p className="text-white/90 text-base mb-6">for {memberName}</p>
            )}

            {/* Big countdown number */}
            <motion.div
              key={secondsLeft}
              className="text-[140px] sm:text-[180px] font-black leading-none mb-4"
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', damping: 15, stiffness: 250 }}
            >
              {secondsLeft}
            </motion.div>

            <p className="text-white/90 text-base mb-2">
              Sending in <span className="font-bold">{secondsLeft}</span>{' '}
              {secondsLeft === 1 ? 'second' : 'seconds'}…
            </p>
            <p className="text-white/70 text-sm mb-8">
              {locationStatus === 'pending' && '📍 Getting your location…'}
              {locationStatus === 'ready' && '📍 Location locked'}
              {locationStatus === 'failed' &&
                '⚠️ Location unavailable — alert will still be sent'}
            </p>

            {/* Giant cancel button */}
            <motion.button
              onClick={onCancel}
              className="w-full bg-white text-red-700 font-extrabold text-2xl rounded-2xl py-6 shadow-2xl flex items-center justify-center gap-3"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <X className="w-7 h-7" />
              CANCEL
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SOSCountdownModal;

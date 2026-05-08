import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const langTagFor = (lng) => {
  switch (lng) {
    case 'hi': return 'hi-IN';
    case 'gu': return 'gu-IN';
    case 'mr': return 'mr-IN';
    case 'bn': return 'bn-IN';
    case 'ta': return 'ta-IN';
    case 'te': return 'te-IN';
    case 'kn': return 'kn-IN';
    case 'pa': return 'pa-IN';
    default: return 'en-IN';
  }
};

const getRecognitionCtor = () => {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
};

const VoiceInput = ({ onResult, title }) => {
  const { i18n, t } = useTranslation();
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    setSupported(!!getRecognitionCtor());
    return () => {
      try { recognitionRef.current?.abort(); } catch { /* noop */ }
    };
  }, []);

  if (!supported) return null;

  const start = () => {
    if (listening) return;
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;

    const rec = new Ctor();
    rec.lang = langTagFor(i18n.resolvedLanguage);
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.continuous = false;

    rec.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript;
      if (transcript) onResult(String(transcript).trim());
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);

    recognitionRef.current = rec;
    setListening(true);
    try { rec.start(); } catch { setListening(false); }
  };

  const stop = () => {
    try { recognitionRef.current?.stop(); } catch { /* noop */ }
    setListening(false);
  };

  return (
    <motion.button
      type="button"
      onClick={listening ? stop : start}
      className={`relative inline-flex items-center justify-center w-11 h-11 rounded-xl transition-colors ${
        listening
          ? 'bg-red-500 text-white shadow-lg shadow-red-500/30'
          : 'bg-primary-light text-primary-dark hover:bg-primary hover:text-white'
      }`}
      whileHover={{ scale: listening ? 1 : 1.06 }}
      whileTap={{ scale: 0.94 }}
      title={title || t('voice.speakToFill', 'Tap to speak')}
      aria-label={listening ? 'Stop recording' : 'Start voice input'}
      aria-pressed={listening}
    >
      <AnimatePresence>
        {listening && (
          <motion.span
            className="absolute inset-0 rounded-xl bg-red-400"
            initial={{ scale: 1, opacity: 0.6 }}
            animate={{ scale: 1.6, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeOut' }}
          />
        )}
      </AnimatePresence>
      <span className="relative z-10">
        {listening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
      </span>
    </motion.button>
  );
};

export default VoiceInput;

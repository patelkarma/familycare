import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Mic, MicOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';

/**
 * Renders a microphone toggle. When the user finishes speaking, calls
 * `onResult(transcript)` with the recognised text. The parent decides what
 * to do with it (parse vitals, fill a field, etc).
 */
const VoiceButton = ({ onResult, lang = 'en-IN', className = '' }) => {
  const { supported, listening, transcript, error, start, stop, reset } =
    useSpeechRecognition({ lang });

  useEffect(() => {
    if (transcript && !listening) {
      onResult?.(transcript);
      reset();
    }
  }, [transcript, listening, onResult, reset]);

  useEffect(() => {
    if (!error) return;
    const messages = {
      'not-allowed':
        'Microphone permission denied. Click the lock icon in the address bar to allow it.',
      'no-speech': "Didn't hear anything. Try again, closer to the mic.",
      'audio-capture': 'No microphone found. Plug one in or check Windows mic settings.',
      'network':
        "Speech service unreachable. If you're on Edge, try Chrome — Edge's speech API often fails. Otherwise check VPN/firewall.",
      'aborted': 'Voice input was stopped.',
      'service-not-allowed':
        'Speech service blocked by your browser or OS. Try Chrome, or enable mic in Windows Settings → Privacy.',
    };
    toast.error(messages[error] || `Voice input failed: ${error}`, { duration: 5000 });
  }, [error]);

  if (!supported) return null;

  return (
    <motion.button
      type="button"
      onClick={listening ? stop : start}
      whileTap={{ scale: 0.92 }}
      className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
        listening
          ? 'bg-red-500 text-white shadow-md shadow-red-200'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      } ${className}`}
      title={listening ? 'Stop listening' : 'Speak instead of typing'}
    >
      {listening ? (
        <>
          <motion.span
            className="block w-2 h-2 bg-white rounded-full"
            animate={{ scale: [1, 1.5, 1], opacity: [1, 0.4, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
          Listening…
        </>
      ) : (
        <>
          <Mic className="w-3.5 h-3.5" />
          Speak
        </>
      )}
      {listening && <MicOff className="w-3 h-3 ml-1 opacity-0" aria-hidden />}
    </motion.button>
  );
};

export default VoiceButton;

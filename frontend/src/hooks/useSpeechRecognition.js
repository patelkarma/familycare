import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Thin wrapper around the browser's Web Speech API. No backend, no cost.
 * Returns a stable interface so consumers can render a mic button.
 *
 * Caveats:
 *  - Chrome / Edge / Safari only — Firefox does not implement this API.
 *  - On HTTPS / localhost only.
 *  - Permission prompt the first time.
 */
export const useSpeechRecognition = ({ lang = 'en-IN', interimResults = false } = {}) => {
  const SR =
    typeof window !== 'undefined'
      ? window.SpeechRecognition || window.webkitSpeechRecognition
      : null;
  const supported = !!SR;

  const recognitionRef = useRef(null);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!supported) return;
    const recognition = new SR();
    recognition.lang = lang;
    recognition.interimResults = interimResults;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const last = event.results[event.results.length - 1];
      if (last && last[0]) {
        setTranscript(last[0].transcript);
      }
    };
    recognition.onerror = (e) => setError(e.error || 'speech-error');
    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
    return () => {
      try {
        recognition.abort();
      } catch {
        /* ignore */
      }
    };
  }, [SR, supported, lang, interimResults]);

  const start = useCallback(() => {
    if (!recognitionRef.current) return;
    setError(null);
    setTranscript('');
    try {
      recognitionRef.current.start();
      setListening(true);
    } catch (e) {
      setError(e?.message || 'start-failed');
    }
  }, []);

  const stop = useCallback(() => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.stop();
    } catch {
      /* ignore */
    }
  }, []);

  const reset = useCallback(() => {
    setTranscript('');
    setError(null);
  }, []);

  return { supported, listening, transcript, error, start, stop, reset };
};

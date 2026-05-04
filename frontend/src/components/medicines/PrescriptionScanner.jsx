import { useState, useRef, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Camera, Upload, Sparkles, Check, AlertCircle, Pill,
  Loader2, ScanLine, RotateCcw, CheckCircle2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { createWorker } from 'tesseract.js';
import { medicinesApi } from '../../api/medicines.api';

const STAGES = {
  IDLE: 'idle',
  READING_IMAGE: 'reading',
  PARSING: 'parsing',
  REVIEW: 'review',
  SAVING: 'saving',
  DONE: 'done',
};

// When a prescription line has no explicit mg/ml dosage (e.g. "Cap. Becosules OD"
// or "Syp. Grilinctus BD"), we still need to save *something* in the dosage field
// so the dose card has a label. Picking the unit that matches the form keeps the
// medicines list honest — Syrup rows shouldn't read "1 tablet".
const defaultDosageForForm = (form) => {
  switch (form) {
    case 'Syrup': return '5 ml';
    case 'Capsule': return '1 capsule';
    case 'Drops': return '2 drops';
    case 'Cream': return 'Apply';
    case 'Inhaler': return '1 puff';
    case 'Injection': return '1 dose';
    case 'Tablet':
    default: return '1 tablet';
  }
};

const PrescriptionScanner = ({ memberId, memberName, onClose }) => {
  const { t } = useTranslation();
  const [stage, setStage] = useState(STAGES.IDLE);
  const [progress, setProgress] = useState(0);
  const [imagePreview, setImagePreview] = useState(null);
  const [rawText, setRawText] = useState('');
  const [detected, setDetected] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [errorMsg, setErrorMsg] = useState(null);
  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();

  const runOcr = useCallback(async (file) => {
    setStage(STAGES.READING_IMAGE);
    setProgress(0);
    setErrorMsg(null);

    try {
      const worker = await createWorker(['eng', 'hin'], 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setProgress(Math.round(m.progress * 100));
          }
        },
      });
      const { data } = await worker.recognize(file);
      await worker.terminate();

      const text = (data?.text || '').trim();
      setRawText(text);

      if (!text) {
        setErrorMsg('Could not read any text from the image. Try a clearer photo.');
        setStage(STAGES.IDLE);
        return;
      }

      setStage(STAGES.PARSING);
      const res = await medicinesApi.parsePrescription(text);
      const found = res?.data || [];
      setDetected(found);
      setSelected(new Set(found.map((_, i) => i)));

      if (!found.length) {
        setErrorMsg('No recognized medicines in that prescription. Add them manually or try a clearer image.');
      }
      setStage(STAGES.REVIEW);
    } catch (err) {
      console.error(err);
      setErrorMsg('Scanning failed. Please try again or add medicines manually.');
      setStage(STAGES.IDLE);
    }
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error(t('toast.somethingWrong'));
      return;
    }
    const url = URL.createObjectURL(file);
    setImagePreview(url);
    runOcr(file);
  };

  const reset = () => {
    setStage(STAGES.IDLE);
    setProgress(0);
    setImagePreview(null);
    setRawText('');
    setDetected([]);
    setSelected(new Set());
    setErrorMsg(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const toggleSelected = (idx) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const updateDetected = (idx, field, value) => {
    setDetected((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const chosen = Array.from(selected).map((idx) => detected[idx]);
      const payload = chosen.map((m) => ({
        name: m.name,
        genericName: m.genericName || null,
        dosage: m.dosage || defaultDosageForForm(m.form),
        form: m.form || 'Tablet',
        frequency: m.frequency || 'Once daily',
        timing: m.timing && Object.keys(m.timing).length ? m.timing : { morning: '09:00' },
        withFood: m.withFood ?? false,
        startDate: new Date().toISOString().split('T')[0],
        endDate: m.durationDays
          ? new Date(Date.now() + m.durationDays * 86400000).toISOString().split('T')[0]
          : null,
        stockCount: 30,
        notes: m.rawLine ? `From prescription scan: "${m.rawLine}"` : null,
      }));
      return medicinesApi.bulkAdd(memberId, payload);
    },
    onSuccess: ({ added, failed }) => {
      queryClient.invalidateQueries({ queryKey: ['medicines', memberId] });
      if (added > 0) {
        toast.success(`Added ${added} medicine${added > 1 ? 's' : ''}${failed ? ` (${failed} failed)` : ''}`);
        setStage(STAGES.DONE);
        setTimeout(onClose, 1500);
      } else {
        toast.error(t('toast.somethingWrong'));
        setStage(STAGES.REVIEW);
      }
    },
    onError: () => {
      toast.error(t('toast.somethingWrong'));
      setStage(STAGES.REVIEW);
    },
  });

  const handleSave = () => {
    if (selected.size === 0) {
      toast.error(t('toast.somethingWrong'));
      return;
    }
    setStage(STAGES.SAVING);
    saveMutation.mutate();
  };

  const isBusy = stage === STAGES.READING_IMAGE || stage === STAGES.PARSING || stage === STAGES.SAVING;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
        onClick={!isBusy ? onClose : undefined}
      />

      <motion.div
        className="relative bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-2xl max-h-[92vh] overflow-hidden flex flex-col"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
      >
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-br from-primary to-primary-dark text-white px-6 py-5 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <motion.div
                className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center"
                animate={isBusy ? { rotate: 360 } : {}}
                transition={{ duration: 2, repeat: isBusy ? Infinity : 0, ease: 'linear' }}
              >
                <Sparkles className="w-5 h-5" />
              </motion.div>
              <div>
                <h2 className="text-lg font-bold">Scan Prescription</h2>
                <p className="text-xs text-white/70">
                  {memberName ? `For ${memberName}` : 'Auto-detect medicines'}
                </p>
              </div>
            </div>
            <motion.button
              onClick={!isBusy ? onClose : undefined}
              disabled={isBusy}
              className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/20 disabled:opacity-40 disabled:cursor-not-allowed"
              whileTap={{ scale: isBusy ? 1 : 0.9 }}
            >
              <X className="w-5 h-5" />
            </motion.button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            {stage === STAGES.IDLE && (
              <motion.div
                key="idle"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-6 space-y-5"
              >
                {errorMsg && (
                  <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-800">{errorMsg}</p>
                  </div>
                )}

                <div className="text-center space-y-2">
                  <motion.div
                    className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-primary-light to-white flex items-center justify-center border-2 border-primary/20"
                    animate={{ y: [0, -6, 0] }}
                    transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <ScanLine className="w-9 h-9 text-primary" />
                  </motion.div>
                  <h3 className="text-base font-semibold text-gray-900 pt-2">
                    Point your camera at the prescription
                  </h3>
                  <p className="text-sm text-gray-500 max-w-sm mx-auto">
                    We'll read the doctor's writing and auto-fill medicines for you. Supports English and Hindi.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <motion.button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center gap-2 bg-primary text-white rounded-2xl py-5 font-semibold shadow-lg shadow-primary/25 hover:bg-primary-dark"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <Camera className="w-6 h-6" />
                    <span className="text-sm">Take Photo</span>
                  </motion.button>
                  <motion.button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center gap-2 bg-white border-2 border-gray-200 text-gray-700 rounded-2xl py-5 font-semibold hover:border-primary hover:text-primary"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <Upload className="w-6 h-6" />
                    <span className="text-sm">Upload Image</span>
                  </motion.button>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <div className="pt-2 text-xs text-center text-gray-400">
                  🔒 Processed on your device — nothing uploaded until you confirm
                </div>
              </motion.div>
            )}

            {(stage === STAGES.READING_IMAGE || stage === STAGES.PARSING) && (
              <motion.div
                key="reading"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-6 space-y-5"
              >
                {imagePreview && (
                  <div className="relative rounded-2xl overflow-hidden bg-gray-100 aspect-video">
                    <img src={imagePreview} alt="Prescription" className="w-full h-full object-contain" />
                    <motion.div
                      className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent shadow-[0_0_20px_#F5A623]"
                      animate={{ top: ['0%', '100%', '0%'] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    />
                  </div>
                )}

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-700 flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      {stage === STAGES.READING_IMAGE ? 'Reading prescription…' : 'Identifying medicines…'}
                    </span>
                    <span className="text-primary font-semibold">{progress}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-primary to-primary-dark rounded-full"
                      animate={{ width: `${stage === STAGES.READING_IMAGE ? progress : 100}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 text-center">
                    First scan downloads the language model (~10MB). Later scans are instant.
                  </p>
                </div>
              </motion.div>
            )}

            {stage === STAGES.REVIEW && (
              <motion.div
                key="review"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-6 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">
                      {detected.length > 0
                        ? `Found ${detected.length} medicine${detected.length > 1 ? 's' : ''}`
                        : 'No medicines detected'}
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Review, edit, and pick which to add
                    </p>
                  </div>
                  <motion.button
                    onClick={reset}
                    className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary"
                    whileTap={{ scale: 0.95 }}
                  >
                    <RotateCcw className="w-4 h-4" />
                    Rescan
                  </motion.button>
                </div>

                {errorMsg && detected.length === 0 && (
                  <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-800">{errorMsg}</p>
                  </div>
                )}

                <div className="space-y-3">
                  {detected.map((med, idx) => (
                    <motion.div
                      key={idx}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.08 }}
                      className={`border-2 rounded-2xl p-4 transition-colors ${
                        selected.has(idx)
                          ? 'border-primary bg-primary-light/30'
                          : 'border-gray-200 bg-white'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <motion.button
                          onClick={() => toggleSelected(idx)}
                          className={`mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 border-2 transition-colors ${
                            selected.has(idx)
                              ? 'bg-primary border-primary text-white'
                              : 'bg-white border-gray-300'
                          }`}
                          whileTap={{ scale: 0.85 }}
                        >
                          {selected.has(idx) && <Check className="w-4 h-4" />}
                        </motion.button>

                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Pill className="w-4 h-4 text-primary flex-shrink-0" />
                            <input
                              value={med.name || ''}
                              onChange={(e) => updateDetected(idx, 'name', e.target.value)}
                              className="font-semibold text-gray-900 bg-transparent outline-none border-b border-transparent focus:border-primary px-1 min-w-0 flex-1"
                            />
                            {med.confidence != null && (
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                med.confidence >= 0.9
                                  ? 'bg-green-100 text-green-700'
                                  : med.confidence >= 0.7
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-red-100 text-red-700'
                              }`}>
                                {Math.round(med.confidence * 100)}%
                              </span>
                            )}
                          </div>

                          {med.genericName && (
                            <p className="text-xs text-gray-500 pl-6">{med.genericName}</p>
                          )}

                          <div className="grid grid-cols-2 gap-2 pl-6">
                            <div>
                              <label className="text-[10px] uppercase tracking-wide text-gray-400 font-medium">Dosage</label>
                              <input
                                value={med.dosage || ''}
                                onChange={(e) => updateDetected(idx, 'dosage', e.target.value)}
                                placeholder="e.g. 500mg"
                                className="w-full text-sm text-gray-800 bg-white border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] uppercase tracking-wide text-gray-400 font-medium">Frequency</label>
                              <input
                                value={med.frequency || ''}
                                onChange={(e) => updateDetected(idx, 'frequency', e.target.value)}
                                placeholder="Once daily"
                                className="w-full text-sm text-gray-800 bg-white border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                              />
                            </div>
                          </div>

                          {med.timing && Object.keys(med.timing).length > 0 && (
                            <div className="flex gap-1.5 pl-6 pt-1">
                              {Object.entries(med.timing).map(([k, v]) => (
                                <span key={k} className="text-[11px] bg-white border border-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                                  {k}: {v}
                                </span>
                              ))}
                            </div>
                          )}

                          {med.rawLine && (
                            <p className="text-[11px] text-gray-400 italic pl-6 truncate" title={med.rawLine}>
                              From: "{med.rawLine}"
                            </p>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {rawText && (
                  <details className="text-xs text-gray-500">
                    <summary className="cursor-pointer hover:text-gray-700">View raw OCR text</summary>
                    <pre className="mt-2 bg-gray-50 border border-gray-200 rounded-xl p-3 whitespace-pre-wrap font-mono text-[11px] max-h-40 overflow-y-auto">{rawText}</pre>
                  </details>
                )}
              </motion.div>
            )}

            {stage === STAGES.SAVING && (
              <motion.div
                key="saving"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-10 text-center space-y-4"
              >
                <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
                <p className="font-medium text-gray-700">Adding medicines…</p>
              </motion.div>
            )}

            {stage === STAGES.DONE && (
              <motion.div
                key="done"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-10 text-center space-y-3"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', damping: 12, stiffness: 200 }}
                  className="w-20 h-20 mx-auto rounded-full bg-green-100 flex items-center justify-center"
                >
                  <CheckCircle2 className="w-10 h-10 text-green-600" />
                </motion.div>
                <p className="text-lg font-semibold text-gray-900">All set!</p>
                <p className="text-sm text-gray-500">Reminders will start as scheduled.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        {stage === STAGES.REVIEW && (
          <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex gap-3">
            <motion.button
              type="button"
              onClick={onClose}
              className="px-5 py-3 rounded-xl border border-gray-200 text-gray-700 font-medium text-sm hover:bg-gray-50"
              whileTap={{ scale: 0.97 }}
            >
              Cancel
            </motion.button>
            <motion.button
              type="button"
              onClick={handleSave}
              disabled={selected.size === 0 || saveMutation.isPending}
              className="flex-1 flex items-center justify-center gap-2 bg-primary text-white rounded-xl px-5 py-3 font-semibold text-sm shadow-lg shadow-primary/20 hover:bg-primary-dark disabled:opacity-60 disabled:cursor-not-allowed"
              whileHover={{ scale: selected.size > 0 ? 1.02 : 1 }}
              whileTap={{ scale: selected.size > 0 ? 0.98 : 1 }}
            >
              <Check className="w-4 h-4" />
              Add {selected.size} Medicine{selected.size !== 1 ? 's' : ''}
            </motion.button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default PrescriptionScanner;

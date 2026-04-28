import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { X, Heart } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { vitalsApi } from '../../api/vitals.api';
import VoiceButton from '../shared/VoiceButton';
import { parseVitalSpeech } from '../../utils/voiceParser';

const vitalTypes = [
  { value: 'BP', label: 'Blood Pressure', unit: 'mmHg', hasDual: true, placeholder1: 'Systolic (e.g. 120)', placeholder2: 'Diastolic (e.g. 80)' },
  { value: 'SUGAR', label: 'Blood Sugar', unit: 'mg/dL', hasDual: false, placeholder1: 'e.g. 100' },
  { value: 'PULSE', label: 'Pulse', unit: 'bpm', hasDual: false, placeholder1: 'e.g. 72' },
  { value: 'SPO2', label: 'Oxygen (SpO2)', unit: '%', hasDual: false, placeholder1: 'e.g. 98' },
  { value: 'TEMP', label: 'Temperature', unit: '\u00B0F', hasDual: false, placeholder1: 'e.g. 98.6' },
  { value: 'WEIGHT', label: 'Weight', unit: 'kg', hasDual: false, placeholder1: 'e.g. 65' },
];

const VitalsLogForm = ({ memberId, selectedType, onClose }) => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [type, setType] = useState(selectedType || 'BP');
  const [valuePrimary, setValuePrimary] = useState('');
  const [valueSecondary, setValueSecondary] = useState('');
  const [notes, setNotes] = useState('');

  const currentType = vitalTypes.find((t) => t.value === type);

  const handleVoice = (transcript) => {
    const parsed = parseVitalSpeech(transcript);
    if (!parsed) {
      toast.error(
        `Couldn't make sense of "${transcript}". Try: "BP 140 over 90" or "sugar 110"`,
        { duration: 5000 }
      );
      return;
    }
    setType(parsed.type);
    setValuePrimary(String(parsed.valuePrimary));
    setValueSecondary(parsed.valueSecondary != null ? String(parsed.valueSecondary) : '');

    if (parsed.partial && parsed.type === 'BP') {
      toast(`Got systolic ${parsed.valuePrimary}. Please add diastolic.`, {
        icon: 'ℹ️',
        duration: 4000,
      });
    } else {
      toast.success(`Heard: ${transcript}`);
    }
  };

  const mutation = useMutation({
    mutationFn: (data) => vitalsApi.add(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vitals'] });
      queryClient.invalidateQueries({ queryKey: ['vitalsLatest'] });
      toast.success(t('toast.logged'));
      onClose();
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || t('toast.somethingWrong'));
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const primary = parseFloat(valuePrimary);
    if (isNaN(primary)) {
      toast.error('Please enter a valid number');
      return;
    }

    const data = {
      familyMemberId: memberId,
      type,
      valuePrimary: primary,
      valueSecondary: currentType.hasDual ? parseFloat(valueSecondary) || null : null,
      notes: notes || null,
    };

    mutation.mutate(data);
  };

  return (
    <motion.div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        initial={{ scale: 0.9, y: 30 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 30 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-gray-900">{t('vitalsForm.title')}</h2>
          </div>
          <motion.button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <X className="w-5 h-5 text-gray-400" />
          </motion.button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {/* Voice entry */}
          <div className="flex items-center justify-between bg-primary-light/40 rounded-xl px-3 py-2">
            <span className="text-xs text-gray-600">
              Tap and say "BP 140 over 90" or "sugar 110"
            </span>
            <VoiceButton onResult={handleVoice} />
          </div>

          {/* Type selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('vitalsForm.vitalType')}</label>
            <div className="grid grid-cols-3 gap-2">
              {vitalTypes.map((vt) => (
                <motion.button
                  key={vt.value}
                  type="button"
                  onClick={() => {
                    setType(vt.value);
                    setValuePrimary('');
                    setValueSecondary('');
                  }}
                  className={`px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    type === vt.value
                      ? 'bg-primary text-white shadow-md shadow-primary/20'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  {vt.label}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Value inputs */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Reading ({currentType?.unit})
            </label>
            <div className={`flex gap-3 ${currentType?.hasDual ? '' : ''}`}>
              <input
                type="number"
                step="any"
                value={valuePrimary}
                onChange={(e) => setValuePrimary(e.target.value)}
                placeholder={currentType?.placeholder1}
                className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-base focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                required
              />
              {currentType?.hasDual && (
                <input
                  type="number"
                  step="any"
                  value={valueSecondary}
                  onChange={(e) => setValueSecondary(e.target.value)}
                  placeholder={currentType?.placeholder2}
                  className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-base focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                  required
                />
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Notes <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. After breakfast, feeling dizzy"
              rows={2}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all resize-none"
            />
          </div>

          {/* Submit */}
          <motion.button
            type="submit"
            disabled={mutation.isPending}
            className="w-full bg-primary text-white rounded-xl px-4 py-3.5 font-semibold text-sm shadow-lg shadow-primary/25 hover:bg-primary-dark transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            whileHover={{ scale: mutation.isPending ? 1 : 1.02 }}
            whileTap={{ scale: mutation.isPending ? 1 : 0.98 }}
          >
            {mutation.isPending ? (
              <motion.div
                className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              />
            ) : (
              'Save Reading'
            )}
          </motion.button>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default VitalsLogForm;

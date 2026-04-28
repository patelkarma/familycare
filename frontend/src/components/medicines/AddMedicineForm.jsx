import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ChevronRight,
  ChevronLeft,
  Pill,
  Clock,
  Package,
  Sun,
  Cloud,
  Moon,
  Check,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { medicineSchema } from '../../utils/validators';
import { medicinesApi } from '../../api/medicines.api';
import InteractionWarning from './InteractionWarning';

const forms = [
  { value: 'Tablet', icon: '💊', label: 'Tablet' },
  { value: 'Capsule', icon: '💊', label: 'Capsule' },
  { value: 'Syrup', icon: '🧴', label: 'Syrup' },
  { value: 'Injection', icon: '💉', label: 'Injection' },
  { value: 'Drops', icon: '💧', label: 'Drops' },
  { value: 'Cream', icon: '🧴', label: 'Cream' },
  { value: 'Inhaler', icon: '🌬️', label: 'Inhaler' },
];

const frequencies = ['Once daily', 'Twice daily', 'Three times daily', 'As needed', 'Weekly'];

const steps = [
  { label: 'Medicine', icon: Pill },
  { label: 'Schedule', icon: Clock },
  { label: 'Details', icon: Package },
];

const slideVariants = {
  enter: (direction) => ({ x: direction > 0 ? 200 : -200, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction) => ({ x: direction > 0 ? -200 : 200, opacity: 0 }),
};

const AddMedicineForm = ({ memberId, medicine, onClose }) => {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const isEditing = !!medicine;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(medicineSchema),
    defaultValues: medicine
      ? {
          name: medicine.name,
          genericName: medicine.genericName || '',
          dosage: medicine.dosage,
          form: medicine.form || '',
          frequency: medicine.frequency,
          morning: medicine.timing?.morning || '',
          afternoon: medicine.timing?.afternoon || '',
          night: medicine.timing?.night || '',
          withFood: medicine.withFood || false,
          startDate: medicine.startDate || '',
          endDate: medicine.endDate || '',
          stockCount: medicine.stockCount?.toString() || '',
          notes: medicine.notes || '',
        }
      : {
          withFood: false,
        },
  });

  const selectedForm = watch('form');
  const watchedName = watch('name');

  const mutation = useMutation({
    mutationFn: (data) => {
      const payload = {
        familyMemberId: memberId,
        name: data.name,
        genericName: data.genericName || null,
        dosage: data.dosage,
        form: data.form || null,
        frequency: data.frequency,
        timing: {},
        withFood: data.withFood || false,
        startDate: data.startDate || null,
        endDate: data.endDate || null,
        stockCount: data.stockCount ? parseInt(data.stockCount) : 0,
        notes: data.notes || null,
      };

      if (data.morning) payload.timing.morning = data.morning;
      if (data.afternoon) payload.timing.afternoon = data.afternoon;
      if (data.night) payload.timing.night = data.night;

      return isEditing
        ? medicinesApi.update(medicine.id, payload)
        : medicinesApi.add(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medicines', memberId] });
      toast.success(t('toast.medicineSaved'));
      onClose();
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || t('toast.somethingWrong'));
    },
  });

  const nextStep = () => {
    setDirection(1);
    setStep((s) => Math.min(s + 1, 2));
  };

  const prevStep = () => {
    setDirection(-1);
    setStep((s) => Math.max(s - 1, 0));
  };

  const onSubmit = (data) => mutation.mutate(data);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <motion.div
        className="relative bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white/90 backdrop-blur-lg px-6 py-4 border-b border-gray-100 z-10">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-gray-900">
              {isEditing ? 'Edit Medicine' : 'Add Medicine'}
            </h2>
            <motion.button
              onClick={onClose}
              className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              whileTap={{ scale: 0.9 }}
            >
              <X className="w-5 h-5" />
            </motion.button>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-2">
            {steps.map((s, i) => (
              <div key={s.label} className="flex items-center flex-1">
                <motion.div
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    i <= step
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                  animate={i === step ? { scale: [1, 1.05, 1] } : {}}
                  transition={{ duration: 0.3 }}
                >
                  <s.icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{s.label}</span>
                </motion.div>
                {i < 2 && (
                  <div className={`flex-1 h-0.5 mx-1 rounded ${i < step ? 'bg-primary' : 'bg-gray-200'}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Form content */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto">
          <div className="p-6 min-h-[320px]">
            <AnimatePresence mode="wait" custom={direction}>
              {/* Step 1: Medicine info */}
              {step === 0 && (
                <motion.div
                  key="step1"
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.25 }}
                  className="space-y-5"
                >
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('medicineForm.medicineName')} *</label>
                    <input
                      type="text"
                      {...register('name')}
                      placeholder={t('medicineForm.medicineNamePlaceholder')}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    />
                    {errors.name && <p className="text-red-500 text-xs mt-1">{t(errors.name.message, errors.name.message)}</p>}
                    {!isEditing && memberId && (
                      <InteractionWarning memberId={memberId} drugName={watchedName} />
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('medicineForm.genericName')}</label>
                    <input
                      type="text"
                      {...register('genericName')}
                      placeholder="e.g., Amlodipine Besylate"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('medicineForm.form')}</label>
                    <div className="grid grid-cols-4 gap-2">
                      {forms.map((f) => (
                        <motion.button
                          key={f.value}
                          type="button"
                          onClick={() => setValue('form', f.value)}
                          className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-colors ${
                            selectedForm === f.value
                              ? 'border-primary bg-primary-light'
                              : 'border-gray-100 hover:border-gray-200'
                          }`}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <span className="text-xl">{f.icon}</span>
                          <span className="text-xs font-medium text-gray-600">{f.label}</span>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 2: Schedule */}
              {step === 1 && (
                <motion.div
                  key="step2"
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.25 }}
                  className="space-y-5"
                >
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('medicineForm.dosage')} *</label>
                    <input
                      type="text"
                      {...register('dosage')}
                      placeholder={t('medicineForm.dosagePlaceholder')}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    />
                    {errors.dosage && <p className="text-red-500 text-xs mt-1">{t(errors.dosage.message, errors.dosage.message)}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('medicineForm.frequency')} *</label>
                    <select
                      {...register('frequency')}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:ring-2 focus:ring-primary focus:border-transparent outline-none bg-white"
                    >
                      <option value="">{t('medicineForm.selectFrequency')}</option>
                      {frequencies.map((f) => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                    {errors.frequency && <p className="text-red-500 text-xs mt-1">{t(errors.frequency.message, errors.frequency.message)}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('medicineForm.morningTime')} / {t('medicineForm.afternoonTime')} / {t('medicineForm.nightTime')}
                    </label>
                    <div className="space-y-3">
                      {[
                        { key: 'morning', icon: Sun, label: t('medicineForm.morningTime'), color: 'text-amber-500', default: '09:00' },
                        { key: 'afternoon', icon: Cloud, label: t('medicineForm.afternoonTime'), color: 'text-sky-500', default: '13:00' },
                        { key: 'night', icon: Moon, label: t('medicineForm.nightTime'), color: 'text-indigo-500', default: '21:00' },
                      ].map((t) => (
                        <div key={t.key} className="flex items-center gap-3">
                          <t.icon className={`w-5 h-5 ${t.color}`} />
                          <span className="text-sm font-medium text-gray-600 w-20">{t.label}</span>
                          <input
                            type="time"
                            {...register(t.key)}
                            className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-base focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                          />
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-400 mt-2">Leave empty to skip that time slot</p>
                  </div>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      {...register('withFood')}
                      className="w-5 h-5 rounded-md border-gray-300 text-primary focus:ring-primary"
                    />
                    <span className="text-sm font-medium text-gray-700">{t('medicineForm.withFood')}</span>
                  </label>
                </motion.div>
              )}

              {/* Step 3: Details */}
              {step === 2 && (
                <motion.div
                  key="step3"
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.25 }}
                  className="space-y-5"
                >
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('medicineForm.startDate')}</label>
                      <input
                        type="date"
                        {...register('startDate')}
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('medicineForm.endDate')}</label>
                      <input
                        type="date"
                        {...register('endDate')}
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('medicineForm.stockCount')}</label>
                    <input
                      type="number"
                      {...register('stockCount')}
                      placeholder="e.g., 30"
                      min="0"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    />
                    <p className="text-xs text-gray-400 mt-1">You'll be alerted when stock runs low</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('medicineForm.notes')}</label>
                    <textarea
                      {...register('notes')}
                      placeholder={t('medicineForm.notesPlaceholder')}
                      rows={3}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer buttons */}
          <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex gap-3">
            {step > 0 && (
              <motion.button
                type="button"
                onClick={prevStep}
                className="flex items-center gap-1.5 px-5 py-3 rounded-xl border border-gray-200 text-gray-700 font-medium text-sm hover:bg-gray-50"
                whileTap={{ scale: 0.97 }}
              >
                <ChevronLeft className="w-4 h-4" />
                {t('common.back')}
              </motion.button>
            )}

            {step < 2 ? (
              <motion.button
                type="button"
                onClick={nextStep}
                className="flex-1 flex items-center justify-center gap-1.5 bg-primary text-white rounded-xl px-5 py-3 font-semibold text-sm shadow-lg shadow-primary/20 hover:bg-primary-dark"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </motion.button>
            ) : (
              <motion.button
                type="submit"
                disabled={mutation.isPending}
                className="flex-1 flex items-center justify-center gap-2 bg-primary text-white rounded-xl px-5 py-3 font-semibold text-sm shadow-lg shadow-primary/20 hover:bg-primary-dark disabled:opacity-60"
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
                  <>
                    <Check className="w-4 h-4" />
                    {isEditing ? 'Save Changes' : 'Add Medicine'}
                  </>
                )}
              </motion.button>
            )}
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default AddMedicineForm;

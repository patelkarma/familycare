import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye,
  EyeOff,
  UserPlus,
  Users,
  Heart,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  Shield,
  Stethoscope,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { registerSchema } from '../utils/validators';
import { authApi } from '../api/auth.api';
import { useAuth } from '../hooks/useAuth';
import WhatsAppJoinCard from '../components/shared/WhatsAppJoinCard';

const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const genders = ['Male', 'Female', 'Other'];

const stepVariants = {
  enter: (direction) => ({ x: direction > 0 ? 80 : -80, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction) => ({ x: direction > 0 ? -80 : 80, opacity: 0 }),
};

const Register = () => {
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();
  const { t } = useTranslation();

  const {
    register: reg,
    handleSubmit,
    watch,
    setValue,
    trigger,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role: '',
      name: '',
      email: '',
      phone: '',
      password: '',
      dateOfBirth: '',
      bloodGroup: '',
      gender: '',
      allergies: '',
      chronicDiseases: '',
      familyHeadEmail: '',
    },
  });

  const selectedRole = watch('role');
  const totalSteps = 3;

  const goNext = async () => {
    let valid = false;
    if (step === 1) {
      valid = !!selectedRole;
      if (!valid) {
        toast.error(t('toast.somethingWrong'));
        return;
      }
    } else if (step === 2) {
      valid = await trigger(['name', 'email', 'phone', 'password']);
      if (!valid) return;
    }
    setDirection(1);
    setStep((s) => Math.min(s + 1, totalSteps));
  };

  const goBack = () => {
    setDirection(-1);
    setStep((s) => Math.max(s - 1, 1));
  };

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      const payload = {
        ...data,
        dateOfBirth: data.dateOfBirth || null,
        bloodGroup: data.bloodGroup || null,
        gender: data.gender || null,
        allergies: data.allergies || null,
        chronicDiseases: data.chronicDiseases || null,
        familyHeadEmail: data.familyHeadEmail || null,
      };
      const res = await authApi.register(payload);
      login(res.data);
      toast.success(t('auth.welcome'));
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || t('toast.somethingWrong'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-page flex items-center justify-center p-4">
      <motion.div
        className="absolute top-10 left-16 w-28 h-28 rounded-full bg-primary/5"
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 7, repeat: Infinity }}
      />
      <motion.div
        className="absolute bottom-10 right-16 w-20 h-20 rounded-full bg-rose-50"
        animate={{ scale: [1, 1.15, 1] }}
        transition={{ duration: 5, repeat: Infinity }}
      />

      <motion.div
        className="w-full max-w-md relative z-10"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="text-center mb-6">
          <Link to="/" className="inline-flex flex-col items-center gap-3">
            <motion.img
              src="/familycare_icon.png"
              alt="FamilyCare"
              className="w-14 h-14 rounded-2xl shadow-lg"
              whileHover={{ scale: 1.05, rotate: -3 }}
              transition={{ type: 'spring', stiffness: 280 }}
            />
            <motion.h1
              className="text-3xl font-bold text-gray-900"
              whileHover={{ scale: 1.02 }}
            >
              Family<span className="text-primary">Care</span>
            </motion.h1>
          </Link>
          <p className="text-gray-500 mt-2">
            {step === 1 && 'How will you use FamilyCare?'}
            {step === 2 && 'Create your account'}
            {step === 3 && (selectedRole === 'FAMILY_HEAD' ? 'Your health profile' : 'Your health details')}
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {[1, 2, 3].map((s) => (
            <motion.div
              key={s}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                s === step ? 'w-8 bg-primary' : s < step ? 'w-6 bg-primary/40' : 'w-6 bg-gray-200'
              }`}
              layout
            />
          ))}
        </div>

        <motion.div
          className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 p-8 overflow-hidden"
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring' }}
        >
          <form onSubmit={handleSubmit(onSubmit)}>
            <AnimatePresence mode="wait" custom={direction}>
              {/* Step 1: Role Selection */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  custom={direction}
                  variants={stepVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.3 }}
                  className="space-y-4"
                >
                  <motion.button
                    type="button"
                    onClick={() => setValue('role', 'FAMILY_HEAD')}
                    className={`w-full p-5 rounded-2xl border-2 text-left transition-all ${
                      selectedRole === 'FAMILY_HEAD'
                        ? 'border-primary bg-primary-light shadow-md shadow-primary/10'
                        : 'border-gray-100 hover:border-primary/30 hover:bg-primary-light/30'
                    }`}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        selectedRole === 'FAMILY_HEAD' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500'
                      }`}>
                        <Shield className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-900 text-base">{t('auth.familyHead')}</h3>
                        <p className="text-sm text-gray-500 mt-1">
                          I manage medicines, reminders & health for my family members
                        </p>
                      </div>
                      <ChevronRight className={`w-5 h-5 mt-1 ${
                        selectedRole === 'FAMILY_HEAD' ? 'text-primary' : 'text-gray-300'
                      }`} />
                    </div>
                  </motion.button>

                  <motion.button
                    type="button"
                    onClick={() => setValue('role', 'MEMBER')}
                    className={`w-full p-5 rounded-2xl border-2 text-left transition-all ${
                      selectedRole === 'MEMBER'
                        ? 'border-primary bg-primary-light shadow-md shadow-primary/10'
                        : 'border-gray-100 hover:border-primary/30 hover:bg-primary-light/30'
                    }`}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        selectedRole === 'MEMBER' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500'
                      }`}>
                        <Heart className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-900 text-base">{t('auth.familyMember')}</h3>
                        <p className="text-sm text-gray-500 mt-1">
                          My family head manages my health — I want to view & confirm doses
                        </p>
                      </div>
                      <ChevronRight className={`w-5 h-5 mt-1 ${
                        selectedRole === 'MEMBER' ? 'text-primary' : 'text-gray-300'
                      }`} />
                    </div>
                  </motion.button>
                </motion.div>
              )}

              {/* Step 2: Account Details */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  custom={direction}
                  variants={stepVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.3 }}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('profile.fullName')}</label>
                    <input
                      type="text"
                      {...reg('name')}
                      placeholder="Rajesh Sharma"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                    />
                    {errors.name && (
                      <motion.p className="text-red-500 text-xs mt-1" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        {t(errors.name.message, errors.name.message)}
                      </motion.p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('auth.email')}</label>
                    <input
                      type="email"
                      {...reg('email')}
                      placeholder="rajesh@example.com"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                    />
                    {errors.email && (
                      <motion.p className="text-red-500 text-xs mt-1" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        {t(errors.email.message, errors.email.message)}
                      </motion.p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      {t('form.phone')} <span className="text-gray-400 font-normal">{t('form.phoneEmergencyHint')}</span>
                    </label>
                    <input
                      type="tel"
                      {...reg('phone')}
                      placeholder="9876543210"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                    />
                    {errors.phone && (
                      <motion.p className="text-red-500 text-xs mt-1" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        {t(errors.phone.message, errors.phone.message)}
                      </motion.p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      {t('auth.whatsappNumber')} <span className="text-gray-400 font-normal">{t('form.whatsappForRemindersHint')}</span>
                    </label>
                    <input
                      type="tel"
                      {...reg('whatsappPhone')}
                      placeholder="9876543210"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                    />
                    <p className="text-xs text-gray-400 mt-1">{t('auth.whatsappBlankHint')}</p>
                    {errors.whatsappPhone && (
                      <motion.p className="text-red-500 text-xs mt-1" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        {t(errors.whatsappPhone.message, errors.whatsappPhone.message)}
                      </motion.p>
                    )}
                  </div>

                  {/* WhatsApp join QR — opt the user's WhatsApp number into our Twilio sandbox */}
                  <WhatsAppJoinCard compact />

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('auth.password')}</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        {...reg('password')}
                        placeholder="At least 6 characters"
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-12 text-base focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {errors.password && (
                      <motion.p className="text-red-500 text-xs mt-1" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        {t(errors.password.message, errors.password.message)}
                      </motion.p>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Step 3: Health Profile */}
              {step === 3 && (
                <motion.div
                  key="step3"
                  custom={direction}
                  variants={stepVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.3 }}
                  className="space-y-4"
                >
                  {/* Patient: Family Head Email */}
                  {selectedRole === 'MEMBER' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Family Head's Email <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="email"
                        {...reg('familyHeadEmail')}
                        placeholder="Your caregiver's email"
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                      />
                      {errors.familyHeadEmail && (
                        <motion.p className="text-red-500 text-xs mt-1" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                          {t(errors.familyHeadEmail.message, errors.familyHeadEmail.message)}
                        </motion.p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        Enter the email of the person who manages your health on FamilyCare
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('profile.dateOfBirth')}</label>
                      <input
                        type="date"
                        {...reg('dateOfBirth')}
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('profile.bloodGroup')}</label>
                      <select
                        {...reg('bloodGroup')}
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all bg-white"
                      >
                        <option value="">{t('form.select')}</option>
                        {bloodGroups.map((bg) => (
                          <option key={bg} value={bg}>{bg}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('profile.gender')}</label>
                    <div className="flex gap-2">
                      {genders.map((g) => (
                        <label
                          key={g}
                          className={`flex-1 text-center py-2.5 rounded-xl border-2 cursor-pointer text-sm font-medium transition-all ${
                            watch('gender') === g
                              ? 'border-primary bg-primary-light text-primary-dark'
                              : 'border-gray-100 text-gray-500 hover:border-primary/30'
                          }`}
                        >
                          <input
                            type="radio"
                            value={g}
                            {...reg('gender')}
                            className="sr-only"
                          />
                          {g}
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Patient-only: Allergies & Chronic Conditions */}
                  {selectedRole === 'MEMBER' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('form.allergies')}</label>
                        <textarea
                          {...reg('allergies')}
                          placeholder={t('form.allergiesPlaceholder')}
                          rows={2}
                          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all resize-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('form.chronicConditions')}</label>
                        <textarea
                          {...reg('chronicDiseases')}
                          placeholder={t('form.chronicPlaceholder')}
                          rows={2}
                          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all resize-none"
                        />
                      </div>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Navigation buttons */}
            <div className="mt-6 flex gap-3">
              {step > 1 && (
                <motion.button
                  type="button"
                  onClick={goBack}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </motion.button>
              )}

              {step < totalSteps && (
                <motion.button
                  type="button"
                  onClick={goNext}
                  className="flex-1 flex items-center justify-center gap-2 bg-primary text-white rounded-xl px-4 py-3.5 font-semibold text-base shadow-lg shadow-primary/25 hover:bg-primary-dark transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </motion.button>
              )}

              {step === totalSteps && (
                <motion.button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 flex items-center justify-center gap-2 bg-primary text-white rounded-xl px-4 py-3.5 font-semibold text-base shadow-lg shadow-primary/25 hover:bg-primary-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  whileHover={{ scale: isSubmitting ? 1 : 1.02 }}
                  whileTap={{ scale: isSubmitting ? 1 : 0.98 }}
                >
                  {isSubmitting ? (
                    <motion.div
                      className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    />
                  ) : (
                    <>
                      <UserPlus className="w-5 h-5" />
                      Create Account
                    </>
                  )}
                </motion.button>
              )}

              {/* Skip option for family head on step 3 */}
              {step === totalSteps && selectedRole === 'FAMILY_HEAD' && (
                <motion.button
                  type="submit"
                  disabled={isSubmitting}
                  onClick={() => {
                    setValue('dateOfBirth', '');
                    setValue('bloodGroup', '');
                    setValue('gender', '');
                  }}
                  className="px-5 py-3 rounded-xl text-sm font-semibold text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                  whileTap={{ scale: 0.98 }}
                >
                  Skip for now
                </motion.button>
              )}
            </div>
          </form>
        </motion.div>

        <motion.p
          className="text-center mt-6 text-gray-500 text-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          Already have an account?{' '}
          <Link to="/login" className="text-primary font-semibold hover:text-primary-dark transition-colors">
            Sign in
          </Link>
        </motion.p>
      </motion.div>
    </div>
  );
};

export default Register;

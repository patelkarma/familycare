import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { loginSchema } from '../utils/validators';
import { authApi } from '../api/auth.api';
import { useAuth } from '../hooks/useAuth';

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();
  const { t } = useTranslation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      const res = await authApi.login(data);
      login(res.data);
      toast.success(t('auth.welcome'));
      navigate(res.data.role === 'MEMBER' ? '/my-medicines' : '/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || t('toast.somethingWrong'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-page flex items-center justify-center p-4">
      {/* Background decoration */}
      <motion.div
        className="absolute top-20 right-20 w-32 h-32 rounded-full bg-primary/5"
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 8, repeat: Infinity }}
      />
      <motion.div
        className="absolute bottom-20 left-20 w-24 h-24 rounded-full bg-blue-50"
        animate={{ scale: [1, 1.15, 1] }}
        transition={{ duration: 6, repeat: Infinity }}
      />

      <motion.div
        className="w-full max-w-md relative z-10"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex flex-col items-center gap-3">
            <motion.img
              src="/familycare_icon.png"
              alt="FamilyCare"
              className="w-16 h-16 rounded-2xl shadow-lg"
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
          <p className="text-gray-500 mt-2">{t('auth.welcomeBack')}</p>
        </div>

        {/* Card */}
        <motion.div
          className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 p-8"
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring' }}
        >
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('auth.email')}</label>
              <motion.input
                type="email"
                {...register('email')}
                placeholder="your@email.com"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                whileFocus={{ scale: 1.01 }}
              />
              {errors.email && (
                <motion.p
                  className="text-red-500 text-xs mt-1"
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  {t(errors.email.message, errors.email.message)}
                </motion.p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('auth.password')}</label>
              <div className="relative">
                <motion.input
                  type={showPassword ? 'text' : 'password'}
                  {...register('password')}
                  placeholder="Enter your password"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-12 text-base focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                  whileFocus={{ scale: 1.01 }}
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
                <motion.p
                  className="text-red-500 text-xs mt-1"
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  {t(errors.password.message, errors.password.message)}
                </motion.p>
              )}
            </div>

            {/* Submit */}
            <motion.button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-primary text-white rounded-xl px-4 py-3.5 font-semibold text-base shadow-lg shadow-primary/25 hover:bg-primary-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
                  <LogIn className="w-5 h-5" />
                  {t('auth.signIn')}
                </>
              )}
            </motion.button>
          </form>
        </motion.div>

        {/* Footer link */}
        <motion.p
          className="text-center mt-6 text-gray-500 text-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {t('auth.noAccount')}{' '}
          <Link to="/register" className="text-primary font-semibold hover:text-primary-dark transition-colors">
            {t('auth.signUpFree')}
          </Link>
        </motion.p>
      </motion.div>
    </div>
  );
};

export default Login;

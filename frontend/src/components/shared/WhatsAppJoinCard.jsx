import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { MessageCircle, Copy, Check, ExternalLink, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { authApi } from '../../api/auth.api';

const WhatsAppJoinCard = ({ compact = false }) => {
  const { t } = useTranslation();
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    authApi
      .getWhatsAppJoinInfo()
      .then((res) => {
        if (!cancelled) setInfo(res.data);
      })
      .catch(() => {
        if (!cancelled) setInfo(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const copyJoinText = async () => {
    if (!info) return;
    try {
      await navigator.clipboard.writeText(info.joinText);
      setCopied(true);
      toast.success(t('whatsappJoin.copied', 'Copied!'));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t('whatsappJoin.copyFailed', 'Could not copy'));
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-surface-card p-5 animate-pulse">
        <div className="h-4 w-32 bg-gray-100 rounded mb-3" />
        <div className="h-3 w-full bg-gray-100 rounded mb-2" />
        <div className="h-3 w-2/3 bg-gray-100 rounded" />
      </div>
    );
  }

  if (!info) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="rounded-2xl border border-green-200 bg-gradient-to-br from-green-50 to-emerald-50/40 dark:from-green-500/10 dark:to-emerald-500/5 p-5"
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center text-white shrink-0">
          <MessageCircle className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <h3 className="text-base font-bold text-gray-900">
            {t('whatsappJoin.title', 'Connect WhatsApp for reminders')}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {t('whatsappJoin.intro', 'A one-time setup so we can send medicine reminders.')}
          </p>
        </div>
      </div>

      {/* Body — QR + steps side-by-side on desktop, stacked on mobile */}
      <div className={`grid gap-5 ${compact ? 'sm:grid-cols-[auto,1fr]' : 'md:grid-cols-[auto,1fr]'}`}>
        {/* QR */}
        <div className="flex flex-col items-center gap-2">
          <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100">
            <QRCodeSVG value={info.deepLink} size={compact ? 128 : 152} level="M" />
          </div>
          <span className="text-[11px] text-gray-500 font-medium">
            {t('whatsappJoin.scanQR', 'Scan with phone camera')}
          </span>
        </div>

        {/* Steps + actions */}
        <div className="space-y-3">
          <ol className="space-y-2 text-sm text-gray-700">
            <li className="flex gap-2.5">
              <span className="shrink-0 w-5 h-5 rounded-full bg-green-500 text-white text-[11px] font-bold flex items-center justify-center">1</span>
              <span>{t('whatsappJoin.step1', 'Open your phone camera and scan the QR code')}</span>
            </li>
            <li className="flex gap-2.5">
              <span className="shrink-0 w-5 h-5 rounded-full bg-green-500 text-white text-[11px] font-bold flex items-center justify-center">2</span>
              <span>
                {t('whatsappJoin.step2', 'WhatsApp opens with the message')}{' '}
                <code className="font-mono text-[11px] bg-gray-100 dark:bg-white/10 px-1.5 py-0.5 rounded text-gray-800">
                  {info.joinText}
                </code>{' '}
                {t('whatsappJoin.step2b', 'pre-filled')}
              </span>
            </li>
            <li className="flex gap-2.5">
              <span className="shrink-0 w-5 h-5 rounded-full bg-green-500 text-white text-[11px] font-bold flex items-center justify-center">3</span>
              <span>{t('whatsappJoin.step3', 'Tap Send. You\'ll get a confirmation reply — that\'s it!')}</span>
            </li>
          </ol>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2 pt-1">
            <a
              href={info.deepLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl text-sm font-semibold transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              {t('whatsappJoin.openWhatsApp', 'Open WhatsApp')}
            </a>
            <button
              type="button"
              onClick={copyJoinText}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              {copied
                ? t('whatsappJoin.copied', 'Copied!')
                : t('whatsappJoin.copyCode', 'Copy code')}
            </button>
          </div>

          {/* 72h warning */}
          <div className="flex items-start gap-2 mt-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="text-xs leading-relaxed">
              <strong className="font-semibold">
                {t('whatsappJoin.warningTitle', 'Heads up:')}
              </strong>{' '}
              {t(
                'whatsappJoin.warning72h',
                'WhatsApp asks you to rejoin every 72 hours of inactivity. If reminders stop arriving, just scan this QR again.',
              )}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default WhatsAppJoinCard;

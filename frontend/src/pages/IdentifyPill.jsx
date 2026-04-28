import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Camera, Upload, Loader2, CheckCircle2, AlertCircle, X, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { familyApi } from '../api/family.api';
import { pillApi } from '../api/pill.api';

const MAX_BYTES = 8 * 1024 * 1024;
const MAX_DIM = 1024; // Gemini Vision works fine at 1024px; smaller payload = faster + less timeout risk

/**
 * Resizes the image down to MAX_DIM (longest side) and returns JPEG base64.
 * For pill photos this is plenty of detail and keeps the request payload tiny.
 */
const compressImage = (file) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > MAX_DIM || height > MAX_DIM) {
        const scale = MAX_DIM / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error('image encoding failed'));
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result;
            const comma = result.indexOf(',');
            resolve({
              base64: comma >= 0 ? result.substring(comma + 1) : result,
              mimeType: 'image/jpeg',
            });
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        },
        'image/jpeg',
        0.85
      );
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });

const IdentifyPill = () => {
  const { t } = useTranslation();
  const [memberId, setMemberId] = useState('');
  const [preview, setPreview] = useState(null);
  const [file, setFile] = useState(null);
  const fileRef = useRef(null);

  const { data: membersResponse, isLoading: membersLoading, isError: membersError } = useQuery({
    queryKey: ['familyMembers'],
    queryFn: familyApi.getMembers,
  });
  // The backend wraps list responses in { success, data, message }; unwrap.
  const members = membersResponse?.data || [];

  // Auto-select the first member as soon as the list loads.
  useEffect(() => {
    if (!memberId && members.length) setMemberId(members[0].id);
  }, [members, memberId]);

  const identify = useMutation({
    mutationFn: pillApi.identify,
    onError: (err) => {
      toast.error(err.response?.data?.message || err.message || t('toast.somethingWrong'));
    },
  });

  const handlePickFile = async (f) => {
    if (!f) return;
    if (f.size > MAX_BYTES) {
      toast.error('Image too large — please pick something under 6 MB');
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    identify.reset();
  };

  const onSubmit = async () => {
    if (!file || !memberId) return;
    try {
      const { base64, mimeType } = await compressImage(file);
      identify.mutate({
        familyMemberId: memberId,
        imageBase64: base64,
        mimeType,
      });
    } catch (e) {
      toast.error('Could not process the image. Try a different photo.');
    }
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    identify.reset();
    if (fileRef.current) fileRef.current.value = '';
  };

  const result = identify.data;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center shadow-md">
            <Camera className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('pill.title')}</h1>
            <p className="text-sm text-gray-500">
              Snap a photo. AI matches it against the family member's prescribed medicines.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Member selector */}
      {membersLoading && (
        <div className="mb-4 flex items-center gap-2 text-xs text-gray-400">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading family members…
        </div>
      )}

      {!membersLoading && members.length === 0 && (
        <div className="mb-5 bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <Users className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-900 mb-1">
              No family members yet
            </p>
            <p className="text-xs text-amber-800 mb-2">
              Add a family member first — the AI matches the pill against their
              prescribed medicines.
            </p>
            <Link
              to="/family"
              className="inline-block text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-lg px-3 py-1.5 transition-colors"
            >
              Add family member →
            </Link>
          </div>
        </div>
      )}

      {membersError && (
        <div className="mb-4 text-xs text-red-600">
          Couldn't load family members. Refresh the page.
        </div>
      )}

      {members.length > 0 && (
        <div className="mb-4 flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-gray-500">For:</span>
          {members.map((m) => (
            <button
              key={m.id}
              onClick={() => setMemberId(m.id)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all ${
                memberId === m.id
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-primary'
              }`}
            >
              {m.name}
            </button>
          ))}
        </div>
      )}

      {/* Uploader */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        {!preview ? (
          <label
            htmlFor="pill-upload"
            className="block border-2 border-dashed border-gray-200 rounded-2xl p-10 text-center cursor-pointer hover:border-primary hover:bg-primary-light/30 transition-colors"
          >
            <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
            <p className="text-sm font-medium text-gray-700">{t('pill.uploadPhoto')}</p>
            <p className="text-xs text-gray-400 mt-1">JPG or PNG, up to 6 MB</p>
            <input
              ref={fileRef}
              id="pill-upload"
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => handlePickFile(e.target.files?.[0])}
            />
          </label>
        ) : (
          <div className="space-y-4">
            <div className="relative">
              <img src={preview} alt="pill preview" className="w-full max-h-80 object-contain rounded-xl bg-gray-50" />
              <button
                onClick={reset}
                className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm rounded-full p-1.5 shadow"
              >
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>
            <button
              onClick={onSubmit}
              disabled={!memberId || identify.isPending}
              className="w-full bg-primary hover:bg-primary-dark text-white font-medium rounded-xl py-3 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {identify.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Identifying…
                </>
              ) : (
                'Identify pill'
              )}
            </button>
          </div>
        )}

        {/* Result */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-5 border border-gray-100 rounded-2xl p-4 bg-gray-50"
            >
              <div className="flex items-start gap-2 mb-3">
                {result.matchedMedicineName ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">
                    {result.matchedMedicineName || 'No clear match'}
                  </p>
                  <p className="text-xs text-gray-500">
                    Confidence: <span className="capitalize font-medium">{result.confidence}</span>
                  </p>
                </div>
              </div>
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{result.description}</p>
              <p className="text-[11px] text-gray-400 mt-3 italic">{result.disclaimer}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default IdentifyPill;

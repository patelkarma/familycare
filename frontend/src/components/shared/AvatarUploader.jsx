import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Camera, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import Avatar from './Avatar';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

const AvatarUploader = ({
  name,
  currentUrl,
  relationship,
  size = 'lg',
  onUpload,
  onRemove,
  disabled = false,
}) => {
  const inputRef = useRef(null);
  const { t } = useTranslation();
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const displayUrl = previewUrl || currentUrl;
  const busy = uploading || removing;
  const canRemove = Boolean(onRemove) && Boolean(displayUrl) && !busy && !disabled;

  const openPicker = () => {
    if (disabled || busy) return;
    inputRef.current?.click();
  };

  const handleRemove = async (e) => {
    e.stopPropagation();
    if (!canRemove) return;
    setRemoving(true);
    try {
      await onRemove();
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    } catch (err) {
      toast.error(err?.response?.data?.message || t('toast.somethingWrong'));
    } finally {
      setRemoving(false);
    }
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error(t('toast.somethingWrong'));
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error(t('toast.uploadFailed'));
      return;
    }

    const localUrl = URL.createObjectURL(file);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return localUrl;
    });

    setUploading(true);
    try {
      await onUpload(file);
    } catch (err) {
      toast.error(err?.response?.data?.message || t('toast.uploadFailed'));
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    } finally {
      setUploading(false);
    }
  };

  const removeLabel = t('profile.removePhoto');

  return (
    <div className="relative inline-block">
      <Avatar name={name} imageUrl={displayUrl} relationship={relationship} size={size} />

      <motion.button
        type="button"
        onClick={openPicker}
        disabled={disabled || busy}
        className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-primary text-white shadow-lg flex items-center justify-center ring-2 ring-white disabled:opacity-60 disabled:cursor-not-allowed"
        whileHover={{ scale: disabled || busy ? 1 : 1.08 }}
        whileTap={{ scale: disabled || busy ? 1 : 0.92 }}
        aria-label="Change photo"
      >
        {uploading ? (
          <motion.div
            className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
        ) : (
          <Camera className="w-4 h-4" />
        )}
      </motion.button>

      {canRemove && (
        <motion.button
          type="button"
          onClick={handleRemove}
          className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-white text-gray-600 hover:text-red-600 shadow-md flex items-center justify-center ring-2 ring-white border border-gray-200"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.92 }}
          aria-label={removeLabel}
          title={removeLabel}
        >
          {removing ? (
            <motion.div
              className="w-3 h-3 border-2 border-gray-300 border-t-gray-600 rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
          ) : (
            <X className="w-3.5 h-3.5" />
          )}
        </motion.button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
};

export default AvatarUploader;

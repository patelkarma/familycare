import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  UploadCloud,
  FileText,
  Image as ImageIcon,
  Loader2,
  Paperclip,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { reportsApi } from '../../api/reports.api';
import { appointmentsApi } from '../../api/appointments.api';
import { REPORT_TYPES } from './ReportFilterBar';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME = [
  // images
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  // documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/rtf',
  // text
  'text/plain',
  'text/csv',
  'text/rtf',
];
const ALLOWED_EXTENSIONS = [
  'jpg', 'jpeg', 'png', 'gif', 'webp',
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'rtf',
  'txt', 'csv',
];
const ACCEPT_ATTR = ALLOWED_EXTENSIONS.map((e) => `.${e}`).concat(ALLOWED_MIME).join(',');
const TYPE_OPTIONS = REPORT_TYPES.filter((t) => t.value !== 'ALL');

const getExtension = (name = '') => {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : '';
};

const today = () => new Date().toISOString().slice(0, 10);

const ReportUploader = ({ memberId, memberName, onClose }) => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const inputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [progress, setProgress] = useState(0);
  const [touched, setTouched] = useState(false);

  const [form, setForm] = useState({
    title: '',
    reportType: '',
    reportDate: today(),
    doctorName: '',
    hospital: '',
    specialty: '',
    notes: '',
    tags: '',
    linkedAppointmentId: '',
  });

  // Live validation
  const errors = {
    file: !file ? 'Choose a file to upload' : null,
    title: !form.title.trim() ? 'Title is required' : null,
    reportType: !form.reportType ? 'Pick a report type' : null,
    reportDate: !form.reportDate ? 'Report date is required' : null,
  };
  const isValid = !Object.values(errors).some(Boolean);

  // Load past appointments for the "link to appointment" dropdown
  const { data: appointmentsData } = useQuery({
    queryKey: ['appointments', memberId],
    queryFn: () => appointmentsApi.getByMember(memberId),
    enabled: !!memberId,
  });
  const appointments = appointmentsData?.data || [];

  const uploadMutation = useMutation({
    mutationFn: ({ metadata, fileToUpload }) =>
      reportsApi.upload(metadata, fileToUpload, (evt) => {
        if (evt.total) setProgress(Math.round((evt.loaded / evt.total) * 100));
      }),
    onSuccess: async () => {
      // Force-refetch instead of just marking stale, so the list updates
      // before the modal closes. Run all three in parallel.
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['reports'] }),
        queryClient.refetchQueries({ queryKey: ['reports-recent'] }),
        queryClient.refetchQueries({ queryKey: ['dashboard-summary'] }),
      ]);
      toast.success(t('toast.reportUploaded'));
      onClose();
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || t('toast.uploadFailed'));
      setProgress(0);
    },
  });

  const validateFile = (f) => {
    if (!f) return 'Please choose a file';
    const ext = getExtension(f.name);
    // Some browsers send application/octet-stream for .docx/.xlsx — fall back
    // to extension matching so those uploads still go through.
    const mimeOk = ALLOWED_MIME.includes(f.type);
    const extOk = ALLOWED_EXTENSIONS.includes(ext);
    if (!mimeOk && !extOk) {
      return 'Allowed: PDF, images (JPG/PNG/GIF/WEBP), documents (DOC/DOCX/XLS/XLSX/RTF), text (TXT/CSV)';
    }
    if (f.size > MAX_FILE_SIZE) return 'File is too large (max 10MB)';
    return null;
  };

  const handleFile = (f) => {
    const error = validateFile(f);
    if (error) {
      toast.error(error);
      return;
    }
    setFile(f);
    // Note: we don't auto-fill the title — user must enter it deliberately.
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    handleFile(f);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setTouched(true);
    if (!isValid) {
      const firstError = Object.values(errors).find(Boolean);
      toast.error(firstError || 'Please fix the highlighted fields');
      return;
    }

    const metadata = {
      familyMemberId: memberId,
      title: form.title.trim(),
      reportType: form.reportType,
      reportDate: form.reportDate,
      doctorName: form.doctorName.trim() || null,
      hospital: form.hospital.trim() || null,
      specialty: form.specialty.trim() || null,
      notes: form.notes.trim() || null,
      tags: form.tags.trim() || null,
      linkedAppointmentId: form.linkedAppointmentId || null,
    };

    uploadMutation.mutate({ metadata, fileToUpload: file });
  };

  const isUploading = uploadMutation.isPending;
  const fileIsImage = file?.type?.startsWith('image/');
  const FileIcon = fileIsImage ? ImageIcon : FileText;
  const fileLabel = file ? (getExtension(file.name).toUpperCase() || file.type.split('/')[1]?.toUpperCase()) : '';

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-white w-full sm:max-w-2xl sm:rounded-3xl rounded-t-3xl shadow-2xl max-h-[92vh] flex flex-col"
        initial={{ y: 60, scale: 0.95, opacity: 0 }}
        animate={{ y: 0, scale: 1, opacity: 1 }}
        exit={{ y: 60, scale: 0.95, opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-light flex items-center justify-center">
              <UploadCloud className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Upload Report</h2>
              {memberName && (
                <p className="text-xs text-gray-500">for {memberName}</p>
              )}
            </div>
          </div>
          <motion.button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
          >
            <X className="w-5 h-5 text-gray-400" />
          </motion.button>
        </div>

        {/* Body (scrollable) */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Drop zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
              dragOver
                ? 'border-primary bg-primary-light/60 scale-[1.01]'
                : file
                  ? 'border-green-300 bg-green-50/40'
                  : touched && errors.file
                    ? 'border-red-300 bg-red-50/40'
                    : 'border-gray-200 bg-gray-50 hover:border-primary hover:bg-primary-light/30'
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT_ATTR}
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
            <AnimatePresence mode="wait">
              {file ? (
                <motion.div
                  key="file"
                  className="flex items-center gap-4"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <div className="w-14 h-14 rounded-xl bg-white shadow-sm flex items-center justify-center shrink-0">
                    <FileIcon className="w-7 h-7 text-primary" />
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{file.name}</p>
                    <p className="text-xs text-gray-500">
                      {(file.size / 1024).toFixed(0)} KB • {fileLabel}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                    }}
                    className="text-xs font-semibold text-gray-500 hover:text-red-500 transition-colors"
                  >
                    Change
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <motion.div
                    animate={{ y: [0, -6, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <UploadCloud className="w-10 h-10 text-primary mx-auto mb-2" />
                  </motion.div>
                  <p className="text-sm font-semibold text-gray-700">
                    Drag &amp; drop your file here
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    or tap to browse • PDF, images, docs &amp; text • max 10 MB
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Type selector */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Report type <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {TYPE_OPTIONS.map((t) => {
                const Icon = t.icon;
                const active = form.reportType === t.value;
                return (
                  <motion.button
                    key={t.value}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, reportType: t.value }))}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl text-xs font-semibold transition-all ${
                      active
                        ? 'bg-primary text-white shadow-md shadow-primary/25'
                        : touched && errors.reportType
                          ? 'bg-red-50 text-red-600 border border-red-200'
                          : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                  >
                    <Icon className={`w-5 h-5 ${active ? 'text-white' : t.color}`} />
                    {t.label}
                  </motion.button>
                );
              })}
            </div>
            {touched && errors.reportType && (
              <p className="text-xs text-red-500 mt-1.5">{errors.reportType}</p>
            )}
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              placeholder="e.g. Lipid profile Oct 2025"
              maxLength={200}
              className={`w-full border rounded-xl px-4 py-3 text-base focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all ${
                touched && errors.title ? 'border-red-300 bg-red-50/30' : 'border-gray-200'
              }`}
              required
            />
            {touched && errors.title && (
              <p className="text-xs text-red-500 mt-1.5">{errors.title}</p>
            )}
          </div>

          {/* Date + Specialty */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Report date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={form.reportDate}
                onChange={(e) => setForm((p) => ({ ...p, reportDate: e.target.value }))}
                className={`w-full border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none ${
                  touched && errors.reportDate ? 'border-red-300 bg-red-50/30' : 'border-gray-200'
                }`}
                required
              />
              {touched && errors.reportDate && (
                <p className="text-xs text-red-500 mt-1.5">{errors.reportDate}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Specialty</label>
              <input
                type="text"
                value={form.specialty}
                onChange={(e) => setForm((p) => ({ ...p, specialty: e.target.value }))}
                placeholder="e.g. Cardiology"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              />
            </div>
          </div>

          {/* Doctor + Hospital */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Doctor</label>
              <input
                type="text"
                value={form.doctorName}
                onChange={(e) => setForm((p) => ({ ...p, doctorName: e.target.value }))}
                placeholder="Dr. Sharma"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Hospital / Clinic</label>
              <input
                type="text"
                value={form.hospital}
                onChange={(e) => setForm((p) => ({ ...p, hospital: e.target.value }))}
                placeholder="Apollo Hospital"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Tags <span className="text-gray-400 font-normal">(comma-separated)</span>
            </label>
            <input
              type="text"
              value={form.tags}
              onChange={(e) => setForm((p) => ({ ...p, tags: e.target.value }))}
              placeholder="diabetes, fasting, follow-up"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            />
          </div>

          {/* Appointment link */}
          {appointments.length > 0 && (
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1.5">
                <Paperclip className="w-4 h-4" />
                Link to appointment <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <select
                value={form.linkedAppointmentId}
                onChange={(e) => setForm((p) => ({ ...p, linkedAppointmentId: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              >
                <option value="">— no appointment —</option>
                {appointments.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.doctorName || 'Appointment'} •{' '}
                    {new Date(a.appointmentDate).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                    {a.hospital ? ` (${a.hospital})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              rows={3}
              placeholder="Any context, follow-ups, key findings..."
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="p-5 border-t border-gray-100 shrink-0">
          {isUploading && progress > 0 && (
            <div className="mb-3">
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-primary"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.2 }}
                />
              </div>
              <p className="text-xs text-gray-400 text-right mt-1">{progress}%</p>
            </div>
          )}
          {touched && !isValid && !isUploading && (
            <p className="text-xs text-red-500 mb-2 text-center">
              Fix the highlighted fields above to upload
            </p>
          )}
          <motion.button
            type="button"
            onClick={handleSubmit}
            disabled={isUploading || (touched && !isValid)}
            className="w-full bg-primary text-white rounded-xl px-4 py-3.5 font-bold text-base shadow-lg shadow-primary/25 hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            whileHover={{ scale: isUploading || (touched && !isValid) ? 1 : 1.02 }}
            whileTap={{ scale: isUploading || (touched && !isValid) ? 1 : 0.98 }}
          >
            {isUploading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <UploadCloud className="w-5 h-5" />
                Upload Report
              </>
            )}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ReportUploader;

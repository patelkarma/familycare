import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, FileText, TrendingUp, Pin } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { familyApi } from '../api/family.api';
import { reportsApi } from '../api/reports.api';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import EmptyState from '../components/shared/EmptyState';
import ConfirmModal from '../components/shared/ConfirmModal';
import EmptyReportsState from '../components/reports/EmptyReportsState';
import ReportFilterBar, { REPORT_TYPES } from '../components/reports/ReportFilterBar';
import ReportTimeline from '../components/reports/ReportTimeline';
import ReportUploader from '../components/reports/ReportUploader';
import ReportViewer from '../components/reports/ReportViewer';
import ReportShareModal from '../components/reports/ReportShareModal';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

const Reports = () => {
  const { user } = useAuth();
  const isPatient = user?.role === 'MEMBER';
  const canEdit = !isPatient;
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const [selectedMemberId, setSelectedMemberId] = useState(null);
  const [activeType, setActiveType] = useState('ALL');
  const [query, setQuery] = useState('');
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const [showUploader, setShowUploader] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [sharing, setSharing] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // Family members (caregiver only)
  const { data: membersData, isLoading: membersLoading } = useQuery({
    queryKey: ['familyMembers'],
    queryFn: () => familyApi.getMembers(),
    enabled: !isPatient,
  });
  const members = membersData?.data || [];
  const activeMemberId = isPatient
    ? user.familyMemberId
    : selectedMemberId || (members.length > 0 ? members[0].id : null);
  const activeMember = isPatient
    ? { name: user.name }
    : members.find((m) => m.id === activeMemberId);

  // Reports for the selected member
  const { data: reportsData, isLoading: reportsLoading } = useQuery({
    queryKey: [
      'reports',
      activeMemberId,
      activeType,
      query,
      pinnedOnly,
    ],
    queryFn: () =>
      reportsApi.getByMember(activeMemberId, {
        type: activeType === 'ALL' ? undefined : activeType,
        q: query || undefined,
        pinned: pinnedOnly ? true : undefined,
      }),
    enabled: !!activeMemberId,
  });
  const reports = reportsData?.data || [];

  // Stats (computed on the full unfiltered list — simple enough for v1)
  const { data: allReportsData } = useQuery({
    queryKey: ['reports', activeMemberId, 'stats'],
    queryFn: () => reportsApi.getByMember(activeMemberId),
    enabled: !!activeMemberId,
  });
  const allReports = allReportsData?.data || [];

  const stats = useMemo(() => {
    const total = allReports.length;
    const byType = {};
    let pinnedCount = 0;
    let latest = null;
    for (const r of allReports) {
      byType[r.reportType] = (byType[r.reportType] || 0) + 1;
      if (r.isPinnedForEmergency) pinnedCount++;
      if (!latest || new Date(r.createdAt) > new Date(latest.createdAt)) latest = r;
    }
    return { total, byType, pinnedCount, latest };
  }, [allReports]);

  // Mutations
  const deleteMutation = useMutation({
    mutationFn: (id) => reportsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      queryClient.invalidateQueries({ queryKey: ['reports-recent'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      toast.success(t('toast.reportDeleted'));
      setDeletingId(null);
      setViewing(null);
    },
    onError: (err) =>
      toast.error(err?.response?.data?.message || t('toast.somethingWrong')),
  });

  const pinMutation = useMutation({
    mutationFn: (id) => reportsApi.togglePin(id),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      queryClient.invalidateQueries({ queryKey: ['reports-recent'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      toast.success(t('toast.saved'));
      if (viewing && res?.data) setViewing(res.data);
    },
    onError: () => toast.error(t('toast.somethingWrong')),
  });

  if (!isPatient && membersLoading) return <LoadingSpinner size="lg" />;

  const latestDate = stats.latest
    ? new Date(stats.latest.createdAt).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
      })
    : null;

  return (
    <div className="space-y-6 pb-24 md:pb-6">
      {/* Header */}
      <motion.div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            {t('reports.title')}
          </h1>
          <p className="text-gray-500 text-xs sm:text-sm mt-1">
            {isPatient ? t('subtitle.reportsPatient') : t('subtitle.reportsCaregiver')}
          </p>
        </div>
        {canEdit && (
          <motion.button
            onClick={() => setShowUploader(true)}
            disabled={!activeMemberId}
            className="hidden sm:flex items-center gap-2 bg-primary text-white rounded-xl px-5 py-3 font-bold text-sm shadow-lg shadow-primary/25 hover:bg-primary-dark transition-colors disabled:opacity-50"
            whileHover={{ scale: activeMemberId ? 1.04 : 1 }}
            whileTap={{ scale: activeMemberId ? 0.96 : 1 }}
          >
            <Plus className="w-5 h-5" />
            {t('reportsExtra.uploadReport')}
          </motion.button>
        )}
      </motion.div>

      {!isPatient && members.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={t('empty.addFamilyFirst')}
          description={t('emptyDesc.needFamily')}
          actionLabel={t('empty.goToFamily')}
          onAction={() => (window.location.href = '/family')}
        />
      ) : (
        <>
          {/* Member picker */}
          {!isPatient && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {members.map((m) => (
                  <motion.button
                    key={m.id}
                    onClick={() => setSelectedMemberId(m.id)}
                    className={`flex items-center gap-2 px-3.5 py-2 sm:px-5 sm:py-3 rounded-xl text-xs sm:text-sm font-medium sm:font-semibold whitespace-nowrap transition-all ${
                      activeMemberId === m.id
                        ? 'bg-primary text-white shadow-md shadow-primary/20'
                        : 'bg-white text-gray-600 border border-gray-200 hover:border-primary-light'
                    }`}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    {m.name}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Stats strip */}
          {stats.total > 0 && (
            <motion.div
              className="grid grid-cols-2 sm:grid-cols-4 gap-3"
              variants={container}
              initial="hidden"
              animate="show"
            >
              <motion.div
                variants={item}
                className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100"
              >
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="w-4 h-4 text-primary" />
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Total
                  </p>
                </div>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </motion.div>

              <motion.div
                variants={item}
                className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Pin className="w-4 h-4 text-amber-500" />
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Pinned
                  </p>
                </div>
                <p className="text-2xl font-bold text-gray-900">{stats.pinnedCount}</p>
              </motion.div>

              <motion.div
                variants={item}
                className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100"
              >
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Latest
                  </p>
                </div>
                <p className="text-base font-bold text-gray-900 truncate">
                  {latestDate || '—'}
                </p>
              </motion.div>

              <motion.div
                variants={item}
                className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100"
              >
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                  By type
                </p>
                <div className="flex flex-wrap gap-1">
                  {REPORT_TYPES.filter((t) => t.value !== 'ALL' && stats.byType[t.value])
                    .slice(0, 3)
                    .map((t) => (
                      <span
                        key={t.value}
                        className="text-[10px] font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full"
                      >
                        {t.label} {stats.byType[t.value]}
                      </span>
                    ))}
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* Filter bar */}
          {stats.total > 0 && (
            <ReportFilterBar
              activeType={activeType}
              onTypeChange={setActiveType}
              query={query}
              onQueryChange={setQuery}
              pinnedOnly={pinnedOnly}
              onPinnedToggle={() => setPinnedOnly((p) => !p)}
            />
          )}

          {/* Content */}
          {reportsLoading ? (
            <LoadingSpinner />
          ) : reports.length === 0 ? (
            stats.total === 0 ? (
              <EmptyReportsState
                memberName={activeMember?.name}
                onUpload={canEdit ? () => setShowUploader(true) : null}
              />
            ) : (
              <div className="bg-white rounded-2xl p-10 text-center border border-dashed border-gray-200">
                <p className="text-gray-500 text-sm">No reports match your filters.</p>
              </div>
            )
          ) : (
            <ReportTimeline
              reports={reports}
              onView={setViewing}
              onShare={setSharing}
              onPin={(r) => pinMutation.mutate(r.id)}
              onDelete={(r) => setDeletingId(r.id)}
              canEdit={canEdit}
            />
          )}
        </>
      )}

      {/* Floating upload button (mobile) */}
      {canEdit && activeMemberId && (
        <motion.button
          onClick={() => setShowUploader(true)}
          className="sm:hidden fixed bottom-24 right-4 z-40 w-14 h-14 rounded-full bg-primary text-white shadow-2xl shadow-primary/40 flex items-center justify-center"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Plus className="w-6 h-6" />
        </motion.button>
      )}

      {/* Modals */}
      <AnimatePresence>
        {showUploader && activeMemberId && (
          <ReportUploader
            memberId={activeMemberId}
            memberName={activeMember?.name}
            onClose={() => setShowUploader(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewing && (
          <ReportViewer
            report={viewing}
            onClose={() => setViewing(null)}
            onShare={(r) => setSharing(r)}
            onPin={(r) => pinMutation.mutate(r.id)}
            onDelete={(r) => setDeletingId(r.id)}
            canEdit={canEdit}
          />
        )}
      </AnimatePresence>

      <ReportShareModal report={sharing} onClose={() => setSharing(null)} />

      <ConfirmModal
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={() => deleteMutation.mutate(deletingId)}
        title={t('confirm.deleteReport')}
        message="The file will be permanently removed from your report locker."
        confirmText={t('common.delete')}
      />
    </div>
  );
};

export default Reports;

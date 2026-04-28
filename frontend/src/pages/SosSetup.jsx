import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, ShieldAlert, Send, Phone, Users, History } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { familyApi } from '../api/family.api';
import { sosApi } from '../api/sos.api';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import EmptyState from '../components/shared/EmptyState';
import ConfirmModal from '../components/shared/ConfirmModal';
import EmergencyContactCard from '../components/sos/EmergencyContactCard';
import EmergencyContactForm from '../components/sos/EmergencyContactForm';
import SOSEventTimeline from '../components/sos/SOSEventTimeline';
import SOSButton from '../components/sos/SOSButton';
import SOSCountdownModal from '../components/sos/SOSCountdownModal';
import SOSResultModal from '../components/sos/SOSResultModal';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const SosSetup = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const isPatient = user?.role === 'MEMBER';

  const [selectedMemberId, setSelectedMemberId] = useState(null);
  const [editingContact, setEditingContact] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [deletingContact, setDeletingContact] = useState(null);

  // SOS trigger flow
  const [showCountdown, setShowCountdown] = useState(false);
  const [triggerResult, setTriggerResult] = useState(null);

  // Family members
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
    ? { id: user.familyMemberId, name: user.name }
    : members.find((m) => m.id === activeMemberId);

  // Contacts
  const { data: contactsData, isLoading: contactsLoading } = useQuery({
    queryKey: ['sos-contacts', activeMemberId],
    queryFn: () => sosApi.getContacts(activeMemberId),
    enabled: !!activeMemberId,
  });
  const contacts = contactsData?.data || [];

  // Events
  const { data: eventsData } = useQuery({
    queryKey: ['sos-events', activeMemberId],
    queryFn: () => sosApi.getEvents(activeMemberId),
    enabled: !!activeMemberId && !isPatient,
  });
  const events = eventsData?.data || [];

  // Mutations
  const deleteMutation = useMutation({
    mutationFn: (id) => sosApi.deleteContact(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sos-contacts', activeMemberId] });
      toast.success(t('toast.contactRemoved'));
      setDeletingContact(null);
    },
    onError: (err) =>
      toast.error(err?.response?.data?.message || t('toast.somethingWrong')),
  });

  const setPrimaryMutation = useMutation({
    mutationFn: (id) => sosApi.setPrimary(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sos-contacts', activeMemberId] });
      toast.success(t('toast.saved'));
    },
    onError: () => toast.error(t('toast.somethingWrong')),
  });

  const triggerMutation = useMutation({
    mutationFn: (location) =>
      sosApi.trigger({
        memberId: activeMemberId,
        latitude: location.latitude,
        longitude: location.longitude,
        accuracyMeters: location.accuracyMeters,
      }),
    onSuccess: (res) => {
      setShowCountdown(false);
      setTriggerResult(res?.data);
      queryClient.invalidateQueries({ queryKey: ['sos-events', activeMemberId] });
      toast.success(t('toast.saved'));
    },
    onError: (err) => {
      setShowCountdown(false);
      toast.error(err?.response?.data?.message || t('toast.somethingWrong'));
    },
  });

  const testSmsMutation = useMutation({
    mutationFn: () => sosApi.sendTestSms(),
    onSuccess: (res) => {
      const delivered = res?.data?.delivered;
      if (delivered) toast.success(t('toast.saved'));
      else toast.error(t('toast.somethingWrong'));
    },
    onError: (err) =>
      toast.error(err?.response?.data?.message || t('toast.somethingWrong')),
  });

  const handleEdit = (c) => {
    setEditingContact(c);
    setShowForm(true);
  };

  const handleAdd = () => {
    setEditingContact(null);
    setShowForm(true);
  };

  if (!isPatient && membersLoading) return <LoadingSpinner size="lg" />;

  return (
    <div className="space-y-6 pb-24 md:pb-6">
      {/* Header */}
      <motion.div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3">
            <ShieldAlert className="w-6 h-6 sm:w-8 sm:h-8 text-red-500" />
            {t('sos.title')}
          </h1>
          <p className="text-gray-500 text-xs sm:text-sm mt-1">
            {isPatient ? t('subtitle.sosPatient') : t('subtitle.sosCaregiver')}
          </p>
        </div>

        {!isPatient && (
          <motion.button
            onClick={() => testSmsMutation.mutate()}
            disabled={testSmsMutation.isPending}
            className="flex items-center gap-2 bg-white border border-gray-200 hover:border-primary hover:bg-primary-light text-gray-700 hover:text-primary-dark rounded-xl px-4 py-2.5 font-semibold text-sm transition-colors disabled:opacity-50"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <Send className="w-4 h-4" />
            {testSmsMutation.isPending ? 'Sending…' : 'Send test WhatsApp to me'}
          </motion.button>
        )}
      </motion.div>

      {!isPatient && members.length === 0 ? (
        <EmptyState
          icon={Users}
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

          {/* Big SOS test button + status */}
          <motion.div
            className="bg-gradient-to-br from-red-50 to-amber-50 rounded-3xl p-6 sm:p-8 border border-red-100"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15 }}
          >
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <SOSButton
                size="md"
                onClick={() => {
                  if (contacts.length === 0) {
                    toast.error(t('emptyDesc.addContactDesc'));
                    return;
                  }
                  setShowCountdown(true);
                }}
                disabled={contacts.length === 0 || triggerMutation.isPending}
              />
              <div className="flex-1 text-center sm:text-left">
                <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 mb-2">
                  {contacts.length === 0
                    ? 'Add a contact to enable SOS'
                    : `${contacts.length} ${
                        contacts.length === 1 ? 'contact' : 'contacts'
                      } will be alerted`}
                </h2>
                <p className="text-sm text-gray-600 mb-3">
                  Pressing this button will send a WhatsApp message with{' '}
                  <strong>{activeMember?.name}'s</strong> medical info, current location and
                  pinned medical reports — to every contact below.
                </p>
                <a
                  href="tel:108"
                  className="inline-flex items-center gap-2 text-red-600 hover:text-red-700 font-bold text-sm"
                >
                  <Phone className="w-4 h-4" />
                  Or call 108 immediately
                </a>
              </div>
            </div>
          </motion.div>

          {/* Contacts section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                {t('sos.emergencyContacts')}
              </h2>
              {!isPatient && (
                <motion.button
                  onClick={handleAdd}
                  className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white rounded-xl px-4 py-2.5 font-semibold text-sm shadow-md shadow-primary/20"
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                >
                  <Plus className="w-4 h-4" />
                  {t('sos.addContact')}
                </motion.button>
              )}
            </div>

            {contactsLoading ? (
              <LoadingSpinner />
            ) : contacts.length === 0 ? (
              <div className="bg-white rounded-2xl p-10 text-center border border-dashed border-gray-200">
                <ShieldAlert className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-700 font-semibold mb-1">{t('sos.noContacts')}</p>
                <p className="text-gray-500 text-sm mb-4">
                  {t('emptyDesc.addContactDesc')}
                </p>
                {!isPatient && (
                  <motion.button
                    onClick={handleAdd}
                    className="inline-flex items-center gap-2 bg-primary text-white rounded-xl px-5 py-2.5 font-semibold text-sm"
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                  >
                    <Plus className="w-4 h-4" />
                    Add first contact
                  </motion.button>
                )}
              </div>
            ) : (
              <motion.div
                className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                variants={container}
                initial="hidden"
                animate="show"
              >
                <AnimatePresence>
                  {contacts.map((c) => (
                    <EmergencyContactCard
                      key={c.id}
                      contact={c}
                      canEdit={!isPatient}
                      onEdit={handleEdit}
                      onDelete={(contact) => setDeletingContact(contact)}
                      onSetPrimary={(contact) => setPrimaryMutation.mutate(contact.id)}
                    />
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </div>

          {/* Event history (caregiver only) */}
          {!isPatient && (
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
                <History className="w-5 h-5 text-primary" />
                Recent SOS alerts
              </h2>
              <SOSEventTimeline events={events} />
            </div>
          )}
        </>
      )}

      {/* Form modal */}
      <AnimatePresence>
        {showForm && activeMemberId && (
          <EmergencyContactForm
            memberId={activeMemberId}
            contact={editingContact}
            onClose={() => {
              setShowForm(false);
              setEditingContact(null);
            }}
          />
        )}
      </AnimatePresence>

      <ConfirmModal
        isOpen={!!deletingContact}
        onClose={() => setDeletingContact(null)}
        onConfirm={() => deleteMutation.mutate(deletingContact.id)}
        title={t('confirm.deleteContact')}
        message={`${deletingContact?.name} will no longer be alerted on SOS.`}
        confirmText={t('family.remove')}
      />

      {/* SOS countdown + result */}
      <SOSCountdownModal
        isOpen={showCountdown}
        memberName={activeMember?.name}
        onCancel={() => setShowCountdown(false)}
        onConfirm={(location) => triggerMutation.mutate(location)}
      />
      <SOSResultModal
        isOpen={!!triggerResult}
        result={triggerResult}
        onClose={() => setTriggerResult(null)}
      />
    </div>
  );
};

export default SosSetup;

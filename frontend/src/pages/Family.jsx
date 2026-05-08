import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Pencil, Trash2, Users, ChevronRight, UserPlus, LinkIcon, Unlink, Crown } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { familyApi } from '../api/family.api';
import { formatRelationship, formatDate } from '../utils/formatters';
import Avatar from '../components/shared/Avatar';
import { SkeletonList } from '../components/shared/SkeletonCard';
import EmptyState from '../components/shared/EmptyState';
import ConfirmModal from '../components/shared/ConfirmModal';
import FamilyMemberForm from '../components/shared/FamilyMemberForm';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

const Family = () => {
  const [showForm, setShowForm] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [linkingMember, setLinkingMember] = useState(null);
  const [linkEmail, setLinkEmail] = useState('');
  const [linkPassword, setLinkPassword] = useState('');
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const { data, isLoading } = useQuery({
    queryKey: ['familyMembers'],
    queryFn: () => familyApi.getMembers(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => familyApi.deleteMember(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['familyMembers'] });
      toast.success(t('toast.memberRemoved'));
      setDeletingId(null);
    },
    onError: () => toast.error(t('toast.memberDeleteFailed')),
  });

  const { user } = useAuth();
  const allMembers = data?.data || [];
  // Separate the family head's own record from other members (match by linked email, not relationship)
  const selfMember = allMembers.find((m) => m.linkedUserEmail === user?.email);
  const members = allMembers.filter((m) => m !== selfMember);

  const linkMutation = useMutation({
    mutationFn: ({ memberId, data: linkData }) => familyApi.linkAccount(memberId, linkData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['familyMembers'] });
      toast.success('Patient account created!');
      setLinkingMember(null);
      setLinkEmail('');
      setLinkPassword('');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to create account');
    },
  });

  const unlinkMutation = useMutation({
    mutationFn: (memberId) => familyApi.unlinkAccount(memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['familyMembers'] });
      toast.success('Account unlinked');
    },
    onError: () => toast.error('Failed to unlink account'),
  });

  const handleLinkSubmit = (e) => {
    e.preventDefault();
    if (!linkEmail || !linkPassword || linkPassword.length < 6) {
      toast.error('Email and password (min 6 chars) are required');
      return;
    }
    linkMutation.mutate({
      memberId: linkingMember.id,
      data: { email: linkEmail, password: linkPassword, name: linkingMember.name },
    });
  };

  const handleEdit = (member) => {
    setEditingMember(member);
    setShowForm(true);
  };

  const handleAdd = () => {
    setEditingMember(null);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingMember(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-gray-100 rounded-md animate-pulse" />
        <SkeletonList count={4} rows={2} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        className="flex items-center justify-between gap-3"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t('family.title')}</h1>
          <p className="text-gray-500 text-xs sm:text-sm mt-0.5">
            {t('subtitle.family')}
          </p>
        </div>
        <motion.button
          onClick={handleAdd}
          className="shrink-0 flex items-center gap-1.5 sm:gap-2 bg-primary text-white rounded-xl px-3.5 sm:px-5 py-2 sm:py-2.5 font-semibold text-xs sm:text-sm shadow-lg shadow-primary/25 hover:bg-primary-dark transition-colors"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Plus className="w-4 h-4" />
          {t('family.addMember')}
        </motion.button>
      </motion.div>

      {/* Your Profile (Self) */}
      {selfMember && (
        <motion.div
          className="bg-gradient-to-r from-primary-light to-amber-50 rounded-2xl p-5 border-2 border-primary/20"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-4">
            <Avatar name={selfMember.name} imageUrl={selfMember.avatarUrl} relationship="Self" size="lg" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-900 text-lg">{selfMember.name}</h3>
                <span className="text-xs bg-primary/15 text-primary-dark px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1">
                  <Crown className="w-3 h-3" />
                  You
                </span>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {selfMember.bloodGroup && (
                  <span className="text-xs bg-red-50 text-red-600 px-2.5 py-1 rounded-full font-medium">{selfMember.bloodGroup}</span>
                )}
                {selfMember.gender && (
                  <span className="text-xs bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full font-medium">{selfMember.gender}</span>
                )}
                {selfMember.dateOfBirth && (
                  <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">Born {formatDate(selfMember.dateOfBirth)}</span>
                )}
              </div>
            </div>
            <motion.button
              onClick={() => handleEdit(selfMember)}
              className="p-2 rounded-lg text-primary hover:text-primary-dark hover:bg-primary/10 transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              title={t('family.editYourProfile')}
            >
              <Pencil className="w-4 h-4" />
            </motion.button>
          </div>
        </motion.div>
      )}

      {/* Members list */}
      {members.length === 0 ? (
        <EmptyState
          icon={Users}
          title={t('emptyDesc.yourFamilyAwaits')}
          description={t('emptyDesc.yourFamilyDesc')}
          actionLabel={t('family.addFirstMember')}
          onAction={handleAdd}
        />
      ) : (
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
          variants={container}
          initial="hidden"
          animate="show"
        >
          {members.map((member) => (
            <motion.div
              key={member.id}
              className="bg-white rounded-2xl p-5 shadow-sm border border-gray-50 hover:shadow-md transition-shadow"
              variants={item}
              layout
              whileHover={{ y: -3 }}
            >
              <div className="flex items-start gap-4">
                <Avatar
                  name={member.name}
                  imageUrl={member.avatarUrl}
                  relationship={member.relationship}
                  size="lg"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 text-lg">{member.name}</h3>
                  <p className="text-sm text-gray-500">{formatRelationship(member.relationship)}</p>

                  <div className="flex flex-wrap gap-2 mt-3">
                    {member.bloodGroup && (
                      <span className="text-xs bg-red-50 text-red-600 px-2.5 py-1 rounded-full font-medium">
                        {member.bloodGroup}
                      </span>
                    )}
                    {member.gender && (
                      <span className="text-xs bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full font-medium">
                        {member.gender}
                      </span>
                    )}
                    {member.dateOfBirth && (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
                        Born {formatDate(member.dateOfBirth)}
                      </span>
                    )}
                  </div>

                  {member.allergies && (
                    <p className="text-xs text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg mt-2 inline-block">
                      Allergies: {member.allergies}
                    </p>
                  )}

                  {member.chronicDiseases && (
                    <p className="text-xs text-purple-600 bg-purple-50 px-2.5 py-1 rounded-lg mt-1 inline-block">
                      Conditions: {member.chronicDiseases}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2">
                  <motion.button
                    onClick={() => handleEdit(member)}
                    className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    title={t('common.edit')}
                  >
                    <Pencil className="w-4 h-4" />
                  </motion.button>
                  <motion.button
                    onClick={() => setDeletingId(member.id)}
                    className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    title={t('common.delete')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </motion.button>
                </div>
              </div>

              {/* Patient Account Link Section */}
              <div className="mt-4 pt-3 border-t border-gray-100">
                {member.linkedUserEmail ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 px-3 py-1.5 rounded-lg">
                      <LinkIcon className="w-3.5 h-3.5" />
                      <span>Patient login: {member.linkedUserEmail}</span>
                    </div>
                    <motion.button
                      onClick={() => unlinkMutation.mutate(member.id)}
                      className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1 transition-colors"
                      whileTap={{ scale: 0.95 }}
                    >
                      <Unlink className="w-3.5 h-3.5" />
                      Unlink
                    </motion.button>
                  </div>
                ) : (
                  <motion.button
                    onClick={() => {
                      setLinkingMember(member);
                      setLinkEmail('');
                      setLinkPassword('');
                    }}
                    className="flex items-center gap-1.5 text-xs text-primary hover:text-primary-dark font-medium transition-colors"
                    whileHover={{ x: 3 }}
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    Create Patient Login
                  </motion.button>
                )}
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Add/Edit form modal */}
      <AnimatePresence>
        {showForm && (
          <FamilyMemberForm
            member={editingMember}
            isSelf={editingMember && selfMember && editingMember.id === selfMember.id}
            onClose={handleFormClose}
          />
        )}
      </AnimatePresence>

      {/* Delete confirmation */}
      <ConfirmModal
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={() => deleteMutation.mutate(deletingId)}
        title={t('confirm.deleteMember')}
        message="This will remove this member and all their associated data. This action cannot be undone."
        confirmText={t('family.remove')}
      />

      {/* Link Account Modal */}
      <AnimatePresence>
        {linkingMember && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLinkingMember(null)}
          >
            <motion.div
              className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-lg font-bold text-gray-900 mb-1">
                Create Patient Login
              </h2>
              <p className="text-sm text-gray-500 mb-5">
                Create a login for <span className="font-medium">{linkingMember.name}</span> so they can mark their own doses.
              </p>

              <form onSubmit={handleLinkSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={linkEmail}
                    onChange={(e) => setLinkEmail(e.target.value)}
                    placeholder="patient@email.com"
                    required
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <input
                    type="text"
                    value={linkPassword}
                    onChange={(e) => setLinkPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    required
                    minLength={6}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  />
                  <p className="text-xs text-gray-400 mt-1">Share these credentials with the patient</p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setLinkingMember(null)}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <motion.button
                    type="submit"
                    disabled={linkMutation.isPending}
                    className="flex-1 bg-primary text-white rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    whileTap={{ scale: 0.97 }}
                  >
                    {linkMutation.isPending ? (
                      <motion.div
                        className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      />
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        Create Account
                      </>
                    )}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Family;

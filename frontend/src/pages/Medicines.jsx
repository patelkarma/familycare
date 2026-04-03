import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Pill, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { familyApi } from '../api/family.api';
import { medicinesApi } from '../api/medicines.api';
import { scheduleApi } from '../api/schedule.api';
import MedicineCard from '../components/medicines/MedicineCard';
import AddMedicineForm from '../components/medicines/AddMedicineForm';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import EmptyState from '../components/shared/EmptyState';
import ConfirmModal from '../components/shared/ConfirmModal';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

const Medicines = () => {
  const [selectedMemberId, setSelectedMemberId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const queryClient = useQueryClient();

  // Fetch family members for the selector
  const { data: membersData, isLoading: membersLoading } = useQuery({
    queryKey: ['familyMembers'],
    queryFn: () => familyApi.getMembers(),
  });

  const members = membersData?.data || [];

  // Auto-select first member
  const activeMemberId = selectedMemberId || (members.length > 0 ? members[0].id : null);

  // Fetch medicines for selected member
  const { data: medicinesData, isLoading: medicinesLoading } = useQuery({
    queryKey: ['medicines', activeMemberId],
    queryFn: () => medicinesApi.getByMember(activeMemberId),
    enabled: !!activeMemberId,
  });

  const medicines = medicinesData?.data || [];

  // Fetch daily schedule for dose status dots
  const today = new Date().toISOString().split('T')[0];
  const { data: scheduleData } = useQuery({
    queryKey: ['memberSchedule', activeMemberId, today],
    queryFn: () => scheduleApi.getMemberDaily(activeMemberId, today),
    enabled: !!activeMemberId,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    refetchInterval: 60_000,
  });

  // Build a map: medicineId -> { timingKey -> slot data }
  const doseStatusMap = {};
  const scheduleSlots = scheduleData?.data?.slots || [];
  scheduleSlots.forEach((slot) => {
    if (!doseStatusMap[slot.medicineId]) {
      doseStatusMap[slot.medicineId] = {};
    }
    doseStatusMap[slot.medicineId][slot.timingKey] = {
      status: slot.status,
      takenAt: slot.takenAt,
      markedByName: slot.markedByName,
    };
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => medicinesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medicines', activeMemberId] });
      toast.success('Medicine removed');
      setDeletingId(null);
    },
    onError: () => toast.error('Failed to remove medicine'),
  });

  const handleEdit = (medicine) => {
    setEditingMedicine(medicine);
    setShowForm(true);
  };

  const handleAdd = () => {
    setEditingMedicine(null);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingMedicine(null);
  };

  if (membersLoading) return <LoadingSpinner size="lg" />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Medicines</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Manage medicines and reminders for your family
          </p>
        </div>
        <motion.button
          onClick={handleAdd}
          disabled={!activeMemberId}
          className="flex items-center gap-2 bg-primary text-white rounded-xl px-5 py-2.5 font-semibold text-sm shadow-lg shadow-primary/25 hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          whileHover={{ scale: activeMemberId ? 1.05 : 1 }}
          whileTap={{ scale: activeMemberId ? 0.95 : 1 }}
        >
          <Plus className="w-4 h-4" />
          Add Medicine
        </motion.button>
      </motion.div>

      {/* Member selector */}
      {members.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {members.map((member) => (
              <motion.button
                key={member.id}
                onClick={() => setSelectedMemberId(member.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                  activeMemberId === member.id
                    ? 'bg-primary text-white shadow-md shadow-primary/20'
                    : 'bg-white text-gray-600 border border-gray-200 hover:border-primary-light'
                }`}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                {member.name}
                {activeMemberId === member.id && (
                  <span className="text-xs bg-white/20 px-1.5 py-0.5 rounded-full">
                    {medicines.length}
                  </span>
                )}
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}

      {/* No family members */}
      {members.length === 0 && (
        <EmptyState
          icon={Pill}
          title="Add family members first"
          description="You need to add family members before you can manage their medicines."
          actionLabel="Go to Family"
          onAction={() => window.location.href = '/family'}
        />
      )}

      {/* Medicines list */}
      {activeMemberId && (
        <>
          {medicinesLoading ? (
            <LoadingSpinner />
          ) : medicines.length === 0 ? (
            <EmptyState
              icon={Pill}
              title="No medicines yet"
              description="Add medicines to start tracking doses and get smart reminders via SMS."
              actionLabel="Add First Medicine"
              onAction={handleAdd}
            />
          ) : (
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
              variants={container}
              initial="hidden"
              animate="show"
            >
              {medicines.map((medicine) => (
                <motion.div key={medicine.id} variants={item}>
                  <MedicineCard
                    medicine={medicine}
                    memberId={activeMemberId}
                    onEdit={handleEdit}
                    onDelete={setDeletingId}
                    doseStatuses={doseStatusMap[medicine.id] || {}}
                  />
                </motion.div>
              ))}
            </motion.div>
          )}
        </>
      )}

      {/* Add/Edit form */}
      <AnimatePresence>
        {showForm && activeMemberId && (
          <AddMedicineForm
            memberId={activeMemberId}
            medicine={editingMedicine}
            onClose={handleFormClose}
          />
        )}
      </AnimatePresence>

      {/* Delete confirmation */}
      <ConfirmModal
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={() => deleteMutation.mutate(deletingId)}
        title="Remove medicine?"
        message="This will deactivate this medicine and stop its reminders. Dose history will be preserved."
        confirmText="Remove"
      />
    </div>
  );
};

export default Medicines;

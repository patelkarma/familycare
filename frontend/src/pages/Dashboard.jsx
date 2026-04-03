import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, Heart, Pill, Clock, Check, AlertTriangle, Sun, Cloud, Moon } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { familyApi } from '../api/family.api';
import { scheduleApi } from '../api/schedule.api';
import { getGreeting, formatRelationship, formatDate } from '../utils/formatters';
import Avatar from '../components/shared/Avatar';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import EmptyState from '../components/shared/EmptyState';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['familyMembers'],
    queryFn: () => familyApi.getMembers(),
  });

  const members = data?.data || [];

  const today = new Date().toISOString().split('T')[0];
  const { data: overviewData } = useQuery({
    queryKey: ['familyOverview', today],
    queryFn: () => scheduleApi.getFamilyOverview(today),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    refetchInterval: 60_000,
  });

  const familySchedules = overviewData?.data || [];

  // Compute summary metrics from all slots across all members
  const allSlots = familySchedules.flatMap((s) => s.slots || []);
  const totalDoses = allSlots.length;
  const takenCount = allSlots.filter((s) => s.status === 'TAKEN').length;
  const missedCount = allSlots.filter((s) => s.status === 'MISSED').length;
  const pendingCount = allSlots.filter((s) => s.status === 'PENDING').length;

  // Count unique active medicines across all members
  const activeMedicineIds = new Set(allSlots.map((s) => s.medicineId));

  if (isLoading) return <LoadingSpinner size="lg" />;

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
          {getGreeting()}, {user?.name?.split(' ')[0]}
        </h1>
        <p className="text-gray-500 mt-1">
          {new Date().toLocaleDateString('en-IN', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </p>
      </motion.div>

      {/* Quick stats */}
      <motion.div
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {[
          { label: 'Family Members', value: members.length, icon: Users, color: 'bg-blue-500', to: '/family' },
          { label: 'Active Medicines', value: activeMedicineIds.size, icon: Pill, color: 'bg-green-500', to: '/medicines' },
          { label: 'Doses Today', value: totalDoses, icon: Clock, color: 'bg-amber-500', to: '/doses-today' },
          { label: 'Vitals Logged', value: '—', icon: Heart, color: 'bg-rose-500', to: '/vitals' },
        ].map((stat) => (
          <motion.div
            key={stat.label}
            className="bg-white rounded-2xl p-5 shadow-sm border border-gray-50 cursor-pointer group"
            variants={item}
            whileHover={{ y: -6, scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate(stat.to)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') navigate(stat.to); }}
            role="button"
            tabIndex={0}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            <div className={`w-10 h-10 ${stat.color} rounded-xl flex items-center justify-center mb-3`}>
              <stat.icon className="w-5 h-5 text-white" />
            </div>
            <p className="text-2xl font-bold text-gray-900 group-hover:text-primary transition-colors">{stat.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{stat.label}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Today's Dose Summary */}
      {familySchedules.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-gray-900">Today&apos;s Dose Summary</h2>
            <div className="flex items-center gap-3 text-xs font-medium">
              <span className="flex items-center gap-1 text-green-600">
                <Check className="w-3.5 h-3.5" /> {takenCount} taken
              </span>
              <span className="flex items-center gap-1 text-red-500">
                <AlertTriangle className="w-3.5 h-3.5" /> {missedCount} missed
              </span>
              <span className="flex items-center gap-1 text-amber-500">
                <Clock className="w-3.5 h-3.5" /> {pendingCount} pending
              </span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden flex mb-6">
            {takenCount > 0 && (
              <motion.div
                className="bg-green-500 h-full"
                initial={{ width: 0 }}
                animate={{ width: `${(takenCount / totalDoses) * 100}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            )}
            {missedCount > 0 && (
              <motion.div
                className="bg-red-400 h-full"
                initial={{ width: 0 }}
                animate={{ width: `${(missedCount / totalDoses) * 100}%` }}
                transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
              />
            )}
            {pendingCount > 0 && (
              <motion.div
                className="bg-amber-400 h-full"
                initial={{ width: 0 }}
                animate={{ width: `${(pendingCount / totalDoses) * 100}%` }}
                transition={{ duration: 0.8, ease: 'easeOut', delay: 0.4 }}
              />
            )}
          </div>

          {/* Per-member dose details */}
          <motion.div
            className="space-y-4"
            variants={container}
            initial="hidden"
            animate="show"
          >
            {familySchedules.map((schedule) => {
              const slots = schedule.slots || [];
              const memberTaken = slots.filter((s) => s.status === 'TAKEN').length;
              const memberTotal = slots.length;

              // Group slots by medicine
              const byMedicine = {};
              slots.forEach((slot) => {
                if (!byMedicine[slot.medicineId]) {
                  byMedicine[slot.medicineId] = { name: slot.medicineName, dosage: slot.dosage, form: slot.form, timings: [] };
                }
                byMedicine[slot.medicineId].timings.push(slot);
              });

              return (
                <motion.div
                  key={schedule.memberId}
                  className="bg-white rounded-2xl p-5 shadow-sm border border-gray-50 cursor-pointer group hover:border-primary-light transition-colors"
                  variants={item}
                  whileHover={{ y: -4 }}
                  onClick={() => navigate('/medicines')}
                  transition={{ type: 'spring', stiffness: 300 }}
                >
                  {/* Member header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Avatar name={schedule.memberName} size="md" />
                      <div>
                        <h3 className="font-semibold text-gray-900 group-hover:text-primary transition-colors">
                          {schedule.memberName}
                        </h3>
                        <p className="text-xs text-gray-400">
                          {memberTaken}/{memberTotal} doses completed
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-sm font-bold ${
                        memberTaken === memberTotal && memberTotal > 0
                          ? 'text-green-600'
                          : memberTaken > 0
                          ? 'text-amber-500'
                          : 'text-gray-400'
                      }`}>
                        {memberTotal > 0 ? Math.round((memberTaken / memberTotal) * 100) : 0}%
                      </span>
                    </div>
                  </div>

                  {/* Medicine rows */}
                  <div className="space-y-3">
                    {Object.values(byMedicine).map((med) => (
                      <div key={med.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <Pill className="w-4 h-4 text-gray-400 shrink-0" />
                          <span className="text-sm text-gray-700 truncate">{med.name}</span>
                          <span className="text-xs text-gray-400">{med.dosage}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {med.timings.map((slot) => {
                            const TimingIcon =
                              slot.timingKey === 'morning' ? Sun :
                              slot.timingKey === 'afternoon' ? Cloud : Moon;
                            const statusColor =
                              slot.status === 'TAKEN' ? 'bg-green-100 text-green-600' :
                              slot.status === 'MISSED' ? 'bg-red-100 text-red-600' :
                              slot.status === 'SKIPPED' ? 'bg-gray-100 text-gray-400' :
                              'bg-amber-100 text-amber-600';
                            const StatusIcon =
                              slot.status === 'TAKEN' ? Check :
                              slot.status === 'MISSED' ? AlertTriangle : null;

                            return (
                              <motion.div
                                key={slot.timingKey}
                                className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusColor}`}
                                whileHover={{ scale: 1.1 }}
                                title={`${slot.timingKey} — ${slot.status}${slot.takenAt ? ` at ${new Date(slot.takenAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}` : ''}`}
                              >
                                <TimingIcon className="w-3 h-3" />
                                {StatusIcon && <StatusIcon className="w-3 h-3" />}
                              </motion.div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      )}

      {/* Family members section */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900">Your Family</h2>
          <motion.button
            onClick={() => navigate('/family')}
            className="flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-dark transition-colors"
            whileHover={{ x: 4 }}
          >
            <Plus className="w-4 h-4" />
            Add Member
          </motion.button>
        </div>

        {members.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No family members yet"
            description="Start by adding your family members to track their health and medicines."
            actionLabel="Add First Member"
            onAction={() => navigate('/family')}
          />
        ) : (
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            variants={container}
            initial="hidden"
            animate="show"
          >
            {members.map((member) => (
              <motion.div
                key={member.id}
                className="bg-white rounded-2xl p-5 shadow-sm border border-gray-50 cursor-pointer group"
                variants={item}
                whileHover={{ y: -6, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate(`/family`)}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                <div className="flex items-center gap-4">
                  <Avatar
                    name={member.name}
                    imageUrl={member.avatarUrl}
                    relationship={member.relationship}
                    size="lg"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate group-hover:text-primary transition-colors">
                      {member.name}
                    </h3>
                    <p className="text-sm text-gray-400">
                      {formatRelationship(member.relationship)}
                    </p>
                    {member.bloodGroup && (
                      <span className="inline-block mt-1.5 text-xs bg-red-50 text-red-500 px-2 py-0.5 rounded-full font-medium">
                        {member.bloodGroup}
                      </span>
                    )}
                  </div>
                </div>

                {/* Health summary placeholder */}
                <div className="mt-4 pt-4 border-t border-gray-50 flex items-center gap-4">
                  <div className="flex items-center gap-1.5 text-xs text-gray-400">
                    <Pill className="w-3.5 h-3.5" />
                    <span>No meds yet</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-400">
                    <Heart className="w-3.5 h-3.5" />
                    <span>No vitals</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;

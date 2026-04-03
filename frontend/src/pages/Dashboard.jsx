import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, Heart, Pill, Clock } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { familyApi } from '../api/family.api';
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
          { label: 'Family Members', value: members.length, icon: Users, color: 'bg-blue-500' },
          { label: 'Active Medicines', value: '—', icon: Pill, color: 'bg-green-500' },
          { label: 'Doses Today', value: '—', icon: Clock, color: 'bg-amber-500' },
          { label: 'Vitals Logged', value: '—', icon: Heart, color: 'bg-rose-500' },
        ].map((stat) => (
          <motion.div
            key={stat.label}
            className="bg-white rounded-2xl p-5 shadow-sm border border-gray-50"
            variants={item}
            whileHover={{ y: -4, shadow: 'lg' }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            <div className={`w-10 h-10 ${stat.color} rounded-xl flex items-center justify-center mb-3`}>
              <stat.icon className="w-5 h-5 text-white" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{stat.label}</p>
          </motion.div>
        ))}
      </motion.div>

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

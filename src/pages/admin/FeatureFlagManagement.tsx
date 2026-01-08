import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabaseAdmin } from '../../utils/supabase';
import { useFeatureFlags } from '../../hooks/useFeatureFlag';
import { useAdmin } from '../../hooks/useAdmin';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { FaFlag, FaPlus, FaEdit, FaTrash, FaHistory, FaToggleOn, FaToggleOff, FaUsers, FaPercentage, FaSearch } from 'react-icons/fa';
import Modal from '../../components/common/modals/Modal';

interface FeatureFlag {
  id: string;
  name: string;
  display_name: string;
  description: string;
  enabled_for: string[];
  enabled_user_ids: string[];
  rollout_percentage: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface Player {
  id: string;
  friendly_name: string;
}

const AVAILABLE_GROUPS = [
  { value: 'production', label: 'Production', color: 'badge-success' },
  { value: 'beta', label: 'Beta Testers', color: 'badge-warning' },
  { value: 'admin', label: 'Admins', color: 'badge-info' },
  { value: 'super_admin', label: 'Super Admins', color: 'badge-error' }
];

const FeatureFlagManagement: React.FC = () => {
  const navigate = useNavigate();
  const { isSuperAdmin, loading: adminLoading } = useAdmin();
  const { flags, loading: flagsLoading, refetch } = useFeatureFlags();
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredFlags, setFilteredFlags] = useState<FeatureFlag[]>([]);
  const [selectedFlag, setSelectedFlag] = useState<FeatureFlag | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isNewFlag, setIsNewFlag] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [auditHistory, setAuditHistory] = useState<any[]>([]);

  // Form state for editing/creating flags
  const [formData, setFormData] = useState({
    name: '',
    display_name: '',
    description: '',
    enabled_for: [] as string[],
    enabled_user_ids: [] as string[],
    rollout_percentage: 0,
    is_active: true
  });

  useEffect(() => {
    if (!adminLoading && !isSuperAdmin) {
      navigate('/admin');
      toast.error('Access denied. Super admin privileges required.');
    }
  }, [adminLoading, isSuperAdmin, navigate]);

  useEffect(() => {
    filterFlags();
  }, [flags, searchTerm]);

  useEffect(() => {
    fetchPlayers();
  }, []);

  const fetchPlayers = async () => {
    try {
      const { data, error } = await supabaseAdmin
        .from('players')
        .select('id, friendly_name')
        .order('friendly_name');

      if (error) throw error;
      setPlayers(data || []);
    } catch (error) {
      console.error('Error fetching players:', error);
      toast.error('Failed to fetch players');
    }
  };

  const filterFlags = () => {
    let filtered = [...flags];
    if (searchTerm) {
      filtered = filtered.filter(flag =>
        flag.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        flag.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        flag.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    setFilteredFlags(filtered);
  };

  const handleCreate = () => {
    setIsNewFlag(true);
    setFormData({
      name: '',
      display_name: '',
      description: '',
      enabled_for: [],
      enabled_user_ids: [],
      rollout_percentage: 0,
      is_active: true
    });
    setIsModalOpen(true);
  };

  const handleEdit = (flag: FeatureFlag) => {
    setIsNewFlag(false);
    setSelectedFlag(flag);
    setFormData({
      name: flag.name,
      display_name: flag.display_name,
      description: flag.description || '',
      enabled_for: flag.enabled_for || [],
      enabled_user_ids: flag.enabled_user_ids || [],
      rollout_percentage: flag.rollout_percentage || 0,
      is_active: flag.is_active
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    try {
      if (!formData.name || !formData.display_name) {
        toast.error('Name and Display Name are required');
        return;
      }

      const flagData = {
        ...formData,
        name: formData.name.toLowerCase().replace(/\s+/g, '_')
      };

      if (isNewFlag) {
        const { error } = await supabaseAdmin
          .from('feature_flags')
          .insert([flagData]);

        if (error) throw error;
        toast.success('Feature flag created successfully');
      } else {
        const { error } = await supabaseAdmin
          .from('feature_flags')
          .update(flagData)
          .eq('id', selectedFlag?.id);

        if (error) throw error;
        toast.success('Feature flag updated successfully');
      }

      setIsModalOpen(false);
      refetch();
    } catch (error: any) {
      console.error('Error saving feature flag:', error);
      toast.error(error.message || 'Failed to save feature flag');
    }
  };

  const handleDelete = async () => {
    if (!selectedFlag) return;

    try {
      const { error } = await supabaseAdmin
        .from('feature_flags')
        .delete()
        .eq('id', selectedFlag.id);

      if (error) throw error;
      toast.success('Feature flag deleted successfully');
      setIsDeleteModalOpen(false);
      refetch();
    } catch (error: any) {
      console.error('Error deleting feature flag:', error);
      toast.error('Failed to delete feature flag');
    }
  };

  const handleToggleActive = async (flag: FeatureFlag) => {
    try {
      const { error } = await supabaseAdmin
        .from('feature_flags')
        .update({ is_active: !flag.is_active })
        .eq('id', flag.id);

      if (error) throw error;
      toast.success(`Feature flag ${!flag.is_active ? 'activated' : 'deactivated'}`);
      refetch();
    } catch (error: any) {
      console.error('Error toggling feature flag:', error);
      toast.error('Failed to toggle feature flag');
    }
  };

  const handleViewHistory = async (flag: FeatureFlag) => {
    setSelectedFlag(flag);
    try {
      const { data, error } = await supabaseAdmin
        .from('feature_flag_audit')
        .select('*')
        .eq('flag_id', flag.id)
        .order('changed_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setAuditHistory(data || []);
      setIsHistoryModalOpen(true);
    } catch (error: any) {
      console.error('Error fetching audit history:', error);
      toast.error('Failed to fetch audit history');
    }
  };

  const handleToggleGroup = (group: string) => {
    setFormData(prev => ({
      ...prev,
      enabled_for: prev.enabled_for.includes(group)
        ? prev.enabled_for.filter(g => g !== group)
        : [...prev.enabled_for, group]
    }));
  };

  const handleToggleUser = (userId: string) => {
    setFormData(prev => ({
      ...prev,
      enabled_user_ids: prev.enabled_user_ids.includes(userId)
        ? prev.enabled_user_ids.filter(id => id !== userId)
        : [...prev.enabled_user_ids, userId]
    }));
  };

  const filteredPlayers = players.filter(player =>
    player.friendly_name.toLowerCase().includes(userSearchTerm.toLowerCase())
  );

  if (adminLoading || flagsLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Feature Flag Management</h1>
        <p className="text-base-content/70">Control feature rollouts and experiments</p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1">
          <fieldset className="fieldset">
            <div className="input-group">
              <span>
                <FaSearch />
              </span>
              <input
                type="text"
                placeholder="Search feature flags..."
                className="input flex-1"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </fieldset>
        </div>
        <button
          className="btn btn-primary gap-2"
          onClick={handleCreate}
        >
          <FaPlus />
          Create Feature Flag
        </button>
      </div>

      <div className="grid gap-4">
        <AnimatePresence>
          {filteredFlags.map((flag) => (
            <motion.div
              key={flag.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="card bg-base-100 shadow-xl"
            >
              <div className="card-body">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold">{flag.display_name}</h3>
                      <code className="text-sm bg-base-300 px-2 py-1 rounded">{flag.name}</code>
                      {flag.is_active ? (
                        <span className="badge badge-success">Active</span>
                      ) : (
                        <span className="badge badge-ghost">Inactive</span>
                      )}
                    </div>
                    {flag.description && (
                      <p className="text-base-content/70 mb-3">{flag.description}</p>
                    )}
                    <div className="flex flex-wrap gap-2 mb-3">
                      {flag.enabled_for?.map((group) => {
                        const groupConfig = AVAILABLE_GROUPS.find(g => g.value === group);
                        return (
                          <span key={group} className={`badge ${groupConfig?.color || 'badge-ghost'}`}>
                            {groupConfig?.label || group}
                          </span>
                        );
                      })}
                      {flag.rollout_percentage > 0 && flag.rollout_percentage < 100 && (
                        <span className="badge badge-info gap-1">
                          <FaPercentage className="text-xs" />
                          {flag.rollout_percentage}% Rollout
                        </span>
                      )}
                      {flag.enabled_user_ids?.length > 0 && (
                        <span className="badge badge-secondary gap-1">
                          <FaUsers className="text-xs" />
                          {flag.enabled_user_ids.length} Targeted Users
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-base-content/50">
                      Updated: {new Date(flag.updated_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className={`btn btn-sm ${flag.is_active ? 'btn-warning' : 'btn-success'}`}
                      onClick={() => handleToggleActive(flag)}
                      title={flag.is_active ? 'Deactivate' : 'Activate'}
                    >
                      {flag.is_active ? <FaToggleOff /> : <FaToggleOn />}
                    </button>
                    <button
                      className="btn btn-sm btn-info"
                      onClick={() => handleViewHistory(flag)}
                      title="View History"
                    >
                      <FaHistory />
                    </button>
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => handleEdit(flag)}
                      title="Edit"
                    >
                      <FaEdit />
                    </button>
                    <button
                      className="btn btn-sm btn-error"
                      onClick={() => {
                        setSelectedFlag(flag);
                        setIsDeleteModalOpen(true);
                      }}
                      title="Delete"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredFlags.length === 0 && (
          <div className="text-center py-12">
            <FaFlag className="text-4xl text-base-content/30 mx-auto mb-4" />
            <p className="text-base-content/70">
              {searchTerm ? 'No feature flags found matching your search.' : 'No feature flags created yet.'}
            </p>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={isNewFlag ? 'Create Feature Flag' : 'Edit Feature Flag'}
        size="lg"
      >
        <div className="space-y-4">
          <fieldset className="fieldset">
            <legend className="fieldset-legend">Internal Name</legend>
            <input
              type="text"
              placeholder="e.g., playstyle_ratings"
              className="input"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              disabled={!isNewFlag}
            />
            <p className="fieldset-label">Lowercase, underscores only</p>
          </fieldset>

          <fieldset className="fieldset">
            <legend className="fieldset-legend">Display Name</legend>
            <input
              type="text"
              placeholder="e.g., Playstyle Rating System"
              className="input"
              value={formData.display_name}
              onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
            />
          </fieldset>

          <fieldset className="fieldset">
            <legend className="fieldset-legend">Description</legend>
            <textarea
              placeholder="Describe what this feature does..."
              className="textarea textarea-bordered"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </fieldset>

          <fieldset className="fieldset">
            <legend className="fieldset-legend">Enable For Groups</legend>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_GROUPS.map((group) => (
                <button
                  key={group.value}
                  className={`btn btn-sm ${
                    formData.enabled_for.includes(group.value)
                      ? 'btn-primary'
                      : 'btn-outline'
                  }`}
                  onClick={() => handleToggleGroup(group.value)}
                >
                  {group.label}
                </button>
              ))}
            </div>
          </fieldset>

          {formData.enabled_for.includes('production') && (
            <fieldset className="fieldset">
              <legend className="fieldset-legend">Rollout Percentage</legend>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                className="range range-primary"
                value={formData.rollout_percentage}
                onChange={(e) => setFormData({ ...formData, rollout_percentage: parseInt(e.target.value) })}
              />
              <div className="w-full flex justify-between text-xs px-2">
                <span>0%</span>
                <span>25%</span>
                <span>50%</span>
                <span>75%</span>
                <span>100%</span>
              </div>
              <p className="fieldset-label">{formData.rollout_percentage}%</p>
            </fieldset>
          )}

          <fieldset className="fieldset">
            <legend className="fieldset-legend">Target Specific Users</legend>
            <input
              type="text"
              placeholder="Search users..."
              className="input input-sm mb-2"
              value={userSearchTerm}
              onChange={(e) => setUserSearchTerm(e.target.value)}
            />
            <div className="max-h-48 overflow-y-auto border border-base-300 rounded-lg p-2">
              {filteredPlayers.map((player) => (
                <label key={player.id} className="flex items-center justify-between cursor-pointer py-1">
                  <span>{player.friendly_name}</span>
                  <input
                    type="checkbox"
                    className="checkbox checkbox-sm"
                    checked={formData.enabled_user_ids.includes(player.id)}
                    onChange={() => handleToggleUser(player.id)}
                  />
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="fieldset">
            <label className="flex items-center justify-between cursor-pointer">
              <legend className="fieldset-legend">Active</legend>
              <input
                type="checkbox"
                className="toggle toggle-primary"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              />
            </label>
          </fieldset>

          <div className="flex justify-end gap-2">
            <button className="btn" onClick={() => setIsModalOpen(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleSave}>
              {isNewFlag ? 'Create' : 'Save'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Feature Flag"
      >
        <p className="mb-4">
          Are you sure you want to delete the feature flag "{selectedFlag?.display_name}"?
          This action cannot be undone.
        </p>
        <div className="flex justify-end gap-2">
          <button className="btn" onClick={() => setIsDeleteModalOpen(false)}>
            Cancel
          </button>
          <button className="btn btn-error" onClick={handleDelete}>
            Delete
          </button>
        </div>
      </Modal>

      {/* History Modal */}
      <Modal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        title={`History: ${selectedFlag?.display_name}`}
        size="lg"
      >
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {auditHistory.map((entry) => (
            <div key={entry.id} className="card bg-base-200">
              <div className="card-body p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <span className={`badge ${
                      entry.action === 'CREATE' ? 'badge-success' :
                      entry.action === 'UPDATE' ? 'badge-info' :
                      'badge-error'
                    } mr-2`}>
                      {entry.action}
                    </span>
                    <span className="text-sm">
                      {new Date(entry.changed_at).toLocaleString()}
                    </span>
                  </div>
                </div>
                {entry.action === 'UPDATE' && entry.previous_state && entry.new_state && (
                  <div className="text-sm mt-2">
                    <details>
                      <summary className="cursor-pointer">View Changes</summary>
                      <pre className="bg-base-300 p-2 rounded mt-2 text-xs overflow-x-auto">
                        {JSON.stringify(
                          {
                            before: entry.previous_state,
                            after: entry.new_state
                          },
                          null,
                          2
                        )}
                      </pre>
                    </details>
                  </div>
                )}
              </div>
            </div>
          ))}
          {auditHistory.length === 0 && (
            <p className="text-center text-base-content/70 py-4">
              No history available
            </p>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default FeatureFlagManagement;
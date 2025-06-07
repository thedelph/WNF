import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { supabaseAdmin } from '../../../utils/supabase';

// Interface for the modal props
interface MergeTestUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMergeCompleted: () => void;
  testUser: {
    id: string;
    friendly_name: string;
  };
}

// Interface for real users that can be merged with
interface RealUser {
  id: string;
  friendly_name: string;
}

export default function MergeTestUserModal({
  isOpen,
  onClose,
  onMergeCompleted,
  testUser,
}: MergeTestUserModalProps) {
  // State for real users and selected user
  const [realUsers, setRealUsers] = useState<RealUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // Fetch real users (non-test users) when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchRealUsers();
    }
  }, [isOpen]);

  // Function to fetch real users from the database
  const fetchRealUsers = async () => {
    const { data, error } = await supabaseAdmin
      .from('players')
      .select('id, friendly_name')
      .eq('is_test_user', false);

    if (error) {
      console.error('Error fetching real users:', error);
      toast.error('Failed to fetch real users');
    } else {
      setRealUsers(data || []);
    }
  };

  // Function to handle the merge process
  const handleMerge = async () => {
    if (!selectedUserId) {
      toast.error('Please select a user to merge with');
      return;
    }

    setLoading(true);

    try {
      // Handle the merge using the database function
      const { data: mergeResult, error: mergeError } = await supabaseAdmin
        .rpc('merge_players', {
          source_player_id: testUser.id,
          target_player_id: selectedUserId
        });

      if (mergeError) throw mergeError;

      if (!mergeResult) {
        throw new Error('Merge operation failed');
      }

      // Update token status for the target user
      const { error: debugTargetUserError } = await supabaseAdmin
        .rpc('debug_player_token_status', {
          p_player_id: selectedUserId
        });

      if (debugTargetUserError) throw debugTargetUserError;

      toast.success('Successfully merged users');
      onMergeCompleted();
      onClose();
    } catch (error) {
      console.error('Error merging users:', error);
      toast.error(`Failed to merge users: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-base-200 p-6 rounded-lg shadow-xl max-w-md w-full"
      >
        <h2 className="text-2xl font-bold mb-4">Merge Test User</h2>
        <p className="mb-4">
          Merging test user <span className="font-bold">{testUser.friendly_name}</span> with a real user.
          This will copy all stats from the test user to the selected real user and delete the test user.
        </p>

        <select
          className="select select-bordered w-full mb-4"
          value={selectedUserId}
          onChange={(e) => setSelectedUserId(e.target.value)}
        >
          <option value="">Select a real user</option>
          {realUsers.map((user) => (
            <option key={user.id} value={user.id}>
              {user.friendly_name}
            </option>
          ))}
        </select>

        <div className="flex justify-end space-x-4">
          <button
            className="btn btn-ghost"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            className={`btn btn-primary ${loading ? 'loading' : ''}`}
            onClick={handleMerge}
            disabled={!selectedUserId || loading}
          >
            {loading ? 'Merging...' : 'Merge Users'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

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
      // First, fetch the test user's stats
      const { data: testUserData, error: testUserError } = await supabaseAdmin
        .from('players')
        .select('caps, win_rate, active_bonuses, active_penalties, attack_rating, defense_rating, current_streak, max_streak, whatsapp_group_member, whatsapp_mobile_number')
        .eq('id', testUser.id)
        .single();

      if (testUserError) throw testUserError;

      // Start a batch of operations

      // 1. Update player_ratings to point to the new user (as rated player)
      const { error: ratingsError } = await supabaseAdmin
        .from('player_ratings')
        .update({ rated_player_id: selectedUserId })
        .eq('rated_player_id', testUser.id);

      if (ratingsError) throw ratingsError;

      // 2. Update player_ratings given by the test user
      const { error: raterError } = await supabaseAdmin
        .from('player_ratings')
        .update({ rater_id: selectedUserId })
        .eq('rater_id', testUser.id);

      if (raterError) throw raterError;

      // 3. Update notifications related to the test user
      const { error: notificationsError } = await supabaseAdmin
        .from('notifications')
        .update({ player_id: selectedUserId })
        .eq('player_id', testUser.id);

      if (notificationsError) throw notificationsError;

      // 4. Update game_registrations
      const { error: gameRegError } = await supabaseAdmin
        .from('game_registrations')
        .update({ player_id: selectedUserId })
        .eq('player_id', testUser.id);

      if (gameRegError) throw gameRegError;

      // 5. Update game_selections - fetch all selections that include the test user
      const { data: selections, error: selectionsError } = await supabaseAdmin
        .from('game_selections')
        .select('*');

      if (selectionsError) throw selectionsError;

      // Update each selection that contains the test user
      for (const selection of selections) {
        const selectedPlayers = selection.selected_players || [];
        const reservePlayers = selection.reserve_players || [];

        // Check and update selected_players
        const updatedSelectedPlayers = selectedPlayers.map((playerId: string) =>
          playerId === testUser.id ? selectedUserId : playerId
        );

        // Check and update reserve_players
        const updatedReservePlayers = reservePlayers.map((playerId: string) =>
          playerId === testUser.id ? selectedUserId : playerId
        );

        // Only update if changes were made
        if (
          JSON.stringify(selectedPlayers) !== JSON.stringify(updatedSelectedPlayers) ||
          JSON.stringify(reservePlayers) !== JSON.stringify(updatedReservePlayers)
        ) {
          const { error: updateSelectionError } = await supabaseAdmin
            .from('game_selections')
            .update({
              selected_players: updatedSelectedPlayers,
              reserve_players: updatedReservePlayers,
            })
            .eq('id', selection.id);

          if (updateSelectionError) throw updateSelectionError;
        }
      }

      // 6. Update player_penalties
      const { error: penaltiesError } = await supabaseAdmin
        .from('player_penalties')
        .update({ player_id: selectedUserId })
        .eq('player_id', testUser.id);

      if (penaltiesError) throw penaltiesError;

      // Update player_xp records
      const { error: xpError } = await supabaseAdmin
        .from('player_xp')
        .update({ player_id: selectedUserId })
        .eq('player_id', testUser.id);

      if (xpError) throw xpError;

      // 7. Update balanced_team_assignments
      const { data: teamAssignments, error: teamAssignmentsError } = await supabaseAdmin
        .from('balanced_team_assignments')
        .select('*');

      if (teamAssignmentsError) throw teamAssignmentsError;

      // Update each team assignment that contains the test user
      for (const assignment of teamAssignments) {
        const teamAssigns = assignment.team_assignments || {};
        let needsUpdate = false;
        const updatedTeamAssigns = { ...teamAssigns };

        // Check each team in the assignments
        for (const teamKey in updatedTeamAssigns) {
          if (Array.isArray(updatedTeamAssigns[teamKey])) {
            updatedTeamAssigns[teamKey] = updatedTeamAssigns[teamKey].map((playerId: string) => {
              if (playerId === testUser.id) {
                needsUpdate = true;
                return selectedUserId;
              }
              return playerId;
            });
          }
        }

        // Only update if changes were made
        if (needsUpdate) {
          const { error: updateAssignmentError } = await supabaseAdmin
            .from('balanced_team_assignments')
            .update({ team_assignments: updatedTeamAssigns })
            .eq('game_id', assignment.game_id);

          if (updateAssignmentError) throw updateAssignmentError;
        }
      }

      // 8. Update the real user with the test user's stats
      const { error: updateError } = await supabaseAdmin
        .from('players')
        .update({
          caps: testUserData.caps,
          win_rate: testUserData.win_rate,
          active_bonuses: testUserData.active_bonuses,
          active_penalties: testUserData.active_penalties,
          attack_rating: testUserData.attack_rating,
          defense_rating: testUserData.defense_rating,
          current_streak: testUserData.current_streak,
          max_streak: testUserData.max_streak,
          whatsapp_group_member: testUserData.whatsapp_group_member,
          whatsapp_mobile_number: testUserData.whatsapp_mobile_number,
        })
        .eq('id', selectedUserId);

      if (updateError) throw updateError;

      // 9. Finally, delete the test user
      const { error: deleteError } = await supabaseAdmin
        .from('players')
        .delete()
        .eq('id', testUser.id);

      if (deleteError) throw deleteError;

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

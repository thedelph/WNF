import React, { useState, useEffect } from 'react';
import { supabaseAdmin } from '../../../utils/supabase';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { FaFlask, FaSearch, FaCheck, FaTimes } from 'react-icons/fa';
import { Tooltip } from '../../ui/Tooltip';

interface Player {
  id: string;
  friendly_name: string;
  is_beta_tester: boolean;
  caps: number;
}

const BetaTesterManagement: React.FC = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [filteredPlayers, setFilteredPlayers] = useState<Player[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showBetaOnly, setShowBetaOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchPlayers();
  }, []);

  useEffect(() => {
    filterPlayers();
  }, [players, searchTerm, showBetaOnly]);

  const fetchPlayers = async () => {
    try {
      const { data, error } = await supabaseAdmin
        .from('players')
        .select('id, friendly_name, is_beta_tester, caps')
        .order('friendly_name');

      if (error) throw error;

      setPlayers(data || []);
    } catch (error: any) {
      console.error('Error fetching players:', error);
      toast.error('Failed to fetch players');
    } finally {
      setIsLoading(false);
    }
  };

  const filterPlayers = () => {
    let filtered = [...players];

    if (searchTerm) {
      filtered = filtered.filter(player =>
        player.friendly_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (showBetaOnly) {
      filtered = filtered.filter(player => player.is_beta_tester);
    }

    setFilteredPlayers(filtered);
  };

  const handleToggleBetaTester = async (playerId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabaseAdmin
        .from('players')
        .update({ is_beta_tester: !currentStatus })
        .eq('id', playerId);

      if (error) throw error;

      setPlayers(prev =>
        prev.map(player =>
          player.id === playerId
            ? { ...player, is_beta_tester: !currentStatus }
            : player
        )
      );

      const player = players.find(p => p.id === playerId);
      if (player) {
        toast.success(
          `${player.friendly_name} ${!currentStatus ? 'added to' : 'removed from'} beta testers`
        );
      }
    } catch (error: any) {
      console.error('Error updating beta tester status:', error);
      toast.error('Failed to update beta tester status');
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedPlayers(new Set(filteredPlayers.map(p => p.id)));
    } else {
      setSelectedPlayers(new Set());
    }
  };

  const handleSelectPlayer = (playerId: string) => {
    const newSelected = new Set(selectedPlayers);
    if (newSelected.has(playerId)) {
      newSelected.delete(playerId);
    } else {
      newSelected.add(playerId);
    }
    setSelectedPlayers(newSelected);
  };

  const handleBulkUpdate = async (makeBeta: boolean) => {
    if (selectedPlayers.size === 0) {
      toast.error('No players selected');
      return;
    }

    const confirmMsg = makeBeta
      ? `Add ${selectedPlayers.size} player(s) as beta testers?`
      : `Remove ${selectedPlayers.size} player(s) from beta testers?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      const { error } = await supabaseAdmin
        .from('players')
        .update({ is_beta_tester: makeBeta })
        .in('id', Array.from(selectedPlayers));

      if (error) throw error;

      await fetchPlayers();
      setSelectedPlayers(new Set());
      toast.success(
        `Successfully ${makeBeta ? 'added' : 'removed'} ${selectedPlayers.size} beta tester(s)`
      );
    } catch (error: any) {
      console.error('Error updating beta testers:', error);
      toast.error('Failed to update beta testers');
    }
  };

  const betaCount = players.filter(p => p.is_beta_tester).length;
  const allSelected = filteredPlayers.length > 0 && 
                      filteredPlayers.every(p => selectedPlayers.has(p.id));

  return (
    <div className="bg-base-200 p-6 rounded-lg shadow-md">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <FaFlask className="text-warning" />
          Beta Tester Management
        </h2>
        <Tooltip content={`${betaCount} active beta testers out of ${players.length} total players`}>
          <span className="badge badge-warning badge-lg">
            {betaCount} Beta Testers
          </span>
        </Tooltip>
      </div>

      <p className="text-sm text-gray-500 mb-4">
        Manage which players have access to beta features. Beta testers can see and use new features before they're released to everyone.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <fieldset className="fieldset">
          <div className="input-group">
            <span className="bg-base-300">
              <FaSearch />
            </span>
            <input
              type="text"
              placeholder="Search players..."
              className="input flex-1"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </fieldset>

        <div className="flex gap-2">
          <button
            className={`btn ${showBetaOnly ? 'btn-warning' : 'btn-ghost'} flex-1`}
            onClick={() => setShowBetaOnly(!showBetaOnly)}
          >
            {showBetaOnly ? 'Show All' : 'Beta Only'}
          </button>
          <Tooltip content="Select all visible players">
            <button
              className="btn btn-ghost btn-square"
              onClick={() => handleSelectAll(!allSelected)}
            >
              {allSelected ? <FaTimes /> : <FaCheck />}
            </button>
          </Tooltip>
        </div>
      </div>

      {selectedPlayers.size > 0 && (
        <div className="alert alert-info mb-4">
          <div className="flex justify-between items-center w-full">
            <span>{selectedPlayers.size} player(s) selected</span>
            <div className="flex gap-2">
              <button
                className="btn btn-sm btn-success"
                onClick={() => handleBulkUpdate(true)}
              >
                Add to Beta
              </button>
              <button
                className="btn btn-sm btn-error"
                onClick={() => handleBulkUpdate(false)}
              >
                Remove from Beta
              </button>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="loading loading-spinner loading-lg"></div>
        </div>
      ) : (
        <div className="max-h-96 overflow-y-auto border border-base-300 rounded-lg">
          <AnimatePresence>
            {filteredPlayers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No players found
              </div>
            ) : (
              filteredPlayers.map((player) => (
                <motion.div
                  key={player.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className={`flex items-center justify-between p-3 border-b border-base-300 hover:bg-base-100 ${
                    selectedPlayers.has(player.id) ? 'bg-base-100' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-primary checkbox-sm"
                      checked={selectedPlayers.has(player.id)}
                      onChange={() => handleSelectPlayer(player.id)}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{player.friendly_name}</span>
                        {player.is_beta_tester && (
                          <span className="badge badge-warning badge-sm">Beta</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        {player.caps} caps
                      </div>
                    </div>
                  </div>
                  <fieldset className="fieldset">
                    <label className="cursor-pointer">
                      <input
                        type="checkbox"
                        className="toggle toggle-warning"
                        checked={player.is_beta_tester}
                        onChange={() => handleToggleBetaTester(player.id, player.is_beta_tester)}
                      />
                    </label>
                  </fieldset>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      )}

      <div className="mt-4 text-sm text-gray-500">
        <strong>Tip:</strong> Use the search to find specific players, or use bulk selection to update multiple players at once.
      </div>
    </div>
  );
};

export default BetaTesterManagement;
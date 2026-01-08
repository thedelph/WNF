import React, { useState, useRef, useEffect } from 'react';
import { useAdmin } from '../../hooks/useAdmin';
import { supabase } from '../../utils/supabase';
import toast from 'react-hot-toast';
import FormContainer from '../../components/common/containers/FormContainer';
import { EditGameModal } from '../../components/admin/games/EditGameModal';
import { CreateGameForm } from '../../components/admin/games/CreateGameForm';
import { GameRegistrations } from '../../components/admin/games/GameRegistrations';
import { Game, Venue } from '../../types/game';
import { PresetSelector } from '../../components/admin/games/presets/PresetSelector';
import { GameList } from '../../components/admin/games/list/GameList';
import { VenueForm } from '../../components/admin/games/venues/VenueForm';
import { VenueEditModal } from '../../components/admin/games/venues/VenueEditModal';
import { deleteGame } from '../../utils/gameUtils';

/**
 * GameManagement component handles the administration of games, venues, and registrations.
 * It has been modularized into smaller components for better maintainability.
 */
const GameManagement: React.FC = () => {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [isEditingGame, setIsEditingGame] = useState(false);
  const [showRegistrations, setShowRegistrations] = useState(false);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [isAddingVenue, setIsAddingVenue] = useState(false);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [presetValues, setPresetValues] = useState({
    date: '',
    time: '',
    venueId: '',
    pitchCost: 0,
    registrationStart: '',
    registrationEnd: '',
    teamAnnouncementTime: ''
  });

  // Reference to GameList component
  const gameListRef = useRef<{ fetchGames: () => void } | null>(null);

  // Fetch venues
  const fetchVenues = async () => {
    try {
      const { data: venuesData, error } = await supabase
        .from('venues')
        .select('*')
        .order('name');

      if (error) {
        throw error;
      }

      setVenues(venuesData);
    } catch (error) {
      console.error('Error fetching venues:', error);
      toast.error('Failed to load venues');
    }
  };

  // Fetch venues on component mount
  React.useEffect(() => {
    fetchVenues();
  }, []);

  // Handle preset selection
  const handlePresetSelect = (
    date: string,
    time: string,
    venueId: string,
    pitchCost: number,
    registrationStart: string,
    registrationEnd: string,
    teamAnnouncementTime: string
  ) => {
    setPresetValues({
      date,
      time,
      venueId,
      pitchCost,
      registrationStart,
      registrationEnd,
      teamAnnouncementTime
    });
  };

  // Fetch venues when opening edit modal
  const handleEditGame = async (game: Game) => {
    try {
      const { data: venuesData, error } = await supabase
        .from('venues')
        .select('*')
        .order('name');

      if (error) {
        throw error;
      }

      setVenues(venuesData);
      setSelectedGame(game);
      setIsEditingGame(true);
    } catch (error) {
      console.error('Error fetching venues:', error);
      toast.error('Failed to load venues');
    }
  };

  // Handle game deletion
  const handleGameDelete = async (gameId: string) => {
    const confirmed = window.confirm('Are you sure you want to delete this game?');
    if (!confirmed) return;

    const { error } = await deleteGame(gameId);

    if (error) {
      console.error('Error deleting game:', error);
      toast.error('Failed to delete game');
      return;
    }

    toast.success('Game deleted successfully');
    gameListRef.current?.fetchGames();
  };

  // Handle game update
  const handleGameUpdate = async (updatedGame: Partial<Game>) => {
    try {
      const { error } = await supabase
        .from('games')
        .update(updatedGame)
        .eq('id', selectedGame?.id);

      if (error) throw error;

      toast.success('Game updated successfully');
      gameListRef.current?.fetchGames();
      setIsEditingGame(false);
      setSelectedGame(null);
    } catch (error) {
      console.error('Error updating game:', error);
      toast.error('Failed to update game');
    }
  };

  // Handle showing registrations
  const handleShowRegistrations = (gameId: string) => {
    setSelectedGameId(gameId);
    setShowRegistrations(true);
  };

  // Handle venue deletion
  const handleVenueDelete = async (venueId: string) => {
    const confirmed = window.confirm('Are you sure you want to delete this venue?');
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('venues')
        .delete()
        .eq('id', venueId);

      if (error) throw error;

      toast.success('Venue deleted successfully');
      fetchVenues();
    } catch (error) {
      console.error('Error deleting venue:', error);
      toast.error('Failed to delete venue');
    }
  };

  if (adminLoading) {
    return <div className="loading loading-spinner loading-lg"></div>;
  }

  if (!isAdmin) {
    return <div>Access denied. Admin privileges required.</div>;
  }

  return (
    <FormContainer>
      <div className="space-y-8">
        <h1 className="text-2xl font-bold mb-4">Game Management</h1>

        {/* Game List */}
        <div className="card bg-base-200 p-4">
          <h2 className="text-xl font-semibold mb-4">Upcoming Games</h2>
          <GameList
            ref={gameListRef}
            onGameSelect={handleEditGame}
            onGameDelete={handleGameDelete}
            onShowRegistrations={handleShowRegistrations}
          />
        </div>

        {/* Preset Selector */}
        <PresetSelector onPresetSelect={handlePresetSelect} />

        {/* Create Game Form */}
        <CreateGameForm 
          {...presetValues} 
          onGameCreated={() => gameListRef.current?.fetchGames()}
        />

        {/* Venue Management */}
        <div className="card bg-base-200 p-4">
          <h2 className="text-xl font-semibold mb-4">Venue Management</h2>
          <button
            className="btn btn-primary mb-4"
            onClick={() => setIsAddingVenue(true)}
          >
            Add New Venue
          </button>
          {isAddingVenue && (
            <VenueForm
              onVenueAdded={() => {
                setIsAddingVenue(false);
                fetchVenues();
              }}
              onCancel={() => setIsAddingVenue(false)}
            />
          )}
          
          {/* Existing Venues List */}
          <div className="space-y-4">
            {venues.map((venue) => (
              <div key={venue.id} className="flex items-center justify-between p-4 bg-base-100 rounded-lg">
                <div>
                  <h3 className="font-semibold">{venue.name}</h3>
                  <p className="text-sm opacity-70">{venue.address}</p>
                  {venue.google_maps_url && (
                    <a href={venue.google_maps_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                      View on Google Maps
                    </a>
                  )}
                  {venue.is_default && (
                    <span className="ml-2 badge badge-primary">Default</span>
                  )}
                </div>
                <div className="flex space-x-2">
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => setSelectedVenue(venue)}
                  >
                    Edit
                  </button>
                  <button
                    className="btn btn-error btn-sm"
                    onClick={() => handleVenueDelete(venue.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Edit Game Modal */}
        {isEditingGame && selectedGame && (
          <EditGameModal
            game={selectedGame}
            venues={venues}
            onClose={() => {
              setIsEditingGame(false);
              setSelectedGame(null);
            }}
            onSubmit={handleGameUpdate}
          />
        )}

        {/* Edit Venue Modal */}
        {selectedVenue && (
          <VenueEditModal
            venue={selectedVenue}
            onClose={() => setSelectedVenue(null)}
            onVenueUpdated={() => {
              fetchVenues();
              setSelectedVenue(null);
            }}
          />
        )}

        {/* Game Registrations Modal */}
        {showRegistrations && (
          <GameRegistrations
            gameId={selectedGameId!}
            onClose={() => setShowRegistrations(false)}
          />
        )}
      </div>
    </FormContainer>
  );
};

export default GameManagement;

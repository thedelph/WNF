import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Venue, GAME_STATUSES, GameStatus, Player } from '../../../types/game';
import FormContainer from '../../common/containers/FormContainer';
import toast from 'react-hot-toast';
import { supabase } from '../../../utils/supabase';
import BasicGameDetails from './form-components/BasicGameDetails';
import GameTimingDetails from './form-components/GameTimingDetails';
import PlayerSelectionDetails from './form-components/PlayerSelectionDetails';
import TeamAnnouncementDetails from './form-components/TeamAnnouncementDetails';
import GameDetailsPaste from './form-components/GameDetailsPaste';

interface CreateGameFormProps {
  date?: string;
  time?: string;
  venueId?: string;
  pitchCost?: number;
  registrationStart?: string;
  registrationEnd?: string;
  teamAnnouncementTime?: string;
  onGameCreated?: () => void;
}

/**
 * Form component for creating new games with different phases
 * Supports three phases: Upcoming Game, Player Selection, and Team Announcement
 */
export const CreateGameForm: React.FC<CreateGameFormProps> = ({
  date: presetDate,
  time: presetTime,
  venueId: presetVenueId,
  pitchCost: presetPitchCost,
  registrationStart: presetRegistrationStart,
  registrationEnd: presetRegistrationEnd,
  teamAnnouncementTime: presetTeamAnnouncementTime,
  onGameCreated,
}) => {
  // Basic state
  const [venues, setVenues] = useState<Venue[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [date, setDate] = useState(presetDate || '');
  const [time, setTime] = useState(presetTime || '21:00');
  const [registrationStart, setRegistrationStart] = useState(presetRegistrationStart || '');
  const [registrationEnd, setRegistrationEnd] = useState(presetRegistrationEnd || '');
  const [teamAnnouncementTime, setTeamAnnouncementTime] = useState(presetTeamAnnouncementTime || '');
  const [venueId, setVenueId] = useState(presetVenueId || '');
  const [maxPlayers, setMaxPlayers] = useState<number>(18);
  const [randomSlots, setRandomSlots] = useState(2);
  const [pitchCost, setPitchCost] = useState(presetPitchCost || 50);
  const [gamePhase, setGamePhase] = useState<GameStatus>(GAME_STATUSES.UPCOMING);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Phase-specific state
  const [confirmedPlayers, setConfirmedPlayers] = useState<string[]>([]);
  const [reservePlayers, setReservePlayers] = useState<string[]>([]);
  const [randomPickPlayers, setRandomPickPlayers] = useState<string[]>([]);
  const [droppedOutPlayers, setDroppedOutPlayers] = useState<string[]>([]);
  const [teamAPlayers, setTeamAPlayers] = useState<string[]>([]);
  const [teamBPlayers, setTeamBPlayers] = useState<string[]>([]);
  const [teamAAttackRating, setTeamAAttackRating] = useState(0);
  const [teamADefenseRating, setTeamADefenseRating] = useState(0);
  const [teamBAttackRating, setTeamBAttackRating] = useState(0);
  const [teamBDefenseRating, setTeamBDefenseRating] = useState(0);

  useEffect(() => {
    fetchVenues();
    fetchPlayers();
  }, []);

  // Update form when preset values change
  useEffect(() => {
    if (presetDate) setDate(presetDate);
    if (presetTime) setTime(presetTime);
    if (presetVenueId) setVenueId(presetVenueId);
    if (presetPitchCost) setPitchCost(presetPitchCost);
    if (presetRegistrationStart) setRegistrationStart(presetRegistrationStart);
    if (presetRegistrationEnd) setRegistrationEnd(presetRegistrationEnd);
    if (presetTeamAnnouncementTime) setTeamAnnouncementTime(presetTeamAnnouncementTime);
  }, [presetDate, presetTime, presetVenueId, presetPitchCost, presetRegistrationStart, presetRegistrationEnd, presetTeamAnnouncementTime]);

  const fetchVenues = async () => {
    const { data, error } = await supabase
      .from('venues')
      .select('*')
      .order('name');

    if (error) {
      toast.error('Failed to fetch venues');
      return;
    }

    setVenues(data || []);
    if (data?.length > 0) {
      const defaultVenue = data.find(v => v.is_default) || data[0];
      setVenueId(defaultVenue.id);
    }
  };

  const fetchPlayers = async () => {
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .order('friendly_name');

    if (error) {
      toast.error('Failed to fetch players');
      return;
    }

    setPlayers(data || []);
  };

  // Function to calculate team announcement time (4 hours before game start)
  const calculateTeamAnnouncementTime = (gameDateTime: string) => {
    console.log('Calculating team announcement time for:', gameDateTime);
    const gameDate = new Date(gameDateTime);
    console.log('Game date parsed as:', gameDate);
    
    // Create announcement time by subtracting 4 hours in milliseconds
    const announcementTime = new Date(gameDate.getTime() - (4 * 60 * 60 * 1000));
    console.log('Announcement time calculated as:', announcementTime);
    
    // Format as YYYY-MM-DDTHH:mm for datetime-local input
    const year = announcementTime.getFullYear();
    const month = (announcementTime.getMonth() + 1).toString().padStart(2, '0');
    const day = announcementTime.getDate().toString().padStart(2, '0');
    const hours = announcementTime.getHours().toString().padStart(2, '0');
    const minutes = announcementTime.getMinutes().toString().padStart(2, '0');
    
    const formattedTime = `${year}-${month}-${day}T${hours}:${minutes}`;
    console.log('Formatted announcement time:', formattedTime);
    
    return formattedTime;
  };

  // Update team announcement time whenever date or time changes
  useEffect(() => {
    if (gamePhase === GAME_STATUSES.PLAYERS_ANNOUNCED && date && time) {
      console.log('Effect triggered with date:', date, 'time:', time);
      const gameDateTime = `${date}T${time}`;
      console.log('Game date time constructed as:', gameDateTime);
      setTeamAnnouncementTime(calculateTeamAnnouncementTime(gameDateTime));
    }
  }, [date, time, gamePhase]);

  // Function to handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validate dates based on game phase
      const gameDateTime = `${date}T${time}`;
      let registrationStartDate = registrationStart;
      let registrationEndDate = registrationEnd;
      
      if (gamePhase !== GAME_STATUSES.UPCOMING) {
        // For non-upcoming games, set registration window to be in the past
        const gameDate = new Date(gameDateTime);
        registrationStartDate = new Date(gameDate.getTime() - (48 * 60 * 60 * 1000)).toISOString(); // 48 hours before game
        registrationEndDate = new Date(gameDate.getTime() - (24 * 60 * 60 * 1000)).toISOString(); // 24 hours before game
      }

      console.log('Creating game with data:', {
        date: gameDateTime,
        venue_id: venueId,
        pitch_cost: pitchCost,
        status: gamePhase,
        max_players: maxPlayers,
        registration_window_start: registrationStartDate,
        registration_window_end: registrationEndDate,
        team_announcement_time: teamAnnouncementTime,
      });

      // Create the game using admin role
      const { data: gameResult, error: gameError } = await supabase.auth.getSession().then(({ data: { session } }) => {
        return supabase
          .from('games')
          .insert([
            {
              date: gameDateTime,
              venue_id: venueId,
              pitch_cost: pitchCost,
              status: gamePhase,
              max_players: maxPlayers,
              registration_window_start: registrationStartDate,
              registration_window_end: registrationEndDate,
              team_announcement_time: teamAnnouncementTime,
            },
          ])
          .select()
          .single();
      });

      if (gameError) throw gameError;

      // Register confirmed and random pick players using admin role
      const allSelectedPlayers = [...new Set([...confirmedPlayers, ...randomPickPlayers])];
      console.log('Registering players:', { 
        confirmed: confirmedPlayers,
        random: randomPickPlayers,
        all: allSelectedPlayers
      });

      if (allSelectedPlayers.length > 0) {
        // First check if any of these players are already registered
        const { data: existingRegistrations } = await supabase
          .from('game_registrations')
          .select('player_id')
          .eq('game_id', gameResult.id)
          .in('player_id', allSelectedPlayers);

        const existingPlayerIds = new Set(existingRegistrations?.map(reg => reg.player_id) || []);
        const newPlayers = allSelectedPlayers.filter(id => !existingPlayerIds.has(id));

        if (newPlayers.length > 0) {
          const { error: registrationError } = await supabase.auth.getSession().then(({ data: { session } }) => {
            return supabase
              .from('game_registrations')
              .insert(
                newPlayers.map(playerId => ({
                  game_id: gameResult.id,
                  player_id: playerId,
                  status: 'selected',
                  selection_method: randomPickPlayers.includes(playerId) ? 'random' : 'merit'
                }))
              );
          });

          if (registrationError) {
            console.error('Error registering players:', registrationError);
            toast.error('Game created but there was an error registering some players');
            return;
          }
        }
      }

      // Add reserve players using admin role
      if (reservePlayers.length > 0) {
        // First check if any of these players are already registered
        const { data: existingReserveRegistrations } = await supabase
          .from('game_registrations')
          .select('player_id')
          .eq('game_id', gameResult.id)
          .in('player_id', reservePlayers);

        const existingReserveIds = new Set(existingReserveRegistrations?.map(reg => reg.player_id) || []);
        const newReservePlayers = reservePlayers.filter(id => !existingReserveIds.has(id));

        if (newReservePlayers.length > 0) {
          const { error: reserveError } = await supabase.auth.getSession().then(({ data: { session } }) => {
            return supabase
              .from('game_registrations')
              .insert(
                newReservePlayers.map(playerId => ({
                  game_id: gameResult.id,
                  player_id: playerId,
                  status: 'reserve',
                  selection_method: 'none'  // Reserve players weren't selected by any method
                }))
              );
          });

          if (reserveError) {
            console.error('Error adding reserve players:', reserveError);
            toast.error('Game created but there was an error adding some reserve players');
            return;
          }
        }
      }

      // Add dropped out players
      if (droppedOutPlayers.length > 0) {
        // First check if any of these players are already registered
        const { data: existingDroppedRegistrations } = await supabase
          .from('game_registrations')
          .select('player_id')
          .eq('game_id', gameResult.id)
          .in('player_id', droppedOutPlayers);

        const existingDroppedIds = new Set(existingDroppedRegistrations?.map(reg => reg.player_id) || []);
        const newDroppedPlayers = droppedOutPlayers.filter(id => !existingDroppedIds.has(id));

        if (newDroppedPlayers.length > 0) {
          const { error: droppedOutError } = await supabase.auth.getSession().then(({ data: { session } }) => {
            return supabase
              .from('game_registrations')
              .insert(
                newDroppedPlayers.map(playerId => ({
                  game_id: gameResult.id,
                  player_id: playerId,
                  status: 'dropped_out',
                  selection_method: 'none'  // Dropped out players don't have a selection method
                }))
              );
          });

          if (droppedOutError) {
            console.error('Error adding dropped out players:', droppedOutError);
            toast.error('Game created but there was an error adding some dropped out players');
            return;
          }
        }
      }

      toast.success('Game created successfully!');
      onGameCreated?.();
    } catch (error) {
      console.error('Error creating game:', error);
      toast.error('Error creating game');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler for when player lists are extracted from pasted text
  const handlePlayerListsExtracted = (
    selectedPlayers: string[],
    randomPlayers: string[],
    reservePlayers: string[],
    droppedOutPlayers: string[]
  ) => {
    // Filter players to only include those in our database
    const validSelectedPlayers = selectedPlayers
      .map(name => players.find(p => p.friendly_name === name))
      .filter((p): p is Player => p !== undefined)
      .map(p => p.id);

    const validRandomPlayers = randomPlayers
      .map(name => players.find(p => p.friendly_name === name))
      .filter((p): p is Player => p !== undefined)
      .map(p => p.id);

    const validReservePlayers = reservePlayers
      .map(name => players.find(p => p.friendly_name === name))
      .filter((p): p is Player => p !== undefined)
      .map(p => p.id);

    const validDroppedOutPlayers = droppedOutPlayers
      .map(name => players.find(p => p.friendly_name === name))
      .filter((p): p is Player => p !== undefined)
      .map(p => p.id);

    setConfirmedPlayers(validSelectedPlayers);
    setRandomPickPlayers(validRandomPlayers);
    setReservePlayers(validReservePlayers);
    setDroppedOutPlayers(validDroppedOutPlayers);
  };

  return (
    <FormContainer title="Create New Game">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Game Phase Selection */}
        <div className="form-control">
          <label className="label">
            <span className="label-text">Game Phase</span>
          </label>
          <select
            value={gamePhase}
            onChange={(e) => {
              const newPhase = e.target.value as GameStatus;
              console.log('Phase changed to:', newPhase);
              setGamePhase(newPhase);
              
              // Set team announcement time when switching to Player Selection Phase
              if (newPhase === GAME_STATUSES.PLAYERS_ANNOUNCED && date && time) {
                console.log('Setting team announcement time on phase change with date:', date, 'time:', time);
                const gameDateTime = `${date}T${time}`;
                setTeamAnnouncementTime(calculateTeamAnnouncementTime(gameDateTime));
              }
            }}
            className="select select-bordered w-full"
          >
            <option value={GAME_STATUSES.UPCOMING}>Upcoming Game</option>
            <option value={GAME_STATUSES.PLAYERS_ANNOUNCED}>Player Selection Phase</option>
            <option value={GAME_STATUSES.TEAMS_ANNOUNCED}>Team Announcement Phase</option>
          </select>
        </div>

        {/* Game Details Paste */}
        <GameDetailsPaste
          onDateTimeExtracted={(newDate, newTime) => {
            setDate(newDate);
            setTime(newTime);
            // If in Player Selection Phase, update team announcement time
            if (gamePhase === GAME_STATUSES.PLAYERS_ANNOUNCED) {
              const gameDateTime = `${newDate}T${newTime}`;
              setTeamAnnouncementTime(calculateTeamAnnouncementTime(gameDateTime));
            }
          }}
          onPlayerListsExtracted={handlePlayerListsExtracted}
          onMaxPlayersExtracted={(maxPlayers) => {
            setMaxPlayers(maxPlayers);
          }}
        />

        {/* Basic Game Details */}
        <BasicGameDetails
          date={date}
          time={time}
          venueId={venueId}
          maxPlayers={maxPlayers}
          randomSlots={randomSlots}
          pitchCost={pitchCost}
          venues={venues}
          onDateChange={setDate}
          onTimeChange={setTime}
          onVenueChange={setVenueId}
          onMaxPlayersChange={setMaxPlayers}
          onRandomSlotsChange={setRandomSlots}
          onPitchCostChange={setPitchCost}
        />

        {/* Game Timing Details */}
        <GameTimingDetails
          gamePhase={gamePhase}
          date={date}
          time={time}
          registrationStart={registrationStart}
          registrationEnd={registrationEnd}
          teamAnnouncementTime={teamAnnouncementTime}
          onRegistrationStartChange={setRegistrationStart}
          onRegistrationEndChange={setRegistrationEnd}
          onTeamAnnouncementTimeChange={setTeamAnnouncementTime}
        />

        {/* Player Selection Phase Details */}
        {gamePhase === GAME_STATUSES.PLAYERS_ANNOUNCED && (
          <PlayerSelectionDetails
            players={players}
            confirmedPlayers={confirmedPlayers}
            reservePlayers={reservePlayers}
            randomPickPlayers={randomPickPlayers}
            droppedOutPlayers={droppedOutPlayers}
            onConfirmedPlayersChange={setConfirmedPlayers}
            onReservePlayersChange={setReservePlayers}
            onRandomPickPlayersChange={setRandomPickPlayers}
            onDroppedOutPlayersChange={setDroppedOutPlayers}
          />
        )}

        {/* Team Announcement Phase Details */}
        {gamePhase === GAME_STATUSES.TEAMS_ANNOUNCED && (
          <TeamAnnouncementDetails
            players={players}
            teamAPlayers={teamAPlayers}
            teamBPlayers={teamBPlayers}
            teamAAttackRating={teamAAttackRating}
            teamADefenseRating={teamADefenseRating}
            teamBAttackRating={teamBAttackRating}
            teamBDefenseRating={teamBDefenseRating}
            onTeamAPlayersChange={setTeamAPlayers}
            onTeamBPlayersChange={setTeamBPlayers}
            onTeamAAttackRatingChange={setTeamAAttackRating}
            onTeamADefenseRatingChange={setTeamADefenseRating}
            onTeamBAttackRatingChange={setTeamBAttackRating}
            onTeamBDefenseRatingChange={setTeamBDefenseRating}
          />
        )}

        <motion.button
          type="submit"
          className="btn btn-primary w-full"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Creating...' : 'Create Game'}
        </motion.button>
      </form>
    </FormContainer>
  );
};

export default CreateGameForm;

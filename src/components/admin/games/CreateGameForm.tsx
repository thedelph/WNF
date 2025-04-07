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
import { ukTimeToUtc } from '../../../utils/dateUtils';

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
    const gameDate = new Date(gameDateTime);
    
    // Create announcement time by subtracting 4 hours in milliseconds
    const announcementTime = new Date(gameDate.getTime() - (4 * 60 * 60 * 1000));
    
    // Format as YYYY-MM-DDTHH:mm for datetime-local input
    const year = announcementTime.getFullYear();
    const month = (announcementTime.getMonth() + 1).toString().padStart(2, '0');
    const day = announcementTime.getDate().toString().padStart(2, '0');
    const hours = announcementTime.getHours().toString().padStart(2, '0');
    const minutes = announcementTime.getMinutes().toString().padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Update team announcement time whenever date or time changes
  useEffect(() => {
    if (gamePhase === GAME_STATUSES.PLAYERS_ANNOUNCED && date && time) {
      const gameDateTime = `${date}T${time}`;
      setTeamAnnouncementTime(calculateTeamAnnouncementTime(gameDateTime));
    }
  }, [date, time, gamePhase]);

  /**
   * Converts a local UK time to UTC for storage in the database
   * This ensures that times are properly stored in UTC regardless of whether UK is in GMT or BST
   */
  const convertToUtcForStorage = (localDateTimeStr: string): string => {
    try {
      // Parse the local date time string
      const localDateTime = new Date(localDateTimeStr);
      
      // Convert to UTC using our utility function
      const utcDateTime = ukTimeToUtc(localDateTime);
      
      // Format as ISO string and return
      return utcDateTime.toISOString();
    } catch (error) {
      console.error('Error converting time to UTC:', error);
      toast.error('Error processing date/time');
      return localDateTimeStr; // Return original if conversion fails
    }
  };

  // Function to handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validate dates based on game phase
      const localGameDateTime = `${date}T${time}`;
      
      // Convert local UK time to UTC for storage
      const gameDateTime = convertToUtcForStorage(localGameDateTime);
      
      console.log('Game time debug:');
      console.log('Local input time:', localGameDateTime);
      console.log('Converted UTC time for storage:', gameDateTime);
      
      let registrationStartDate = registrationStart;
      let registrationEndDate = registrationEnd;
      let teamAnnouncementTimeUtc = teamAnnouncementTime;
      
      // Convert registration times to UTC if they exist
      if (registrationStart) {
        registrationStartDate = convertToUtcForStorage(registrationStart);
      }
      
      if (registrationEnd) {
        registrationEndDate = convertToUtcForStorage(registrationEnd);
      }
      
      if (teamAnnouncementTime) {
        teamAnnouncementTimeUtc = convertToUtcForStorage(teamAnnouncementTime);
      }
      
      if (gamePhase !== GAME_STATUSES.UPCOMING) {
        // For non-upcoming games, set registration window to be in the past
        const gameDate = new Date(gameDateTime);
        registrationStartDate = new Date(gameDate.getTime() - (48 * 60 * 60 * 1000)).toISOString(); // 48 hours before game
        registrationEndDate = new Date(gameDate.getTime() - (24 * 60 * 60 * 1000)).toISOString(); // 24 hours before game
      }

      // Create the game using admin role
      const { data: gameResult, error: gameError } = await supabase
        .from('games')
        .insert([
          {
            date: gameDateTime,
            venue_id: venueId,
            pitch_cost: pitchCost,
            status: gamePhase,
            max_players: maxPlayers,
            random_slots: randomSlots,
            registration_window_start: registrationStartDate,
            registration_window_end: registrationEndDate,
            team_announcement_time: teamAnnouncementTimeUtc,
          },
        ])
        .select()
        .single();

      if (gameError) throw gameError;

      // Register confirmed and random pick players using admin role
      const allSelectedPlayers = [...new Set([...confirmedPlayers, ...randomPickPlayers])];

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
          const { error: registrationError } = await supabase
            .from('game_registrations')
            .insert(
              newPlayers.map(playerId => ({
                game_id: gameResult.id,
                player_id: playerId,
                status: 'selected',
                selection_method: randomPickPlayers.includes(playerId) ? 'random' : 'merit'
              }))
            );

          if (registrationError) throw registrationError;
        }
      }

      // Register reserve players
      if (reservePlayers.length > 0) {
        const { error: reserveError } = await supabase
          .from('game_registrations')
          .insert(
            reservePlayers.map(playerId => ({
              game_id: gameResult.id,
              player_id: playerId,
              status: 'reserve',
              selection_method: 'merit'
            }))
          );

        if (reserveError) throw reserveError;
      }

      // Register dropped out players
      if (droppedOutPlayers.length > 0) {
        const { error: droppedOutError } = await supabase
          .from('game_registrations')
          .insert(
            droppedOutPlayers.map(playerId => ({
              game_id: gameResult.id,
              player_id: playerId,
              status: 'dropped_out',
              selection_method: 'merit'
            }))
          );

        if (droppedOutError) throw droppedOutError;
      }

      // Assign teams if in team announcement phase
      if (gamePhase === GAME_STATUSES.TEAMS_ANNOUNCED) {
        // Assign team A (blue)
        if (teamAPlayers.length > 0) {
          const { error: teamAError } = await supabase
            .from('game_registrations')
            .update({ team: 'blue' })
            .eq('game_id', gameResult.id)
            .in('player_id', teamAPlayers);

          if (teamAError) throw teamAError;
        }

        // Assign team B (orange)
        if (teamBPlayers.length > 0) {
          const { error: teamBError } = await supabase
            .from('game_registrations')
            .update({ team: 'orange' })
            .eq('game_id', gameResult.id)
            .in('player_id', teamBPlayers);

          if (teamBError) throw teamBError;
        }

        // Save team ratings
        const { error: teamRatingsError } = await supabase
          .from('game_team_ratings')
          .insert([
            {
              game_id: gameResult.id,
              team: 'blue',
              attack_rating: teamAAttackRating,
              defense_rating: teamADefenseRating
            },
            {
              game_id: gameResult.id,
              team: 'orange',
              attack_rating: teamBAttackRating,
              defense_rating: teamBDefenseRating
            }
          ]);

        if (teamRatingsError) throw teamRatingsError;
      }

      toast.success('Game created successfully!');
      if (onGameCreated) onGameCreated();
    } catch (error: any) {
      console.error('Error creating game:', error);
      toast.error(`Failed to create game: ${error.message || 'Unknown error'}`);
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
              setGamePhase(newPhase);
              
              // Set team announcement time when switching to Player Selection Phase
              if (newPhase === GAME_STATUSES.PLAYERS_ANNOUNCED && date && time) {
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

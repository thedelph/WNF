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
  const [pitchCost, setPitchCost] = useState(presetPitchCost || 56.70);
  const [gamePhase, setGamePhase] = useState<GameStatus>(GAME_STATUSES.UPCOMING);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Phase-specific state
  const [confirmedPlayers, setConfirmedPlayers] = useState<string[]>([]);
  const [reservePlayers, setReservePlayers] = useState<string[]>([]);
  const [randomPickPlayers, setRandomPickPlayers] = useState<string[]>([]);
  const [droppedOutPlayers, setDroppedOutPlayers] = useState<string[]>([]);
  const [tokenPlayers, setTokenPlayers] = useState<string[]>([]);
  const [shieldPlayers, setShieldPlayers] = useState<string[]>([]);
  const [injuryPlayers, setInjuryPlayers] = useState<string[]>([]);
  const [teamAPlayers, setTeamAPlayers] = useState<string[]>([]);
  const [teamBPlayers, setTeamBPlayers] = useState<string[]>([]);
  
  // Parsed counts state
  const [parsedCounts, setParsedCounts] = useState({
    selected: 0,
    random: 0,
    reserve: 0,
    droppedOut: 0,
    token: 0,
    shield: 0,
    injury: 0
  });
  
  // Track unmatched players
  const [unmatchedPlayers, setUnmatchedPlayers] = useState<string[]>([]);
  const [matchedCounts, setMatchedCounts] = useState({
    selected: 0,
    random: 0,
    reserve: 0,
    droppedOut: 0
  });

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
                selection_method: randomPickPlayers.includes(playerId) ? 'random' : 'merit',
                using_token: tokenPlayers.includes(playerId),
                using_shield: shieldPlayers.includes(playerId),
                using_injury: injuryPlayers.includes(playerId)
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
              selection_method: 'merit',
              using_shield: shieldPlayers.includes(playerId),
              using_injury: injuryPlayers.includes(playerId)
            }))
          );

        if (reserveError) throw reserveError;
      }

      // Register dropped out players (with shield/injury token info)
      if (droppedOutPlayers.length > 0) {
        const { error: droppedOutError } = await supabase
          .from('game_registrations')
          .insert(
            droppedOutPlayers.map(playerId => ({
              game_id: gameResult.id,
              player_id: playerId,
              status: 'dropped_out',
              selection_method: 'merit',
              using_shield: shieldPlayers.includes(playerId),
              using_injury: injuryPlayers.includes(playerId)
            }))
          );

        if (droppedOutError) throw droppedOutError;
      }

      // Register shield/injury players who aren't in any other list (just token protection)
      // Use 'absent' status - they didn't register but are using token protection
      // This does NOT count towards registration streaks
      const allRegisteredPlayers = new Set([...allSelectedPlayers, ...reservePlayers, ...droppedOutPlayers]);
      const tokenOnlyPlayers = [...shieldPlayers, ...injuryPlayers].filter(id => !allRegisteredPlayers.has(id));

      if (tokenOnlyPlayers.length > 0) {
        const { error: tokenOnlyError } = await supabase
          .from('game_registrations')
          .insert(
            tokenOnlyPlayers.map(playerId => ({
              game_id: gameResult.id,
              player_id: playerId,
              status: 'absent',
              selection_method: 'none',
              using_shield: shieldPlayers.includes(playerId),
              using_injury: injuryPlayers.includes(playerId)
            }))
          );

        if (tokenOnlyError) throw tokenOnlyError;
      }

      // Activate shield protection for shield players
      for (const playerId of shieldPlayers) {
        // Get player's current streak to protect
        const { data: playerData, error: playerError } = await supabase
          .from('players')
          .select('current_streak, shield_tokens_available')
          .eq('id', playerId)
          .single();

        if (playerError) {
          console.error('Error fetching player for shield activation:', playerError);
          continue;
        }

        const currentStreak = playerData?.current_streak || 0;
        const tokensAvailable = playerData?.shield_tokens_available || 0;

        // Only activate if player has tokens available
        if (tokensAvailable > 0) {
          // Activate shield protection on players table
          const { error: shieldError } = await supabase
            .from('players')
            .update({
              shield_active: true,
              protected_streak_value: currentStreak,
              protected_streak_base: currentStreak,
              shield_tokens_available: tokensAvailable - 1
            })
            .eq('id', playerId);

          if (shieldError) {
            console.error('Error activating shield protection:', shieldError);
            toast.error(`Failed to activate shield for player`);
          } else {
            console.log(`Activated shield for player ${playerId}: protecting ${currentStreak}-game streak`);
          }
        } else {
          console.warn(`Player ${playerId} has no shield tokens available`);
          toast.error(`Player has no shield tokens available`);
        }
      }

      // Activate injury tokens for injury players
      if (injuryPlayers.length > 0) {
        for (const playerId of injuryPlayers) {
          // Get player's current streak to calculate return streak
          const { data: playerData, error: playerError } = await supabase
            .from('players')
            .select('current_streak')
            .eq('id', playerId)
            .single();

          if (playerError) {
            console.error('Error fetching player for injury activation:', playerError);
            continue;
          }

          const currentStreak = playerData?.current_streak || 0;
          const returnStreak = Math.ceil(currentStreak / 2); // 50% of original streak

          // Activate injury token
          const { error: injuryError } = await supabase
            .from('players')
            .update({
              injury_token_active: true,
              injury_original_streak: currentStreak,
              injury_return_streak: returnStreak
            })
            .eq('id', playerId);

          if (injuryError) {
            console.error('Error activating injury token:', injuryError);
            toast.error(`Failed to activate injury token for player`);
          }
        }
      }

      // Assign teams if in team announcement phase
      if (gamePhase === GAME_STATUSES.TEAMS_ANNOUNCED) {
        // Assign team A (orange)
        if (teamAPlayers.length > 0) {
          const { error: teamAError } = await supabase
            .from('game_registrations')
            .update({ team: 'orange' })
            .eq('game_id', gameResult.id)
            .in('player_id', teamAPlayers);

          if (teamAError) throw teamAError;
        }

        // Assign team B (blue)
        if (teamBPlayers.length > 0) {
          const { error: teamBError } = await supabase
            .from('game_registrations')
            .update({ team: 'blue' })
            .eq('game_id', gameResult.id)
            .in('player_id', teamBPlayers);

          if (teamBError) throw teamBError;
        }
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
    droppedOutPlayers: string[],
    tokenUsers: string[]
  ) => {
    // Update parsed counts immediately with raw counts
    // Note: shield and injury are extracted separately via their own callbacks
    setParsedCounts(prev => ({
      ...prev,
      selected: selectedPlayers.length,
      random: randomPlayers.length,
      reserve: reservePlayers.length,
      droppedOut: droppedOutPlayers.length,
      token: tokenUsers.length
    }));

    // Track all unmatched players
    const allUnmatchedPlayers: string[] = [];

    // Process selected players
    const selectedPlayerMatches = selectedPlayers.map(name => {
      const player = players.find(p => p.friendly_name === name);
      if (!player) {
        allUnmatchedPlayers.push(name);
      }
      return player;
    });
    const validSelectedPlayers = selectedPlayerMatches
      .filter((p): p is Player => p !== undefined)
      .map(p => p.id);

    // Process random players
    const randomPlayerMatches = randomPlayers.map(name => {
      const player = players.find(p => p.friendly_name === name);
      return player;
    });
    const validRandomPlayers = randomPlayerMatches
      .filter((p): p is Player => p !== undefined)
      .map(p => p.id);

    // Process reserve players
    const reservePlayerMatches = reservePlayers.map(name => {
      const player = players.find(p => p.friendly_name === name);
      if (!player && !allUnmatchedPlayers.includes(name)) {
        allUnmatchedPlayers.push(name);
      }
      return player;
    });
    const validReservePlayers = reservePlayerMatches
      .filter((p): p is Player => p !== undefined)
      .map(p => p.id);

    // Process dropped out players
    const droppedOutPlayerMatches = droppedOutPlayers.map(name => {
      const player = players.find(p => p.friendly_name === name);
      if (!player && !allUnmatchedPlayers.includes(name)) {
        allUnmatchedPlayers.push(name);
      }
      return player;
    });
    const validDroppedOutPlayers = droppedOutPlayerMatches
      .filter((p): p is Player => p !== undefined)
      .map(p => p.id);

    // Process token players
    const validTokenPlayers = tokenUsers
      .map(name => players.find(p => p.friendly_name === name))
      .filter((p): p is Player => p !== undefined)
      .map(p => p.id);

    // Update matched counts
    setMatchedCounts({
      selected: validSelectedPlayers.length,
      random: validRandomPlayers.length,
      reserve: validReservePlayers.length,
      droppedOut: validDroppedOutPlayers.length
    });

    // Set unmatched players
    setUnmatchedPlayers(allUnmatchedPlayers);

    setConfirmedPlayers(validSelectedPlayers);
    setRandomPickPlayers(validRandomPlayers);
    setReservePlayers(validReservePlayers);
    setDroppedOutPlayers(validDroppedOutPlayers);
    setTokenPlayers(validTokenPlayers);
  };

  // Function to handle team extraction from team announcement message
  const handleTeamsExtracted = (orangeTeamNames: string[], blueTeamNames: string[]) => {
    // Convert player names to IDs
    const validOrangePlayers = orangeTeamNames
      .map(name => players.find(p => p.friendly_name === name))
      .filter((p): p is Player => p !== undefined)
      .map(p => p.id);

    const validBluePlayers = blueTeamNames
      .map(name => players.find(p => p.friendly_name === name))
      .filter((p): p is Player => p !== undefined)
      .map(p => p.id);

    setTeamAPlayers(validOrangePlayers); // Team A = Orange
    setTeamBPlayers(validBluePlayers);   // Team B = Blue

    console.log('Teams extracted:', {
      orange: validOrangePlayers,
      blue: validBluePlayers
    });
  };

  return (
    <FormContainer title="Create New Game">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Game Phase Selection */}
        <fieldset className="fieldset">
          <legend className="fieldset-legend">Game Phase</legend>
          <select
            value={gamePhase}
            onChange={(e) => {
              const newPhase = e.target.value as GameStatus;
              setGamePhase(newPhase);

              // Reset parsed counts when changing phase
              setParsedCounts({
                selected: 0,
                random: 0,
                reserve: 0,
                droppedOut: 0,
                token: 0,
                shield: 0,
                injury: 0
              });
              setMatchedCounts({
                selected: 0,
                random: 0,
                reserve: 0,
                droppedOut: 0
              });
              setUnmatchedPlayers([]);
              setShieldPlayers([]);
              setInjuryPlayers([]);

              // Set team announcement time when switching to Player Selection Phase
              if (newPhase === GAME_STATUSES.PLAYERS_ANNOUNCED && date && time) {
                const gameDateTime = `${date}T${time}`;
                setTeamAnnouncementTime(calculateTeamAnnouncementTime(gameDateTime));
              }
            }}
            className="select w-full"
          >
            <option value={GAME_STATUSES.UPCOMING}>Upcoming Game</option>
            <option value={GAME_STATUSES.PLAYERS_ANNOUNCED}>Player Selection Phase</option>
            <option value={GAME_STATUSES.TEAMS_ANNOUNCED}>Team Announcement Phase</option>
          </select>
        </fieldset>

        {/* Game Details Paste */}
        <GameDetailsPaste
          gamePhase={gamePhase}
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
          onTeamsExtracted={handleTeamsExtracted}
          onShieldPlayersExtracted={(shieldPlayerNames) => {
            // Convert shield player names to IDs
            const validShieldPlayers = shieldPlayerNames
              .map(name => players.find(p => p.friendly_name === name))
              .filter((p): p is Player => p !== undefined)
              .map(p => p.id);
            setShieldPlayers(validShieldPlayers);
            console.log('Shield players extracted:', validShieldPlayers);
          }}
          onInjuryPlayersExtracted={(injuryPlayerNames) => {
            // Convert injury player names to IDs
            const validInjuryPlayers = injuryPlayerNames
              .map(name => players.find(p => p.friendly_name === name))
              .filter((p): p is Player => p !== undefined)
              .map(p => p.id);
            setInjuryPlayers(validInjuryPlayers);
            console.log('Injury players extracted:', validInjuryPlayers);
          }}
        />

        {/* Parsed Player Counts Display */}
        {(parsedCounts.selected > 0 || parsedCounts.reserve > 0 || parsedCounts.droppedOut > 0 || shieldPlayers.length > 0 || injuryPlayers.length > 0) && (
          <>
            <div className="alert alert-info">
              <div className="flex flex-col gap-1">
                <span className="font-semibold">Parsed from WhatsApp message:</span>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                  <div>✅ Selected Players: {parsedCounts.selected}</div>
                  <div>🪙 Token Users: {parsedCounts.token}</div>
                  <div>🎲 Random Picks: {parsedCounts.random}</div>
                  <div>🔄 Reserve Players: {parsedCounts.reserve}</div>
                  <div>❌ Dropped Out: {parsedCounts.droppedOut}</div>
                  {shieldPlayers.length > 0 && <div>🛡️ Shield Users: {shieldPlayers.length}</div>}
                  {injuryPlayers.length > 0 && <div>🩹 Injured: {injuryPlayers.length}</div>}
                </div>
              </div>
            </div>
            
            {/* Matching Status */}
            <div className={`alert ${unmatchedPlayers.length > 0 ? 'alert-warning' : 'alert-success'}`}>
              <div className="flex flex-col gap-1">
                <span className="font-semibold">Database Matching:</span>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                  <div>✅ Matched Selected: {matchedCounts.selected}/{parsedCounts.selected}</div>
                  <div>🔄 Matched Reserves: {matchedCounts.reserve}/{parsedCounts.reserve}</div>
                  <div>❌ Matched Dropped: {matchedCounts.droppedOut}/{parsedCounts.droppedOut}</div>
                </div>
                {unmatchedPlayers.length > 0 && (
                  <div className="mt-2">
                    <span className="font-semibold text-warning">⚠️ Unmatched players ({unmatchedPlayers.length}):</span>
                    <div className="text-sm mt-1">
                      {unmatchedPlayers.map((name, index) => (
                        <span key={index}>
                          {name}{index < unmatchedPlayers.length - 1 ? ', ' : ''}
                        </span>
                      ))}
                    </div>
                    <div className="text-xs mt-1 opacity-75">
                      Please manually select these players from the dropdowns below
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

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
            shieldPlayers={shieldPlayers}
            injuryPlayers={injuryPlayers}
            onConfirmedPlayersChange={setConfirmedPlayers}
            onReservePlayersChange={setReservePlayers}
            onRandomPickPlayersChange={setRandomPickPlayers}
            onDroppedOutPlayersChange={setDroppedOutPlayers}
            onShieldPlayersChange={setShieldPlayers}
            onInjuryPlayersChange={setInjuryPlayers}
          />
        )}

        {/* Team Announcement Phase Details */}
        {gamePhase === GAME_STATUSES.TEAMS_ANNOUNCED && (
          <TeamAnnouncementDetails
            players={players}
            teamAPlayers={teamAPlayers}
            teamBPlayers={teamBPlayers}
            onTeamAPlayersChange={setTeamAPlayers}
            onTeamBPlayersChange={setTeamBPlayers}
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

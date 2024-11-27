import React, { useState, useEffect } from 'react'
import { useAdmin } from '../../hooks/useAdmin'
import { supabase, supabaseAdmin } from '../../utils/supabase'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'
import FormContainer from '../../components/common/containers/FormContainer'
import { EditGameModal } from '../../components/admin/games/EditGameModal'
import { GameCard } from '../../components/admin/games/GameCard'
import { CreateGameForm } from '../../components/admin/games/CreateGameForm'
import { VenueManagement } from '../../components/admin/venues/VenueManagement'
import { Game, Venue, GameRegistration, GameStatus, GAME_STATUSES, isValidGameStatus } from '../../types/game'
import { Toaster } from 'react-hot-toast'
import { selectPlayers } from '../../utils/playerSelection'
import { selectTeamMembers } from '../../utils/teamselection'
import { GameRegistrations } from '../../components/admin/games/GameRegistrations'
import { handlePlayerSelection } from '../../utils/playerSelection'
import { deleteGame } from '../../utils/gameUtils'; // Fix the import path

function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

const calculatePlayerXP = (player: any): number => {
  if (!player) return 0;
  
  const baseXP = player.caps || 0;
  const bonusModifier = (player.active_bonuses || 0) * 0.1;
  const penaltyModifier = (player.active_penalties || 0) * -0.1;
  const streakModifier = (player.current_streak || 0) * 0.1;
  
  return baseXP * (1 + bonusModifier + penaltyModifier + streakModifier);
};

const GameManagement: React.FC = () => {
  const { isAdmin, loading: adminLoading } = useAdmin()
  const [venues, setVenues] = useState<Venue[]>([])
  const [date, setDate] = useState('')
  const [time, setTime] = useState('21:00')
  const [registrationStart, setRegistrationStart] = useState('')
  const [registrationEnd, setRegistrationEnd] = useState('')
  const [venueId, setVenueId] = useState('')
  const [maxPlayers, setMaxPlayers] = useState(18)
  const [isAddingVenue, setIsAddingVenue] = useState(false)
  const [newVenueName, setNewVenueName] = useState('')
  const [newVenueAddress, setNewVenueAddress] = useState('')
  const [newVenueMapUrl, setNewVenueMapUrl] = useState('')
  const [isEditingVenue, setIsEditingVenue] = useState(false)
  const [editingVenue, setEditingVenue] = useState<Venue | null>(null)
  const [games, setGames] = useState<Game[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedGame, setSelectedGame] = useState<Game | null>(null)
  const [isEditingGame, setIsEditingGame] = useState(false)
  const [registrations, setRegistrations] = useState<GameRegistration[]>([])
  const [showRegistrations, setShowRegistrations] = useState(false)
  const [players, setPlayers] = useState<{ id: string; friendly_name: string }[]>([])
  const [selectedPlayerId, setSelectedPlayerId] = useState('')
  const [randomSlots, setRandomSlots] = useState(2)
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null)
  const [isRegistrationsModalOpen, setIsRegistrationsModalOpen] = useState(false)
  const [presets, setPresets] = useState([]);

  useEffect(() => {
    fetchVenues()
  }, [])

  useEffect(() => {
    fetchGames()
  }, [])

  useEffect(() => {
    fetchPlayers()
  }, [])

  useEffect(() => {
    const checkAndCloseRegistrations = async () => {
      await checkClosedRegistrationWindows()
    }

    checkAndCloseRegistrations() // Run once when component mounts
    const interval = setInterval(checkAndCloseRegistrations, 60000) // Check every minute

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const game = games.find(g => g.status === 'pending_teams' || g.status === 'registration_closed' || g.status === 'teams_announced')
    if (game) {
      console.log('Found game with closed/pending status:', game.id)
      fetchRegistrations(game.id)
    }
  }, [games])

  useEffect(() => {
    fetchPresets();
  }, []);

  const fetchPresets = async () => {
    console.log('Fetching presets...');
    const { data, error } = await supabase
      .from('venue_presets')
      .select('*')
      .order('name');

    console.log('Presets response:', { data, error });

    if (error) {
      toast.error('Failed to fetch presets');
      return;
    }

    setPresets(data);
  };

  const handlePresetSelect = async (presetId: string) => {
    const preset = presets.find(p => p.id === presetId);
    if (!preset) return;

    // Calculate next occurrence of the day
    const today = new Date();
    const daysUntilNext = getDaysUntilNext(preset.day_of_week);
    const nextDate = new Date(today);
    nextDate.setDate(today.getDate() + daysUntilNext);
    
    // Set the game date and time
    setDate(nextDate.toISOString().split('T')[0]);
    setTime(preset.start_time);
    setVenueId(preset.venue_id);
    
    // Calculate registration window
    const gameDate = new Date(nextDate);
    const [hours, minutes] = preset.start_time.split(':');
    gameDate.setHours(parseInt(hours), parseInt(minutes));
    
    const regStart = new Date(gameDate);
    regStart.setHours(regStart.getHours() - preset.registration_hours_before);
    setRegistrationStart(regStart.toISOString().slice(0, 16));
    
    const regEnd = new Date(gameDate);
    regEnd.setHours(regEnd.getHours() - preset.registration_hours_until);
    setRegistrationEnd(regEnd.toISOString().slice(0, 16));
  };

  // Helper function to calculate days until next occurrence
  const getDaysUntilNext = (targetDay: string) => {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const today = new Date().getDay();
    const targetDayNum = days.indexOf(targetDay.toLowerCase());
    let daysUntil = targetDayNum - today;
    if (daysUntil <= 0) daysUntil += 7;
    return daysUntil;
  };

  const fetchVenues = async () => {
    const { data, error } = await supabase
      .from('venues')
      .select('*')
      .order('name')

    if (error) {
      toast.error('Failed to fetch venues')
      return
    }

    setVenues(data)
    if (data.length > 0) {
      const defaultVenue = data.find(v => v.is_default) || data[0]
      setVenueId(defaultVenue.id)
    }
  }

  const fetchGames = async () => {
    setIsLoading(true)
    console.log('Fetching games')
    
    const { data, error } = await supabase
      .from('games')
      .select(`
        *,
        venue:venues(*),
        registrations_count:game_registrations!inner(count)
      `)
      .gte('date', new Date().toISOString())
      .neq('status', 'completed')
      .order('date')

    console.log('Games fetch result:', {
      success: !error,
      error,
      gamesCount: data?.length,
      gameStatuses: data?.map(g => g.status)
    })

    if (error) {
      toast.error('Failed to fetch games')
    } else {
      const gamesWithCount = data?.map(game => ({
        ...game,
        registrations_count: game.registrations_count?.[0]?.count || 0
      }))
      setGames(gamesWithCount || [])
    }
    setIsLoading(false)
  }

  const fetchRegistrations = async (gameId: string) => {
    console.log('Fetching registrations for game:', gameId)
    
    if (!gameId) return

    const { data, error } = await supabaseAdmin
      .from('game_registrations')
      .select(`
        *,
        players!inner (
          id,
          friendly_name
        )
      `)
      .eq('game_id', gameId)
      .order('created_at')

    console.log('Fetched registrations:', {
      success: !error,
      error,
      registrationsCount: data?.length,
      registrations: data
    })

    if (error) {
      toast.error('Failed to fetch registrations')
      return
    }

    setRegistrations(data || [])
    setShowRegistrations(true)
    setSelectedGame(games.find(g => g.id === gameId))
  }

  const fetchPlayers = async () => {
    const { data, error } = await supabase
      .from('players')
      .select('id, friendly_name')
      .order('friendly_name')

    if (error) {
      toast.error('Failed to fetch players')
      return
    }
    setPlayers(data || [])
  }

  const checkClosedRegistrationWindows = async () => {
    try {
      const now = new Date().toISOString()
      const { data: closedGames, error } = await supabase
        .from('games')
        .select('*')
        .eq('status', 'upcoming')
        .lt('registration_window_end', now)

      if (error) throw error

      for (const game of closedGames) {
        await handleRegistrationClose(game.id)
      }
    } catch (error) {
      console.error('Error checking closed registration windows:', error)
      toast.error('Failed to process closed registration windows')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const gameDate = new Date(`${date}T${time}`);
      const regStart = new Date(registrationStart);
      const regEnd = new Date(registrationEnd);
      const now = new Date();

      console.log('Creating game with details:', {
        gameDate,
        regStart,
        regEnd,
        currentTime: now,
        venueId,
        maxPlayers,
        randomSlots
      });

      // Validate dates
      if (regStart >= regEnd) {
        toast.error('Registration start must be before registration end');
        return;
      }

      if (gameDate <= regEnd) {
        toast.error('Game date must be after registration end');
        return;
      }

      // Determine initial status
      let initialStatus: GameStatus = 'upcoming';
      if (now >= regStart && now < regEnd) {
        initialStatus = 'open';
      }

      console.log('Setting initial game status:', initialStatus);

      const { data, error } = await supabase
        .from('games')
        .insert({
          date: gameDate.toISOString(),
          registration_window_start: regStart.toISOString(),
          registration_window_end: regEnd.toISOString(),
          venue_id: venueId,
          max_players: maxPlayers,
          random_slots: randomSlots,
          status: initialStatus
        })
        .select()
        .single();

      if (error) {
        console.error('Game creation error:', error);
        throw error;
      }

      console.log('Game created successfully:', data);
      toast.success('Game created successfully!');
      await fetchGames(); // Refresh the games list
      
      // Reset form
      setDate('');
      setTime('21:00');
      setRegistrationStart('');
      setRegistrationEnd('');
      
    } catch (error) {
      console.error('Error creating game:', error);
      toast.error('Failed to create game');
    }
  };

  const handleAddVenue = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const { error } = await supabase
        .from('venues')
        .insert({
          name: newVenueName,
          address: newVenueAddress,
          google_maps_url: newVenueMapUrl
        })

      if (error) throw error

      toast.success('Venue added successfully!')
      setIsAddingVenue(false)
      setNewVenueName('')
      setNewVenueAddress('')
      setNewVenueMapUrl('')
      fetchVenues()
    } catch (error) {
      toast.error('Failed to add venue')
    }
  }

  const handleVenueSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      if (isEditingVenue && editingVenue) {
        const { error } = await supabase
          .from('venues')
          .update({
            name: newVenueName,
            address: newVenueAddress,
            google_maps_url: newVenueMapUrl
          })
          .match({ id: editingVenue.id })

        if (error) throw error
        toast.success('Venue updated successfully!')
      } else {
        const { error } = await supabase
          .from('venues')
          .insert({
            name: newVenueName,
            address: newVenueAddress,
            google_maps_url: newVenueMapUrl
          })

        if (error) throw error
        toast.success('Venue added successfully!')
      }

      setIsAddingVenue(false)
      setIsEditingVenue(false)
      setEditingVenue(null)
      setNewVenueName('')
      setNewVenueAddress('')
      setNewVenueMapUrl('')
      fetchVenues()
    } catch (error) {
      toast.error(isEditingVenue ? 'Failed to update venue' : 'Failed to add venue')
    }
  }

  const handleDeleteGame = async (gameId: string) => {
    try {
      const { error } = await deleteGame(gameId);
      
      if (error) {
        console.error('Error deleting game:', error);
        toast.error('Failed to delete game');
        return;
      }

      // Update local state if deletion was successful
      setGames(prevGames => prevGames.filter(game => game.id !== gameId));
      toast.success('Game deleted successfully');
    } catch (error) {
      console.error('Error in delete operation:', error);
      toast.error('Failed to delete game');
    }
  };

  const handleEditGame = (game: Game) => {
    setSelectedGame(game)
    setDate(new Date(game.date).toISOString().split('T')[0])
    setTime(new Date(game.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
    setRegistrationStart(game.registration_window_start)
    setRegistrationEnd(game.registration_window_end)
    setVenueId(game.venue_id)
    setMaxPlayers(game.max_players)
    setIsEditingGame(true)
  }

  const handleUpdateGame = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedGame) return

    try {
      const gameDate = new Date(`${date}T${time}`)
      const regStart = new Date(registrationStart)
      const regEnd = new Date(registrationEnd)

      const { error } = await supabase
        .from('games')
        .update({
          date: gameDate.toISOString(),
          registration_window_start: regStart.toISOString(),
          registration_window_end: regEnd.toISOString(),
          venue_id: venueId,
          max_players: maxPlayers
        })
        .eq('id', selectedGame.id)

      if (error) throw error

      toast.success('Game updated successfully!')
      setIsEditingGame(false)
      setSelectedGame(null)
      fetchGames()
    } catch (error) {
      toast.error('Failed to update game')
    }
  }

  const handleUnregisterPlayer = async (registrationId: string) => {
    try {
      const { error } = await supabaseAdmin
        .from('game_registrations')
        .delete()
        .match({ id: registrationId })

      if (error) {
        console.error('Unregistration error:', error)
        throw error
      }

      toast.success('Player unregistered successfully')
      if (selectedGameId) {
        await fetchRegistrations(selectedGameId)
      }
      await fetchGames() // Refresh games to update registration count
    } catch (error) {
      console.error('Error unregistering player:', error)
      toast.error(`Failed to unregister player: ${error.message}`)
    }
  }

  const handleClickOutside = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      setIsEditingGame(false)
      setSelectedGame(null)
    }
  }

  const handleRegisterPlayer = async (gameId: string) => {
    try {
      // Validate inputs
      if (!selectedPlayerId || !gameId) {
        toast.error('Please select a player to register')
        return
      }

      // Check for existing registration using supabaseAdmin
      const { data: existingReg, error: checkError } = await supabaseAdmin
        .from('game_registrations')
        .select('id')
        .eq('game_id', gameId)
        .eq('player_id', selectedPlayerId)
        .single()

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking existing registration:', checkError)
        throw checkError
      }

      if (existingReg) {
        toast.error('This player is already registered for this game')
        return
      }

      // Check if game is full
      const game = games.find(g => g.id === gameId)
      if (game && game.registrations_count >= game.max_players) {
        toast.error('This game is full')
        return
      }

      // Register player using supabaseAdmin
      const { data, error } = await supabaseAdmin
        .from('game_registrations')
        .insert({
          game_id: gameId,
          player_id: selectedPlayerId,
          status: 'registered',
          team: null,
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error

      toast.success('Player registered successfully!')
      await fetchRegistrations(gameId)
      await fetchGames()
      setSelectedPlayerId('')
    } catch (error) {
      console.error('Error registering player:', error)
      toast.error(`Failed to register player: ${error.message}`)
    }
  }

  const handleRegistrationClose = async (gameId: string) => {
    try {
      console.log('Starting admin registration close for game:', gameId);
      
      const { data: gameData, error: gameError } = await supabaseAdmin
        .from('games')
        .select('max_players, random_slots')
        .eq('id', gameId)
        .single();

      if (gameError) throw gameError;

      console.log('Game settings:', gameData);

      const maxPlayers = gameData.max_players || 18;
      const randomSlots = gameData.random_slots || 0;
      const meritSlots = maxPlayers - randomSlots;

      // Get all registrations with player data
      const { data: registrations, error: regError } = await supabaseAdmin
        .from('game_registrations')
        .select(`
          id,
          player_id,
          players (
            id,
            friendly_name,
            caps,
            active_bonuses,
            active_penalties,
            current_streak
          )
        `)
        .eq('game_id', gameId)
        .neq('status', 'cancelled');

      if (regError) throw regError;

      console.log('Registrations found:', registrations?.length);

      // Calculate XP and sort players
      const playersWithXP = registrations.map(reg => ({
        id: reg.id,
        player_id: reg.player_id,
        xp: calculatePlayerXP(reg.players),
        player: reg.players
      })).sort((a, b) => b.xp - a.xp);

      // Select players by merit (highest XP)
      const meritPlayers = playersWithXP.slice(0, meritSlots);

      // Randomly select remaining players from the pool
      const remainingPlayers = playersWithXP.slice(meritSlots);
      const randomPlayers = shuffleArray(remainingPlayers).slice(0, randomSlots);

      // Update selected players status - Merit based first
      if (meritPlayers.length > 0) {
        const { error: updateMeritError } = await supabaseAdmin
          .from('game_registrations')
          .update({ 
            status: 'selected',
            randomly_selected: false
          })
          .eq('game_id', gameId)
          .in('id', meritPlayers.map(p => p.id));

        if (updateMeritError) throw updateMeritError;
      }

      // Update randomly selected players
      if (randomPlayers.length > 0) {
        const { error: updateRandomError } = await supabaseAdmin
          .from('game_registrations')
          .update({ 
            status: 'selected',
            randomly_selected: true
          })
          .eq('game_id', gameId)
          .in('id', randomPlayers.map(p => p.id));

        if (updateRandomError) throw updateRandomError;
      }

      // Update remaining players as reserves
      const reserveIds = playersWithXP
        .filter(p => !selectedPlayers.find(s => s.id === p.id))
        .map(p => p.id);

      if (reserveIds.length > 0) {
        const { error: updateReservesError } = await supabaseAdmin
          .from('game_registrations')
          .update({ status: 'reserve' })
          .eq('game_id', gameId)
          .in('id', reserveIds);

        if (updateReservesError) throw updateReservesError;
      }

      // Update game status
      const { error: updateGameError } = await supabaseAdmin
        .from('games')
        .update({ 
          status: GAME_STATUSES.PENDING_TEAMS 
        })
        .eq('id', gameId);

      if (updateGameError) throw updateGameError;

      toast.success('Player selection completed successfully!');
      await fetchRegistrations(gameId);
    } catch (error) {
      console.error('Error in player selection:', error);
      toast.error('Failed to complete player selection');
    }
  };

  const handleViewRegistrations = async (gameId: string) => {
    console.log('Opening registrations for game:', gameId);
    setSelectedGameId(gameId);
    setIsRegistrationsModalOpen(true);
    await fetchRegistrations(gameId);
  };

  const handleCloseRegistrations = () => {
    console.log('Closing registrations modal');
    setIsRegistrationsModalOpen(false);
    setSelectedGameId(null);
  };

  const handleRegisterPlayers = async (gameId: string, playerIds: string[]) => {
    try {
      if (!playerIds.length) return;
      
      console.log('Registering players:', { gameId, playerIds });

      // Create the registration objects array
      const registrations = playerIds.map(playerId => ({
        game_id: gameId,
        player_id: playerId,
        status: 'registered',
        created_at: new Date().toISOString()
      }));

      // Insert all registrations at once with upsert option
      const { data, error } = await supabaseAdmin
        .from('game_registrations')
        .upsert(registrations, {
          onConflict: 'game_id,player_id',
          ignoreDuplicates: true
        })
        .select();

      if (error) throw error;

      toast.success(`Successfully registered ${playerIds.length} players`);
      await fetchRegistrations(gameId);
    } catch (error) {
      console.error('Error registering players:', error);
      toast.error('Failed to register players');
    }
  };

  const validateGameStatus = (status: string): GameStatus => {
    if (!isValidGameStatus(status)) {
      throw new Error(`Invalid game status: ${status}`);
    }
    return status;
  };

  const handleResetGameStatus = async (gameId: string) => {
    try {
      // Get the game details first
      const { data: game, error: gameError } = await supabase
        .from('games')
        .select('*')
        .eq('id', gameId)
        .single();

      if (gameError) throw gameError;

      // First reset ALL registrations to reserve status
      const { error: resetError } = await supabaseAdmin
        .from('game_registrations')
        .update({ 
          status: 'reserve',
          randomly_selected: false 
        })
        .eq('game_id', gameId);

      if (resetError) throw resetError;

      // Get all registrations and sort by XP
      const { data: registrations, error: regError } = await supabase
        .from('game_registrations')
        .select(`
          *,
          registered_player:players!game_registrations_player_id_fkey (
            id,
            friendly_name,
            caps,
            active_bonuses,
            active_penalties,
            current_streak
          )
        `)
        .eq('game_id', gameId);

      if (regError) throw regError;

      // Sort players by XP
      const sortedPlayers = registrations
        .map(reg => ({
          ...reg,
          xp: calculatePlayerXP(reg.registered_player)
        }))
        .sort((a, b) => b.xp - a.xp);

      // Calculate merit slots (total slots minus random slots)
      const meritSlots = game.max_players - game.random_slots;

      // Take top players by XP for merit slots
      const meritPlayers = sortedPlayers.slice(0, meritSlots);

      // Remaining players eligible for random selection
      const randomPool = sortedPlayers.filter(p => 
        !meritPlayers.find(mp => mp.id === p.id)
      );

      // Make random selections
      const randomlySelected = shuffleArray(randomPool)
        .slice(0, game.random_slots);

      // Update merit players
      if (meritPlayers.length > 0) {
        await supabaseAdmin
          .from('game_registrations')
          .update({ 
            status: 'selected',
            randomly_selected: false 
          })
          .in('id', meritPlayers.map(p => p.id));
      }

      // Update randomly selected players
      if (randomlySelected.length > 0) {
        await supabaseAdmin
          .from('game_registrations')
          .update({ 
            status: 'selected',
            randomly_selected: true 
          })
          .in('id', randomlySelected.map(p => p.id));
      }

      // Update game status
      await supabaseAdmin
        .from('games')
        .update({ status: 'players_announced' })
        .eq('id', gameId);

      toast.success('Game reset and players reselected successfully');
      await fetchGames();
      if (selectedGameId === gameId) {
        await fetchRegistrations(gameId);
      }
    } catch (error) {
      console.error('Error resetting game:', error);
      toast.error('Failed to reset game');
    }
  };

  if (adminLoading) {
    return <div className="text-center mt-8">Loading...</div>
  }

  if (!isAdmin) {
    return <div className="text-center mt-8">Access denied. Admin only.</div>
  }

  return (
    <div className="container mx-auto mt-8 p-4">
      <Toaster position="top-right" />
      <motion.h1 
        className="text-3xl font-bold mb-6"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        Game Management
      </motion.h1>

      <FormContainer title="Upcoming Games">
        {isLoading ? (
          <div className="text-center py-4">Loading games...</div>
        ) : games.length === 0 ? (
          <div className="text-center py-4">No upcoming games found</div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {games.map((game) => (
              <GameCard
                key={game.id}
                game={game}
                showRegistrations={showRegistrations}
                selectedGame={selectedGame}
                onEditClick={handleEditGame}
                onViewRegistrations={handleViewRegistrations}
                onDeleteClick={handleDeleteGame}
                registrations={registrations.filter(r => r.game_id === game.id)}
                players={players}
                selectedPlayerId={selectedGameId}
                onPlayerSelect={setSelectedPlayerId}
                onRegisterPlayer={handleRegisterPlayers}
                onUnregisterPlayer={handleUnregisterPlayer}
                onRegistrationClose={handleRegistrationClose}
                onResetGameStatus={handleResetGameStatus}
              />
            ))}
          </div>
        )}
      </FormContainer>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <CreateGameForm
          venues={venues}
          onSubmit={handleSubmit}
          date={date}
          setDate={setDate}
          time={time}
          setTime={setTime}
          registrationStart={registrationStart}
          setRegistrationStart={setRegistrationStart}
          registrationEnd={registrationEnd}
          setRegistrationEnd={setRegistrationEnd}
          venueId={venueId}
          setVenueId={setVenueId}
          maxPlayers={maxPlayers}
          setMaxPlayers={setMaxPlayers}
          randomSlots={randomSlots}
          setRandomSlots={setRandomSlots}
          presets={presets}
          onPresetSelect={handlePresetSelect}
        />
        <VenueManagement
          venues={venues}
          onUpdate={fetchVenues}
        />
      </div>

      {isEditingGame && selectedGame && (
        <EditGameModal
          game={selectedGame}
          venues={venues}
          onClose={() => {
            setIsEditingGame(false)
            setSelectedGame(null)
          }}
          onSubmit={handleUpdateGame}
          // ... other props
        />
      )}

      {isRegistrationsModalOpen && selectedGameId && (
        <GameRegistrations
          gameId={selectedGameId}
          registrations={registrations.filter(r => r.game_id === selectedGameId)}
          players={players}
          onRegister={handleRegisterPlayers}
          onUnregister={handleUnregisterPlayer}
          onClose={handleCloseRegistrations}
        />
      )}
    </div>
  )
}

export default GameManagement

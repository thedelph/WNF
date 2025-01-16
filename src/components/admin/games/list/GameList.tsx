import React, { forwardRef, useImperativeHandle } from 'react';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import { supabase } from '../../../../utils/supabase';
import { Game } from '../../../../types/game';
import { GameCard } from '../GameCard';

interface GameListProps {
  onGameSelect: (game: Game) => void;
  onGameDelete: (gameId: string) => void;
  onShowRegistrations: (gameId: string) => void;
}

export const GameList = forwardRef<{ fetchGames: () => void }, GameListProps>(({
  onGameSelect,
  onGameDelete,
  onShowRegistrations,
}, ref) => {
  const [games, setGames] = React.useState<Game[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    fetchGames();
  }, []);

  const fetchGames = async () => {
    setIsLoading(true);
    
    const { data: gamesData, error: gamesError } = await supabase
      .from('games')
      .select(`
        id,
        date,
        status,
        max_players,
        random_slots,
        registration_window_start,
        registration_window_end,
        team_announcement_time,
        teams_announced,
        sequence_number,
        score_blue,
        score_orange,
        outcome,
        pitch_cost,
        venue:venues(
          id,
          name,
          address,
          google_maps_url
        ),
        game_registrations(
          id,
          status,
          selection_method,
          player:players!game_registrations_player_id_fkey(
            id,
            friendly_name,
            caps,
            active_bonuses,
            active_penalties,
            current_streak
          )
        )
      `)
      .gte('date', new Date().toISOString())
      .neq('status', 'completed')
      .order('date');

    if (gamesError) {
      console.error('Supabase error details:', gamesError);
      toast.error('Failed to fetch games');
      setIsLoading(false);
      return;
    }

    if (!gamesData) {
      console.error('No games data returned');
      setIsLoading(false);
      return;
    }

    // Add registrations_count to each game
    const gamesWithCounts = gamesData.map(game => ({
      ...game,
      registrations_count: game.game_registrations?.filter(reg => reg.status !== 'dropped_out').length || 0
    }));

    console.log('Games data:', gamesWithCounts);
    setGames(gamesWithCounts);
    setIsLoading(false);
  };

  // Expose fetchGames to parent component
  useImperativeHandle(ref, () => ({
    fetchGames
  }));

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {games.map((game) => (
        <motion.div
          key={game.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <GameCard
            game={game}
            onEditClick={onGameSelect}
            onViewRegistrations={onShowRegistrations}
            onDeleteClick={onGameDelete}
          />
        </motion.div>
      ))}
      {games.length === 0 && !isLoading && (
        <div className="text-center py-8">
          <p className="text-gray-500">No upcoming games found</p>
        </div>
      )}
    </div>
  );
});

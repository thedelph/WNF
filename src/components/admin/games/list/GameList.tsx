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
        *,
        venue:venues(*),
        registrations_count:game_registrations!game_registrations_game_id_fkey(count)
      `)
      .gte('date', new Date().toISOString())
      .neq('status', 'completed')
      .order('date');

    if (gamesError) {
      toast.error('Failed to fetch games');
      setIsLoading(false);
      return;
    }

    // Transform the data to handle the count properly
    const transformedGames = gamesData?.map(game => ({
      ...game,
      registrations_count: game.registrations_count?.[0]?.count || 0
    })) || [];

    setGames(transformedGames);
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

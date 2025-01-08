import { motion } from 'framer-motion';
import { PlayerStats } from '../../types/player';
import { User } from '@supabase/supabase-js';
import StarRating from '../StarRating';

interface PlayerRatingProps {
  player: PlayerStats;
  user: User | null;
  onRatePlayer: () => void;
  ratings: {
    attack: number;
    defense: number;
  };
  setRatings: (ratings: { attack: number; defense: number }) => void;
}

export const PlayerRating = ({ player, user, onRatePlayer, ratings, setRatings }: PlayerRatingProps) => {
  // If no user is logged in, don't show anything
  if (!user) return null;

  // If user is viewing their own profile
  if (user.id === player.id) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card bg-base-100 shadow-xl mb-8"
      >
        <div className="card-body">
          <h2 className="card-title">Player Rating</h2>
          <p className="text-gray-500">You cannot rate yourself</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card bg-base-100 shadow-xl mb-8"
    >
      <div className="card-body">
        <h2 className="card-title">Player Rating</h2>
        
        {player?.games_played_together !== undefined && (
          <>
            {player.games_played_together >= 5 ? (
              <div className="space-y-4">
                {player.my_rating && (
                  <div className="text-sm text-gray-600">
                    <p>Your Current Ratings:</p>
                    <p>Attack: {player.my_rating.attack_rating / 2} stars</p>
                    <p>Defense: {player.my_rating.defense_rating / 2} stars</p>
                  </div>
                )}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="btn btn-primary"
                  onClick={onRatePlayer}
                >
                  {player.my_rating ? 'Update Rating' : 'Rate Player'}
                </motion.button>
              </div>
            ) : (
              <p className="text-gray-500">
                You need to play {5 - player.games_played_together} more games with this player to rate them
              </p>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
};

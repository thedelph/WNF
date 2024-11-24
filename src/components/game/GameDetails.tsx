import React from 'react';
import { Game } from '../../types/game';
import { RegisteredPlayers } from './RegisteredPlayers';
import { calculatePlayerXP } from '../../utils/xpCalculations';
import { motion } from 'framer-motion';

interface GameDetailsProps {
  game: Game | null;
}

export const GameDetails: React.FC<GameDetailsProps> = ({ game }) => {
  if (!game) {
    return (
      <div className="text-center p-4">
        <p className="text-lg">No upcoming game scheduled</p>
      </div>
    );
  }

  const isRegistrationOpen = new Date() >= new Date(game.registration_window_start) 
    && new Date() <= new Date(game.registration_window_end);

  // Transform registrations for PlayerSelectionResults when status is 'players_announced'
  const getPlayerSelectionData = () => {
    if (!game.game_registrations) return { selectedPlayers: [], reservePlayers: [] };

    const transformPlayer = (registration: any) => ({
      id: registration.player?.id || '',
      friendly_name: registration.player?.friendly_name || '',
      isRandomlySelected: registration.randomly_selected,
      xp: calculatePlayerXP({
        caps: registration.player?.caps || 0,
        activeBonuses: registration.player?.active_bonuses || 0,
        activePenalties: registration.player?.active_penalties || 0,
        currentStreak: registration.player?.current_streak || 0
      })
    });

    const selectedPlayers = game.game_registrations
      .filter(reg => reg.status === 'selected')
      .map(transformPlayer);

    const reservePlayers = game.game_registrations
      .filter(reg => reg.status === 'reserve')
      .map(transformPlayer);

    return { selectedPlayers, reservePlayers };
  };

  const formatGameStatus = (status: string) => {
    return status
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  // Add this function near the top of the component
  const generateDebugData = (game: Game) => {
    return {
      gameDetails: {
        id: game.id,
        status: game.status,
        date: game.date,
        maxPlayers: game.max_players,
        randomSlots: game.random_slots,
        venue: game.venue,
        registrationWindow: {
          start: game.registration_window_start,
          end: game.registration_window_end,
          isOpen: new Date() >= new Date(game.registration_window_start) 
            && new Date() <= new Date(game.registration_window_end)
        }
      },
      registrations: game.game_registrations?.map(reg => ({
        id: reg.id,
        status: reg.status,
        randomly_selected: reg.randomly_selected,
        player: {
          id: reg.player?.id,
          name: reg.player?.friendly_name,
          caps: reg.player?.caps,
          bonuses: reg.player?.active_bonuses,
          penalties: reg.player?.active_penalties,
          streak: reg.player?.current_streak,
          calculatedXP: calculatePlayerXP({
            caps: reg.player?.caps || 0,
            activeBonuses: reg.player?.active_bonuses || 0,
            activePenalties: reg.player?.active_penalties || 0,
            currentStreak: reg.player?.current_streak || 0
          })
        }
      })),
      processedSelections: getPlayerSelectionData()
    };
  };

  // Add this function to handle the download
  const handleDebugDownload = () => {
    if (!game) return;
    
    const debugData = generateDebugData(game);
    const blob = new Blob([JSON.stringify(debugData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `game-details-debug-${game.id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const generateSelectionReasoning = (registration) => {
    if (registration.status === "selected") {
      if (registration.randomly_selected) {
        return {
          reason: "Random Selection",
          details: "Selected from random pool due to insufficient XP for merit selection",
          probability: calculateRandomProbability(registration),
          otherEligiblePlayers: countEligibleRandomPlayers(registration)
        };
      } else {
        return {
          reason: "Merit Selection",
          details: `Selected based on XP (${registration.player.calculatedXP})`,
          xpRank: calculateXPRank(registration),
          marginAboveCutoff: registration.player.calculatedXP - calculateXPCutoff()
        };
      }
    } else {
      return {
        reason: "Reserve",
        details: registration.player.calculatedXP >= calculateXPCutoff() 
          ? "Insufficient XP for merit selection"
          : "Not selected in random draw",
        nearestSelectionThreshold: calculateNearestThreshold(registration)
      };
    }
  };

  // Add validation checks
  const performValidationChecks = (game) => ({
    totalPlayers: {
      expected: game.max_players,
      actual: game.game_registrations.filter(r => r.status === "selected").length,
      valid: game.game_registrations.filter(r => r.status === "selected").length === game.max_players
    },
    randomSlots: {
      expected: game.random_slots,
      actual: game.game_registrations.filter(r => r.status === "selected" && r.randomly_selected).length,
      valid: game.game_registrations.filter(r => r.status === "selected" && r.randomly_selected).length === game.random_slots
    },
    meritSelection: {
      valid: validateMeritSelection(game),
      details: analyzeMeritSelectionAccuracy(game)
    },
    potentialIssues: identifyPotentialIssues(game)
  });

  return (
    <div className="space-y-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-base-200 rounded-lg p-6 shadow-lg"
      >
        <h2 className="text-2xl font-bold mb-4">Next Game Details</h2>
        
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold">Date & Time</h3>
            <p>{new Date(game.date).toLocaleString('en-GB', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}</p>
          </div>

          <div>
            <h3 className="font-semibold">Venue</h3>
            <p>{game.venue?.name}</p>
            <p className="text-sm">{game.venue?.address}</p>
            {game.venue?.google_maps_url && (
              <a 
                href={game.venue.google_maps_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:text-primary-focus text-sm"
              >
                View on Google Maps
              </a>
            )}
          </div>

          <div>
            <h3 className="font-semibold">Registration Window</h3>
            <p>Opens: {new Date(game.registration_window_start).toLocaleString('en-GB')}</p>
            <p>Closes: {new Date(game.registration_window_end).toLocaleString('en-GB')}</p>
          </div>

          <div>
            <h3 className="font-semibold">Game Status</h3>
            <span className={`badge ${
              game.status === 'open' ? 'badge-primary' :
              game.status === 'players_announced' ? 'badge-success' :
              'badge-info'
            }`}>
              {formatGameStatus(game.status)}
            </span>
          </div>

          <div>
            <h3 className="font-semibold">Player Slots</h3>
            <p>{game.max_players} players total</p>
            <p>{game.random_slots} random selection slots</p>
          </div>
        </div>

        {/* Add this before the closing motion.div */}
        <div className="mt-4">
          <button 
            onClick={handleDebugDownload}
            className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded text-sm"
          >
            Download Debug Data
          </button>
        </div>
      </motion.div>

      {/* Show registered players if registration is open */}
      {isRegistrationOpen && game.game_registrations && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h3 className="text-xl font-semibold mb-4">Registered Players</h3>
          <RegisteredPlayers registrations={game.game_registrations} />
        </motion.div>
      )}
    </div>
  );
};

export default GameDetails; 
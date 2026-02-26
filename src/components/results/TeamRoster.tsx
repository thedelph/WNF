/**
 * TeamRoster - Displays team sheets for Blue and Orange teams
 * Shows player names with links to profiles in a collapsible section
 * Highlights the current logged-in user if they played
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, ChevronDown, ChevronUp } from 'lucide-react';
import { GameDetailRegistration } from '../../hooks/useGameDetail';
import { useUser } from '../../hooks/useUser';

interface TeamRosterProps {
  blueTeam: GameDetailRegistration[];
  orangeTeam: GameDetailRegistration[];
  reserves: GameDetailRegistration[];
  defaultExpanded?: boolean;
  teamLeft?: 'blue' | 'orange';
}

export const TeamRoster: React.FC<TeamRosterProps> = ({
  blueTeam,
  orangeTeam,
  reserves,
  defaultExpanded = true,
  teamLeft = 'blue',
}) => {
  const isSwapped = teamLeft === 'orange';
  const { player: currentPlayer } = useUser();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const renderPlayerList = (
    players: GameDetailRegistration[],
    teamColor?: 'blue' | 'orange'
  ) => {
    if (players.length === 0) {
      return (
        <div className="text-sm text-base-content/50 italic">
          No players recorded
        </div>
      );
    }

    return (
      <ul className="space-y-1">
        {players.map((reg, index) => {
          const isCurrentUser = currentPlayer?.id === reg.player.id;

          return (
            <motion.li
              key={reg.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.03 }}
            >
              <Link
                to={`/player/${reg.player.id}`}
                className={`flex items-center gap-2 p-2 rounded-lg transition-colors group ${
                  isCurrentUser
                    ? 'bg-primary/10 ring-1 ring-primary/30'
                    : teamColor === 'blue'
                    ? 'hover:bg-blue-500/10'
                    : teamColor === 'orange'
                    ? 'hover:bg-orange-500/10'
                    : 'hover:bg-base-200'
                }`}
              >
                {/* Avatar */}
                {reg.player.avatar_svg ? (
                  <img
                    src={reg.player.avatar_svg}
                    alt={reg.player.friendly_name}
                    className={`w-8 h-8 rounded-full flex-shrink-0 ${
                      isCurrentUser ? 'ring-2 ring-primary' : 'bg-base-200'
                    }`}
                  />
                ) : (
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    isCurrentUser ? 'bg-primary/20 ring-2 ring-primary' : 'bg-base-200'
                  }`}>
                    <span className={`text-xs ${isCurrentUser ? 'text-primary font-semibold' : 'text-base-content/50'}`}>
                      {reg.player.friendly_name?.charAt(0) || '?'}
                    </span>
                  </div>
                )}

                {/* Name */}
                <span
                  className={`text-sm group-hover:underline ${
                    isCurrentUser
                      ? 'font-semibold text-primary'
                      : teamColor === 'blue'
                      ? 'group-hover:text-blue-500'
                      : teamColor === 'orange'
                      ? 'group-hover:text-orange-500'
                      : ''
                  }`}
                >
                  {reg.player.friendly_name}
                </span>

                {/* "You" badge */}
                {isCurrentUser && (
                  <span className="badge badge-xs badge-primary ml-auto">You</span>
                )}
              </Link>
            </motion.li>
          );
        })}
      </ul>
    );
  };

  const totalPlayers = blueTeam.length + orangeTeam.length + reserves.length;

  return (
    <div className="space-y-4">
      {/* Collapsible Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 bg-base-200 rounded-lg hover:bg-base-300 transition-colors"
      >
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          Team Sheets
          <span className="badge badge-sm badge-primary">{totalPlayers}</span>
        </h3>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-base-content/50" />
        ) : (
          <ChevronDown className="w-5 h-5 text-base-content/50" />
        )}
      </button>

      {/* Collapsible Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="space-y-4">
              {/* Team Grids */}
              <div className="grid gap-4 md:grid-cols-2">
                {/* Left Team */}
                <div className={`card ${isSwapped ? 'bg-orange-500/5 border border-orange-500/20' : 'bg-blue-500/5 border border-blue-500/20'}`}>
                  <div className="card-body p-4">
                    <h4 className={`card-title text-base ${isSwapped ? 'text-orange-500' : 'text-blue-500'}`}>
                      {isSwapped ? 'Orange' : 'Blue'} Team
                      <span className={`badge badge-sm ${isSwapped ? 'bg-orange-500/20 text-orange-500 border-orange-500/30' : 'bg-blue-500/20 text-blue-500 border-blue-500/30'}`}>
                        {isSwapped ? orangeTeam.length : blueTeam.length}
                      </span>
                    </h4>
                    {renderPlayerList(isSwapped ? orangeTeam : blueTeam, isSwapped ? 'orange' : 'blue')}
                  </div>
                </div>

                {/* Right Team */}
                <div className={`card ${isSwapped ? 'bg-blue-500/5 border border-blue-500/20' : 'bg-orange-500/5 border border-orange-500/20'}`}>
                  <div className="card-body p-4">
                    <h4 className={`card-title text-base ${isSwapped ? 'text-blue-500' : 'text-orange-500'}`}>
                      {isSwapped ? 'Blue' : 'Orange'} Team
                      <span className={`badge badge-sm ${isSwapped ? 'bg-blue-500/20 text-blue-500 border-blue-500/30' : 'bg-orange-500/20 text-orange-500 border-orange-500/30'}`}>
                        {isSwapped ? blueTeam.length : orangeTeam.length}
                      </span>
                    </h4>
                    {renderPlayerList(isSwapped ? blueTeam : orangeTeam, isSwapped ? 'blue' : 'orange')}
                  </div>
                </div>
              </div>

              {/* Reserves */}
              {reserves.length > 0 && (
                <div className="card bg-base-200">
                  <div className="card-body p-4">
                    <h4 className="card-title text-base-content/70 text-base">
                      Reserves
                      <span className="badge badge-sm badge-ghost">
                        {reserves.length}
                      </span>
                    </h4>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {reserves.map((reg) => {
                        const isCurrentUser = currentPlayer?.id === reg.player.id;
                        return (
                          <Link
                            key={reg.id}
                            to={`/player/${reg.player.id}`}
                            className={`badge transition-colors ${
                              isCurrentUser
                                ? 'badge-primary'
                                : 'badge-outline hover:badge-primary'
                            }`}
                          >
                            {reg.player.friendly_name}
                            {isCurrentUser && ' (You)'}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TeamRoster;

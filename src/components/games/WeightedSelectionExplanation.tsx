import React from 'react';
import { Tooltip } from '../ui/Tooltip';

interface PlayerWeight {
  id: string;
  friendly_name: string;
  benchWarmerStreak: number;
  total_points: number;
  probability: number;
  whatsapp_group_member: string;
}

interface WeightedSelectionExplanationProps {
  players: PlayerWeight[];
  numSlots: number;
}

export const WeightedSelectionExplanation: React.FC<WeightedSelectionExplanationProps> = ({
  players,
  numSlots
}) => {
  // Group players by WhatsApp status
  const whatsappMembers = players.filter(p => 
    p.whatsapp_group_member === 'Yes' || p.whatsapp_group_member === 'Proxy'
  );
  const nonWhatsappMembers = players.filter(p => 
    p.whatsapp_group_member === 'No' || !p.whatsapp_group_member
  );

  // Calculate probabilities for each group
  const calculateGroupProbabilities = (groupPlayers: PlayerWeight[]) => {
    const totalPoints = groupPlayers.reduce((sum, p) => sum + (1 + p.benchWarmerStreak), 0);
    return groupPlayers.map(player => ({
      ...player,
      total_points: 1 + player.benchWarmerStreak,
      probability: ((1 + player.benchWarmerStreak) / totalPoints) * 100
    }));
  };

  const renderPlayerList = (players: PlayerWeight[], wasGroupUsed: boolean) => {
    const playersWithProbs = calculateGroupProbabilities(players);
    return playersWithProbs.map(player => (
      <li key={player.id} className="mb-2">
        <div className="flex items-center justify-between">
          <span className="font-semibold">{player.friendly_name}</span>
          <Tooltip content={`
            Base points: 1
            + ${player.benchWarmerStreak} (reserve streak)
            = ${player.total_points} total points
            ${!wasGroupUsed ? '\nThis group was not used in the final selection' : ''}
          `}>
            <span className={`${wasGroupUsed ? 'text-info' : 'text-base-content opacity-50'}`}>
              {wasGroupUsed ? `${Math.round(player.probability)}% chance` : 'Not considered'}
              <span className="text-xs ml-2">
                ({player.total_points} pts)
              </span>
            </span>
          </Tooltip>
        </div>
      </li>
    ));
  };

  // Determine if each group was used
  const whatsappGroupUsed = whatsappMembers.length > 0;
  const nonWhatsappGroupUsed = whatsappMembers.length < numSlots;

  return (
    <div className="space-y-4">
      <div className="mb-4">
        <h4 className="font-bold mb-2">Selection Process</h4>
        <p className="text-sm mb-2">
          Players were weighted based on their reserve streak. Each player had:
        </p>
        <ul className="list-disc pl-4 text-sm mb-4">
          <li>1 base point</li>
          <li>+1 point per game as reserve</li>
        </ul>
      </div>

      {whatsappMembers.length > 0 && (
        <div className="mb-4">
          <h5 className="font-semibold mb-2">WhatsApp Members ({whatsappMembers.length})</h5>
          {whatsappMembers.length >= numSlots ? (
            <p className="text-sm text-info mb-2">
              All {numSlots} slots were filled from this group
            </p>
          ) : (
            <p className="text-sm text-info mb-2">
              {whatsappMembers.length} slots were filled from this group, 
              {numSlots - whatsappMembers.length} remaining
            </p>
          )}
          <ul className="list-none pl-4">
            {renderPlayerList(whatsappMembers, whatsappGroupUsed)}
          </ul>
        </div>
      )}

      {nonWhatsappMembers.length > 0 && (
        <div className="mb-4">
          <h5 className="font-semibold mb-2">Non-WhatsApp Members ({nonWhatsappMembers.length})</h5>
          {whatsappMembers.length >= numSlots ? (
            <p className="text-sm text-warning mb-2">
              This group was not used as all slots were filled by WhatsApp members
            </p>
          ) : (
            <p className="text-sm text-info mb-2">
              {numSlots - whatsappMembers.length} slots were filled from this group
            </p>
          )}
          <ul className="list-none pl-4">
            {renderPlayerList(nonWhatsappMembers, nonWhatsappGroupUsed)}
          </ul>
        </div>
      )}
    </div>
  );
};

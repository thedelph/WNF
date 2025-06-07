import React from 'react'
import { Game } from '../../../../types/game'

interface Props {
  game: Game
}

const GameTeamList: React.FC<Props> = ({ game }) => {
  const blueTeam = game.game_registrations.filter(reg => reg.team === 'blue')
  const orangeTeam = game.game_registrations.filter(reg => reg.team === 'orange')

  return (
    <div className="grid grid-cols-2 gap-4 mt-4">
      <div>
        <h4 className="font-semibold text-blue-500 mb-2">Blue Team</h4>
        <ul className="space-y-1">
          {blueTeam.map(reg => (
            <li key={reg.id} className="text-sm">
              {reg.player.friendly_name}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h4 className="font-semibold text-orange-500 mb-2">Orange Team</h4>
        <ul className="space-y-1">
          {orangeTeam.map(reg => (
            <li key={reg.id} className="text-sm">
              {reg.player.friendly_name}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export default GameTeamList

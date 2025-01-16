import React, { useState } from 'react'
import { Tooltip } from '../../../ui/Tooltip'
import { ParsedGameInfo, ParsedTeams } from '../types'
import { parseGameMessage, parseTeamsMessage } from '../utils/messageParsers'

interface Props {
  onParsed: (gameInfo: ParsedGameInfo, teams: ParsedTeams) => void
  onError: (error: string) => void
}

export const GameMessagesParser: React.FC<Props> = ({ onParsed, onError }) => {
  const [gameMessage, setGameMessage] = useState('')
  const [teamsMessage, setTeamsMessage] = useState('')

  const handleParse = () => {
    if (!gameMessage.trim() || !teamsMessage.trim()) {
      onError('Both Game Message and Teams Message are required')
      return
    }

    const parsedGame = parseGameMessage(gameMessage)
    if (!parsedGame) {
      onError('Failed to parse game message. Please check the format.')
      return
    }

    const parsedTeams = parseTeamsMessage(teamsMessage)
    if (!parsedTeams) {
      onError('Failed to parse teams message. Please check the format.')
      return
    }

    onParsed(parsedGame, parsedTeams)
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="form-control">
        <label className="label">
          <span className="label-text">Game Message</span>
          <Tooltip content="Paste the WhatsApp game announcement message here" side="right">
            <span className="label-text-alt cursor-help">ℹ️</span>
          </Tooltip>
        </label>
        <textarea
          className="textarea textarea-bordered h-48"
          value={gameMessage}
          onChange={(e) => setGameMessage(e.target.value)}
          placeholder="Paste game message here..."
        />
      </div>

      <div className="form-control">
        <label className="label">
          <span className="label-text">Teams Message</span>
          <Tooltip content="Paste the WhatsApp teams announcement message here" side="right">
            <span className="label-text-alt cursor-help">ℹ️</span>
          </Tooltip>
        </label>
        <textarea
          className="textarea textarea-bordered h-48"
          value={teamsMessage}
          onChange={(e) => setTeamsMessage(e.target.value)}
          placeholder="Paste teams message here..."
        />
      </div>

      <div className="col-span-2">
        <button 
          type="button"
          className="btn btn-primary w-full"
          onClick={handleParse}
          disabled={!gameMessage.trim() || !teamsMessage.trim()}
        >
          Parse Messages
        </button>
      </div>
    </div>
  )
}

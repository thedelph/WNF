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
      <fieldset className="fieldset">
        <legend className="fieldset-legend flex items-center gap-2">
          Game Message
          <Tooltip content="Paste the WhatsApp game announcement message here" side="right">
            <span className="cursor-help">ℹ️</span>
          </Tooltip>
        </legend>
        <textarea
          className="textarea textarea-bordered h-48"
          value={gameMessage}
          onChange={(e) => setGameMessage(e.target.value)}
          placeholder="Paste game message here..."
        />
      </fieldset>

      <fieldset className="fieldset">
        <legend className="fieldset-legend flex items-center gap-2">
          Teams Message
          <Tooltip content="Paste the WhatsApp teams announcement message here" side="right">
            <span className="cursor-help">ℹ️</span>
          </Tooltip>
        </legend>
        <textarea
          className="textarea textarea-bordered h-48"
          value={teamsMessage}
          onChange={(e) => setTeamsMessage(e.target.value)}
          placeholder="Paste teams message here..."
        />
      </fieldset>

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

'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { supabaseAdmin } from '../../../utils/supabase'
import { toast } from 'react-hot-toast'
import { useVenues } from '../../../hooks/useVenues'
import { GameMessagesParser } from './forms/GameMessagesParser'
import { TeamPlayerList } from './forms/TeamPlayerList'
import { PlayerStatusLists } from './forms/PlayerStatusLists'
import {
  TeamPlayer,
  ReservePlayer,
  DropoutPlayer,
  ParsedGameInfo,
  ParsedTeams,
  GameOutcomeType,
  Player
} from './types'

interface Props {
  onGameAdded: () => void
}

const HistoricalGameForm: React.FC<Props> = ({ onGameAdded }) => {
  // Form state
  const [date, setDate] = useState('')
  const [venueId, setVenueId] = useState('')
  const [blueScore, setBlueScore] = useState('')
  const [orangeScore, setOrangeScore] = useState('')
  const [bluePlayers, setBluePlayers] = useState<TeamPlayer[]>([])
  const [orangePlayers, setOrangePlayers] = useState<TeamPlayer[]>([])
  const [reservePlayers, setReservePlayers] = useState<ReservePlayer[]>([])
  const [dropoutPlayers, setDropoutPlayers] = useState<DropoutPlayer[]>([])
  const [outcome, setOutcome] = useState<GameOutcomeType>(null)
  
  // UI state
  const [availablePlayers, setAvailablePlayers] = useState<Player[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [parseError, setParseError] = useState<string | null>(null)
  
  const { venues, isLoading: venuesLoading } = useVenues()

  useEffect(() => {
    fetchPlayers()
  }, [])

  const fetchPlayers = async () => {
    try {
      console.log('Fetching players...')
      const { data: players, error } = await supabaseAdmin
        .from('players')
        .select('*')
        .order('friendly_name')

      if (error) throw error
      
      console.log('Fetched players:', players)
      setAvailablePlayers(players)
    } catch (error) {
      console.error('Error fetching players:', error)
      toast.error('Failed to load players')
    } finally {
      setIsLoading(false)
    }
  }

  const handleMessagesParsed = (parsedGame: ParsedGameInfo, parsedTeams: ParsedTeams) => {
    // Set form data
    setDate(parsedGame.date)
    const venueMatch = venues.find(v => v.name.toLowerCase().includes(parsedGame.venue.toLowerCase()))
    if (venueMatch) {
      setVenueId(venueMatch.id)
    }

    // Clear existing players
    setBluePlayers([])
    setOrangePlayers([])
    setReservePlayers([])
    setDropoutPlayers([])

    // Map parsed players to available players
    const mapPlayer = (playerInfo: { name: string; xp: number }) => {
      console.log('Trying to map player:', playerInfo.name)
      console.log('Available players:', availablePlayers.map(p => p.friendly_name))
      
      // Normalize the search name by replacing non-breaking spaces with regular spaces
      const normalizeString = (str: string) => 
        str.toLowerCase()
           .replace(/\u00A0/g, ' ') // Replace non-breaking spaces with regular spaces
           .replace(/\s+/g, ' ')    // Replace multiple spaces with single space
           .trim()                  // Remove leading/trailing spaces

      const searchName = normalizeString(playerInfo.name)
      
      // Try exact match first
      let player = availablePlayers.find(p => {
        const dbName = normalizeString(p.friendly_name)
        console.log(`Comparing normalized names:`)
        console.log(`DB name: "${dbName}"`)
        console.log(`Search name: "${searchName}"`)
        return dbName === searchName
      })

      // If no exact match, try partial match
      if (!player) {
        player = availablePlayers.find(p => {
          const dbName = normalizeString(p.friendly_name)
          const playerNameParts = searchName.split(' ')
          
          // Handle cases like "Ryan J" matching "Ryan"
          if (playerNameParts.length > 1) {
            const firstNameMatch = playerNameParts[0] === dbName
            console.log(`Checking first name match: ${dbName} against ${playerNameParts[0]}: ${firstNameMatch}`)
            return firstNameMatch
          }
          
          const partialMatch = dbName.includes(searchName) || searchName.includes(dbName)
          console.log(`Checking partial match: ${dbName} against ${searchName}: ${partialMatch}`)
          return partialMatch
        })
      }

      if (!player) {
        console.warn(`Could not find player match for: ${playerInfo.name}`)
      } else {
        console.log(`Successfully mapped ${playerInfo.name} to ${player.friendly_name}`)
      }
      return player
    }

    // Add merit-selected players
    const selectedPlayers: TeamPlayer[] = []
    for (const playerInfo of parsedGame.selectedPlayers) {
      const player = mapPlayer(playerInfo)
      if (player) {
        const teamPlayer = { 
          id: player.id, 
          name: player.friendly_name,
          selectionType: 'merit' as const
        }
        selectedPlayers.push(teamPlayer)
      } else {
        setParseError(`Could not find player: ${playerInfo.name}`)
        return
      }
    }

    // Add random-selected players
    for (const playerInfo of parsedGame.randomPlayers) {
      const player = mapPlayer(playerInfo)
      if (player) {
        const teamPlayer = { 
          id: player.id, 
          name: player.friendly_name,
          selectionType: 'random' as const
        }
        selectedPlayers.push(teamPlayer)
      } else {
        setParseError(`Could not find player: ${playerInfo.name}`)
        return
      }
    }

    // Add reserve players
    for (const playerInfo of parsedGame.reservePlayers) {
      const player = mapPlayer(playerInfo)
      if (player) {
        const reservePlayer: ReservePlayer = {
          id: player.id,
          name: player.friendly_name,
          isWhatsAppMember: true
        }
        setReservePlayers(prev => [...prev, reservePlayer])
      } else {
        console.warn(`Could not find reserve player: ${playerInfo.name}`)
      }
    }

    // Assign players to teams
    const assignTeamPlayers = (teamList: string[], team: 'blue' | 'orange') => {
      teamList.forEach(playerName => {
        const player = selectedPlayers.find(p => 
          p.name.toLowerCase() === playerName.toLowerCase()
        )
        if (!player) {
          setParseError(`Player ${playerName} was not in the selected players list`)
          return
        }
        if (team === 'blue') {
          setBluePlayers(prev => [...prev, player])
        } else {
          setOrangePlayers(prev => [...prev, player])
        }
      })
    }

    assignTeamPlayers(parsedTeams.blueTeam, 'blue')
    assignTeamPlayers(parsedTeams.orangeTeam, 'orange')

    setParseError(null)
  }

  const addReservePlayer = (player: Player, isWhatsAppMember: boolean) => {
    const reservePlayer = { 
      id: player.id, 
      name: player.friendly_name,
      isWhatsAppMember 
    }
    setReservePlayers([...reservePlayers, reservePlayer])
  }

  const removeReservePlayer = (playerId: string) => {
    setReservePlayers(reservePlayers.filter(p => p.id !== playerId))
  }

  const addDropoutPlayer = (player: Player, reason?: string) => {
    const dropoutPlayer = { 
      id: player.id, 
      name: player.friendly_name,
      reason 
    }
    setDropoutPlayers([...dropoutPlayers, dropoutPlayer])
  }

  const removeDropoutPlayer = (playerId: string) => {
    setDropoutPlayers(dropoutPlayers.filter(p => p.id !== playerId))
  }

  const handleDropoutReasonChange = (playerId: string, reason: string) => {
    setDropoutPlayers(dropoutPlayers.map(p => 
      p.id === playerId ? { ...p, reason } : p
    ))
  }

  const determineOutcome = (blue: string, orange: string, manualOutcome: GameOutcomeType): GameOutcomeType => {
    if (manualOutcome) return manualOutcome
    if (blue === '' || orange === '') return null
    const blueNum = parseInt(blue)
    const orangeNum = parseInt(orange)
    if (blueNum > orangeNum) return 'blue_win'
    if (orangeNum > blueNum) return 'orange_win'
    return 'draw'
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      const [year, month, day] = date.split('-').map(num => parseInt(num))
      
      const gameDate = new Date(Date.UTC(year, month - 1, day, 20, 0, 0))
      const startDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0))
      const endDate = new Date(Date.UTC(year, month - 1, day, 20, 0, 0))

      const gameData = {
        date: gameDate.toISOString(),
        score_blue: blueScore === '' ? null : parseInt(blueScore),
        score_orange: orangeScore === '' ? null : parseInt(orangeScore),
        status: 'completed',
        is_historical: true,
        registration_window_start: startDate.toISOString(),
        registration_window_end: endDate.toISOString(),
        max_players: Math.max(bluePlayers.length + orangePlayers.length, 10),
        random_slots: bluePlayers.filter(p => p.selectionType === 'random').length + 
                     orangePlayers.filter(p => p.selectionType === 'random').length,
        outcome: determineOutcome(blueScore, orangeScore, outcome),
        venue_id: venueId
      }

      const { data: game, error: gameError } = await supabaseAdmin
        .from('games')
        .insert(gameData)
        .select()
        .single()

      if (gameError) throw gameError

      // Insert game selections
      const selectionData = {
        game_id: game.id,
        selected_players: [
          ...bluePlayers.map(p => ({ 
            id: p.id, 
            team: 'blue', 
            selection_method: p.selectionType || 'merit'
          })),
          ...orangePlayers.map(p => ({ 
            id: p.id, 
            team: 'orange', 
            selection_method: p.selectionType || 'merit'
          }))
        ],
        reserve_players: reservePlayers.map(p => ({
          id: p.id,
          whatsapp_member: p.isWhatsAppMember
        })),
        selection_metadata: {
          is_historical: true,
          dropouts: dropoutPlayers.map(p => ({
            id: p.id,
            reason: p.reason
          }))
        }
      }

      const { error: selectionError } = await supabaseAdmin
        .from('game_selections')
        .insert(selectionData)

      if (selectionError) throw selectionError

      // Insert game registrations for all players
      const allRegistrations = [
        // Selected players
        ...bluePlayers.map(player => ({
          game_id: game.id,
          player_id: player.id,
          team: 'blue',
          status: 'selected'
        })),
        ...orangePlayers.map(player => ({
          game_id: game.id,
          player_id: player.id,
          team: 'orange',
          status: 'selected'
        })),
        // Reserve players
        ...reservePlayers.map(player => ({
          game_id: game.id,
          player_id: player.id,
          team: null,
          status: 'reserve'
        })),
        // Dropout players
        ...dropoutPlayers.map(player => ({
          game_id: game.id,
          player_id: player.id,
          team: null,
          status: 'dropped_out'
        }))
      ]

      const { error: registrationError } = await supabaseAdmin
        .from('game_registrations')
        .insert(allRegistrations)

      if (registrationError) throw registrationError

      // Verify both game_registrations and game_selections were created
      const { data: verifyData, error: verifyError } = await supabaseAdmin
        .from('game_selections')
        .select('id')
        .eq('game_id', game.id)
        .single()

      if (verifyError || !verifyData) {
        throw new Error('Game selections were not created properly')
      }

      // Update caps for selected players only
      // First, fetch current caps for all selected players
      const selectedPlayerIds = [...bluePlayers, ...orangePlayers].map(p => p.id)
      const { data: playersData, error: fetchError } = await supabaseAdmin
        .from('players')
        .select('id, caps')
        .in('id', selectedPlayerIds)

      if (fetchError) {
        console.error('Error fetching player caps:', fetchError)
        toast.error('Failed to fetch player caps for update')
      } else if (playersData) {
        for (const playerData of playersData) {
          const currentCaps = playerData.caps ?? 0
          const { error: capsError } = await supabaseAdmin
            .from('players')
            .update({ caps: currentCaps + 1 })
            .eq('id', playerData.id)

          if (capsError) {
            console.error(`Error updating caps for player ${playerData.id}:`, capsError)
            const playerName = [...bluePlayers, ...orangePlayers].find(p => p.id === playerData.id)?.name
            toast.error(`Failed to update caps for ${playerName}`)
          }
        }
      }

      console.log('Updated caps for players:', [...bluePlayers, ...orangePlayers].map(p => p.name))
      
      toast.success('Historical game and caps added successfully')
      onGameAdded()
      resetForm()
    } catch (error) {
      console.error('Error adding historical game:', error)
      toast.error('Failed to add historical game')
    } finally {
      setIsSaving(false)
    }
  }

  const resetForm = () => {
    setDate('')
    setBlueScore('')
    setOrangeScore('')
    setBluePlayers([])
    setOrangePlayers([])
    setReservePlayers([])
    setDropoutPlayers([])
    setOutcome(null)
  }

  if (isLoading || venuesLoading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex justify-center items-center h-64"
      >
        <div className="loading loading-spinner loading-lg text-primary"></div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card bg-base-100 shadow-xl"
    >
      <div className="card-body">
        <h2 className="card-title text-2xl font-bold mb-6">Add Historical Game</h2>

        <div className="mb-6">
          <GameMessagesParser 
            onParsed={handleMessagesParsed}
            onError={setParseError}
          />
        </div>

        {parseError && (
          <div className="alert alert-error mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{parseError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <fieldset className="fieldset">
            <legend className="fieldset-legend">Date</legend>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="input w-full"
              required
            />
          </fieldset>

          <fieldset className="fieldset">
            <legend className="fieldset-legend">Venue</legend>
            <select
              className="select w-full"
              value={venueId}
              onChange={(e) => setVenueId(e.target.value)}
            >
              <option value="">Select a venue...</option>
              {venues.map(venue => (
                <option key={venue.id} value={venue.id}>
                  {venue.name}
                </option>
              ))}
            </select>
          </fieldset>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <TeamPlayerList
              label="Blue Team"
              players={availablePlayers}
              selectedPlayers={bluePlayers}
              otherTeamPlayers={[...orangePlayers]}
              onAddPlayer={(player) => {
                const teamPlayer: TeamPlayer = {
                  id: player.id,
                  name: player.friendly_name,
                  selectionType: 'merit' as const
                }
                setBluePlayers([...bluePlayers, teamPlayer])
              }}
              onRemovePlayer={(playerId) => {
                setBluePlayers(bluePlayers.filter(p => p.id !== playerId))
              }}
              onSelectionTypeChange={(playerId, type) => {
                setBluePlayers(bluePlayers.map(p => 
                  p.id === playerId ? { ...p, selectionType: type } : p
                ))
              }}
            />
            <TeamPlayerList
              label="Orange Team"
              players={availablePlayers}
              selectedPlayers={orangePlayers}
              otherTeamPlayers={[...bluePlayers]}
              onAddPlayer={(player) => {
                const teamPlayer: TeamPlayer = {
                  id: player.id,
                  name: player.friendly_name,
                  selectionType: 'merit' as const
                }
                setOrangePlayers([...orangePlayers, teamPlayer])
              }}
              onRemovePlayer={(playerId) => {
                setOrangePlayers(orangePlayers.filter(p => p.id !== playerId))
              }}
              onSelectionTypeChange={(playerId, type) => {
                setOrangePlayers(orangePlayers.map(p => 
                  p.id === playerId ? { ...p, selectionType: type } : p
                ))
              }}
            />
          </div>

          <PlayerStatusLists
            availablePlayers={availablePlayers}
            reservePlayers={reservePlayers}
            dropoutPlayers={dropoutPlayers}
            onAddReserve={addReservePlayer}
            onRemoveReserve={removeReservePlayer}
            onAddDropout={addDropoutPlayer}
            onRemoveDropout={removeDropoutPlayer}
            onDropoutReasonChange={handleDropoutReasonChange}
            disabledPlayerIds={[
              ...bluePlayers.map(p => p.id),
              ...orangePlayers.map(p => p.id),
              ...reservePlayers.map(p => p.id),
              ...dropoutPlayers.map(p => p.id)
            ]}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <fieldset className="fieldset">
              <legend className="fieldset-legend">Blue Score (Optional)</legend>
              <input
                type="number"
                value={blueScore}
                onChange={(e) => setBlueScore(e.target.value)}
                className="input w-full"
                min="0"
              />
            </fieldset>

            <fieldset className="fieldset">
              <legend className="fieldset-legend">Orange Score (Optional)</legend>
              <input
                type="number"
                value={orangeScore}
                onChange={(e) => setOrangeScore(e.target.value)}
                className="input w-full"
                min="0"
              />
            </fieldset>
          </div>

          <fieldset className="fieldset">
            <legend className="fieldset-legend">Game Outcome (if scores unknown)</legend>
            <select
              className="select w-full"
              value={outcome || ''}
              onChange={(e) => setOutcome(e.target.value as GameOutcomeType)}
              disabled={blueScore !== '' || orangeScore !== ''}
            >
              <option value="">Unknown/Use Scores</option>
              <option value="blue_win">Blue Team Won</option>
              <option value="orange_win">Orange Team Won</option>
              <option value="draw">Draw</option>
            </select>
          </fieldset>

          <div className="card-actions justify-end">
            <button 
              type="submit" 
              className={`btn btn-primary ${isSaving ? 'loading' : ''}`}
              disabled={isSaving || 
                !date || 
                !venueId || 
                (bluePlayers.length === 0 && orangePlayers.length === 0)}
            >
              {isSaving ? 'Adding...' : 'Add Game'}
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  )
}

export default HistoricalGameForm
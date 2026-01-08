import Papa from 'papaparse'
import { supabaseAdmin } from './supabase'

interface CSVRow {
  Date: string
  'Player Name': string
  Team: string
  'Blue Score': string
  'Orange Score': string
}

interface ProcessedGame {
  date: string
  bluePlayers: string[]
  orangePlayers: string[]
  blueScore: number | null
  orangeScore: number | null
  outcome: string | null
}

export const parseHistoricalGamesCsv = async (file: File): Promise<ProcessedGame[]> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const rows = results.data as CSVRow[]
          
          // Get all player mappings first
          const { data: players, error: playerError } = await supabaseAdmin
            .from('players')
            .select('id, friendly_name')

          if (playerError) throw playerError

          const playerMap = new Map<string, string>(
            (players || []).map((p: { id: string; friendly_name: string }) => [p.friendly_name.toLowerCase(), p.id])
          )

          // Group rows by date
          const gamesByDate = rows.reduce((acc, row) => {
            const date = row.Date
            if (!acc[date]) {
              acc[date] = {
                bluePlayers: [],
                orangePlayers: [],
                blueScore: row['Blue Score'] ? parseInt(row['Blue Score']) : null,
                orangeScore: row['Orange Score'] ? parseInt(row['Orange Score']) : null
              }
            }

            const playerId = playerMap.get(row['Player Name'].toLowerCase())
            if (!playerId) {
              throw new Error(`Player not found: ${row['Player Name']}`)
            }

            if (row.Team.toLowerCase() === 'blue') {
              acc[date].bluePlayers.push(playerId)
            } else if (row.Team.toLowerCase() === 'orange') {
              acc[date].orangePlayers.push(playerId)
            }

            return acc
          }, {} as Record<string, Omit<ProcessedGame, 'date' | 'outcome'>>)

          // Convert to array and determine outcomes
          const processedGames = Object.entries(gamesByDate).map(([date, game]) => ({
            date,
            ...game,
            outcome: determineOutcome(game.blueScore, game.orangeScore)
          }))

          resolve(processedGames)
        } catch (error) {
          reject(error)
        }
      },
      error: (error) => reject(error)
    })
  })
}

const determineOutcome = (blueScore: number | null, orangeScore: number | null): string | null => {
  if (blueScore === null || orangeScore === null) return null
  if (blueScore > orangeScore) return 'blue_win'
  if (orangeScore > blueScore) return 'orange_win'
  return 'draw'
}

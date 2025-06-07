import { ParsedGameInfo, ParsedTeams } from '../types'

const getMonthNumber = (month: string): string => {
  const months: { [key: string]: string } = {
    'January': '01',
    'February': '02',
    'March': '03',
    'April': '04',
    'May': '05',
    'June': '06',
    'July': '07',
    'August': '08',
    'September': '09',
    'October': '10',
    'November': '11',
    'December': '12'
  }
  return months[month] || '01'
}

export const parseGameMessage = (message: string): ParsedGameInfo | null => {
  try {
    const lines = message.split('\n').map(line => line.trim())
    
    // Parse date
    const dateMatch = lines[0].match(/📅\s*(\w+)\s+(\d+)\w+\s+(\w+)\s+(\d+)/)
    if (!dateMatch) return null
    const [_, day, date, month, year] = dateMatch
    const dateStr = `${year}-${getMonthNumber(month)}-${date.padStart(2, '0')}`

    // Parse venue
    const venueLine = lines.find(line => line.startsWith('📍') && !line.includes('http'))
    const venue = venueLine ? venueLine.replace('📍', '').trim() : ''

    // Parse game number
    const gameNumberMatch = lines.find(line => line.includes('WNF #'))?.match(/WNF #(\d+)/)
    const gameNumber = gameNumberMatch ? parseInt(gameNumberMatch[1]) : 0

    // Parse max players
    const playersMatch = lines.find(line => line.includes('players'))?.match(/(\d+)\s+players/)
    const maxPlayers = playersMatch ? parseInt(playersMatch[1]) : 0

    // Parse players
    const selectedPlayers: { name: string; xp: number }[] = []
    const randomPlayers: { name: string; xp: number }[] = []
    const reservePlayers: { name: string; xp: number }[] = []

    let currentSection = ''
    for (const line of lines) {
      if (line.includes('✅ Selected Players:')) {
        currentSection = 'selected'
        continue
      } else if (line.includes('🎲 Randomly Selected:')) {
        currentSection = 'random'
        continue
      } else if (line.includes('🔄 Reserves')) {
        currentSection = 'reserves'
        continue
      }

      const playerMatch = line.match(/(.+?)\s*\((\d+)\s*XP\)/)
      if (!playerMatch) continue

      const [_, name, xpStr] = playerMatch
      const xp = parseInt(xpStr)

      if (currentSection === 'selected') {
        selectedPlayers.push({ name: name.trim(), xp })
      } else if (currentSection === 'random') {
        randomPlayers.push({ name: name.trim(), xp })
      } else if (currentSection === 'reserves') {
        reservePlayers.push({ name: name.trim(), xp })
      }
    }

    return {
      date: dateStr,
      time: lines[1].replace('⏰', '').trim(),
      gameNumber,
      venue,
      maxPlayers,
      selectedPlayers,
      randomPlayers,
      reservePlayers
    }
  } catch (error) {
    console.error('Error parsing game message:', error)
    return null
  }
}

export const parseTeamsMessage = (message: string): ParsedTeams | null => {
  try {
    const lines = message.split('\n').map(line => line.trim())
    
    const orangeTeam: string[] = []
    const blueTeam: string[] = []
    
    let currentTeam = ''
    for (const line of lines) {
      if (line.includes('🟠 Orange')) {
        currentTeam = 'orange'
        continue
      } else if (line.includes('🔵 Blue')) {
        currentTeam = 'blue'
        continue
      }

      // Skip empty lines and header lines
      if (!line || line.startsWith('⚽') || line.includes('Starting teams')) continue

      // Normalize the name by removing any extra spaces
      const normalizedName = line.replace(/\s+/g, ' ').trim()
      
      if (currentTeam === 'orange' && normalizedName) {
        orangeTeam.push(normalizedName)
      } else if (currentTeam === 'blue' && normalizedName) {
        blueTeam.push(normalizedName)
      }
    }

    return {
      orangeTeam,
      blueTeam
    }
  } catch (error) {
    console.error('Error parsing teams message:', error)
    return null
  }
}

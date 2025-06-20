import React from 'react';
import { motion } from 'framer-motion';

interface GameDetailsPasteProps {
  onDateTimeExtracted: (date: string, time: string) => void;
  onPlayerListsExtracted: (selected: string[], random: string[], reserve: string[], droppedOut: string[], tokenUsers: string[]) => void;
  onMaxPlayersExtracted: (maxPlayers: number) => void;
  onTeamsExtracted?: (orangeTeam: string[], blueTeam: string[]) => void;
  gamePhase?: string;
}

/**
 * Enhanced component for pasting and parsing full game details
 * Now supports the updated WhatsApp message format from players_announced phase:
 * - Token players (🪙)
 * - Random selection players (🎲) 
 * - Players with unpaid games penalty (💰)
 * - Section headers with player counts: "Selected Players (18)", "Reserves in XP order (3)"
 */
export const GameDetailsPaste: React.FC<GameDetailsPasteProps> = ({
  onDateTimeExtracted,
  onPlayerListsExtracted,
  onMaxPlayersExtracted,
  onTeamsExtracted,
  gamePhase,
}) => {
  // Function to parse player names from a section of text
  const parsePlayerNamesFromSection = (text: string) => {
    return text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => {
        // Remove numbering (e.g., "17. ")
        line = line.replace(/^\d+\.\s*/, '');
        // Remove XP info
        line = line.replace(/\s*\(\d+\s*XP\).*$/, '');
        // Remove any emojis at the start (including multiple emojis like "🪙💰")
        line = line.replace(/^[\u{1F300}-\u{1F9FF}\u{1FA70}-\u{1FAFF}]+\s*/gu, '');
        
        console.log('Parsed player name from line:', { original: line, parsed: line.trim() });
        return line.trim();
      });
  };

  // Function to parse player names and identify random selections and token usage
  const parseSelectedPlayers = (text: string) => {
    const selectedPlayers: string[] = [];
    const randomPlayers: string[] = [];
    const tokenPlayers: string[] = [];

    text.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .forEach(line => {
        // Remove numbering (e.g., "17. ")
        let processedLine = line.replace(/^\d+\.\s*/, '');
        // Remove XP info
        processedLine = processedLine.replace(/\s*\(\d+\s*XP\).*$/, '');
        
        // Check if the line contains a dice emoji (🎲) - it might be combined with other emojis
        const isRandom = processedLine.includes('🎲');
        // Check if the line contains a token emoji (🪙)
        const isToken = processedLine.includes('🪙');
        
        // Remove all emojis at the start (🪙, 🎲, 💰, combinations)
        processedLine = processedLine.replace(/^[\u{1F300}-\u{1F9FF}\u{1FA70}-\u{1FAFF}]+\s*/gu, '');
        
        const playerName = processedLine.trim();
        if (playerName) {
          selectedPlayers.push(playerName);
          if (isRandom) {
            randomPlayers.push(playerName);
          }
          if (isToken) {
            tokenPlayers.push(playerName);
          }
        }
      });

    return { selectedPlayers, randomPlayers, tokenPlayers };
  };

  // Function to parse team announcement message
  const parseTeamAnnouncement = (text: string) => {
    const orangeTeam: string[] = [];
    const blueTeam: string[] = [];

    // Match Orange Team section
    const orangeMatch = text.match(/🟠\s*Orange Team[^:]*:\s*\n([\s\S]*?)(?=\n\n🔵|$)/);
    // Match Blue Team section
    const blueMatch = text.match(/🔵\s*Blue Team[^:]*:\s*\n([\s\S]*?)$/);

    if (orangeMatch) {
      const orangePlayers = orangeMatch[1]
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .map(line => {
          // Remove emoji prefix (👤)
          return line.replace(/^👤\s*/, '').trim();
        })
        .filter(name => name.length > 0);
      
      orangeTeam.push(...orangePlayers);
    }

    if (blueMatch) {
      const bluePlayers = blueMatch[1]
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .map(line => {
          // Remove emoji prefix (👤)
          return line.replace(/^👤\s*/, '').trim();
        })
        .filter(name => name.length > 0);
      
      blueTeam.push(...bluePlayers);
    }

    console.log('Parsed teams:', { orangeTeam, blueTeam });
    return { orangeTeam, blueTeam };
  };

  // Function to parse the full game details text
  const handleFullTextPaste = (text: string) => {
    // Check if this is a team announcement message
    if (text.includes('🟠 Orange Team') && text.includes('🔵 Blue Team')) {
      const { orangeTeam, blueTeam } = parseTeamAnnouncement(text);
      if (onTeamsExtracted) {
        onTeamsExtracted(orangeTeam, blueTeam);
      }
      return;
    }

    // Parse max players
    const maxPlayersMatch = text.match(/⚽\s*(\d+)\s*players/);
    if (maxPlayersMatch) {
      const maxPlayers = parseInt(maxPlayersMatch[1]);
      console.log('Extracted max players:', maxPlayers);
      onMaxPlayersExtracted(maxPlayers);
    }

    // Parse date and time
    const dateMatch = text.match(/📅\s*([^]*?)(?=\n|$)/);
    const timeMatch = text.match(/⏰\s*([^]*?)(?=\n|$)/);

    if (dateMatch && timeMatch) {
      const dateText = dateMatch[1].trim();
      const timeText = timeMatch[1].trim();

      console.log('Parsed date text:', dateText);
      console.log('Parsed time text:', timeText);

      // Extract date components using the date regex
      const dateRegex = /(\d+)(?:st|nd|rd|th)?\s+(\w+)(?:\s+(\d{4}|\d{2})?)?/;
      const dateComponents = dateText.match(dateRegex);
      
      if (!dateComponents) {
        console.error('Failed to parse date:', dateText);
        return;
      }

      let [, day, month, year] = dateComponents;
      
      // If year is not provided, use the next occurrence of the date
      if (!year) {
        const currentDate = new Date();
        year = currentDate.getFullYear().toString();
      } else if (year.length === 2) {
        // Handle 2-digit year
        year = '20' + year;
      }

      console.log('Extracted date components:', { day, month, year });

      // Convert month name to number
      const months: { [key: string]: string } = {
        'January': '01', 'February': '02', 'March': '03', 'April': '04',
        'May': '05', 'June': '06', 'July': '07', 'August': '08',
        'September': '09', 'October': '10', 'November': '11', 'December': '12'
      };
      
      const monthNum = months[month];
      if (!monthNum) {
        console.error('Invalid month:', month);
        return;
      }

      // Ensure day is a valid number
      const dayNum = parseInt(day);
      if (isNaN(dayNum) || dayNum < 1 || dayNum > 31) {
        console.error('Invalid day:', day);
        return;
      }
      
      const formattedDay = dayNum.toString().padStart(2, '0');
      
      // Format date as YYYY-MM-DD
      const formattedDate = `${year}-${monthNum}-${formattedDay}`;

      // Extract time
      const timeRegex = /(\d+):(\d+)([ap]m)/i;
      const timeComponents = timeText.match(timeRegex);
      
      if (!timeComponents) {
        console.error('Failed to parse time:', timeText);
        return;
      }

      const [, hours, minutes, period] = timeComponents;
      const isPM = period.toLowerCase() === 'pm';
      let hour24 = parseInt(hours);
      
      // Convert to 24-hour format
      if (isPM && hour24 !== 12) hour24 += 12;
      if (!isPM && hour24 === 12) hour24 = 0;
      
      const formattedTime = `${hour24.toString().padStart(2, '0')}:${minutes}`;

      console.log('Formatted date:', formattedDate);
      console.log('Formatted time:', formattedTime);

      onDateTimeExtracted(formattedDate, formattedTime);
    }

    // Find the sections by their headers (updated to handle new format with counts)
    const selectedPlayersMatch = text.match(/✅\s*Selected Players\s*\((\d+)\):\s*\n([\s\S]*?)(?=\n\n🔄|\n\n❌|$)/);
    const reservesMatch = text.match(/🔄\s*Reserves[^:]*\((\d+)\):\s*\n([\s\S]*?)(?=\n\n❌|$)/);
    const droppedOutMatch = text.match(/❌\s*Dropped Out\s*:?\s*\n([\s\S]*?)$/);
    
    // Also try legacy format without counts
    const legacySelectedPlayersMatch = !selectedPlayersMatch ? text.match(/✅\s*Selected Players:\s*\n\n([\s\S]*?)(?=\n\n🔄|\n\n❌|$)/) : null;
    const legacyReservesMatch = !reservesMatch ? text.match(/🔄\s*Reserves[^:]*:\s*\n\n([\s\S]*?)(?=\n\n❌|$)/) : null;

    console.log('Selected players section:', selectedPlayersMatch?.[2] || legacySelectedPlayersMatch?.[1]);
    console.log('Reserves section:', reservesMatch?.[2] || legacyReservesMatch?.[1]);
    console.log('Dropped out section:', droppedOutMatch?.[1]);

    // Parse player names from each section - handle both new format with counts and legacy format
    const selectedPlayersText = selectedPlayersMatch?.[2] || legacySelectedPlayersMatch?.[1];
    const reservesText = reservesMatch?.[2] || legacyReservesMatch?.[1];
    
    const { selectedPlayers, randomPlayers, tokenPlayers } = selectedPlayersText 
      ? parseSelectedPlayers(selectedPlayersText) 
      : { selectedPlayers: [], randomPlayers: [], tokenPlayers: [] };
    const reservePlayers = reservesText ? parsePlayerNamesFromSection(reservesText) : [];
    const droppedOutPlayers = droppedOutMatch ? parsePlayerNamesFromSection(droppedOutMatch[1]) : [];

    console.log('Parsed players:', {
      selected: selectedPlayers,
      random: randomPlayers,
      token: tokenPlayers,
      reserve: reservePlayers,
      droppedOut: droppedOutPlayers
    });

    onPlayerListsExtracted(selectedPlayers, randomPlayers, reservePlayers, droppedOutPlayers, tokenPlayers);
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="form-control"
    >
      <label className="label">
        <span className="label-text">
          {gamePhase === 'teams_announced' 
            ? 'Paste Player Registration or Team Announcement' 
            : 'Paste Full Game Details'}
        </span>
      </label>
      <textarea
        className="textarea textarea-bordered h-48"
        placeholder={
          gamePhase === 'teams_announced'
            ? "First paste the player registration message, then paste the team announcement (🟠 Orange Team / 🔵 Blue Team)..."
            : "Paste the full game details here, including date, time, and player lists with emojis (🪙 for tokens, 🎲 for random, 💰 for unpaid games)..."
        }
        onChange={(e) => handleFullTextPaste(e.target.value)}
      />
    </motion.div>
  );
};

export default GameDetailsPaste;

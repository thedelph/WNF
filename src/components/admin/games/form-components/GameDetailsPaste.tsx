import React from 'react';
import { motion } from 'framer-motion';

interface GameDetailsPasteProps {
  onDateTimeExtracted: (date: string, time: string) => void;
  onPlayerListsExtracted: (selected: string[], random: string[], reserve: string[], droppedOut: string[]) => void;
  onMaxPlayersExtracted: (maxPlayers: number) => void;
}

/**
 * Component for pasting and parsing full game details
 */
export const GameDetailsPaste: React.FC<GameDetailsPasteProps> = ({
  onDateTimeExtracted,
  onPlayerListsExtracted,
  onMaxPlayersExtracted,
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
        // Remove any emojis at the start (e.g., "🔄 ")
        line = line.replace(/^[\u{1F300}-\u{1F9FF}]\s*/u, '');
        // Remove XP info
        line = line.replace(/\s*\(\d+\s*XP\).*$/, '');
        
        console.log('Parsed player name from line:', { original: line, parsed: line.trim() });
        return line.trim();
      });
  };

  // Function to parse the full game details text
  const handleFullTextPaste = (text: string) => {
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

    // Find the sections by their headers
    const selectedPlayersMatch = text.match(/✅\s*Selected Players:\s*\n\n([\s\S]*?)(?=\n\n🎲|\n\n🔄|\n\n❌|$)/);
    const randomPlayersMatch = text.match(/🎲\s*Randomly Selected:\s*\n\n([\s\S]*?)(?=\n\n🔄|\n\n❌|$)/);
    const reservesMatch = text.match(/🔄\s*Reserves[^:]*:\s*\n\n([\s\S]*?)(?=\n\n❌|$)/);
    const droppedOutMatch = text.match(/❌\s*Dropped Out\s*\n\n([\s\S]*?)$/);

    console.log('Selected players section:', selectedPlayersMatch?.[1]);
    console.log('Random players section:', randomPlayersMatch?.[1]);
    console.log('Reserves section:', reservesMatch?.[1]);
    console.log('Dropped out section:', droppedOutMatch?.[1]);

    // Parse player names from each section
    const selectedPlayers = selectedPlayersMatch ? parsePlayerNamesFromSection(selectedPlayersMatch[1]) : [];
    const randomPlayers = randomPlayersMatch ? parsePlayerNamesFromSection(randomPlayersMatch[1]) : [];
    const reservePlayers = reservesMatch ? parsePlayerNamesFromSection(reservesMatch[1]) : [];
    const droppedOutPlayers = droppedOutMatch ? parsePlayerNamesFromSection(droppedOutMatch[1]) : [];

    console.log('Parsed players:', {
      selected: selectedPlayers,
      random: randomPlayers,
      reserve: reservePlayers,
      droppedOut: droppedOutPlayers
    });

    onPlayerListsExtracted(selectedPlayers, randomPlayers, reservePlayers, droppedOutPlayers);
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="form-control"
    >
      <label className="label">
        <span className="label-text">Paste Full Game Details</span>
      </label>
      <textarea
        className="textarea textarea-bordered h-48"
        placeholder="Paste the full game details here, including date, time, and player lists..."
        onChange={(e) => handleFullTextPaste(e.target.value)}
      />
    </motion.div>
  );
};

export default GameDetailsPaste;

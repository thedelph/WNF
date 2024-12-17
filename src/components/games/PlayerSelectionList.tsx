import React from 'react';
import { PlayerRegistration } from '../../types/database.types';
import { Box, List, ListItem, Typography } from '@mui/material';
import { getCalculatedXP } from '../../utils/playerUtils';

interface PlayerSelectionListProps {
  players: PlayerRegistration[];
  title: string;
}

export const PlayerSelectionList: React.FC<PlayerSelectionListProps> = ({ players, title }) => {
  return (
    <Box>
      <Typography variant="h6" component="h2" gutterBottom>
        {title} ({players.length})
      </Typography>
      <List>
        {players.map((player) => (
          <ListItem key={player.id}>
            <Typography>
              {player.friendly_name} - XP: {getCalculatedXP(player)}
              {player.isRandomlySelected && ' (Random)'}
            </Typography>
          </ListItem>
        ))}
      </List>
    </Box>
  );
};

export default PlayerSelectionList;

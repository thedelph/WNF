import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
  Tooltip as RechartsTooltip
} from 'recharts';
import {
  DerivedAttributes,
  RadarChartDataPoint,
  PlayerComparisonData,
  ATTRIBUTE_CONFIGS,
  normalizeAttributeValue,
  DEFAULT_ATTRIBUTE_VALUE
} from '../../types/playstyle';

interface PlayerRadarChartProps {
  players: Array<{
    id: string;
    friendly_name: string;
    derived_attributes?: DerivedAttributes | null;
  }>;
  height?: number;
  showLegend?: boolean;
  className?: string;
}

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'];

const PlayerRadarChart: React.FC<PlayerRadarChartProps> = ({
  players,
  height = 400,
  showLegend = true,
  className = ''
}) => {
  // Responsive height based on screen size
  const [isMobile, setIsMobile] = React.useState(false);
  
  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  const responsiveHeight = isMobile ? Math.min(height, 300) : height;
  // Transform player data into radar chart format
  const chartData = useMemo(() => {
    // Create base data points for each attribute
    const data: RadarChartDataPoint[] = ATTRIBUTE_CONFIGS.map(config => ({
      attribute: config.label,
      fullMark: 10,
      value: 0 // Will be filled per player
    }));

    // Add player values to each attribute
    const enhancedData = data.map((point, index) => {
      const attrKey = ATTRIBUTE_CONFIGS[index].key;
      const dataPoint: any = {
        attribute: point.attribute,
        fullMark: 10
      };

      players.forEach((player, playerIndex) => {
        const attributes = player.derived_attributes;
        const value = attributes ? attributes[attrKey] : DEFAULT_ATTRIBUTE_VALUE;
        dataPoint[`player${playerIndex}`] = normalizeAttributeValue(value);
      });

      return dataPoint;
    });

    return enhancedData;
  }, [players]);

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-base-100 border border-base-300 rounded-lg p-3 shadow-lg">
          <p className="font-semibold text-sm mb-2">{label}</p>
          {payload.map((entry: any, index: number) => {
            const playerIndex = parseInt(entry.dataKey.replace('player', ''));
            const player = players[playerIndex];
            return (
              <div key={index} className="flex items-center gap-2 text-xs">
                <span 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="font-medium">{player.friendly_name}:</span>
                <span>{entry.value.toFixed(1)}</span>
              </div>
            );
          })}
        </div>
      );
    }
    return null;
  };

  // Don't render if no players
  if (!players || players.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-base-content/50">
        <p>No player data available</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={`w-full ${className}`}
    >
      <ResponsiveContainer width="100%" height={responsiveHeight}>
        <RadarChart data={chartData}>
          <PolarGrid 
            stroke="currentColor" 
            strokeOpacity={0.2}
            radialLines={true}
          />
          <PolarAngleAxis 
            dataKey="attribute" 
            tick={{ fontSize: isMobile ? 11 : 12 }}
            className="text-base-content"
          />
          <PolarRadiusAxis 
            domain={[0, 10]} 
            tickCount={isMobile ? 4 : 6}
            tick={{ fontSize: isMobile ? 10 : 10 }}
            axisLine={false}
            className="text-base-content/60"
          />
          
          {players.map((player, index) => (
            <Radar
              key={player.id}
              name={player.friendly_name}
              dataKey={`player${index}`}
              stroke={COLORS[index % COLORS.length]}
              fill={COLORS[index % COLORS.length]}
              fillOpacity={0.2}
              strokeWidth={2}
            />
          ))}

          <RechartsTooltip content={<CustomTooltip />} />
          
          {showLegend && !isMobile && (
            <Legend 
              wrapperStyle={{ 
                paddingTop: '20px',
                fontSize: '14px'
              }}
              iconType="circle"
            />
          )}
        </RadarChart>
      </ResponsiveContainer>
    </motion.div>
  );
};

// Comparison component for multiple players
export const PlayerAttributeComparison: React.FC<{
  players: Array<{
    id: string;
    friendly_name: string;
    derived_attributes?: DerivedAttributes | null;
  }>;
  className?: string;
}> = ({ players, className = '' }) => {
  // Filter to max 4 players for clarity
  const displayPlayers = players.slice(0, 4);

  return (
    <div className={`card bg-base-200 ${className}`}>
      <div className="card-body">
        <h3 className="card-title text-lg">Player Attribute Comparison</h3>
        
        {displayPlayers.length === 0 ? (
          <p className="text-base-content/60 text-center py-8">
            Select players to compare their attributes
          </p>
        ) : (
          <>
            <PlayerRadarChart 
              players={displayPlayers}
              height={350}
              showLegend={true}
            />
            
            {/* Attribute descriptions - hidden on mobile to save space */}
            <div className="hidden sm:grid grid-cols-2 md:grid-cols-3 gap-2 mt-4">
              {ATTRIBUTE_CONFIGS.map(config => (
                <div key={config.key} className="flex items-center gap-2 text-xs">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: config.color }}
                  />
                  <div>
                    <span className="font-medium">{config.label}:</span>
                    <span className="text-base-content/60 ml-1">
                      {config.description}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {players.length > 4 && (
              <p className="text-warning text-sm text-center mt-2">
                Showing first 4 players only
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// Individual player radar chart card
export const PlayerAttributeCard: React.FC<{
  player: {
    id: string;
    friendly_name: string;
    derived_attributes?: DerivedAttributes | null;
  };
  className?: string;
}> = ({ player, className = '' }) => {
  const hasAttributes = player.derived_attributes && 
    Object.values(player.derived_attributes).some(v => v > 0);

  return (
    <div className={`card bg-base-200 ${className}`}>
      <div className="card-body p-4">
        <h4 className="font-semibold text-sm mb-2">{player.friendly_name}</h4>
        
        {!hasAttributes ? (
          <p className="text-base-content/60 text-xs text-center py-8">
            No playstyle data available
          </p>
        ) : (
          <PlayerRadarChart 
            players={[player]}
            height={180}
            showLegend={false}
          />
        )}
      </div>
    </div>
  );
};

export default PlayerRadarChart;
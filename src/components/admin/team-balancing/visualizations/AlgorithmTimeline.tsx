import React from 'react';
import { motion } from 'framer-motion';

interface AlgorithmTimelineProps {
  activePhase: 'transformation' | 'tiering' | 'draft' | 'optimization' | 'final';
  onPhaseClick: (phase: 'transformation' | 'tiering' | 'draft' | 'optimization' | 'final') => void;
  hasOptimization: boolean;
}

export const AlgorithmTimeline: React.FC<AlgorithmTimelineProps> = ({
  activePhase,
  onPhaseClick,
  hasOptimization
}) => {
  const phases = [
    {
      id: 'transformation',
      title: 'Player Transformation',
      description: 'Apply performance adjustments',
      icon: '🔄',
      color: 'primary'
    },
    {
      id: 'tiering',
      title: 'Tier Creation',
      description: 'Group players by rating',
      icon: '📊',
      color: 'secondary'
    },
    {
      id: 'draft',
      title: 'Snake Draft',
      description: 'Assign players to teams',
      icon: '🐍',
      color: 'accent'
    },
    {
      id: 'optimization',
      title: 'Optimization',
      description: hasOptimization ? 'Balance teams with swaps' : 'No swaps needed',
      icon: '⚖️',
      color: hasOptimization ? 'success' : 'base-300',
      disabled: !hasOptimization
    },
    {
      id: 'final',
      title: 'Final Teams',
      description: 'Review team composition',
      icon: '🏁',
      color: 'info'
    }
  ];

  return (
    <div className="relative">
      {/* Desktop Timeline */}
      <div className="hidden md:block">
        <div className="flex items-center justify-between relative">
          {/* Progress Line */}
          <div className="absolute top-1/2 left-0 right-0 h-1 bg-base-300 -z-10" />
          <motion.div
            className="absolute top-1/2 left-0 h-1 bg-primary -z-10"
            initial={{ width: '0%' }}
            animate={{
              width: `${
                activePhase === 'transformation' ? 0 :
                activePhase === 'tiering' ? 25 :
                activePhase === 'draft' ? 50 :
                activePhase === 'optimization' ? 75 :
                100
              }%`
            }}
            transition={{ duration: 0.5 }}
          />

          {/* Phase Nodes */}
          {phases.map((phase, index) => {
            const isActive = phase.id === activePhase;
            const isPast = phases.findIndex(p => p.id === activePhase) > index;
            
            return (
              <motion.div
                key={phase.id}
                className={`relative flex flex-col items-center cursor-pointer ${
                  phase.disabled ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                onClick={() => !phase.disabled && onPhaseClick(phase.id as any)}
                whileHover={!phase.disabled ? { scale: 1.05 } : {}}
                whileTap={!phase.disabled ? { scale: 0.95 } : {}}
              >
                {/* Node */}
                <motion.div
                  className={`
                    w-16 h-16 rounded-full flex items-center justify-center text-2xl
                    ${isActive ? `bg-${phase.color} shadow-lg ring-4 ring-${phase.color} ring-opacity-50` :
                      isPast ? `bg-${phase.color}` : 'bg-base-200'}
                    transition-all duration-300
                  `}
                  animate={isActive ? { y: [0, -5, 0] } : {}}
                  transition={{ repeat: Infinity, duration: 2 }}
                >
                  {phase.icon}
                </motion.div>

                {/* Text */}
                <div className="text-center mt-2">
                  <div className={`font-medium ${isActive ? 'text-primary' : ''}`}>
                    {phase.title}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 max-w-[120px]">
                    {phase.description}
                  </div>
                </div>

                {/* Active Indicator */}
                {isActive && (
                  <motion.div
                    className="absolute -bottom-8"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div className="badge badge-primary badge-sm">Current Phase</div>
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Mobile Timeline */}
      <div className="md:hidden">
        <div className="space-y-4">
          {phases.map((phase, index) => {
            const isActive = phase.id === activePhase;
            const isPast = phases.findIndex(p => p.id === activePhase) > index;
            
            return (
              <motion.div
                key={phase.id}
                className={`
                  relative flex items-center gap-4 p-4 rounded-lg cursor-pointer
                  ${isActive ? 'bg-primary bg-opacity-10 border-2 border-primary' :
                    isPast ? 'bg-base-200' : 'bg-base-100 border border-base-300'}
                  ${phase.disabled ? 'opacity-50 cursor-not-allowed' : ''}
                `}
                onClick={() => !phase.disabled && onPhaseClick(phase.id as any)}
                whileTap={!phase.disabled ? { scale: 0.98 } : {}}
              >
                {/* Icon */}
                <div className={`
                  w-12 h-12 rounded-full flex items-center justify-center text-xl
                  ${isActive || isPast ? `bg-${phase.color}` : 'bg-base-200'}
                `}>
                  {phase.icon}
                </div>

                {/* Content */}
                <div className="flex-1">
                  <div className={`font-medium ${isActive ? 'text-primary' : ''}`}>
                    {phase.title}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {phase.description}
                  </div>
                </div>

                {/* Status */}
                {isActive && (
                  <div className="badge badge-primary badge-sm">Active</div>
                )}
                {isPast && !isActive && (
                  <div className="badge badge-success badge-sm">✓</div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
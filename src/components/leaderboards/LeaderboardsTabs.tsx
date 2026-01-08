/**
 * LeaderboardsTabs component - Tab navigation for unified Leaderboards page
 * Design: DaisyUI tabs with Framer Motion animations
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Zap, Database } from 'lucide-react';

export interface LeaderboardTab {
  id: string;
  label: string;
  icon: React.ReactNode;
}

interface LeaderboardsTabsProps {
  children: React.ReactNode[];
  tabs?: LeaderboardTab[];
  defaultTab?: string;
}

// Default tabs for the Leaderboards page
export const defaultLeaderboardTabs: LeaderboardTab[] = [
  {
    id: 'hall-of-fame',
    label: 'Hall of Fame',
    icon: <Trophy className="w-4 h-4" />
  },
  {
    id: 'stats',
    label: 'Stats',
    icon: <Zap className="w-4 h-4" />
  },
  {
    id: 'all-players',
    label: 'All Players',
    icon: <Database className="w-4 h-4" />
  }
];

export const LeaderboardsTabs = ({
  children,
  tabs = defaultLeaderboardTabs,
  defaultTab
}: LeaderboardsTabsProps) => {
  const [activeTab, setActiveTab] = useState<string>(defaultTab || tabs[0].id);

  // Animation variants for tab content
  const contentVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut"
      }
    },
    exit: {
      opacity: 0,
      y: -20,
      transition: {
        duration: 0.3
      }
    }
  };

  return (
    <div className="w-full">
      {/* Tab navigation */}
      <div className="flex justify-center mb-8">
        <div className="tabs tabs-box bg-base-200 p-1">
          {tabs.map((tab, index) => (
            <motion.button
              key={tab.id}
              className={`tab gap-2 ${activeTab === tab.id ? 'tab-active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Tab content with animations */}
      <AnimatePresence mode="wait">
        {tabs.map((tab, index) => (
          activeTab === tab.id && (
            <motion.div
              key={tab.id}
              variants={contentVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              {children[index]}
            </motion.div>
          )
        ))}
      </AnimatePresence>
    </div>
  );
};

export default LeaderboardsTabs;

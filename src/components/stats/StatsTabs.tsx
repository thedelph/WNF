import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Award, Zap, Database } from 'lucide-react';

// Tab interface for type safety
interface Tab {
  id: string;
  label: string;
  icon: React.ReactNode;
}

// Props interface for the StatsTabs component
interface StatsTabsProps {
  children: React.ReactNode[];
  tabs: Tab[];
}

/**
 * StatsTabs component - Provides a tabbed interface for the Stats page
 * 
 * @param children - Array of React nodes to be displayed in each tab
 * @param tabs - Array of tab objects with id, label, and icon
 */
export const StatsTabs = ({ children, tabs }: StatsTabsProps) => {
  const [activeTab, setActiveTab] = useState<string>(tabs[0].id);

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
        <div className="tabs tabs-boxed bg-base-200 p-1">
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
              {tab.label}
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

// Default tabs for the Stats page
export const defaultStatsTabs = [
  {
    id: 'attendance',
    label: 'Attendance',
    icon: <User className="w-4 h-4" />
  },
  {
    id: 'performance',
    label: 'Performance',
    icon: <Award className="w-4 h-4" />
  },
  {
    id: 'other',
    label: 'Other',
    icon: <Zap className="w-4 h-4" />
  },
  {
    id: 'allstats',
    label: 'All Stats',
    icon: <Database className="w-4 h-4" />
  }
];

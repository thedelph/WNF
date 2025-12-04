import { motion } from 'framer-motion';
import { User, Award, Zap, Database } from 'lucide-react';
import { FIFA_TABS, fifaAnimations } from '../../constants/fifaTheme';

interface FIFATabNavProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

const iconMap = {
  User,
  Award,
  Zap,
  Database,
};

export const FIFATabNav = ({ activeTab, onTabChange }: FIFATabNavProps) => {
  return (
    <motion.div
      className="flex flex-wrap justify-center gap-2 mb-10"
      variants={fifaAnimations.pageEntrance}
      initial="hidden"
      animate="visible"
    >
      {FIFA_TABS.map((tab, index) => {
        const Icon = iconMap[tab.icon as keyof typeof iconMap];
        const isActive = activeTab === tab.id;

        return (
          <motion.button
            key={tab.id}
            className={`
              flex items-center gap-2 px-4 py-3 md:px-6
              font-fifa-display text-sm md:text-base tracking-wider
              transition-all duration-300 rounded-lg
              ${
                isActive
                  ? 'bg-fifa-electric/20 border-fifa-electric text-fifa-electric shadow-fifa-glow'
                  : 'bg-fifa-card/50 border-white/10 text-white/60 hover:text-white hover:border-white/30'
              }
              border
            `}
            onClick={() => onTabChange(tab.id)}
            variants={fifaAnimations.cardEntrance}
            custom={index}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
          >
            <Icon className="w-4 h-4 md:w-5 md:h-5" />
            <span className="hidden sm:inline">{tab.label}</span>
          </motion.button>
        );
      })}
    </motion.div>
  );
};

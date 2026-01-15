/**
 * AwardCategory component - displays a single award category as gradient card
 * Design: Matches AwardCard.tsx pattern with vibrant gradients
 */

import { motion } from 'framer-motion';
import {
  Crown, Target, Zap, Shield, Flame, Lock,
  Trophy, Users, Heart, Droplet, Clock, Swords
} from 'lucide-react';
import { AwardsByCategory } from '../../types/awards';
import { getCategoryGradient, getCategoryShadow } from '../../constants/awards';
import AwardPodium from './AwardPodium';

interface AwardCategoryProps {
  category: AwardsByCategory;
  index: number;
}

// Map icon names to components
const iconMap: Record<string, React.ElementType> = {
  Crown,
  Target,
  Zap,
  Shield,
  Flame,
  Lock,
  Trophy,
  Users,
  Heart,
  Droplet,
  Clock,
  Swords,
};

export const AwardCategory = ({ category, index }: AwardCategoryProps) => {
  const { config, awards, placeholderMessage } = category;
  const IconComponent = iconMap[config.icon] || Trophy;
  const gradientClass = getCategoryGradient(config.id);
  const shadowClass = getCategoryShadow(config.id);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.08 }}
      className={`card bg-gradient-to-br ${gradientClass} text-white shadow-lg ${shadowClass}`}
    >
      <div className="card-body">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="card-title text-lg font-bold drop-shadow-[0_0_1px_rgba(0,0,0,0.5)]">
            {config.title}
          </h2>
          <IconComponent className="w-6 h-6 drop-shadow-[0_0_2px_rgba(0,0,0,0.3)]" />
        </div>

        {/* Winners podium or placeholder */}
        <div className="mb-4">
          {awards.length > 0 ? (
            <AwardPodium awards={awards} config={config} />
          ) : placeholderMessage ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-sm opacity-80 text-center italic drop-shadow-[0_0_1px_rgba(0,0,0,0.5)]">
                {placeholderMessage}
              </p>
            </div>
          ) : null}
        </div>

        {/* Description */}
        <p className="text-sm opacity-80 mt-auto drop-shadow-[0_0_1px_rgba(0,0,0,0.5)]">
          {config.description}
        </p>
      </div>
    </motion.div>
  );
};

export default AwardCategory;

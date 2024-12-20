import { useState, useRef, useEffect } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import { 
  Trophy, 
  Medal, 
  Star, 
  TrendingUp, 
  Timer, 
  Crown, 
  Percent, 
  Users, 
  ShirtIcon,
  Flame,
  Heart
} from 'lucide-react';
import { StatsCard } from '../components/dashboard/StatsCard';
import { AwardCard } from '../components/dashboard/AwardCard';
import { YearSelector } from '../components/dashboard/YearSelector';
import { useStats } from '../hooks/useStats';

// Parallax section component
const ParallaxSection = ({ children, offset = 150 }) => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  });

  const y = useTransform(scrollYProgress, [0, 1], [offset, -offset]);
  const opacity = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0, 1, 1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.8, 1, 0.8]);

  return (
    <motion.div
      ref={ref}
      style={{ y, opacity, scale }}
      className="mb-0"
    >
      {children}
    </motion.div>
  );
};

// Hero section with parallax background
const Hero = () => {
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 1], [0, 500]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.2]);
  
  return (
    <motion.div 
      className="relative h-screen flex items-center justify-center overflow-hidden bg-gradient-to-b from-primary to-base-300"
      style={{
        backgroundPosition: "center",
        backgroundSize: "cover"
      }}
    >
      <motion.div 
        className="relative z-10 text-center text-white p-8"
        style={{ y, opacity, scale }}
      >
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-6xl font-bold mb-4"
        >
          WNF
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="text-xl mb-8"
        >
          Stats
        </motion.p>
      </motion.div>
    </motion.div>
  );
};

export default function StandaloneDashboard() {
  const [selectedYear, setSelectedYear] = useState<number | 'all'>('all');
  const stats = useStats(selectedYear === 'all' ? undefined : selectedYear);
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  if (stats.loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (stats.error) {
    return (
      <div className="alert alert-error">
        <p>Error loading stats: {stats.error}</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Progress bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-primary z-50"
        style={{ scaleX }}
      />

      {/* Hero Section */}
      <Hero />

      {/* Year Selector */}
      <div className="sticky top-0 z-40 bg-base-100/80 backdrop-blur-sm py-4">
        <div className="container mx-auto px-4">
          <YearSelector
            selectedYear={selectedYear}
            onYearChange={setSelectedYear}
          />
        </div>
      </div>

      {/* Stats Sections */}
      <div className="container mx-auto px-0">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
          {/* Lucky Bib Color */}
          <ParallaxSection>
            <StatsCard
              title="Lucky Bib Colour"
              value={stats.luckyBibColor.color.toUpperCase()}
              description={`${stats.luckyBibColor.winRate.toFixed(1)}% Win Rate`}
              color={stats.luckyBibColor.color as 'blue' | 'orange'}
              icon={<ShirtIcon className="w-6 h-6" />}
            />
          </ParallaxSection>

          {/* Longest Attendance Streaks */}
          <ParallaxSection>
            <AwardCard
              title="Longest Attendance Streaks"
              winners={stats.topAttendanceStreaks.map(player => ({
                name: player.friendlyName,
                value: `${player.maxStreak} games`,
                id: player.id
              }))}
              icon={<Crown className="w-6 h-6" />}
              color="purple"
            />
          </ParallaxSection>

          {/* Current Streaks */}
          <ParallaxSection>
            <AwardCard
              title="Current Attendance Streaks"
              winners={stats.currentStreaks.map(player => ({
                name: player.friendlyName,
                value: `${player.currentStreak} games`,
                id: player.id
              }))}
              icon={<Flame className="w-6 h-6" />}
              color="green"
            />
          </ParallaxSection>

          {/* Most Caps */}
          <ParallaxSection>
            <AwardCard
              title="Most Caps"
              winners={stats.mostCaps.map(player => ({
                name: player.friendlyName,
                value: `${player.caps} games`,
                id: player.id
              }))}
              icon={<Trophy className="w-6 h-6" />}
              color="indigo"
            />
          </ParallaxSection>

          {/* Best Win Rates */}
          <ParallaxSection>
            <StatsCard
              title="Best Win Rates"
              stats={stats.bestWinRates}
              icon={<Percent className="w-6 h-6" />}
              description="Stats based on games with known outcomes and even teams only"
              color="teal"
            />
          </ParallaxSection>

          {/* Blue Team Specialists */}
          <ParallaxSection>
            <AwardCard
              title="Blue Team Specialists"
              winners={stats.teamColorFrequency.blue.map(player => ({
                name: player.friendlyName,
                value: `${(player.teamFrequency * 100).toFixed(1)}%`,
                id: player.id
              }))}
              description="Players with 10+ caps who play most often on blue team"
              icon={<Star className="w-6 h-6" />}
              color="blue"
            />
          </ParallaxSection>

          {/* Orange Team Specialists */}
          <ParallaxSection>
            <AwardCard
              title="Orange Team Specialists"
              winners={stats.teamColorFrequency.orange.map(player => ({
                name: player.friendlyName,
                value: `${(player.teamFrequency * 100).toFixed(1)}%`,
                id: player.id
              }))}
              description="Players with 10+ caps who play most often on orange team"
              icon={<Star className="w-6 h-6" />}
              color="orange"
            />
          </ParallaxSection>

          {/* Best Buddies */}
          <ParallaxSection>
            <AwardCard
              title="Best Buddies"
              winners={stats.bestBuddies.map(buddy => ({
                id: buddy.id,
                name: `${buddy.friendlyName} & ${buddy.buddyFriendlyName}`,
                value: `${buddy.gamesTogether} games`
              }))}
              icon={<Heart className="w-6 h-6" />}
              color="pink"
              description="Players who have been on the same team most often"
            />
          </ParallaxSection>
        </div>
      </div>
    </div>
  );
}

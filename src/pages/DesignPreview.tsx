import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Crown, Flame, Target, Users, Zap, TrendingUp, TrendingDown, Heart, LayoutGrid, Navigation, UserCircle } from 'lucide-react';
import {
  FIFAParticleBackground,
  FIFAHeader,
  FIFATabNav,
  FIFAStatCard,
  FIFALeaderboard,
  FIFANavHeader,
  FIFAPlayerGrid,
  SAMPLE_PLAYERS,
} from '../components/design-preview';
import { useStats } from '../hooks/useStats';
import { FIFA_COLORS, fifaAnimations } from '../constants/fifaTheme';
import { supabase } from '../utils/supabase';

// Section selector options
type PreviewSection = 'stats' | 'navigation' | 'players';

export default function DesignPreview() {
  const [selectedYear, setSelectedYear] = useState<number | 'all'>('all');
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [activeTab, setActiveTab] = useState('attendance');
  const [activeSection, setActiveSection] = useState<PreviewSection>('stats');

  // Fetch stats using the existing hook
  const stats = useStats(selectedYear === 'all' ? undefined : selectedYear, availableYears);

  // Fetch available years
  useEffect(() => {
    const fetchYears = async () => {
      const { data } = await supabase
        .from('games')
        .select('date')
        .order('date', { ascending: false });

      if (data) {
        const years = [...new Set((data as Array<{ date: string }>).map((g) => new Date(g.date).getFullYear()))];
        setAvailableYears(years.sort((a, b) => b - a));
      }
    };
    fetchYears();
  }, []);

  // Fetch XP leaderboard data
  const [xpLeaderboard, setXpLeaderboard] = useState<any[]>([]);
  useEffect(() => {
    const fetchXP = async () => {
      const { data } = await supabase
        .from('players')
        .select('id, friendly_name, xp')
        .order('xp', { ascending: false })
        .limit(10);

      if (data) {
        setXpLeaderboard(data.map(p => ({
          id: p.id,
          friendlyName: p.friendly_name,
          xp: p.xp || 0,
          value: `${p.xp || 0} XP`,
        })));
      }
    };
    fetchXP();
  }, []);

  const handleYearChange = (year: number | 'all') => {
    setSelectedYear(year);
  };

  // Tab content variants
  const tabContentVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, staggerChildren: 0.1 } },
    exit: { opacity: 0, y: -20, transition: { duration: 0.2 } },
  };

  // Section config
  const sections = [
    { id: 'stats' as const, label: 'Stats Page', icon: <LayoutGrid size={16} /> },
    { id: 'navigation' as const, label: 'Navigation', icon: <Navigation size={16} /> },
    { id: 'players' as const, label: 'Player Cards', icon: <UserCircle size={16} /> },
  ];

  return (
    <div
      className="fifa-page min-h-screen"
      style={{
        background: 'linear-gradient(180deg, #0a0a0f 0%, #12121a 50%, #0a0a0f 100%)',
        marginTop: '-2rem',
        marginBottom: '-2rem',
        paddingTop: '0',
        paddingBottom: '2rem',
      }}
    >
      {/* Particle Background */}
      <FIFAParticleBackground />

      {/* Section Selector (Top Bar) */}
      <div
        style={{
          background: 'rgba(10, 10, 15, 0.9)',
          borderBottom: `1px solid ${FIFA_COLORS.accent.electric}30`,
          padding: '0.75rem 1rem',
          position: 'sticky',
          top: 0,
          zIndex: 40,
        }}
      >
        <div className="container mx-auto flex items-center justify-center gap-2 flex-wrap">
          <span
            style={{
              fontFamily: 'Oswald, sans-serif',
              fontSize: '12px',
              color: 'rgba(255,255,255,0.5)',
              marginRight: '0.5rem',
              textTransform: 'uppercase',
              letterSpacing: '1px',
            }}
          >
            Preview:
          </span>
          {sections.map((section) => (
            <motion.button
              key={section.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveSection(section.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                background:
                  activeSection === section.id
                    ? `linear-gradient(135deg, ${FIFA_COLORS.accent.electric}20, ${FIFA_COLORS.accent.purple}20)`
                    : 'transparent',
                border: `1px solid ${activeSection === section.id ? FIFA_COLORS.accent.electric : 'rgba(255,255,255,0.1)'}`,
                borderRadius: '6px',
                color: activeSection === section.id ? FIFA_COLORS.accent.electric : 'rgba(255,255,255,0.6)',
                fontFamily: 'Oswald, sans-serif',
                fontSize: '13px',
                fontWeight: 500,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              {section.icon}
              {section.label}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 relative z-10">
        <AnimatePresence mode="wait">
          {/* STATS SECTION */}
          {activeSection === 'stats' && (
            <motion.div
              key="stats-section"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {/* Header */}
              <FIFAHeader
                title="WNF STATS"
                subtitle="FIFA Ultimate Team Style Preview"
                selectedYear={selectedYear}
                onYearChange={handleYearChange}
                availableYears={availableYears}
              />

              {/* Tab Navigation */}
              <FIFATabNav activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {stats.loading ? (
            <motion.div
              key="loading"
              className="flex justify-center items-center py-20"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="w-12 h-12 border-4 border-fifa-electric/30 border-t-fifa-electric rounded-full animate-spin" />
            </motion.div>
          ) : (
            <>
              {/* ATTENDANCE TAB */}
              {activeTab === 'attendance' && (
                <motion.div
                  key="attendance"
                  variants={tabContentVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                >
                  {/* XP Leaderboard */}
                  <FIFALeaderboard
                    title="XP LEADERBOARD"
                    icon={<Trophy className="w-6 h-6" />}
                    players={xpLeaderboard}
                    color="gold"
                    showRarity
                  />

                  {/* Longest Attendance Streaks */}
                  <FIFAStatCard
                    title="LONGEST ATTENDANCE STREAKS"
                    icon={<Crown className="w-6 h-6" />}
                    color="purple"
                    winners={stats.topAttendanceStreaks.map((p) => ({
                      id: p.id,
                      name: p.friendlyName,
                      value: `${p.maxStreak} games`,
                      rawValue: p.maxStreak,
                    }))}
                    animationDelay={0.1}
                  />

                  {/* Current Attendance Streaks */}
                  {stats.currentStreaks.length > 0 && (
                    <FIFAStatCard
                      title="CURRENT ATTENDANCE STREAKS"
                      icon={<Flame className="w-6 h-6" />}
                      color="green"
                      winners={stats.currentStreaks.map((p) => ({
                        id: p.id,
                        name: p.friendlyName,
                        value: `${p.currentStreak} games`,
                        rawValue: p.currentStreak,
                      }))}
                      animationDelay={0.2}
                    />
                  )}

                  {/* Most Caps */}
                  <FIFAStatCard
                    title="MOST CAPS"
                    icon={<Trophy className="w-6 h-6" />}
                    color="blue"
                    winners={stats.mostCaps.slice(0, 10).map((p) => ({
                      id: p.id,
                      name: p.friendlyName,
                      value: `${p.caps} games`,
                      rawValue: p.caps,
                    }))}
                    animationDelay={0.3}
                  />
                </motion.div>
              )}

              {/* PERFORMANCE TAB */}
              {activeTab === 'performance' && (
                <motion.div
                  key="performance"
                  variants={tabContentVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                >
                  {/* Best Win Rates */}
                  <FIFAStatCard
                    title="BEST WIN RATES"
                    icon={<Target className="w-6 h-6" />}
                    color="gold"
                    winners={stats.bestWinRates.map((p) => ({
                      id: p.id,
                      name: p.friendlyName,
                      value: (
                        <div className="flex flex-col items-end">
                          <span className="font-bold text-fifa-gold">{p.winRate.toFixed(1)}%</span>
                          <span className="text-xs text-white/50">
                            {p.wins}W/{p.draws}D/{p.losses}L
                          </span>
                        </div>
                      ),
                      rawValue: p.winRate,
                    }))}
                    animationDelay={0}
                  />

                  {/* Longest Win Streaks */}
                  <FIFAStatCard
                    title="LONGEST WIN STREAKS"
                    icon={<TrendingUp className="w-6 h-6" />}
                    color="green"
                    winners={stats.topWinStreaks.filter(p => p.maxWinStreak > 0).slice(0, 10).map((p) => ({
                      id: p.id,
                      name: p.friendlyName,
                      value: `${p.maxWinStreak} wins`,
                      rawValue: p.maxWinStreak,
                    }))}
                    animationDelay={0.1}
                  />

                  {/* Current Win Streaks */}
                  {stats.currentWinStreaks.filter(p => p.currentWinStreak > 0).length > 0 && (
                    <FIFAStatCard
                      title="CURRENT WIN STREAKS"
                      icon={<Flame className="w-6 h-6" />}
                      color="pink"
                      winners={stats.currentWinStreaks.filter(p => p.currentWinStreak > 0).slice(0, 10).map((p) => ({
                        id: p.id,
                        name: p.friendlyName,
                        value: `${p.currentWinStreak} wins`,
                        rawValue: p.currentWinStreak,
                      }))}
                      animationDelay={0.2}
                    />
                  )}

                  {/* Longest Unbeaten Streaks */}
                  <FIFAStatCard
                    title="LONGEST UNBEATEN STREAKS"
                    icon={<Zap className="w-6 h-6" />}
                    color="blue"
                    winners={stats.topUnbeatenStreaks.filter(p => p.maxUnbeatenStreak > 0).slice(0, 10).map((p) => ({
                      id: p.id,
                      name: p.friendlyName,
                      value: `${p.maxUnbeatenStreak} games`,
                      rawValue: p.maxUnbeatenStreak,
                    }))}
                    animationDelay={0.3}
                  />

                  {/* Goal Differentials */}
                  <FIFAStatCard
                    title="BEST GOAL DIFFERENTIAL"
                    icon={<Target className="w-6 h-6" />}
                    color="purple"
                    winners={stats.goalDifferentials
                      .sort((a, b) => b.goalDifferential - a.goalDifferential)
                      .slice(0, 10)
                      .map((p) => ({
                        id: p.id,
                        name: p.friendlyName,
                        value: (
                          <span className={p.goalDifferential >= 0 ? 'text-fifa-green' : 'text-red-400'}>
                            {p.goalDifferential > 0 ? '+' : ''}{p.goalDifferential}
                          </span>
                        ),
                        rawValue: p.goalDifferential,
                      }))}
                    animationDelay={0.4}
                  />

                  {/* Worst Losing Streaks */}
                  <FIFAStatCard
                    title="LONGEST LOSING STREAKS"
                    icon={<TrendingDown className="w-6 h-6" />}
                    color="orange"
                    winners={stats.topLossStreaks.filter(p => p.maxLossStreak > 0).slice(0, 10).map((p) => ({
                      id: p.id,
                      name: p.friendlyName,
                      value: `${p.maxLossStreak} losses`,
                      rawValue: p.maxLossStreak,
                    }))}
                    animationDelay={0.5}
                  />
                </motion.div>
              )}

              {/* OTHER TAB */}
              {activeTab === 'other' && (
                <motion.div
                  key="other"
                  variants={tabContentVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                >
                  {/* Lucky Bib Color */}
                  <FIFAStatCard
                    title="LUCKY BIB COLOR"
                    icon={<Zap className="w-6 h-6" />}
                    color={stats.luckyBibColor.color === 'blue' ? 'blue' : 'orange'}
                    value={`${stats.luckyBibColor.color.toUpperCase()} (${stats.luckyBibColor.winRate.toFixed(1)}%)`}
                    description="Team color with highest overall win rate"
                    animationDelay={0}
                  />

                  {/* Best Buddies */}
                  <FIFAStatCard
                    title="BEST BUDDIES"
                    icon={<Heart className="w-6 h-6" />}
                    color="pink"
                    winners={stats.bestBuddies.slice(0, 10).map((b, i) => ({
                      id: `${b.id}-${b.buddyId}-${i}`,
                      name: `${b.friendlyName} & ${b.buddyFriendlyName}`,
                      value: `${b.gamesTogether} games`,
                      rawValue: b.gamesTogether,
                    }))}
                    animationDelay={0.1}
                  />

                  {/* Blue Team Specialists */}
                  <FIFAStatCard
                    title="BLUE TEAM SPECIALISTS"
                    icon={<Users className="w-6 h-6" />}
                    color="blue"
                    winners={stats.teamColorFrequency.blue.slice(0, 10).map((p) => ({
                      id: p.id,
                      name: p.friendlyName,
                      value: `${(p.teamFrequency * 100).toFixed(0)}%`,
                      rawValue: p.teamFrequency * 100,
                    }))}
                    animationDelay={0.2}
                  />

                  {/* Orange Team Specialists */}
                  <FIFAStatCard
                    title="ORANGE TEAM SPECIALISTS"
                    icon={<Users className="w-6 h-6" />}
                    color="orange"
                    winners={stats.teamColorFrequency.orange.slice(0, 10).map((p) => ({
                      id: p.id,
                      name: p.friendlyName,
                      value: `${(p.teamFrequency * 100).toFixed(0)}%`,
                      rawValue: p.teamFrequency * 100,
                    }))}
                    animationDelay={0.3}
                  />
                </motion.div>
              )}

              {/* ALL STATS TAB */}
              {activeTab === 'allstats' && (
                <motion.div
                  key="allstats"
                  variants={tabContentVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  <div className="fifa-card p-4 md:p-6 overflow-x-auto">
                    <h3 className="font-fifa-display text-xl text-fifa-electric mb-4">
                      COMPREHENSIVE PLAYER STATISTICS
                    </h3>
                    <table className="w-full min-w-[800px]">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="text-left py-3 px-2 font-fifa-display text-white/60 text-sm">PLAYER</th>
                          <th className="text-right py-3 px-2 font-fifa-display text-white/60 text-sm">XP</th>
                          <th className="text-right py-3 px-2 font-fifa-display text-white/60 text-sm">CAPS</th>
                          <th className="text-right py-3 px-2 font-fifa-display text-white/60 text-sm">WIN%</th>
                          <th className="text-right py-3 px-2 font-fifa-display text-white/60 text-sm">W/D/L</th>
                          <th className="text-right py-3 px-2 font-fifa-display text-white/60 text-sm">GD</th>
                          <th className="text-right py-3 px-2 font-fifa-display text-white/60 text-sm hidden lg:table-cell">WIN STREAK</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.comprehensiveStats.slice(0, 50).map((player, index) => (
                          <motion.tr
                            key={player.id}
                            className="border-b border-white/5 hover:bg-white/5 transition-colors"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.02 }}
                          >
                            <td className="py-3 px-2">
                              <span className="font-fifa-body text-white">{player.friendlyName}</span>
                            </td>
                            <td className="py-3 px-2 text-right">
                              <span className="font-fifa-display text-fifa-gold">{player.xp}</span>
                            </td>
                            <td className="py-3 px-2 text-right">
                              <span className="font-fifa-display text-fifa-electric">{player.caps}</span>
                            </td>
                            <td className="py-3 px-2 text-right">
                              <span className="font-fifa-display text-white">
                                {player.winRate ? `${player.winRate.toFixed(1)}%` : '-'}
                              </span>
                            </td>
                            <td className="py-3 px-2 text-right">
                              <span className="font-fifa-body text-white/70 text-sm">
                                {player.wins}/{player.draws}/{player.losses}
                              </span>
                            </td>
                            <td className="py-3 px-2 text-right">
                              <span className={`font-fifa-display ${player.goalDifferential >= 0 ? 'text-fifa-green' : 'text-red-400'}`}>
                                {player.goalDifferential > 0 ? '+' : ''}{player.goalDifferential}
                              </span>
                            </td>
                            <td className="py-3 px-2 text-right hidden lg:table-cell">
                              <span className="font-fifa-display text-fifa-purple">{player.maxWinStreak}</span>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}
            </>
          )}
        </AnimatePresence>
            </motion.div>
          )}

          {/* NAVIGATION SECTION */}
          {activeSection === 'navigation' && (
            <motion.div
              key="navigation-section"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="mb-8">
                <h2
                  style={{
                    fontFamily: 'Oswald, sans-serif',
                    fontSize: '28px',
                    fontWeight: 600,
                    color: FIFA_COLORS.accent.electric,
                    textTransform: 'uppercase',
                    letterSpacing: '2px',
                    textAlign: 'center',
                    marginBottom: '0.5rem',
                    textShadow: `0 0 30px ${FIFA_COLORS.accent.electric}40`,
                  }}
                >
                  Navigation Preview
                </h2>
                <p
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '14px',
                    color: 'rgba(255,255,255,0.5)',
                    textAlign: 'center',
                    marginBottom: '2rem',
                  }}
                >
                  FIFA-styled site navigation with glowing hover effects
                </p>
              </div>

              {/* Navigation Preview Box */}
              <div
                style={{
                  border: `1px solid ${FIFA_COLORS.accent.electric}30`,
                  borderRadius: '12px',
                  overflow: 'hidden',
                  marginBottom: '2rem',
                }}
              >
                <FIFANavHeader userName="Chris H" />
              </div>

              {/* Description */}
              <div
                style={{
                  background: FIFA_COLORS.background.card,
                  borderRadius: '12px',
                  padding: '1.5rem',
                  border: `1px solid rgba(255,255,255,0.1)`,
                }}
              >
                <h3
                  style={{
                    fontFamily: 'Oswald, sans-serif',
                    fontSize: '16px',
                    color: FIFA_COLORS.accent.electric,
                    marginBottom: '1rem',
                    textTransform: 'uppercase',
                  }}
                >
                  Features
                </h3>
                <ul
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '14px',
                    color: 'rgba(255,255,255,0.7)',
                    lineHeight: 1.8,
                    listStyle: 'none',
                    padding: 0,
                  }}
                >
                  <li>• Glass-morphism background with blur effect</li>
                  <li>• Glowing cyan underline on active tab</li>
                  <li>• Hover text glow effects on nav links</li>
                  <li>• User menu with avatar dropdown</li>
                  <li>• Responsive mobile hamburger menu</li>
                  <li>• Animated transitions with Framer Motion</li>
                </ul>
              </div>
            </motion.div>
          )}

          {/* PLAYER CARDS SECTION */}
          {activeSection === 'players' && (
            <motion.div
              key="players-section"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="mb-8">
                <h2
                  style={{
                    fontFamily: 'Oswald, sans-serif',
                    fontSize: '28px',
                    fontWeight: 600,
                    color: FIFA_COLORS.accent.electric,
                    textTransform: 'uppercase',
                    letterSpacing: '2px',
                    textAlign: 'center',
                    marginBottom: '0.5rem',
                    textShadow: `0 0 30px ${FIFA_COLORS.accent.electric}40`,
                  }}
                >
                  Player Cards Preview
                </h2>
                <p
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '14px',
                    color: 'rgba(255,255,255,0.5)',
                    textAlign: 'center',
                    marginBottom: '2rem',
                  }}
                >
                  FIFA Ultimate Team style player cards with rarity tiers based on XP
                </p>
              </div>

              {/* Player Grid */}
              <FIFAPlayerGrid
                players={SAMPLE_PLAYERS}
                title="PLAYER ROSTER"
                showSearch={true}
              />

              {/* Rarity Legend */}
              <div
                style={{
                  background: FIFA_COLORS.background.card,
                  borderRadius: '12px',
                  padding: '1.5rem',
                  border: `1px solid rgba(255,255,255,0.1)`,
                  marginTop: '2rem',
                }}
              >
                <h3
                  style={{
                    fontFamily: 'Oswald, sans-serif',
                    fontSize: '16px',
                    color: FIFA_COLORS.accent.electric,
                    marginBottom: '1rem',
                    textTransform: 'uppercase',
                  }}
                >
                  Rarity Tiers (Based on XP)
                </h3>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                    gap: '1rem',
                  }}
                >
                  {[
                    { name: 'Bronze', xp: '0-499', color: '#cd7f32' },
                    { name: 'Silver', xp: '500-1,499', color: '#c0c0c0' },
                    { name: 'Gold', xp: '1,500-2,999', color: '#ffd700' },
                    { name: 'TOTW', xp: '3,000-4,999', color: '#1e90ff' },
                    { name: 'Icon', xp: '5,000+', color: '#ff6b35' },
                  ].map((tier) => (
                    <div
                      key={tier.name}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                      }}
                    >
                      <div
                        style={{
                          width: '16px',
                          height: '16px',
                          borderRadius: '4px',
                          background: tier.color,
                          boxShadow: `0 0 10px ${tier.color}80`,
                        }}
                      />
                      <div>
                        <div
                          style={{
                            fontFamily: 'Oswald, sans-serif',
                            fontSize: '14px',
                            color: tier.color,
                          }}
                        >
                          {tier.name}
                        </div>
                        <div
                          style={{
                            fontFamily: 'Inter, sans-serif',
                            fontSize: '11px',
                            color: 'rgba(255,255,255,0.5)',
                          }}
                        >
                          {tier.xp} XP
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer note */}
        <motion.div
          className="text-center mt-12 text-white/30 font-fifa-body text-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          Design Preview - FIFA/EA Sports Style
        </motion.div>
      </div>
    </div>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AlgorithmTimeline } from '../../components/admin/team-balancing/visualizations/AlgorithmTimeline';
import { PlayerTransformationAnalysis } from '../../components/admin/team-balancing/visualizations/PlayerTransformationAnalysis';
import { TierDistributionVisual } from '../../components/admin/team-balancing/visualizations/TierDistributionVisual';
import { SnakeDraftSimulator } from '../../components/admin/team-balancing/visualizations/SnakeDraftSimulator';
import { BalanceAnalysisDashboard } from '../../components/admin/team-balancing/visualizations/BalanceAnalysisDashboard';
import { OptimizationJourney } from '../../components/admin/team-balancing/visualizations/OptimizationJourney';
import { FinalTeamComposition } from '../../components/admin/team-balancing/visualizations/FinalTeamComposition';
import { AnalyticsInsights } from '../../components/admin/team-balancing/visualizations/AnalyticsInsights';
import { ParsedDebugData, parseDebugLog } from '../../utils/teamBalancing/debugLogParser';
import { PlayerWithRating } from '../../components/admin/team-balancing/tierBasedSnakeDraft';
import { toast } from 'react-hot-toast';
import { supabase } from '../../utils/supabase';

interface LocationState {
  debugLog: string;
  blueTeam: PlayerWithRating[];
  orangeTeam: PlayerWithRating[];
}

export default function TeamBalancingVisualization() {
  const location = useLocation();
  const navigate = useNavigate();
  const [parsedData, setParsedData] = useState<ParsedDebugData | null>(null);
  const [activePhase, setActivePhase] = useState<'transformation' | 'tiering' | 'draft' | 'optimization' | 'final'>('transformation');
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  // Refs for sections
  const transformationRef = useRef<HTMLDivElement>(null);
  const tieringRef = useRef<HTMLDivElement>(null);
  const draftRef = useRef<HTMLDivElement>(null);
  const optimizationRef = useRef<HTMLDivElement>(null);
  const finalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }
      setUser(user);
    }
    checkAuth();
  }, [navigate]);

  useEffect(() => {
    const state = location.state as LocationState;
    if (!state?.debugLog) {
      toast.error('No debug log data found');
      navigate('/admin/team-balancing');
      return;
    }

    try {
      console.log('Debug log sample:', state.debugLog.substring(0, 500));
      const parsed = parseDebugLog(state.debugLog);
      console.log('Parsed data:', parsed);
      setParsedData({
        ...parsed,
        blueTeam: state.blueTeam,
        orangeTeam: state.orangeTeam
      });
      setIsLoading(false);
    } catch (error) {
      console.error('Error parsing debug log:', error);
      toast.error('Failed to parse debug log');
      navigate('/admin/team-balancing');
    }
  }, [location.state, navigate]);

  const scrollToSection = (phase: typeof activePhase) => {
    setActivePhase(phase);
    const refs = {
      transformation: transformationRef,
      tiering: tieringRef,
      draft: draftRef,
      optimization: optimizationRef,
      final: finalRef
    };
    refs[phase].current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (isLoading || !parsedData) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-200">
      {/* Fixed Header */}
      <div className="sticky top-0 z-50 bg-base-100 shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Team Balancing Visualization</h1>
              <p className="text-sm text-gray-500">
                {parsedData.executiveSummary.totalPlayers} players • 
                {parsedData.executiveSummary.tierCount} tiers • 
                Balance: {parsedData.executiveSummary.finalBalance.toFixed(3)} ({parsedData.executiveSummary.balanceQuality})
              </p>
            </div>
            <button
              onClick={() => navigate('/admin/team-balancing')}
              className="btn btn-ghost btn-sm"
            >
              ← Back to Team Balancing
            </button>
          </div>
        </div>
      </div>

      {/* Algorithm Timeline */}
      <div className="bg-base-100 border-b">
        <div className="container mx-auto px-4 py-6">
          <AlgorithmTimeline
            activePhase={activePhase}
            onPhaseClick={scrollToSection}
            hasOptimization={parsedData.optimizationSwaps.length > 0}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Executive Summary Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-base-100 rounded-lg shadow-lg p-6"
        >
          <h2 className="text-xl font-bold mb-4">Executive Summary</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="stat">
              <div className="stat-title text-sm">Total Players</div>
              <div className="stat-value text-2xl">{parsedData.executiveSummary.totalPlayers}</div>
              <div className="stat-desc">
                {parsedData.executiveSummary.ratedPlayers} rated, {parsedData.executiveSummary.newPlayers} new
              </div>
            </div>
            <div className="stat">
              <div className="stat-title text-sm">Tier Structure</div>
              <div className="stat-value text-2xl">{parsedData.executiveSummary.tierCount}</div>
              <div className="stat-desc">{parsedData.executiveSummary.tierSizes}</div>
            </div>
            <div className="stat">
              <div className="stat-title text-sm">Final Balance</div>
              <div className="stat-value text-2xl">{parsedData.executiveSummary.finalBalance.toFixed(3)}</div>
              <div className="stat-desc">{parsedData.executiveSummary.balanceQuality}</div>
            </div>
            <div className="stat">
              <div className="stat-title text-sm">Optimization</div>
              <div className="stat-value text-2xl">{parsedData.executiveSummary.optimizationSwaps}</div>
              <div className="stat-desc">swaps made</div>
            </div>
          </div>
          <div className="mt-4 p-3 bg-base-200 rounded-lg">
            <div className="text-sm font-medium">Team Advantage</div>
            <div className="text-lg">{parsedData.executiveSummary.advantage}</div>
          </div>
        </motion.div>

        {/* Player Transformation Section */}
        <div ref={transformationRef}>
          <PlayerTransformationAnalysis data={parsedData} />
        </div>

        {/* Tier Distribution Section */}
        <div ref={tieringRef}>
          <TierDistributionVisual data={parsedData} />
        </div>

        {/* Snake Draft Section */}
        <div ref={draftRef}>
          <SnakeDraftSimulator data={parsedData} />
        </div>

        {/* Optimization Section */}
        <div ref={optimizationRef}>
          <OptimizationJourney data={parsedData} />
        </div>

        {/* Final Teams Section */}
        <div ref={finalRef}>
          <FinalTeamComposition data={parsedData} />
        </div>

        {/* Analytics & Insights */}
        <AnalyticsInsights data={parsedData} />
      </div>

      {/* Floating Action Button for Export */}
      <div className="fixed bottom-6 right-6">
        <div className="dropdown dropdown-top dropdown-end">
          <label tabIndex={0} className="btn btn-circle btn-primary btn-lg shadow-xl">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </label>
          <ul tabIndex={0} className="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-52">
            <li><a onClick={() => toast.success('Export as PDF functionality coming soon!')}>Export as PDF</a></li>
            <li><a onClick={() => toast.success('Export as Image functionality coming soon!')}>Export as Image</a></li>
            <li><a onClick={() => toast.success('Share to WhatsApp functionality coming soon!')}>Share to WhatsApp</a></li>
          </ul>
        </div>
      </div>
    </div>
  );
}
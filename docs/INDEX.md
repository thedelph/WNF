# WNF Documentation Index

**Last Updated:** 2025-11-17

This index provides a comprehensive guide to all WNF documentation. Use this as your starting point to find information about features, systems, components, and fixes.

---

## 🎯 Core Systems

### Player Management
- **[Token System](TokenSystem.md)** - Priority token mechanics, eligibility, and shield tokens
- **[XP System](XPSystemExplained.md)** - Experience points, tiers, and progression
- **[Rarity Tier System](RarityTierSystem.md)** - Player classification and badges

### Ratings & Performance
- **[Ratings System Guide](RatingsSystemGuide.md)** - Comprehensive guide to all rating systems
- **[GK Rating](features/GKRating.md)** - Goalkeeper-specific rating metric
- **[Position Preferences](features/PositionPreferences.md)** - Ranked position system (gold/silver/bronze)
- **[Playstyle System](features/PlaystyleRatingSystem.md)** - 24 playstyles with 6 derived attributes
- **[Admin Ratings Integration](features/AdminRatingsIntegration.md)** - Position integration in admin interface

### Team Management
- **[Team Balancing](features/TeamBalancing.md)** - Tier-based snake draft overview
- **[Team Balancing Algorithm Evolution](algorithms/TeamBalancingEvolution.md)** - Complete algorithm history
- **[Tier-Based Snake Draft](TierBasedSnakeDraftImplementation.md)** - Detailed implementation guide
- **[Formation Suggester](features/FormationSuggester.md)** - Position consensus + playstyle formation assignments

---

## 🔧 Technical Guides

### Development Patterns
- **[Core Development Patterns](systems/CoreDevelopmentPatterns.md)** - Essential coding conventions and patterns
- **[Database Patterns](systems/DatabasePatterns.md)** - RLS policies, triggers, naming conventions
- **[Tech Stack Overview](TechStackOverview.md)** - Technologies used in WNF

### Admin & Configuration
- **[Admin Systems](systems/AdminSystems.md)** - RBAC, View As, Feature Flags
- **[Feature Flag Management](features/BetaTesterFeature.md)** - Beta testing and controlled rollouts

---

## 📋 Features

### Game Management
- **[Game Creation Guide](GameCreationGuide.md)** - Creating games with WhatsApp import
- **[WhatsApp Import](WhatsAppImport.md)** - Parsing player registration messages
- **[WhatsApp Bot Integration](features/WhatsAppBotIntegration.md)** - Automated messaging integration
- **[Game Flow](GameFlow.md)** - Game lifecycle and status transitions
- **[Player Selection Explained](PlayerSelectionExplained.md)** - Selection algorithm and mechanics

### Player Features
- **[Reserve Status Visualization](features/ReserveStatusVisualization.md)** - Last 40 games wheel with reserve tracking
- **[Win Rate Explainer](WinRateExplainer.md)** - Win rate calculation methodology
- **[Goal Differential Feature](GoalDifferentialFeature.md)** - Goal diff tracking and display
- **[Streaks Features](WinningStreaksFeature.md)** - Winning and unbeaten streaks
- **[Player Stats Overview](PlayerStatsFeaturesOverview.md)** - Comprehensive stats features

### Admin Features
- **[Role-Based Access Control](features/RoleBasedAccessControl.md)** - Granular admin permissions
- **[Team Balancing Visualization](features/TeamBalancingVisualization.md)** - Tier pyramids and distribution
- **[Tier Distribution Awareness](features/TierDistributionAwareness.md)** - Preventing quality concentration
- **[Rating Activity Tracking](features/RatingActivityTracking.md)** - Rating history and changes

### UI/UX Enhancements
- **[Changelog Deep Linking](components/Changelog.md)** - Direct links to version sections
- **[Timezone Handling](TimezoneHandling.md)** - UTC storage, local display
- **[Vercel Analytics](VercelAnalyticsIntegration.md)** - Analytics integration

---

## 📦 Components

### Player Display
- **[Player Card](components/PlayerCard.md)** - Card component with stats, participation wheel
- **[Profile Header](components/ProfileHeader.md)** - Player profile header
- **[Stats Grid](components/StatsGrid.md)** - Grid layout for player statistics
- **[Stats Card](components/StatsCard.md)** - Individual stat card component

### Performance Visualizations
- **[Win Rate Graph](components/WinRateGraph.md)** - Win rate trend visualization
- **[Game Results Bar](components/GameResultsBar.md)** - W/L/D result bars
- **[Streak Bar](components/StreakBar.md)** - Winning/unbeaten streak display
- **[Goals Distribution Bar](components/GoalsDistributionBar.md)** - Goal scoring patterns
- **[Goal Differentials Card](components/GoalDifferentialsCard.md)** - +/- differential display
- **[Team Distribution Bar](components/TeamDistributionBar.md)** - Team assignment history
- **[Performance Stats](components/PerformanceStats.md)** - Performance metrics component

### Admin Components
- **[Position Heatmap](components/PositionHeatmap.md)** - League-wide position consensus visualization
- **[Registered Players](components/RegisteredPlayers.md)** - Selection odds, zones, visual indicators
- **[Token Management](components/TokenManagement.md)** - Admin token interface
- **[Comprehensive Stats Table](components/ComprehensiveStatsTable.md)** - Advanced stats table

### Other Components
- **[XP Breakdown](components/XPBreakdown.md)** - XP source breakdown
- **[Password Change Section](components/PasswordChangeSection.md)** - Password management UI
- **[Password Reset Modal](components/PasswordResetModal.md)** - Admin password reset
- **[WhatsApp Messaging](components/WhatsAppMessaging.md)** - Message templates and sending

---

## 🐛 Fixes & Troubleshooting

### Rating System Fixes
- **[Rating Decimal Precision Fix](fixes/RatingDecimalPrecisionFix.md)** - Average calculation precision
- **[Rating Average Overwrite Issue](fixes/RatingAverageOverwriteIssue.md)** - Preventing average overwrites
- **[Game IQ Average Calculation Fix](fixes/GameIQAverageCalculationFix.md)** - Game IQ averaging bug
- **[Game IQ Team Balancing Fix](GameIQTeamBalancingFix.md)** - Game IQ in team balancing

### Team Balancing Fixes
- **[Team Balancing Inconsistency Fix](fixes/TeamBalancingInconsistencyFix.md)** - Consistency improvements
- **[Formation Suggester Overhaul](fixes/FormationSuggesterOverhaul.md)** - Playstyle integration (Sep 2025)
- **[Formation Suggester Position Consensus Integration](fixes/FormationSuggesterPositionConsensusIntegration.md)** - Position consensus priority, outfield-only formations (Nov 2025)

### Token System Fixes
- **[Priority Token Consumption Fix](fixes/PriorityTokenConsumptionFix.md)** - Token usage bugs
- **[Selection Odds Token Counting Fix](fixes/SelectionOddsTokenCountingFix.md)** - Accurate odds calculation
- **[Token Eligibility Fixes](TokenSystem.md#fixes)** - Dropout handling, selection cooldown

### Query & Performance Fixes
- **[Payment Splitting Query Limit Fix](fixes/PaymentSplittingQueryLimitFix.md)** - Supabase query limits
- **[Recent Games Query Limit Fix](fixes/RecentGamesQueryLimitFix.md)** - Last 40 games query optimization
- **[Database Functions](DatabaseFunctions.md)** - RPC and trigger optimizations

### Player Selection Fixes
- **[Registration Close Player Selection Fix](fixes/RegistrationClosePlayerSelectionFix.md)** - Automated selection bug
- **[Bench Warmer Streak Calculation Fix](fixes/BenchWarmerStreakCalculationFix.md)** - Consecutive reserve counting

### UI/UX Fixes
- **[Reserve Status Constraint Fix](fixes/ReserveStatusConstraintFix.md)** - Database constraints
- **[Reserve XP Display Fix](ReserveXPDisplayFix.md)** - Reserve XP calculation
- **[Reserve XP 40 Game Limit Fix](fixes/ReserveXP40GameLimitFix.md)** - 40 game window
- **[Game Participation Wheel Fix](fixes/GameParticipationWheelRegisteredPlayersFix.md)** - Index ordering
- **[XP Value Display Fix](fixes/XPValueDisplayFix.md)** - XP display accuracy
- **[Playstyle TBD Display Fix](fixes/PlaystyleTBDDisplayFix.md)** - Playstyle rendering
- **[Playstyle Feature Visibility Issue](fixes/PlaystyleFeatureVisibilityIssue.md)** - Feature flag visibility

### Other Fixes
- **[Game Deletion Fix](GameDeletionFix.md)** - Cascading deletion
- **[Game Deletion Stack Depth Fix](GameDeletionStackDepthFix.md)** - Recursion limits
- **[Orphaned Game Registrations Fix](fixes/OrphanedGameRegistrationsFix.md)** - Data cleanup
- **[Merge Players Attendance Column Fix](fixes/MergePlayersAttendanceColumnFix.md)** - Column migration
- **[Stats Page Database Fix](fixes/StatsPageDatabaseFix.md)** - Stats query optimization
- **[Recurring Login Issues Fix](fixes/RecurringLoginIssuesFix.md)** ⚠️ **UPDATED Nov 17, 2025** - Auth stability, service role key fixes, SMTP issues, Set Temp Password feature
- **[Specialist Detection Fix](fixes/SpecialistDetectionFix.md)** - Playstyle specialist logic
- **[Similarity-Based Specialist Detection](fixes/SimilarityBasedSpecialistDetection.md)** - Improved detection
- **[Streak Reset on Game Completion Fix](fixes/StreakResetOnGameCompletionFix.md)** - Streak calculation
- **[Registration Streak Bonus Fix](fixes/RegistrationStreakBonusFix.md)** - Bonus calculation

---

## 📚 Guides & Explanations

### Game Mechanics
- **[Slot Offer Function Logic](SlotOfferFunctionLogic.md)** - How slot offers work
- **[Player Selection Explained](PlayerSelectionExplained.md)** - Merit, random, token zones
- **[Game Completion Form Explained](GameCompletionFormExplained.md)** - Completing games
- **[Component Rendering By Phase](ComponentRenderingByPhase.md)** - Phase-based UI rendering

### Historical Documents
- **[XP Leaderboard Fix](XPLeaderboardFix.md)** - Historical XP leaderboard issue
- **[Token System Fix](TokenSystemFix.md)** - Legacy token system fix
- **[Token System Issuance Fix](TokenSystemIssuanceFix.md)** - Token issuance bug
- **[Token System Unpaid Games Fix](TokenSystemUnpaidGamesFix.md)** - Unpaid game handling
- **[Player Profile Multiple Matches Fix](PlayerProfileMultipleMatchesFix.md)** - Profile display bug
- **[Status Change History](StatusChangeHistory.md)** - Status tracking implementation
- **[Player Search](PlayerSearch.md)** - Search functionality

---

## 🗂️ Special Topics

### Team Balancing Deep Dives
- **[Multi-Objective Optimization Roadmap](team-balancing/MultiObjectiveOptimizationRoadmap.md)** - Future optimization plans
- **[Multi-Objective Optimization Progress](team-balancing/MultiObjectiveOptimizationProgress.md)** - Implementation progress
- **[Multi-Objective README](team-balancing/README_MultiObjective.md)** - Optimization overview
- **[Session Summary 2025-11-04](team-balancing/SESSION_SUMMARY_2025-11-04.md)** - Development session notes
- **[Session Summary 2025-11-05](team-balancing/SESSION_SUMMARY_2025-11-05.md)** - Development session notes

### System Designs
- **[Tiered XP System Design](TieredXPSystemDesign.md)** - XP tier architecture
- **[Shield Token System](ShieldTokenSystem.md)** - Comprehensive shield token guide
- **[Win Rate Visualisation Enhancements](WinRateVisualisationEnhancements.md)** - Win rate UI improvements
- **[Goal Differential Team Balancing](GoalDifferentialTeamBalancing.md)** - Goal diff in balancing

---

## 🔍 How to Use This Index

1. **Finding Features**: Look under "Features" for user-facing functionality
2. **Technical Details**: Check "Technical Guides" for implementation patterns
3. **Troubleshooting**: See "Fixes & Troubleshooting" for solved issues
4. **Component Info**: "Components" section documents UI elements
5. **System Overview**: "Core Systems" explains major subsystems

---

## 📝 Contributing to Documentation

When adding new documentation:
1. Create the file in the appropriate subdirectory
2. Add an entry to this INDEX.md
3. Link from CLAUDE.md if it contains critical patterns
4. Use relative links for cross-referencing

**Documentation Standards:**
- Include "Last Updated" date
- Use descriptive headings
- Provide code examples where relevant
- Link to related documentation
- Keep technical depth appropriate for audience

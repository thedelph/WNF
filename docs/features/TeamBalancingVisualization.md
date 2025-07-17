# Team Balancing Visualization

## Overview
A comprehensive visualization system for the tier-based snake draft team balancing algorithm. Accessible via the "View Full Visualization" button on the Team Balancing page or directly at `/admin/team-balancing/visualization`.

## Features

### 1. Algorithm Timeline
Interactive timeline showing all phases of the team generation process:
- **Player Transformation**: Three-layer rating calculations with momentum adjustments
- **Tier Assignment**: Grouping players by skill level
- **Snake Draft**: Step-by-step team selection process
- **Optimization**: Final balance adjustments
- **Final Teams**: Complete team rosters

Click any phase to jump directly to that section.

### 2. Player Transformation Analysis
Three visualization modes showing how player ratings are adjusted:

#### Scatter Plot
- X-axis: Base skill rating
- Y-axis: Final three-layer rating  
- Color coding: Hot (red), Cold (blue), Steady (yellow)
- Diagonal line shows "no change" reference
- Interactive tooltips with full player details

#### Heatmap
- Visual comparison of all metrics across players
- Shows Base Skill, Final Rating, Change, Win Rate Δ, Goal Diff Δ
- Color intensity indicates relative values
- Green = positive changes, Red = negative changes

#### Categories
- Summary statistics for hot/cold/steady players
- Lists of players with major rating boosts or drops
- Performance distribution overview

### 3. Tier Distribution
Multiple views of how players are grouped by skill:

#### Pyramid View
- Visual representation of tier structure
- Shows player count per tier
- Color-coded by tier level
- **Click any tier to see player names directly underneath**
- **Multiple tiers can be expanded simultaneously**
- **"Expand All" and "Collapse All" buttons for bulk control**
- Smooth animations with isolated state per tier

#### Distribution Charts
- Bar chart of players per tier
- Pie chart showing tier proportions
- Skills range visualization

### 4. Snake Draft Simulator
Step-by-step animation of the draft process:
- Play/pause controls
- Speed adjustment (0.5x to 3x)
- Visual draft board showing selections
- True snake pattern visualization with:
  - Randomly selected starting team (shown at top)
  - Alternating first picks between tiers
  - Team balance adjustments when needed
- Current pick indicator
- Running totals for each team
- Warnings when balance adjustments are made

### 5. Balance Analysis Dashboard
Comprehensive team comparison metrics:

#### Radar Chart
- Multi-dimensional team comparison
- Shows Attack, Defense, Game IQ, Win Rate, Goal Diff
- Visual balance assessment

#### Bar Charts
- Side-by-side metric comparisons
- Percentage differences displayed
- Color-coded for easy interpretation

#### Balance Gauge
- Overall balance score (0-100%)
- Visual indicator of team equality

### 6. Optimization Journey
Tracks balance improvements through swaps:
- Initial vs optimized scores
- Each swap shown with players involved
- Score improvements highlighted
- Final optimization results

### 7. Final Team Composition
Three views of the final teams:

#### Player Cards
- Detailed roster cards for each team
- Shows ratings, stats, and tier assignment
- NEW player indicators for <10 games
- Win rate and goal differential for experienced players

#### Team Stats
- Aggregate team metrics
- Average ratings comparison
- Balance summary

#### By Tier
- Players grouped by tier level
- Shows tier distribution per team
- Ensures balanced tier representation

### 8. Analytics Insights
Key metrics and takeaways:
- Total players and confidence level
- Balance improvements achieved
- Distribution statistics
- Algorithm performance summary

## Technical Implementation

### Components Structure
```
/src/components/admin/team-balancing/visualizations/
├── AlgorithmTimeline.tsx       # Phase navigation
├── PlayerTransformationAnalysis.tsx  # Rating adjustments
├── TierDistributionVisual.tsx  # Tier groupings
├── SnakeDraftSimulator.tsx     # Draft animation
├── BalanceAnalysisDashboard.tsx # Team comparisons
├── OptimizationJourney.tsx     # Swap tracking
├── FinalTeamComposition.tsx    # Team rosters
└── AnalyticsInsights.tsx       # Summary metrics
```

### Data Flow
1. Debug log from tier-based algorithm is parsed
2. Structured data passed to visualization components
3. Each component renders specific algorithm aspects
4. Interactive controls allow exploration

### Key Features
- **Responsive Design**: Works on mobile and desktop
- **Interactive Elements**: Hover tooltips, clickable navigation
- **Smooth Animations**: Framer Motion transitions
- **Real-time Updates**: Reflects latest algorithm runs
- **Export Ready**: Visual data can be screenshotted for sharing

## Usage

### Accessing the Visualization
1. Navigate to Admin → Team Balancing
2. Generate teams using the tier-based algorithm
3. Click "View Full Visualization" button
4. Explore different phases and views

### Understanding the Data
- **Momentum Indicators**: 🔥 (hot), ❄️ (cold), ● (steady)
- **Tier Colors**: Higher tiers = darker colors
- **Balance Scores**: Higher = more balanced teams
- **NEW Badge**: Players with <10 games

### Sharing Results
- Use browser screenshot tools to capture visualizations
- Each section is self-contained for easy sharing
- Debug log can be copied for technical discussions

## Recent Updates
- Fixed win rate and goal differential calculations in heatmap
- Added proper null handling for player statistics
- Improved field mapping for snake_case database fields
- Enhanced mobile responsiveness across all views
- **Tier Pyramid Improvements (July 17, 2025)**:
  - Player names now appear directly under each tier when clicked
  - Multiple tiers can be expanded at once for comparison
  - Added expand/collapse all functionality
  - Fixed animation issues with isolated component state
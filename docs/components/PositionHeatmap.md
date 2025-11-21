# Position Heatmap Component

**Component Path:** `src/components/admin/ratings/components/PositionHeatmap.tsx`
**Created:** 2025-11-13
**GK Removed:** 2025-11-21
**Purpose:** League-wide position consensus visualization for admin ratings page

## Overview

The Position Heatmap provides a comprehensive matrix view showing position consensus data for all players across all 11 outfield positions. This visualization helps administrators quickly identify position strengths, versatility, and data quality across the entire player base.

**Note:** GK is not included due to the rotating goalkeeper system. GK ratings (0-10) remain as a core skill metric but are not part of position preferences.

## Visual Structure

### Layout
- **Rows**: Players (sorted alphabetically)
- **Columns**: 11 outfield positions grouped by category
  - Defense: LB, CB, RB, LWB, RWB
  - Midfield: LW, CM, RW, CAM, CDM
  - Attack: ST

### Header Structure
```
┌─────────┬──────────────────────────────────────────────────────┐
│ Player  │ 🛡️ Defense (5 cols) │ ⚙️ Midfield (5 cols) │ ⚔️ Attack │
├─────────┼──────────────────────┼────────────────────┼──────────┤
│         │ LB  CB  RB  LWB  RWB │ LW  CM  RW  CAM CDM│    ST    │
└─────────┴──────────────────────┴────────────────────┴──────────┘
```

## Color Coding

### Consensus Strength
Cells are color-coded based on the consensus percentage:

| Percentage | Color | Class | Meaning |
|------------|-------|-------|---------|
| ≥75% | Success Green | `bg-success` | Strong primary position |
| 50-74% | Primary Blue | `bg-primary` | Primary position |
| 25-49% | Warning Yellow | `bg-warning` | Secondary position |
| 1-24% | Info Blue | `bg-info` | Mentioned position |
| 0% | Base Gray | `bg-base-300` | Not rated |

### Opacity Gradient
- Minimum opacity: 0.2 (for 0% consensus)
- Maximum opacity: 1.0 (for 100% consensus)
- Formula: `0.3 + (percentage / 100) * 0.7`

This creates a subtle visual gradient that emphasizes stronger consensus while still showing weaker signals.

## Cell Content

### Display Format
- **With Rating**: `"75%"` (percentage rounded to integer)
- **No Rating**: `"-"`

### Tooltips
Hovering over a cell displays detailed information:
```
ST: 67% consensus
4/6 raters
🥇 2 | 🥈 1 | 🥉 1
```

For players with insufficient data (<5 raters):
```
Insufficient data (<5 raters)
```

For positions with no ratings but sufficient data elsewhere:
```
ST: No ratings
```

## Legend

The component includes a visual legend at the bottom:

```
[Green Square] 75%+ Primary
[Blue Square] 50-74% Primary
[Yellow Square] 25-49% Secondary
[Light Blue Square] <25% Mentioned
[Gray Square] Not rated
```

## Player Rows

### Status Indicators
Each player row shows their data status:

**Sufficient Data (≥5 raters):**
```
John Smith
```

**Insufficient Data (<5 raters):**
```
John Smith (need 2 more)
```

### Row Interactivity
- **Hover**: Highlights the row
- **Click**: Selects the player (if `onPlayerSelect` callback provided)
- **Selected State**: Row background changes to `bg-primary/20`

## Props Interface

```typescript
interface PositionHeatmapProps {
  /** Array of players with position consensus data */
  players: Player[];

  /** Optional callback when a player row is clicked */
  onPlayerSelect?: (playerId: string) => void;

  /** Currently selected player ID for highlighting */
  selectedPlayerId?: string | null;
}
```

## Data Requirements

### Player Interface
Each player object must include:
- `id`: Unique player identifier
- `friendly_name`: Display name
- `position_consensus`: Array of consensus objects (optional)

### Position Consensus Interface
```typescript
interface PositionConsensus {
  position: Position;           // e.g., 'ST', 'CM'
  percentage: number;           // 0-100
  rating_count: number;         // Number of raters who selected this position
  total_raters: number;         // Total raters for this player
  rank_1_count: number;         // How many picked as 1st choice
  rank_2_count: number;         // How many picked as 2nd choice
  rank_3_count: number;         // How many picked as 3rd choice
}
```

## Performance Considerations

### Optimization Techniques
1. **useMemo**: Position grouping calculated once
2. **Sorted Players**: Pre-sorted alphabetically with useMemo
3. **Staggered Animation**: Rows animate with `delay: idx * 0.02` for smooth rendering

### Rendering Performance
- Handles 50+ players efficiently
- Horizontal scroll prevents performance issues with large datasets
- Animation delays prevent janky initial render

## Responsive Design

### Desktop (>1024px)
- Full heatmap visible
- All 12 position columns displayed
- Tooltips show full detail

### Tablet (768-1024px)
- Horizontal scroll enabled
- Sticky player name column
- Condensed spacing

### Mobile (<768px)
- Position labels abbreviated
- Smaller text sizes
- Touch-optimized cell sizes
- Legend wraps to multiple lines

## Use Cases

### 1. Versatility Analysis
Identify players who excel in multiple positions:
- Look for rows with multiple green/blue cells
- High percentages across different categories suggest versatility

### 2. Position Gap Detection
Find positions that lack coverage:
- Scan columns vertically
- Columns with mostly gray cells indicate position gaps
- Useful for recruitment targeting

### 3. Data Quality Assessment
Identify players needing more ratings:
- Look for "(need X more)" indicators
- Gray cells on otherwise complete rows
- Helps prioritize rating campaigns

### 4. Position Concentration
Spot over-representation in certain positions:
- Columns with many green cells
- Helps understand league meta
- Informs team balancing decisions

## Example Usage

```tsx
import { PositionHeatmap } from './components/admin/ratings/components/PositionHeatmap';

function AdminRatingsPage() {
  const { players } = usePlayerRatings(isSuperAdmin);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

  return (
    <PositionHeatmap
      players={players}
      onPlayerSelect={setSelectedPlayerId}
      selectedPlayerId={selectedPlayerId}
    />
  );
}
```

## Empty State

When no players have position data:
```
┌────────────────────────────────────────────────┐
│  No players with position data to display     │
└────────────────────────────────────────────────┘
```

## Integration Points

### Admin Ratings Page
The Position Heatmap could be integrated as:
1. **Dedicated Tab**: Add a fourth "Position Heatmap" tab
2. **Expandable Section**: Collapsible section within Attributes tab
3. **Standalone View**: Separate admin page at `/admin/positions`

Currently **not integrated** into the main admin ratings page UI, but the component is ready for use.

## Future Enhancements

### Potential Additions
1. **Sort Options**: Click column headers to sort by position strength
2. **Category Collapse**: Fold/unfold position categories
3. **Export**: Download heatmap as CSV or image
4. **Filter Integration**: Respect position filters from main page
5. **Threshold Adjustment**: Toggle to show all positions vs. primary only
6. **Player Search**: Quick filter within heatmap
7. **Comparison Mode**: Highlight selected players for side-by-side comparison

### Advanced Features
- **Heat Gradient Customization**: Let admins choose color schemes
- **Statistical Overlays**: Show standard deviations, ranges
- **Historical View**: Animate changes over time
- **Team Comparison**: Show position distribution by team

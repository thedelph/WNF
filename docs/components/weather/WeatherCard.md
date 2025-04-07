# Weather Card Component

## Overview
The Weather Card component provides real-time weather forecasts for upcoming games. It displays a beautifully animated card that shows weather conditions at the game venue for the scheduled time and date.

## Features
- Dynamic weather forecasts based on venue location and game time
- Animated weather effects for different conditions (rain, snow, sun, clouds, etc.)
- Detailed information including temperature, humidity, wind speed, and precipitation chance
- Expandable/collapsible card that remembers user preference
- Responsive design that works on all screen sizes
- Timezone-aware forecasting that handles GMT/BST transitions

## Technical Implementation

### Dependencies
- OpenWeather API for weather data
- Framer Motion for animations
- React Hot Toast for notifications
- Radix UI Tooltip component
- date-fns and date-fns-tz for timezone handling

### Files
- `src/components/weather/WeatherCard.tsx` - Main component
- `src/components/weather/WeatherAnimations.css` - CSS animations for weather effects
- `src/services/weatherService.ts` - Service for API calls and data processing
- `src/hooks/useWeatherCard.ts` - Custom hook for managing card state
- `src/utils/dateUtils.ts` - Utility functions for timezone handling

## Usage

```tsx
import WeatherCard from '../components/weather/WeatherCard';
import { useWeatherCard } from '../hooks/useWeatherCard';

// In your component:
const { isVisible, toggleVisibility } = useWeatherCard({ gameId: 'optional-game-id' });

// Then in your JSX:
<WeatherCard
  venueAddress="123 Main St, Partington, UK"
  venueName="Partington Sports Village"
  gameDateTime="2025-03-12T21:00:00Z"
  isVisible={isVisible}
  onToggle={toggleVisibility}
/>
```

## Configuration
This component requires an OpenWeather API key to function. Add the following to your `.env` file:

```
VITE_OPENWEATHER_API_KEY=your_api_key_here
```

You can obtain an API key by signing up at [OpenWeatherMap](https://openweathermap.org/api).

## How It Works
1. The component geocodes the venue address to get coordinates
2. It converts the game time from UTC to UK timezone (GMT/BST) using `utcToUkTime()`
3. It fetches weather forecast data for the converted game time from OpenWeather API
4. Based on weather conditions, it applies appropriate CSS animations
5. The card displays temperature, conditions, and other weather metrics
6. User can toggle the card open/closed and state is remembered

## Timezone Handling
The WeatherCard component is timezone-aware and handles the UK's transitions between GMT and BST:

```typescript
// Example of timezone handling in WeatherCard
const gameDateObj = utcToUkTime(new Date(gameDateTime));
const formattedGameTime = format(gameDateObj, 'h:mm a');
```

This ensures that weather forecasts are fetched for the correct local time regardless of whether the UK is in GMT or BST. For more details on timezone handling, see the [Timezone Handling documentation](../../TimezoneHandling.md).

## XP Penalty Consideration
This feature does not interact with the XP penalty system for unpaid games, which remains at -50% per unpaid game as previously documented.

# Weather Card Component

## Overview
The Weather Card component provides real-time weather forecasts for upcoming games. It displays a beautifully animated card that shows weather conditions at the game venue for the scheduled time and date.

## Features
- Dynamic weather forecasts based on venue location and game time
- Animated weather effects for different conditions (rain, snow, sun, clouds, etc.)
- Detailed information including temperature, humidity, wind speed, and precipitation chance
- Expandable/collapsible card that remembers user preference
- Responsive design that works on all screen sizes

## Technical Implementation

### Dependencies
- OpenWeather API for weather data
- Framer Motion for animations
- React Hot Toast for notifications
- Radix UI Tooltip component

### Files
- `src/components/weather/WeatherCard.tsx` - Main component
- `src/components/weather/WeatherAnimations.css` - CSS animations for weather effects
- `src/services/weatherService.ts` - Service for API calls and data processing
- `src/hooks/useWeatherCard.ts` - Custom hook for managing card state

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
2. It fetches weather forecast data for the game time from OpenWeather API
3. Based on weather conditions, it applies appropriate CSS animations
4. The card displays temperature, conditions, and other weather metrics
5. User can toggle the card open/closed and state is remembered

## XP Penalty Consideration
This feature does not interact with the XP penalty system for unpaid games, which remains at -50% per unpaid game as previously documented.

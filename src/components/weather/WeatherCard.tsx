/**
 * WeatherCard Component
 * 
 * Displays an animated weather forecast card for game venues.
 * The component fetches weather data based on venue address and game time.
 * It shows dynamic animations based on weather conditions (rain, snow, sun, etc.)
 * Updates every hour normally, and every 15 minutes on game day.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import {
  geocodeAddress,
  getWeatherForecast,
  getWeatherAnimationClass,
  type WeatherForecast
} from '../../services/weatherService';
import { Tooltip } from '../ui/Tooltip';
import './WeatherAnimations.css';
import { utcToUkTime } from '../../utils/dateUtils';

// Import particle components
import RainParticles from './particles/RainParticles';
import SnowParticles from './particles/SnowParticles';
import LightningBolt from './particles/LightningBolt';
import WindStreaks from './particles/WindStreaks';

interface WeatherCardProps {
  venueAddress: string;
  venueName: string;
  gameDateTime: string;
  isVisible: boolean; // Controls whether the card is visible/expanded
  onToggle: () => void; // Function to toggle the visibility
}

/**
 * WeatherCard component displays weather forecast for game venues
 * Handles timezone conversion for proper display of game date/time
 */
const WeatherCard: React.FC<WeatherCardProps> = ({
  venueAddress,
  venueName,
  gameDateTime,
  isVisible,
  onToggle
}) => {
  // State for weather data
  const [weather, setWeather] = useState<WeatherForecast | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFallbackData, setIsFallbackData] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  
  // Reference to store the refresh timer
  const refreshTimerRef = useRef<number | null>(null);
  
  // Fetch weather data function
  const fetchWeatherData = useCallback(async () => {
    if (!venueAddress || !gameDateTime) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Step 1: Geocode the venue address to get coordinates
      const geoData = await geocodeAddress(venueAddress);
      
      if (!geoData) {
        setError('Unable to find coordinates for this venue');
        setIsLoading(false);
        return;
      }
      
      // If we're using Manchester as fallback, note we're using approximate data
      if (venueAddress.toLowerCase().indexOf('manchester') === -1 && 
          geoData.lat === 53.4808 && geoData.lon === -2.2426) {
        setIsFallbackData(true);
      }
      
      // Step 2: Get weather forecast for the game date/time and location
      // Convert the game date to UK timezone for proper weather forecasting
      const gameDateObj = utcToUkTime(new Date(gameDateTime));
      const forecast = await getWeatherForecast(
        geoData.lat,
        geoData.lon,
        gameDateObj
      );
      
      if (forecast) {
        setWeather(forecast);
        
        // If the API call failed and we're using mock data
        if (forecast.condition === 'Clear' && forecast.icon === '01d' && 
            forecast.windDirection === Math.floor(forecast.windDirection)) {
          setIsFallbackData(true);
        }
      } else {
        setError('Weather forecast not available for this date and location');
      }
    } catch (err) {
      setError('Failed to load weather data');
    } finally {
      setIsLoading(false);
      setLastUpdated(new Date());
    }
  }, [venueAddress, gameDateTime]);
  
  // Set up refresh timer based on game day
  useEffect(() => {
    // Clear any existing timer
    if (refreshTimerRef.current) {
      window.clearInterval(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
    
    // Skip if we don't have the required props
    if (!venueAddress || !gameDateTime) return;
    
    // Determine if it's game day - use UK timezone for proper date comparison
    const now = new Date();
    const gameDate = utcToUkTime(new Date(gameDateTime));
    const isGameDay = 
      now.getFullYear() === gameDate.getFullYear() && 
      now.getMonth() === gameDate.getMonth() && 
      now.getDate() === gameDate.getDate();
    
    // Set refresh interval: 15 minutes on game day, 60 minutes otherwise
    const refreshInterval = isGameDay ? 15 * 60 * 1000 : 60 * 60 * 1000;
    
    // Initial fetch
    fetchWeatherData();
    
    // Set up timer for regular updates
    refreshTimerRef.current = window.setInterval(() => {
      fetchWeatherData();
    }, refreshInterval);
    
    // Clean up the interval on component unmount
    return () => {
      if (refreshTimerRef.current) {
        window.clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [venueAddress, gameDateTime, fetchWeatherData]);
  
  // Determine if it's day or night based on current time and sunrise/sunset
  const isDaytime = useCallback(() => {
    if (!weather || !weather.sys || !weather.sys.sunrise || !weather.sys.sunset) return true;
    const now = new Date().getTime() / 1000; // Convert to seconds
    return now > weather.sys.sunrise && now < weather.sys.sunset;
  }, [weather]);

  // Get the appropriate animation class based on weather conditions
  const getAnimationClass = useCallback(() => {
    if (!weather || !weather.weather || !weather.weather[0]) return 'weather-default-day';
    
    // Extract weather ID and check if it's day or night
    const weatherId = weather.weather[0].id;
    const isDay = isDaytime();
    
    // Extract wind speed and precipitation if available
    const windSpeed = weather.wind?.speed || 0;
    
    // Calculate precipitation from rain or snow data if available
    // OpenWeatherMap provides precipitation in mm for the last 1h or 3h
    let precipitation = 0;
    if (weather.rain) {
      // Get 1h precipitation or 3h if 1h is not available
      precipitation = weather.rain['1h'] || (weather.rain['3h'] ? weather.rain['3h'] / 3 : 0);
    } else if (weather.snow) {
      // Get 1h snow or 3h if 1h is not available
      precipitation = weather.snow['1h'] || (weather.snow['3h'] ? weather.snow['3h'] / 3 : 0);
    }
    
    // Get animation class using the updated function
    return getWeatherAnimationClass(weatherId, isDay, windSpeed, precipitation);
  }, [weather, isDaytime]);
  
  // Format temperature with degree symbol
  const formatTemperature = (temp: number) => {
    return `${Math.round(temp)}°`;
  };

  // Convert wind direction in degrees to compass direction (8-point)
  const getWindDirection = (degrees: number): string => {
    // Define 8-point compass directions
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    
    // Calculate the index in the directions array
    // Each direction covers 45 degrees (360 / 8)
    const index = Math.round(degrees / 45) % 8;
    
    return directions[index];
  };

  // Get appropriate weather icon
  const getWeatherIcon = () => {
    if (!weather || !weather.weather || !weather.weather[0]) return 'cloud';
    
    // Map weather conditions to icon names
    const iconMap: Record<string, string> = {
      'Clear': 'sun',
      'Clouds': 'cloud',
      'Rain': 'cloud-rain',
      'Drizzle': 'cloud-drizzle',
      'Thunderstorm': 'cloud-lightning',
      'Snow': 'cloud-snow',
      'Mist': 'align-justify',
      'Smoke': 'align-justify',
      'Haze': 'align-justify',
      'Dust': 'wind',
      'Fog': 'align-justify',
      'Sand': 'wind',
      'Ash': 'wind',
      'Squall': 'wind',
      'Tornado': 'wind'
    };
    
    // Use icon mapping or default to cloud
    return iconMap[weather.weather[0].main] || 'cloud';
  };
  
  // Format the forecast date for display - using the game date instead of forecast date
  const getFormattedForecastDate = () => {
    // Use the game date directly instead of the weather forecast date
    // Convert to UK timezone for proper display
    const date = utcToUkTime(new Date(gameDateTime));
    
    // Format the date with ordinal suffix for the day
    const day = date.getDate();
    const ordinalSuffix = getOrdinalSuffix(day);
    
    return date.toLocaleString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    }).replace(day.toString(), `${day}${ordinalSuffix}`);
  };
  
  // Helper to get ordinal suffix for a number (1st, 2nd, 3rd, etc.)
  const getOrdinalSuffix = (day: number): string => {
    if (day > 3 && day < 21) return 'th';
    switch (day % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  };

  // Format the last updated time
  const getFormattedLastUpdated = () => {
    return lastUpdated.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Determine which weather particles to show based on conditions
  const getWeatherParticles = useCallback(() => {
    if (!weather || !weather.weather || !weather.weather[0]) {
      return { showRain: false, showSnow: false, showLightning: false, showWind: false };
    }

    const weatherId = weather.weather[0].id;
    const windSpeed = weather.wind?.speed || 0;

    // Rain conditions (200-531)
    const isRain = (weatherId >= 200 && weatherId < 300) || (weatherId >= 300 && weatherId < 600);
    // Snow conditions (600-622)
    const isSnow = weatherId >= 600 && weatherId < 700;
    // Thunderstorm (200-232)
    const isThunderstorm = weatherId >= 200 && weatherId < 300;
    // Windy (wind speed > 7 m/s or specific weather codes)
    const isWindy = windSpeed > 7 || (weatherId >= 700 && weatherId < 782) || weatherId === 905 || weatherId === 957;

    return {
      showRain: isRain,
      showSnow: isSnow,
      showLightning: isThunderstorm,
      showWind: isWindy
    };
  }, [weather]);

  // Determine intensity for rain
  const getRainIntensity = useCallback((): 'light' | 'moderate' | 'heavy' => {
    if (!weather) return 'moderate';

    const weatherId = weather.weather[0]?.id || 0;
    const precipitation = weather.precipitation || 0;

    // Drizzle (300-321) is always light
    if (weatherId >= 300 && weatherId < 400) return 'light';

    // Check precipitation amount
    let precipAmount = 0;
    if (weather.rain) {
      precipAmount = weather.rain['1h'] || (weather.rain['3h'] ? weather.rain['3h'] / 3 : 0);
    }

    if (precipAmount > 7 || precipitation > 70) return 'heavy';
    if (precipAmount > 2.5 || precipitation > 40) return 'moderate';
    return 'light';
  }, [weather]);

  // Determine intensity for snow
  const getSnowIntensity = useCallback((): 'light' | 'moderate' | 'heavy' => {
    if (!weather) return 'moderate';

    const precipitation = weather.precipitation || 0;

    let snowAmount = 0;
    if (weather.snow) {
      snowAmount = weather.snow['1h'] || (weather.snow['3h'] ? weather.snow['3h'] / 3 : 0);
    }

    if (snowAmount > 5 || precipitation > 70) return 'heavy';
    if (snowAmount > 2 || precipitation > 40) return 'moderate';
    return 'light';
  }, [weather]);

  // Determine intensity for lightning
  const getLightningIntensity = useCallback((): 'moderate' | 'heavy' => {
    if (!weather) return 'moderate';

    const weatherId = weather.weather[0]?.id || 0;
    const precipitation = weather.precipitation || 0;

    // Heavy thunderstorm codes: 211, 212, 221
    if (weatherId === 211 || weatherId === 212 || weatherId === 221 || precipitation > 70) {
      return 'heavy';
    }

    return 'moderate';
  }, [weather]);

  // Determine intensity for wind
  const getWindIntensity = useCallback((): 'light' | 'moderate' | 'strong' => {
    if (!weather) return 'moderate';

    const windSpeed = weather.wind?.speed || 0;

    if (windSpeed > 15) return 'strong'; // > 15 m/s
    if (windSpeed > 10) return 'moderate'; // > 10 m/s
    return 'light';
  }, [weather]);
  
  // Variants for motion animations
  const cardVariants = {
    hidden: { y: -50, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { 
        type: 'spring', 
        stiffness: 300, 
        damping: 20 
      }
    },
    exit: {
      y: -20,
      opacity: 0,
      transition: { 
        duration: 0.3
      }
    }
  };
  
  // Animation for the pull-down effect
  const expandVariants = {
    collapsed: { 
      height: '0px', 
      overflow: 'hidden'
    },
    expanded: { 
      height: 'auto',
      transition: { 
        duration: 0.3, 
        ease: 'easeOut' 
      }
    }
  };
  
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={cardVariants}
      className="relative w-full max-w-md mx-auto z-10"
    >
      {/* Header/Toggle button section */}
      <div 
        onClick={onToggle}
        className="bg-gradient-to-r from-blue-700 to-blue-900 text-white p-2 rounded-t-lg cursor-pointer shadow-md flex justify-between items-center"
      >
        <span className="font-semibold">Weather Forecast</span>
        <div className="flex items-center">
          {isLoading ? (
            <div className="animate-spin h-5 w-5 mr-1 border-2 border-white rounded-full border-t-transparent"></div>
          ) : (
            weather && (
              <span className="mr-2">{formatTemperature(weather.temperature)}</span>
            )
          )}
          <i className={`fa-solid fa-chevron-${isVisible ? 'up' : 'down'}`}></i>
        </div>
      </div>
      
      {/* Expandable content section */}
      <motion.div
        initial="collapsed"
        animate={isVisible ? "expanded" : "collapsed"}
        variants={expandVariants}
        className="overflow-hidden"
      >
        <div className={`relative p-4 bg-gradient-to-b from-blue-500 to-blue-700 rounded-b-lg shadow-md ${getAnimationClass()}`}>
          {/* Animation elements container */}
          <div className="absolute inset-0 overflow-hidden rounded-b-lg">
            {/* Animation elements will be added via CSS based on the animation class */}
            <div className="animation-elements">
              <div className="cloud-extra"></div>
              <div className="cloud-extra-2"></div>
              <div className="fog-layer"></div>
              <div className="wind-line"></div>
              <div className="wind-line-2"></div>
              <div className="lightning-extra"></div>
            </div>

            {/* Particle components - rendered conditionally based on weather */}
            {weather && (() => {
              const particles = getWeatherParticles();
              const isNight = !isDaytime();

              return (
                <>
                  {particles.showRain && (
                    <RainParticles
                      intensity={getRainIntensity()}
                      isNight={isNight}
                    />
                  )}
                  {particles.showSnow && (
                    <SnowParticles
                      intensity={getSnowIntensity()}
                    />
                  )}
                  {particles.showLightning && (
                    <LightningBolt
                      intensity={getLightningIntensity()}
                    />
                  )}
                  {particles.showWind && (
                    <WindStreaks
                      intensity={getWindIntensity()}
                    />
                  )}
                </>
              );
            })()}
          </div>
          
          {/* Content container */}
          <div className="relative z-10 text-white shadow-text">
            {isLoading ? (
              <div className="flex justify-center items-center h-20">
                <div className="animate-spin h-8 w-8 border-4 border-white rounded-full border-t-transparent"></div>
              </div>
            ) : error ? (
              <div className="text-center py-3">
                <p className="text-yellow-200 font-semibold">{error}</p>
                <p className="text-sm mt-1">We're showing beautiful animations while our weather data is unavailable.</p>
              </div>
            ) : weather ? (
              <div className="space-y-2">
                {/* Venue Name */}
                <div className="mb-2">
                  <h3 className="font-bold text-lg">{venueName}</h3>
                </div>
                
                {/* Temperature and condition */}
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <span className="text-3xl font-bold mr-2">
                      {formatTemperature(weather.temperature)}
                    </span>
                    <span className="text-lg capitalize">
                      {weather.description}
                    </span>
                  </div>
                  <div className="text-4xl">
                    <i className={`fa-solid fa-${getWeatherIcon()}`}></i>
                  </div>
                </div>
                
                {/* Date and time */}
                <div className="text-sm">
                  <Tooltip content="Game date and time">
                    <span>{getFormattedForecastDate()}</span>
                  </Tooltip>
                </div>
                
                {/* Weather details */}
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div className="flex items-center">
                    <i className="fa-solid fa-droplet mr-2"></i>
                    <Tooltip content="Humidity percentage">
                      <span>Humidity: {weather.humidity}%</span>
                    </Tooltip>
                  </div>
                  <div className="flex items-center">
                    <i className="fa-solid fa-wind mr-2"></i>
                    <Tooltip content="Wind speed in meters per second">
                      <span>Wind: {weather.windSpeed} m/s</span>
                    </Tooltip>
                  </div>
                  <div className="flex items-center">
                    <i className="fa-solid fa-compass mr-2"></i>
                    <Tooltip content="Wind direction">
                      <span>Direction: {getWindDirection(weather.windDirection)}</span>
                    </Tooltip>
                  </div>
                  <div className="flex items-center">
                    <i className="fa-solid fa-cloud-rain mr-2"></i>
                    <Tooltip content="Precipitation probability">
                      <span>Precip: {Math.round(weather.precipitation)}%</span>
                    </Tooltip>
                  </div>
                </div>
                
                <div className="text-xs text-blue-100 text-center mt-2">
                  {isFallbackData ? (
                    <span>⚠️ Showing approximate forecast • Last updated: {getFormattedLastUpdated()}</span>
                  ) : (
                    <span>Forecast for kick-off time • Last updated: {getFormattedLastUpdated()}</span>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-3">
                <p>No weather data available</p>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default WeatherCard;

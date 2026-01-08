/**
 * Weather Service
 * 
 * Handles fetching weather forecast data for game venues.
 * Uses the OpenWeatherMap API for weather data and geocoding.
 * 
 * To use this service, you need to set the VITE_OPENWEATHER_API_KEY
 * environment variable with a valid OpenWeatherMap API key.
 */

// Types for weather data
export interface WeatherForecast {
  datetime: string;
  condition: string;
  description: string;
  temperature: number;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  precipitation: number;
  icon: string;
  weather: any;
  rain: any;
  snow: any;
  wind: any;
  sys: any;
}

export interface GeocodingResult {
  lat: number;
  lon: number;
}

// Common UK city coordinates for fallback if geocoding fails
const UK_LOCATIONS: Record<string, GeocodingResult> = {
  'manchester': { lat: 53.4808, lon: -2.2426 },
  'partington': { lat: 53.4169, lon: -2.4301 },
  'salford': { lat: 53.4839, lon: -2.2953 },
  'liverpool': { lat: 53.4084, lon: -2.9916 },
  'london': { lat: 51.5074, lon: -0.1278 },
  'birmingham': { lat: 52.4862, lon: -1.8904 },
  'leeds': { lat: 53.8008, lon: -1.5491 },
  'glasgow': { lat: 55.8642, lon: -4.2518 },
  'edinburgh': { lat: 55.9533, lon: -3.1883 },
  'newcastle': { lat: 54.9783, lon: -1.6178 },
  'cardiff': { lat: 51.4816, lon: -3.1791 },
};

/**
 * Extracts the city name from an address
 * Simple approach to get approximate city from an address string
 * @param address The full address string
 * @returns A probable city name
 */
const extractCityFromAddress = (address: string): string => {
  // Try to find common UK city names in the address
  const lowerAddress = address.toLowerCase();
  
  // Check if any of our known cities are in the address
  for (const city of Object.keys(UK_LOCATIONS)) {
    if (lowerAddress.includes(city)) {
      return city;
    }
  }
  
  // If no match, try to extract city based on comma separation
  const parts = address.split(',').map(part => part.trim());
  
  // If we have parts, take the one before the postcode (usually the city)
  if (parts.length > 1) {
    // UK postcodes typically come at the end, so the part before that is often the city
    return parts[parts.length - 2].toLowerCase();
  }
  
  // Default to Manchester as fallback
  return 'manchester';
};

/**
 * Geocodes an address to get latitude and longitude coordinates
 * @param address The full address to geocode
 * @returns Promise with latitude and longitude
 */
export const geocodeAddress = async (address: string): Promise<GeocodingResult | null> => {
  try {
    // First try to find a city match in our predefined locations
    const cityName = extractCityFromAddress(address);
    
    // Check if we have this city in our predefined coordinates
    if (UK_LOCATIONS[cityName]) {
      console.log(`Using predefined coordinates for ${cityName}`);
      return UK_LOCATIONS[cityName];
    }
    
    // If no match in predefined cities, try OpenWeatherMap geocoding API
    const formattedAddress = address.replace(/\s+/g, '+');
    
    const apiKey = import.meta.env.VITE_OPENWEATHER_API_KEY;
    const response = await fetch(
      `https://api.openweathermap.org/geo/1.0/direct?q=${formattedAddress}&limit=1&appid=${apiKey}`
    );
    
    if (!response.ok) {
      throw new Error(`Geocoding failed: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data && data.length > 0) {
      return {
        lat: data[0].lat,
        lon: data[0].lon
      };
    }
    
    // If OpenWeatherMap fails but we have a partial city match, use that
    for (const [key, value] of Object.entries(UK_LOCATIONS)) {
      if (cityName.includes(key)) {
        console.log(`Using partial match coordinates for ${key}`);
        return value;
      }
    }
    
    // Ultimate fallback to Manchester
    console.warn('No geocoding results found, defaulting to Manchester coordinates');
    return UK_LOCATIONS['manchester'];
  } catch (error) {
    console.error('Error geocoding address:', error);
    
    // Fallback to approximate coordinates if API fails
    const cityName = extractCityFromAddress(address);
    
    // Try to find a match or partial match in our predefined locations
    for (const [key, value] of Object.entries(UK_LOCATIONS)) {
      if (cityName.includes(key)) {
        console.log(`Fallback: Using coordinates for ${key}`);
        return value;
      }
    }
    
    // Ultimate fallback to Manchester
    console.warn('Geocoding failed, defaulting to Manchester coordinates');
    return UK_LOCATIONS['manchester'];
  }
};

/**
 * Gets weather forecast for a specific date, time, and location
 * @param lat Latitude
 * @param lon Longitude
 * @param targetDate Date and time for the forecast
 * @returns Promise with weather forecast data
 */
export const getWeatherForecast = async (
  lat: number,
  lon: number,
  targetDate: Date
): Promise<WeatherForecast | null> => {
  try {
    const apiKey = import.meta.env.VITE_OPENWEATHER_API_KEY;
    const targetTimestamp = Math.floor(targetDate.getTime() / 1000);
    const currentTime = Math.floor(Date.now() / 1000);
    
    // Use different API endpoints depending on how far in the future the forecast is
    // For up to 5 days in the future, use the 5-day/3-hour forecast API
    // For more than 5 days, use OneCall API with daily forecasts
    
    // Five days in seconds
    const fiveDaysInSeconds = 5 * 24 * 60 * 60;
    
    if (targetTimestamp - currentTime <= fiveDaysInSeconds) {
      // For near-term forecasts (up to 5 days)
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`
      );
      
      if (!response.ok) {
        throw new Error(`Weather forecast failed: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Process the 5-day forecast data
      if (data && data.list && data.list.length > 0) {
        // Find the forecast closest to the target date
        const targetTimestamp = new Date(targetDate).getTime() / 1000;
        
        // Log target date for debugging
        console.log('Target game date:', targetDate.toLocaleString(), 'Timestamp:', targetTimestamp);
        
        // Filter forecasts to only include those on the same day as the target date
        const targetDay = targetDate.getDate();
        const targetMonth = targetDate.getMonth();
        const targetYear = targetDate.getFullYear();
        
        // First try to find forecasts on the exact game day
        let matchingForecasts = data.list.filter(forecast => {
          const forecastDate = new Date(forecast.dt * 1000);
          return forecastDate.getDate() === targetDay && 
                 forecastDate.getMonth() === targetMonth &&
                 forecastDate.getFullYear() === targetYear;
        });
        
        // If no forecasts on the exact day (might be beyond 5-day limit), use all available
        if (matchingForecasts.length === 0) {
          matchingForecasts = data.list;
        }
        
        // Find the closest time match from the filtered forecasts
        let closestForecast = matchingForecasts[0];
        let smallestDiff = Math.abs(targetTimestamp - matchingForecasts[0].dt);
        
        for (let i = 1; i < matchingForecasts.length; i++) {
          const diff = Math.abs(targetTimestamp - matchingForecasts[i].dt);
          if (diff < smallestDiff) {
            smallestDiff = diff;
            closestForecast = matchingForecasts[i];
          }
        }
        
        // Log selected forecast for debugging
        console.log('Selected forecast time:', new Date(closestForecast.dt * 1000).toLocaleString());
        
        // Extract and return the weather data
        return {
          datetime: targetDate.toISOString(),
          condition: closestForecast.weather[0].main,
          description: closestForecast.weather[0].description,
          temperature: closestForecast.main.temp,
          humidity: closestForecast.main.humidity,
          windSpeed: closestForecast.wind.speed,
          windDirection: closestForecast.wind.deg,
          precipitation: closestForecast.pop * 100, // Probability of precipitation as percentage
          icon: closestForecast.weather[0].icon,
          // Add the full weather object for our enhanced animations
          weather: closestForecast.weather,
          rain: closestForecast.rain,
          snow: closestForecast.snow,
          wind: closestForecast.wind,
          sys: {
            // For sunrise/sunset, use the current day's data
            sunrise: new Date(targetDate).setHours(6, 0, 0, 0) / 1000, // Default sunrise at 6 AM
            sunset: new Date(targetDate).setHours(18, 0, 0, 0) / 1000   // Default sunset at 6 PM
          }
        };
      }
    } else {
      // For longer-term forecasts
      try {
        // Use the 2.5 API endpoint which is more widely accessible with free API keys
        // instead of the 3.0 endpoint which requires a paid subscription
        const response = await fetch(
          `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`
        );
        
        if (!response.ok) {
          console.error(`Weather API error: ${response.status} ${response.statusText}`);
          throw new Error(`Weather forecast failed: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Process the 5-day forecast data
        if (data && data.list && data.list.length > 0) {
          // Find the forecast closest to the target date
          const targetTimestamp = new Date(targetDate).getTime() / 1000;
          
          // Log target date for debugging
          console.log('Target game date:', targetDate.toLocaleString(), 'Timestamp:', targetTimestamp);
          
          // Filter forecasts to only include those on the same day as the target date
          const targetDay = targetDate.getDate();
          const targetMonth = targetDate.getMonth();
          const targetYear = targetDate.getFullYear();
          
          // First try to find forecasts on the exact game day
          let matchingForecasts = data.list.filter(forecast => {
            const forecastDate = new Date(forecast.dt * 1000);
            return forecastDate.getDate() === targetDay && 
                   forecastDate.getMonth() === targetMonth &&
                   forecastDate.getFullYear() === targetYear;
          });
          
          // If no forecasts on the exact day (might be beyond 5-day limit), use all available
          if (matchingForecasts.length === 0) {
            matchingForecasts = data.list;
          }
          
          // Find the closest time match from the filtered forecasts
          let closestForecast = matchingForecasts[0];
          let smallestDiff = Math.abs(targetTimestamp - matchingForecasts[0].dt);
          
          for (let i = 1; i < matchingForecasts.length; i++) {
            const diff = Math.abs(targetTimestamp - matchingForecasts[i].dt);
            if (diff < smallestDiff) {
              smallestDiff = diff;
              closestForecast = matchingForecasts[i];
            }
          }
          
          // Log selected forecast for debugging
          console.log('Selected forecast time:', new Date(closestForecast.dt * 1000).toLocaleString());
          
          // Extract and return the weather data
          return {
            datetime: targetDate.toISOString(),
            condition: closestForecast.weather[0].main,
            description: closestForecast.weather[0].description,
            temperature: closestForecast.main.temp,
            humidity: closestForecast.main.humidity,
            windSpeed: closestForecast.wind.speed,
            windDirection: closestForecast.wind.deg,
            precipitation: closestForecast.pop * 100, // Probability of precipitation as percentage
            icon: closestForecast.weather[0].icon,
            // Add the full weather object for our enhanced animations
            weather: closestForecast.weather,
            rain: closestForecast.rain,
            snow: closestForecast.snow,
            wind: closestForecast.wind,
            sys: {
              // For sunrise/sunset, use the current day's data
              sunrise: new Date(targetDate).setHours(6, 0, 0, 0) / 1000, // Default sunrise at 6 AM
              sunset: new Date(targetDate).setHours(18, 0, 0, 0) / 1000   // Default sunset at 6 PM
            }
          };
        } else {
          throw new Error('No forecast data available');
        }
      } catch (error) {
        console.error('Error fetching weather forecast:', error);
        
        // Return a fallback weather object with default values
        // This allows the UI to still render with default animations
        return {
          datetime: new Date(targetDate).toISOString(),
          condition: 'Clouds',
          description: 'Weather data unavailable',
          temperature: 15, // Default temperature
          humidity: 50,    // Default humidity
          windSpeed: 5,    // Default wind speed
          windDirection: 0,
          precipitation: 0,
          icon: '03d',     // Default to few clouds icon
          weather: [{ id: 802, main: 'Clouds', description: 'scattered clouds', icon: '03d' }],
          rain: null,
          snow: null,
          wind: { speed: 5, deg: 0 },
          sys: {
            sunrise: new Date(targetDate).setHours(6, 0, 0, 0) / 1000,
            sunset: new Date(targetDate).setHours(18, 0, 0, 0) / 1000
          }
        };
      }
    }
    
    console.warn('No weather forecast found for the specified time and location');
    return null;
  } catch (error) {
    console.error('Error fetching weather forecast:', error);
    
    // Return mock weather data as fallback when API fails
    const now = new Date();
    const isWinter = now.getMonth() >= 10 || now.getMonth() <= 2; // Nov-Feb
    
    // Generate seasonal mock data
    return {
      datetime: targetDate.toISOString(),
      condition: isWinter ? 'Clouds' : 'Clear',
      description: isWinter ? 'scattered clouds' : 'clear sky',
      temperature: isWinter ? 5 + Math.random() * 5 : 15 + Math.random() * 10,
      humidity: 60 + Math.random() * 20,
      windSpeed: 3 + Math.random() * 5,
      windDirection: Math.random() * 360,
      precipitation: isWinter ? 30 + Math.random() * 40 : 10 + Math.random() * 20,
      icon: isWinter ? '03d' : '01d',
      weather: [{ id: 802, main: isWinter ? 'Clouds' : 'Clear', description: isWinter ? 'scattered clouds' : 'clear sky', icon: isWinter ? '03d' : '01d' }],
      rain: null,
      snow: null,
      wind: { speed: 3 + Math.random() * 5, deg: Math.random() * 360 },
      sys: {
        sunrise: new Date(targetDate).setHours(6, 0, 0, 0) / 1000,
        sunset: new Date(targetDate).setHours(18, 0, 0, 0) / 1000
      }
    };
  }
};

/**
 * Determines the appropriate CSS animation class based on weather conditions
 * @param weatherId - OpenWeatherMap weather condition code
 * @param isDay - Boolean indicating if it's daytime
 * @param windSpeed - Wind speed in meters/second
 * @param precipitation - Precipitation amount in mm
 * @returns CSS class name for the appropriate weather animation
 */
export const getWeatherAnimationClass = (
  weatherId: number,
  isDay: boolean,
  windSpeed = 0,
  precipitation = 0
): string => {
  // Define thresholds for different weather intensities
  const HEAVY_RAIN_THRESHOLD = 7; // mm
  const HEAVY_SNOW_THRESHOLD = 5; // mm
  const STRONG_WIND_THRESHOLD = 10; // m/s
  const EXTREME_WIND_THRESHOLD = 20; // m/s

  // Check for extreme weather conditions first
  if (weatherId === 781) {
    return 'weather-tornado';
  }

  // Check for thunderstorms (200-232)
  if (weatherId >= 200 && weatherId < 300) {
    if (precipitation > HEAVY_RAIN_THRESHOLD) {
      return 'weather-heavy-thunderstorm';
    }
    return isDay ? 'weather-thunderstorm-day' : 'weather-thunderstorm-night';
  }

  // Check for drizzle (300-321)
  if (weatherId >= 300 && weatherId < 400) {
    if (windSpeed > STRONG_WIND_THRESHOLD) {
      return 'weather-windy-drizzle';
    }
    return isDay ? 'weather-drizzle-day' : 'weather-drizzle-night';
  }

  // Check for rain (500-531)
  if (weatherId >= 500 && weatherId < 600) {
    if (precipitation > HEAVY_RAIN_THRESHOLD) {
      return isDay ? 'weather-heavy-rain-day' : 'weather-heavy-rain-night';
    }
    if (windSpeed > STRONG_WIND_THRESHOLD) {
      return 'weather-windy-rain';
    }
    return isDay ? 'weather-rain-day' : 'weather-rain-night';
  }

  // Check for snow (600-622)
  if (weatherId >= 600 && weatherId < 700) {
    if (precipitation > HEAVY_SNOW_THRESHOLD) {
      return 'weather-heavy-snow';
    }
    if (windSpeed > STRONG_WIND_THRESHOLD) {
      return 'weather-windy-snow';
    }
    return isDay ? 'weather-snow-day' : 'weather-snow-night';
  }

  // Check for atmosphere phenomena (700-781)
  if (weatherId >= 700 && weatherId < 800) {
    // Mist, smoke, haze, fog
    if (weatherId >= 700 && weatherId <= 750) {
      if (windSpeed > STRONG_WIND_THRESHOLD) {
        return 'weather-fog-windy';
      }
      return 'weather-fog';
    }
    
    // Dust, sand, dust whirls
    if (weatherId >= 751 && weatherId <= 771) {
      if (windSpeed > STRONG_WIND_THRESHOLD) {
        return 'weather-windy-dust';
      }
      return 'weather-dust';
    }
    
    // Tornado and extreme conditions
    return 'weather-extreme';
  }

  // Check for clear sky (800)
  if (weatherId === 800) {
    return isDay ? 'weather-clear-day' : 'weather-clear-night';
  }

  // Check for clouds (801-804)
  if (weatherId > 800 && weatherId < 900) {
    // Few clouds (801)
    if (weatherId === 801) {
      return isDay ? 'weather-few-clouds-day' : 'weather-few-clouds-night';
    }
    
    // Scattered clouds (802)
    if (weatherId === 802) {
      return isDay ? 'weather-scattered-clouds-day' : 'weather-scattered-clouds-night';
    }
    
    // Broken or overcast clouds (803-804)
    return 'weather-cloudy';
  }

  // Default fallback for unknown conditions
  return isDay ? 'weather-default-day' : 'weather-default-night';
};

/**
 * useWeatherCard Hook
 * 
 * Custom hook for managing the weather card state in the Game component.
 * Handles visibility toggling, persistence, and API key validation.
 */

import { useState, useEffect } from 'react';

interface UseWeatherCardProps {
  gameId?: string;
}

/**
 * Custom hook for managing the weather card state
 * @param props - Properties including the gameId for persisting state
 * @returns Object containing visibility state and toggle function
 */
export const useWeatherCard = (props: UseWeatherCardProps = {}) => {
  // Get previous state from localStorage if available
  const getInitialVisibility = () => {
    try {
      // If there's a specific game ID, we can save per-game preferences
      if (props.gameId) {
        const savedState = localStorage.getItem(`weather_card_visible_${props.gameId}`);
        return savedState === 'true';
      }
      
      // Otherwise use the global preference
      const savedState = localStorage.getItem('weather_card_visible');
      return savedState === null ? false : savedState === 'true'; // Default to collapsed (false)
    } catch (error) {
      // If localStorage fails, default to collapsed
      console.error('Error reading localStorage for weather card state:', error);
      return false;
    }
  };

  // State for whether the card is visible/expanded
  const [isVisible, setIsVisible] = useState<boolean>(getInitialVisibility());
  
  // Check if API key is configured
  const [hasApiKey, setHasApiKey] = useState<boolean>(false);
  
  useEffect(() => {
    // Check if API key is available
    const apiKey = import.meta.env.VITE_OPENWEATHER_API_KEY;
    setHasApiKey(!!apiKey);
    
    // Log warning if key is missing
    if (!apiKey) {
      console.warn(
        'OpenWeather API key not found! Add VITE_OPENWEATHER_API_KEY to your .env file to enable weather forecasts.'
      );
    }
  }, []);
  
  // Save visibility state when it changes
  useEffect(() => {
    try {
      // Save game-specific preference if we have a gameId
      if (props.gameId) {
        localStorage.setItem(`weather_card_visible_${props.gameId}`, String(isVisible));
      }
      
      // Always save the global preference
      localStorage.setItem('weather_card_visible', String(isVisible));
    } catch (error) {
      console.error('Error saving weather card state to localStorage:', error);
    }
  }, [isVisible, props.gameId]);
  
  // Toggle visibility function
  const toggleVisibility = () => {
    setIsVisible(prevVisible => !prevVisible);
  };
  
  return {
    isVisible,
    toggleVisibility,
    hasApiKey
  };
};

export default useWeatherCard;

/**
 * Weather Demo Page
 *
 * Displays all weather animation types in a grid for testing and comparison.
 * This page shows mock weather data for every supported condition.
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import RainParticles from '../components/weather/particles/RainParticles';
import SnowParticles from '../components/weather/particles/SnowParticles';
import LightningBolt from '../components/weather/particles/LightningBolt';
import WindStreaks from '../components/weather/particles/WindStreaks';
import '../components/weather/WeatherAnimations.css';

interface WeatherDemoCard {
  title: string;
  description: string;
  animationClass: string;
  particles?: {
    type: 'rain' | 'snow' | 'lightning' | 'wind';
    intensity: 'light' | 'moderate' | 'heavy' | 'strong';
    isNight?: boolean;
  };
}

const weatherConditions: WeatherDemoCard[] = [
  {
    title: '☀️ Clear Day',
    description: 'Sunny with animated sun rays',
    animationClass: 'weather-clear-day'
  },
  {
    title: '🌙 Clear Night',
    description: 'Moon with twinkling stars',
    animationClass: 'weather-clear-night'
  },
  {
    title: '⛅ Partly Cloudy Day',
    description: 'Sun with floating clouds',
    animationClass: 'weather-partly-cloudy-day'
  },
  {
    title: '⛅ Partly Cloudy Night',
    description: 'Moon with clouds',
    animationClass: 'weather-partly-cloudy-night'
  },
  {
    title: '☁️ Cloudy',
    description: 'Multiple layered clouds',
    animationClass: 'weather-cloudy'
  },
  {
    title: '🌧️ Light Drizzle',
    description: 'Light rain particles',
    animationClass: 'weather-drizzle',
    particles: { type: 'rain', intensity: 'light', isNight: false }
  },
  {
    title: '🌧️ Moderate Rain',
    description: 'Steady rain',
    animationClass: 'weather-rain-day',
    particles: { type: 'rain', intensity: 'moderate', isNight: false }
  },
  {
    title: '🌧️ Heavy Rain',
    description: 'Heavy downpour',
    animationClass: 'weather-heavy-rain-day',
    particles: { type: 'rain', intensity: 'heavy', isNight: false }
  },
  {
    title: '🌧️ Rain at Night',
    description: 'Rain with night colors',
    animationClass: 'weather-rain-night',
    particles: { type: 'rain', intensity: 'moderate', isNight: true }
  },
  {
    title: '⛈️ Thunderstorm',
    description: 'Lightning + heavy rain',
    animationClass: 'weather-thunderstorm'
  },
  {
    title: '⛈️ Heavy Thunderstorm',
    description: 'Multiple lightning bolts',
    animationClass: 'weather-thunderstorm-heavy'
  },
  {
    title: '❄️ Light Snow',
    description: 'Gentle snowfall',
    animationClass: 'weather-snow',
    particles: { type: 'snow', intensity: 'light', isNight: false }
  },
  {
    title: '❄️ Moderate Snow',
    description: 'Steady snowfall',
    animationClass: 'weather-snow',
    particles: { type: 'snow', intensity: 'moderate', isNight: false }
  },
  {
    title: '❄️ Heavy Snow',
    description: 'Blizzard conditions',
    animationClass: 'weather-heavy-snow',
    particles: { type: 'snow', intensity: 'heavy', isNight: false }
  },
  {
    title: '🌫️ Fog',
    description: 'Layered fog banks',
    animationClass: 'weather-fog'
  },
  {
    title: '🌫️ Windy Fog',
    description: 'Fast-moving fog',
    animationClass: 'weather-fog-windy'
  },
  {
    title: '💨 Light Wind',
    description: 'Gentle wind streaks',
    animationClass: 'weather-windy',
    particles: { type: 'wind', intensity: 'light', isNight: false }
  },
  {
    title: '💨 Moderate Wind',
    description: 'Steady wind',
    animationClass: 'weather-windy',
    particles: { type: 'wind', intensity: 'moderate', isNight: false }
  },
  {
    title: '💨 Strong Wind',
    description: 'High wind speeds',
    animationClass: 'weather-windy',
    particles: { type: 'wind', intensity: 'strong', isNight: false }
  },
  {
    title: '💨 Windy + Rain',
    description: 'Combined wind and rain',
    animationClass: 'weather-windy-rain',
    particles: { type: 'rain', intensity: 'moderate', isNight: false }
  },
  {
    title: '🌪️ Tornado',
    description: 'Spinning funnel cloud',
    animationClass: 'weather-tornado',
    particles: { type: 'wind', intensity: 'strong', isNight: false }
  }
];

const WeatherDemo: React.FC = () => {
  const [selectedCard, setSelectedCard] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold text-white mb-2">
            ⛅ Weather Animations Demo
          </h1>
          <p className="text-blue-200 mb-4">
            Testing all {weatherConditions.length} weather animation types
          </p>
          <div className="text-sm text-blue-300 bg-blue-800/50 rounded-lg p-3 inline-block">
            💡 Tip: Click any card to see it larger, or scroll to compare all animations
          </div>
        </motion.div>

        {/* Large preview if card selected */}
        {selectedCard !== null && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-8 relative"
          >
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-2xl">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                    {weatherConditions[selectedCard].title}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-300">
                    {weatherConditions[selectedCard].description}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedCard(null)}
                  className="btn btn-circle btn-ghost text-gray-600 dark:text-gray-300"
                >
                  <i className="fa-solid fa-times text-xl"></i>
                </button>
              </div>
              <div
                className={`relative h-80 rounded-lg overflow-hidden ${weatherConditions[selectedCard].animationClass}`}
              >
                <div className="absolute inset-0">
                  <div className="animation-elements">
                    <div className="cloud-extra"></div>
                    <div className="cloud-extra-2"></div>
                    <div className="fog-layer"></div>
                    <div className="wind-line"></div>
                    <div className="wind-line-2"></div>
                  </div>

                  {/* Render particles */}
                  {(() => {
                    const condition = weatherConditions[selectedCard];
                    const isThunderstorm = condition.animationClass.includes('thunderstorm');
                    const isWindyRain = condition.animationClass.includes('windy-rain');

                    return (
                      <>
                        {condition.particles && (() => {
                          const p = condition.particles!;
                          switch (p.type) {
                            case 'rain':
                              return <RainParticles intensity={p.intensity as any} isNight={p.isNight} />;
                            case 'snow':
                              return <SnowParticles intensity={p.intensity as any} />;
                            case 'lightning':
                              return <LightningBolt intensity={p.intensity as any} />;
                            case 'wind':
                              return <WindStreaks intensity={p.intensity as any} />;
                          }
                        })()}

                        {/* Thunderstorms show both lightning and rain */}
                        {isThunderstorm && (
                          <>
                            <LightningBolt intensity={condition.animationClass.includes('heavy') ? 'heavy' : 'moderate'} />
                            <RainParticles intensity="heavy" isNight={false} />
                          </>
                        )}

                        {/* Windy Rain shows both wind and rain */}
                        {isWindyRain && (
                          <>
                            <WindStreaks intensity="strong" />
                            <RainParticles intensity="moderate" isNight={false} />
                          </>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Grid of all conditions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {weatherConditions.map((condition, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              whileHover={{ scale: 1.03 }}
              className="cursor-pointer"
              onClick={() => setSelectedCard(index)}
            >
              <div className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
                {/* Weather animation preview */}
                <div
                  className={`relative h-40 ${condition.animationClass}`}
                >
                  <div className="absolute inset-0 overflow-hidden">
                    <div className="animation-elements">
                      <div className="cloud-extra"></div>
                      <div className="cloud-extra-2"></div>
                      <div className="fog-layer"></div>
                      <div className="wind-line"></div>
                      <div className="wind-line-2"></div>
                    </div>

                    {/* Render particles */}
                    {(() => {
                      const isThunderstorm = condition.animationClass.includes('thunderstorm');
                      const isWindyRain = condition.animationClass.includes('windy-rain');

                      return (
                        <>
                          {condition.particles && (() => {
                            const p = condition.particles;
                            switch (p.type) {
                              case 'rain':
                                return <RainParticles intensity={p.intensity as any} isNight={p.isNight} />;
                              case 'snow':
                                return <SnowParticles intensity={p.intensity as any} />;
                              case 'lightning':
                                return <LightningBolt intensity={p.intensity as any} />;
                              case 'wind':
                                return <WindStreaks intensity={p.intensity as any} />;
                            }
                          })()}

                          {/* Thunderstorms show both lightning and rain */}
                          {isThunderstorm && (
                            <>
                              <LightningBolt intensity={condition.animationClass.includes('heavy') ? 'heavy' : 'moderate'} />
                              <RainParticles intensity="heavy" isNight={false} />
                            </>
                          )}

                          {/* Windy Rain shows both wind and rain */}
                          {isWindyRain && (
                            <>
                              <WindStreaks intensity="strong" />
                              <RainParticles intensity="moderate" isNight={false} />
                            </>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>

                {/* Card info */}
                <div className="p-4 bg-white dark:bg-gray-800">
                  <h3 className="font-bold text-gray-800 dark:text-white mb-1">
                    {condition.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {condition.description}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Footer info */}
        <div className="mt-8 text-center text-blue-200 text-sm">
          <p>All animations are GPU-accelerated and mobile-optimized</p>
          <p className="mt-1">
            Animations respect <code className="bg-blue-800/50 px-2 py-1 rounded">prefers-reduced-motion</code> accessibility settings
          </p>
        </div>
      </div>
    </div>
  );
};

export default WeatherDemo;

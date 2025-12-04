/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      screens: {
        '3xl': '1920px',
      },
      colors: {
        // FIFA Theme Colors
        'fifa-bg': '#0a0a0f',
        'fifa-surface': '#12121a',
        'fifa-card': '#1a1a25',
        'fifa-elevated': '#222230',
        'fifa-electric': '#00d4ff',
        'fifa-gold': '#ffd700',
        'fifa-pink': '#ff2d92',
        'fifa-green': '#00ff88',
        'fifa-purple': '#9d4edd',
        'fifa-orange': '#ff6b35',
        // Rarity colors
        'rarity-bronze': '#cd7f32',
        'rarity-silver': '#c0c0c0',
        'rarity-gold': '#ffd700',
        'rarity-totw': '#1e90ff',
        'rarity-icon': '#ff6b35',
      },
      fontFamily: {
        'fifa-display': ['Oswald', 'sans-serif'],
        'fifa-body': ['Inter', 'sans-serif'],
      },
      animation: {
        'flip': 'flip 0.6s ease-in-out',
        'gradient-xy': 'gradient-xy 3s ease infinite',
        // FIFA animations
        'shine': 'shine 3s ease-in-out infinite',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'particle-float': 'particle-float 15s linear infinite',
        'slide-up': 'slide-up 0.5s ease-out',
        'scale-in': 'scale-in 0.4s ease-out',
        'text-glow': 'text-glow 2s ease-in-out infinite',
      },
      keyframes: {
        flip: {
          '0%': { transform: 'rotateY(0deg)' },
          '100%': { transform: 'rotateY(180deg)' },
        },
        'gradient-xy': {
          '0%, 100%': {
            'background-size': '400% 400%',
            'background-position': 'left center'
          },
          '50%': {
            'background-size': '200% 200%',
            'background-position': 'right center'
          }
        },
        // FIFA keyframes
        shine: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 20px currentColor', opacity: '0.8' },
          '50%': { boxShadow: '0 0 40px currentColor, 0 0 60px currentColor', opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0) rotate(0deg)' },
          '50%': { transform: 'translateY(-10px) rotate(5deg)' },
        },
        'particle-float': {
          '0%': { transform: 'translate(0, 0) rotate(0deg)', opacity: '0' },
          '10%': { opacity: '0.6' },
          '90%': { opacity: '0.6' },
          '100%': { transform: 'translate(var(--x-drift, 50px), -100vh) rotate(360deg)', opacity: '0' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'text-glow': {
          '0%, 100%': { textShadow: '0 0 10px var(--tw-shadow-color), 0 0 20px var(--tw-shadow-color)' },
          '50%': { textShadow: '0 0 20px var(--tw-shadow-color), 0 0 40px var(--tw-shadow-color), 0 0 60px var(--tw-shadow-color)' },
        },
      },
      boxShadow: {
        'fifa-glow': '0 0 20px rgba(0, 212, 255, 0.5)',
        'fifa-glow-strong': '0 0 30px rgba(0, 212, 255, 0.7), 0 0 60px rgba(0, 212, 255, 0.4)',
        'gold-glow': '0 0 30px rgba(255, 215, 0, 0.6)',
        'pink-glow': '0 0 25px rgba(255, 45, 146, 0.5)',
      },
      backgroundImage: {
        'fifa-gradient': 'linear-gradient(135deg, #0a0a0f 0%, #1a1a25 50%, #0a0a0f 100%)',
        'card-shine': 'linear-gradient(110deg, transparent 25%, rgba(255,255,255,0.1) 50%, transparent 75%)',
      },
    },
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: ["light"],
    base: true,
    styled: true,
    utils: true,
  }
}
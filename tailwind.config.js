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
        // Trophy/Medal colors
        'medal-gold': '#ffd700',
        'medal-gold-dark': '#b8860b',
        'medal-silver': '#c0c0c0',
        'medal-silver-dark': '#a0a0a0',
        'medal-bronze': '#cd7f32',
        'medal-bronze-dark': '#8b4513',
        // Trophy cabinet theme
        'trophy-bg': '#0d0d12',
        'trophy-surface': '#15151f',
        'trophy-elevated': '#1e1e2a',
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
        // Trophy animations
        'medal-shine': 'medal-shine 2.5s ease-in-out infinite',
        'trophy-wobble': 'trophy-wobble 4s ease-in-out infinite',
        'podium-rise': 'podium-rise 0.6s ease-out forwards',
        'trophy-pulse': 'trophy-pulse 3s ease-in-out infinite',
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
        // Trophy keyframes
        'medal-shine': {
          '0%': { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
        'trophy-wobble': {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '25%': { transform: 'rotate(5deg)' },
          '75%': { transform: 'rotate(-5deg)' },
        },
        'podium-rise': {
          '0%': { opacity: '0', transform: 'translateY(30px) scale(0.9)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'trophy-pulse': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(255, 215, 0, 0)' },
          '50%': { boxShadow: '0 0 20px 5px rgba(255, 215, 0, 0.3)' },
        },
      },
      boxShadow: {
        'fifa-glow': '0 0 20px rgba(0, 212, 255, 0.5)',
        'fifa-glow-strong': '0 0 30px rgba(0, 212, 255, 0.7), 0 0 60px rgba(0, 212, 255, 0.4)',
        'gold-glow': '0 0 30px rgba(255, 215, 0, 0.6)',
        'pink-glow': '0 0 25px rgba(255, 45, 146, 0.5)',
        // Medal glows
        'medal-gold': '0 0 20px rgba(255, 215, 0, 0.5), 0 0 40px rgba(255, 215, 0, 0.3)',
        'medal-silver': '0 0 20px rgba(192, 192, 192, 0.5), 0 0 40px rgba(192, 192, 192, 0.3)',
        'medal-bronze': '0 0 20px rgba(205, 127, 50, 0.5), 0 0 40px rgba(205, 127, 50, 0.3)',
        'trophy-glow': '0 4px 20px rgba(255, 215, 0, 0.4), 0 0 60px rgba(255, 215, 0, 0.2)',
      },
      backgroundImage: {
        'fifa-gradient': 'linear-gradient(135deg, #0a0a0f 0%, #1a1a25 50%, #0a0a0f 100%)',
        'card-shine': 'linear-gradient(110deg, transparent 25%, rgba(255,255,255,0.1) 50%, transparent 75%)',
        // Medal gradients
        'medal-gold-gradient': 'linear-gradient(135deg, #ffd700 0%, #ffec8b 30%, #ffd700 50%, #daa520 100%)',
        'medal-silver-gradient': 'linear-gradient(135deg, #e8e8e8 0%, #ffffff 30%, #c0c0c0 50%, #a8a8a8 100%)',
        'medal-bronze-gradient': 'linear-gradient(135deg, #cd7f32 0%, #daa06d 30%, #cd7f32 50%, #8b4513 100%)',
        'medal-shine': 'linear-gradient(110deg, transparent 20%, rgba(255,255,255,0.4) 50%, transparent 80%)',
        'trophy-cabinet': 'linear-gradient(180deg, #0d0d12 0%, #15151f 50%, #0d0d12 100%)',
      },
    },
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: ["light"],
  }
}
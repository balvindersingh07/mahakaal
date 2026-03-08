/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        mahakaal: {
          purple: '#6C2BD9',
          violet: '#A855F7',
          coral: '#FF6B6B',
          orange: '#FF8A00',
        }
      },
      backgroundImage: {
        'gradient-mahakaal': 'linear-gradient(135deg, #6C2BD9 0%, #A855F7 35%, #FF6B6B 70%, #FF8A00 100%)',
        'gradient-mahakaal-soft': 'linear-gradient(135deg, rgba(108,43,217,0.1) 0%, rgba(168,85,247,0.1) 50%, rgba(255,138,0,0.1) 100%)',
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
        'glass-lg': '0 8px 32px 0 rgba(31, 38, 135, 0.25)',
        'glow-purple': '0 0 40px rgba(108, 43, 217, 0.4)',
        'glow-orange': '0 0 40px rgba(255, 138, 0, 0.4)',
        'glow-gradient': '0 0 60px rgba(168, 85, 247, 0.35)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'float-delay-1': 'float 6s ease-in-out 1s infinite',
        'float-delay-2': 'float 6s ease-in-out 2s infinite',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        'particle-float': 'particle-float 8s ease-in-out infinite',
        'slide-in-left': 'slide-in-left 0.5s ease-out forwards',
        'fade-out': 'fade-out 0.5s ease-in forwards',
        'marquee': 'marquee 25s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        'glow-pulse': {
          '0%, 100%': { opacity: '0.6', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.05)' },
        },
        'particle-float': {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)', opacity: '0.4' },
          '33%': { transform: 'translate(10px, -15px) scale(1.1)', opacity: '0.7' },
          '66%': { transform: 'translate(-5px, -25px) scale(0.9)', opacity: '0.5' },
        },
        'slide-in-left': {
          '0%': { transform: 'translateX(-100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        'fade-out': {
          '0%': { opacity: '1', transform: 'translateX(0)' },
          '100%': { opacity: '0', transform: 'translateX(-20px)' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
    },
  },
  plugins: [],
}

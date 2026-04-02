/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // Display font — DM Sans for Mate companion identity
      fontFamily: {
        display: ['DM Sans', 'system-ui', 'sans-serif'],
      },
      // Design System Colors
      colors: {
        // Primary brand colors using CSS variables
        primary: {
          DEFAULT: 'var(--color-primary)',
          hover: 'var(--color-primary-hover)',
          50: 'var(--color-neutral-50)',
          100: 'var(--color-neutral-100)',
          500: 'var(--color-primary)',
          600: 'var(--color-primary-hover)',
        },
        secondary: {
          DEFAULT: 'var(--color-secondary)',
          hover: 'var(--color-secondary-hover)',
          500: 'var(--color-secondary)',
          600: 'var(--color-secondary-hover)',
        },
        accent: {
          DEFAULT: 'var(--color-accent)',
          hover: 'var(--color-accent-hover)',
          500: 'var(--color-accent)',
          600: 'var(--color-accent-hover)',
        },
        // Glass system
        glass: {
          primary: 'var(--glass-primary)',
          secondary: 'var(--glass-secondary)',
          tertiary: 'var(--glass-tertiary)',
          border: 'var(--glass-border)',
          'border-hover': 'var(--glass-border-hover)',
          'border-active': 'var(--glass-border-active)',
        },
        // Text system
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
          disabled: 'var(--text-disabled)',
          'high-contrast': 'var(--text-high-contrast)',
          inverse: 'var(--text-inverse)',
          accent: 'var(--text-accent)',
          success: 'var(--text-success)',
          warning: 'var(--text-warning)',
          danger: 'var(--text-danger)',
        },
      },
      
      // Design System Spacing
      spacing: {
        xs: 'var(--space-xs)',
        sm: 'var(--space-sm)',
        md: 'var(--space-md)',
        lg: 'var(--space-lg)',
        xl: 'var(--space-xl)',
        '2xl': 'var(--space-2xl)',
        '3xl': 'var(--space-3xl)',
        '4xl': 'var(--space-4xl)',
        '5xl': 'var(--space-5xl)',
      },
      
      // Design System Border Radius
      borderRadius: {
        xs: 'var(--radius-xs)',
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        '2xl': 'var(--radius-2xl)',
        full: 'var(--radius-full)',
      },
      
      // Design System Shadows
      boxShadow: {
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
        xl: 'var(--shadow-xl)',
        '2xl': 'var(--shadow-2xl)',
        glow: 'var(--shadow-glow)',
        'glow-secondary': 'var(--shadow-glow-secondary)',
      },
      
      // Design System Animations
      transitionDuration: {
        fast: 'var(--duration-fast)',
        normal: 'var(--duration-normal)',
        slow: 'var(--duration-slow)',
        slower: 'var(--duration-slower)',
      },
      
      transitionTimingFunction: {
        'ease-out': 'var(--easing-ease-out)',
        'ease-in-out': 'var(--easing-ease-in-out)',
        bounce: 'var(--easing-bounce)',
        spring: 'var(--easing-spring)',
        smooth: 'var(--easing-smooth)',
      },
      
      // Background System
      backgroundImage: {
        'gradient-primary': 'var(--gradient-primary)',
        'gradient-secondary': 'var(--gradient-secondary)',
        'gradient-tertiary': 'var(--gradient-tertiary)',
        'gradient-surface': 'var(--gradient-surface)',
        'gradient-overlay': 'var(--gradient-overlay)',
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
      
      // Component Specific
      height: {
        'bottom-area': 'var(--bottom-area-height)',
        'bottom-area-mobile': 'var(--bottom-area-height-mobile)',
      },
      
      width: {
        'sidebar': 'var(--sidebar-width)',
        'sidebar-expanded': 'var(--sidebar-width-expanded)',
      },
      
      // Animation keyframes
      keyframes: {
        'slide-in-top': {
          '0%': { opacity: '0', transform: 'translateY(-100%)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-bottom': {
          '0%': { opacity: '0', transform: 'translateY(100%)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-left': {
          '0%': { opacity: '0', transform: 'translateX(-100%)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'slide-in-right': {
          '0%': { opacity: '0', transform: 'translateX(100%)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'bounce-in': {
          '0%': { opacity: '0', transform: 'scale(0.3)' },
          '50%': { transform: 'scale(1.05)' },
          '70%': { transform: 'scale(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 20px var(--color-primary), 0 0 40px var(--color-primary)' },
          '50%': { boxShadow: '0 0 30px var(--color-primary), 0 0 60px var(--color-primary)' },
        },
      },
      
      animation: {
        'slide-in-top': 'slide-in-top 0.3s ease-out',
        'slide-in-bottom': 'slide-in-bottom 0.3s ease-out',
        'slide-in-left': 'slide-in-left 0.3s ease-out',
        'slide-in-right': 'slide-in-right 0.3s ease-out',
        'fade-in': 'fade-in 0.3s ease-out',
        'scale-in': 'scale-in 0.2s ease-out',
        'bounce-in': 'bounce-in 0.6s ease-out',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
      },
    },
  },
  plugins: [
    // Custom utilities plugin
    function({ addUtilities, theme }) {
      const newUtilities = {
        // Glass utilities
        '.glass-primary': {
          backgroundColor: 'var(--glass-primary)',
          backdropFilter: 'blur(20px) saturate(120%)',
          border: '1px solid var(--glass-border)',
        },
        '.glass-secondary': {
          backgroundColor: 'var(--glass-secondary)',
          backdropFilter: 'blur(15px) saturate(110%)',
          border: '1px solid var(--glass-border)',
        },
        '.glass-tertiary': {
          backgroundColor: 'var(--glass-tertiary)',
          backdropFilter: 'blur(10px) saturate(100%)',
          border: '1px solid var(--glass-border)',
        },
        
        // Text utilities
        '.text-gradient': {
          background: 'var(--gradient-secondary)',
          '-webkit-background-clip': 'text',
          '-webkit-text-fill-color': 'transparent',
          backgroundClip: 'text',
        },
        
        // Layout utilities
        '.layout-center': {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        },
        '.layout-between': {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        },
        '.layout-start': {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
        },
        
        // Interaction utilities
        '.interactive': {
          transition: 'all var(--duration-normal) var(--easing-ease-out)',
          cursor: 'pointer',
          '&:hover': {
            transform: 'translateY(-2px)',
          },
          '&:active': {
            transform: 'translateY(0)',
          },
        },
        
        '.interactive-scale': {
          transition: 'all var(--duration-normal) var(--easing-ease-out)',
          cursor: 'pointer',
          '&:hover': {
            transform: 'scale(1.02)',
          },
          '&:active': {
            transform: 'scale(0.98)',
          },
        },
      }
      
      addUtilities(newUtilities)
    },
  ],
}
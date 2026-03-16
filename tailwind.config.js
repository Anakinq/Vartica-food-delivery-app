/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      // ============================================
      // LIGHT MODE COLORS (CSS Variables)
      // ============================================
      colors: {
        // Light mode specific background colors
        'light-bg': {
          primary: '#ffffff',
          secondary: '#f8fafc',
          tertiary: '#f1f5f9',
          elevated: '#ffffff',
        },
        // Light mode text colors (high contrast)
        'light-text': {
          primary: '#111827',   // gray-900 - WCAG AAA compliant
          secondary: '#374151',  // gray-700 - WCAG AA compliant
          tertiary: '#6b7280',   // gray-500 - moderate contrast
          muted: '#9ca3af',     // gray-400 - use with caution
          inverse: '#ffffff',
        },
        // Light mode border colors
        'light-border': {
          primary: '#e5e7eb',   // gray-200
          secondary: '#d1d5db', // gray-300
          tertiary: '#e2e8f0',  // slate-200
        },
        // Brand Colors (green shades)
        brand: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          950: '#052e16',
        },
        // Accent Colors
        accent: {
          pink: '#ec4899',
          purple: '#8b5cf6',
          cyan: '#06b6d4',
          rose: '#f43f5e',
          violet: '#7c3aed',
          indigo: '#4f46e5',
          orange: '#f97316',
          amber: '#f59e0b',
          lime: '#84cc16',
          emerald: '#10b981',
          teal: '#14b8a6',
          sky: '#0ea5e9',
          blue: '#3b82f6',
        },
        // Surface Colors (slate variants)
        surface: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
        // Semantic Colors expanded
        success: {
          light: '#dcfce7',
          DEFAULT: '#22c55e',
          dark: '#15803d',
        },
        warning: {
          light: '#fef3c7',
          DEFAULT: '#f59e0b',
          dark: '#b45309',
        },
        error: {
          light: '#fee2e2',
          DEFAULT: '#ef4444',
          dark: '#b91c1c',
        },
        info: {
          light: '#dbeafe',
          DEFAULT: '#3b82f6',
          dark: '#1d4ed8',
        },
      },

      // ============================================
      // TYPOGRAPHY SYSTEM
      // ============================================
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Poppins', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        body: ['DM Sans', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }], // 10px
        'xs': ['0.75rem', { lineHeight: '1rem' }],        // 12px
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],   // 14px
        'base': ['1rem', { lineHeight: '1.5rem' }],      // 16px
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],  // 18px
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],    // 20px
        '2xl': ['1.5rem', { lineHeight: '2rem' }],       // 24px
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],  // 30px
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],    // 36px
        '5xl': ['3rem', { lineHeight: '1' }],            // 48px
      },
      fontWeight: {
        thin: '100',
        extralight: '200',
        light: '300',
        normal: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
        extrabold: '800',
        black: '900',
      },
      letterSpacing: {
        tighter: '-0.05em',
        tight: '-0.025em',
        normal: '0',
        wide: '0.025em',
        wider: '0.05em',
        widest: '0.1em',
      },

      // ============================================
      // SPACING & LAYOUT SYSTEM
      // ============================================
      spacing: {
        '18': '4.5rem',   // 72px
        '22': '5.5rem',   // 88px
        '26': '6.5rem',   // 104px
        '30': '7.5rem',   // 120px
        '128': '32rem',   // 512px
        '144': '36rem',   // 576px
      },
      minHeight: {
        'screen-90': '90vh',
        'screen-80': '80vh',
      },
      minWidth: {
        'screen-sm': '640px',
        'screen-md': '768px',
        'screen-lg': '1024px',
        'screen-xl': '1280px',
      },

      // ============================================
      // RESPONSIVE BREAKPOINTS
      // ============================================
      screens: {
        'xs': '375px',    // Mobile small
        'sm': '640px',    // Mobile large
        'md': '768px',    // Tablet
        'lg': '1024px',   // Laptop
        'xl': '1280px',   // Desktop
        '2xl': '1536px',  // Large desktop
        '3xl': '1920px',  // Full HD
      },

      // ============================================
      // BORDER RADIUS
      // ============================================
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
        '6xl': '3rem',
      },

      // ============================================
      // BOX SHADOWS
      // ============================================
      boxShadow: {
        'glow-green': '0 0 20px rgba(34, 197, 94, 0.5)',
        'glow-purple': '0 0 20px rgba(139, 92, 246, 0.5)',
        'glow-pink': '0 0 20px rgba(236, 72, 153, 0.5)',
        'glow-orange': '0 0 20px rgba(249, 115, 22, 0.5)',
        'glow-cyan': '0 0 20px rgba(6, 182, 212, 0.5)',
        'inner-lg': 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
        'outline-green': '0 0 0 2px rgba(34, 197, 94, 0.5)',
        'outline-purple': '0 0 0 2px rgba(139, 92, 246, 0.5)',
      },

      // ============================================
      // ANIMATIONS
      // ============================================
      animation: {
        'bounce-slow': 'bounce 3s infinite',
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 3s linear infinite',
        'fade-in': 'fadeIn 0.5s ease-out',
        'fade-in-up': 'fadeInUp 0.5s ease-out',
        'fade-in-down': 'fadeInDown 0.5s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'slide-in-left': 'slideInLeft 0.3s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'zoom-in': 'zoomIn 0.3s ease-out',
        'shimmer': 'shimmer 2s linear infinite',
        'float': 'float 3s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite',
        'wiggle': 'wiggle 0.5s ease-in-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)' },
          '100%': { transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)' },
          '100%': { transform: 'translateY(0)' },
        },
        slideInLeft: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        zoomIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        glow: {
          '0%, 100%': { boxShadow: '0 0 5px rgba(34, 197, 94, 0.5)' },
          '50%': { boxShadow: '0 0 20px rgba(34, 197, 94, 0.8)' },
        },
        wiggle: {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        },
      },

      // ============================================
      // TRANSITION DURATIONS
      // ============================================
      transitionDuration: {
        '0': '0ms',
        '75': '75ms',
        '100': '100ms',
        '150': '150ms',
        '200': '200ms',
        '300': '300ms',
        '500': '500ms',
        '700': '700ms',
        '1000': '1000ms',
      },
      transitionTimingFunction: {
        'bounce-in': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },

      // ============================================
      // ASPECT RATIOS
      // ============================================
      aspectRatio: {
        'portrait': '3/4',
        'landscape': '4/3',
        'square': '1/1',
        '4-3': '4/3',
        '16-9': '16/9',
        '21-9': '21/9',
      },

      // ============================================
      // BACKGROUND IMAGES
      // ============================================
      backgroundImage: {
        'gradient-brand': 'linear-gradient(to right, #22c55e, #16a34a)',
        'gradient-accent': 'linear-gradient(to right, #8b5cf6, #ec4899)',
        'gradient-dark': 'linear-gradient(to right, #0f172a, #1e293b)',
        'gradient-rainbow': 'linear-gradient(to right, #ef4444, #f59e0b, #22c55e, #3b82f6, #8b5cf6)',
        'gradient-slate': 'linear-gradient(180deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
        'shimmer': 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%)',
      },
      backgroundSize: {
        'shimmer': '200% 100%',
      },

      // ============================================
      // Z-INDEX
      // ============================================
      zIndex: {
        '1': '1',
        '10': '10',
        '20': '20',
        '30': '30',
        '40': '40',
        '50': '50',
        'modal': '100',
        'tooltip': '200',
        'toast': '300',
      },
    },
  },
  plugins: [],
  // Safelist critical classes to prevent purging
  safelist: [
    // Layout
    'flex', 'flex-col', 'flex-1', 'grid', 'block', 'inline-block', 'hidden', 'inline-flex',
    // Positioning  
    'absolute', 'relative', 'fixed', 'sticky', 'inset-0', 'top-0', 'bottom-0', 'left-0', 'right-0',
    // Spacing
    'p-1', 'p-2', 'p-3', 'p-4', 'p-5', 'p-6', 'p-8', 'px-2', 'px-3', 'px-4', 'px-5', 'px-6', 'py-1', 'py-2', 'py-3', 'py-4', 'm-0', 'mx-auto', 'my-2', 'gap-1', 'gap-2', 'gap-3', 'gap-4',
    // Sizing
    'w-full', 'w-1/2', 'w-1/3', 'w-2/3', 'w-1/4', 'w-3/4', 'h-full', 'min-h-screen', 'max-w-md', 'max-w-lg', 'max-w-xl', 'min-w-0',
    // Colors - Brand
    'bg-brand-50', 'bg-brand-100', 'bg-brand-200', 'bg-brand-300', 'bg-brand-400', 'bg-brand-500', 'bg-brand-600', 'bg-brand-700', 'bg-brand-800', 'bg-brand-900', 'bg-brand-950',
    // Colors - Accent
    'bg-accent-pink', 'bg-accent-purple', 'bg-accent-cyan', 'bg-accent-rose', 'bg-accent-orange', 'bg-accent-amber', 'bg-accent-emerald',
    // Colors - Surface
    'bg-surface-50', 'bg-surface-100', 'bg-surface-200', 'bg-surface-300', 'bg-surface-400', 'bg-surface-500', 'bg-surface-600', 'bg-surface-700', 'bg-surface-800', 'bg-surface-900', 'bg-surface-950',
    // Colors - Semantic
    'bg-success', 'bg-success-light', 'bg-warning', 'bg-warning-light', 'bg-error', 'bg-error-light', 'bg-info', 'bg-info-light',
    // Text Colors - Brand
    'text-brand-50', 'text-brand-100', 'text-brand-200', 'text-brand-300', 'text-brand-400', 'text-brand-500', 'text-brand-600', 'text-brand-700', 'text-brand-800', 'text-brand-900', 'text-brand-950',
    // Text Colors - Accent
    'text-accent-pink', 'text-accent-purple', 'text-accent-cyan', 'text-accent-rose', 'text-accent-orange',
    // Border Colors
    'border-brand-500', 'border-brand-600', 'border-accent-purple', 'border-surface-700',
    // Gradients
    'bg-gradient-brand', 'bg-gradient-accent', 'bg-gradient-dark', 'bg-gradient-rainbow', 'bg-gradient-slate',
    // Shadows
    'shadow-sm', 'shadow', 'shadow-md', 'shadow-lg', 'shadow-xl', 'shadow-glow-green', 'shadow-glow-purple', 'shadow-glow-pink', 'shadow-glow-orange', 'shadow-inner-lg', 'shadow-outline-green',
    // Border Radius
    'rounded', 'rounded-sm', 'rounded-md', 'rounded-lg', 'rounded-xl', 'rounded-2xl', 'rounded-3xl', 'rounded-full',
    // Text
    'text-white', 'text-black', 'text-gray-100', 'text-gray-200', 'text-gray-300', 'text-gray-400', 'text-gray-500', 'text-gray-600', 'text-gray-700', 'text-gray-800', 'text-gray-900',
    'text-xs', 'text-sm', 'text-base', 'text-lg', 'text-xl', 'text-2xl', 'text-3xl',
    'font-thin', 'font-extralight', 'font-light', 'font-normal', 'font-medium', 'font-semibold', 'font-bold', 'font-extrabold', 'font-black',
    // Animations
    'animate-bounce', 'animate-pulse', 'animate-spin', 'animate-fade-in', 'animate-fade-in-up', 'animate-slide-up', 'animate-zoom-in', 'animate-shimmer', 'animate-float', 'animate-glow',
    // Transitions
    'transition-all', 'transition-colors', 'transition-transform', 'transition-shadow', 'duration-75', 'duration-100', 'duration-150', 'duration-200', 'duration-300', 'duration-500', 'duration-700',
    // Backdrop
    'backdrop-blur', 'backdrop-blur-sm', 'backdrop-blur-md', 'backdrop-blur-lg', 'backdrop-blur-xl',
    // Transform
    'transform', 'scale-95', 'scale-100', 'scale-105', 'translate-y-0', '-translate-y-1', '-translate-y-2',
    // Overflow
    'overflow-hidden', 'overflow-auto', 'overflow-scroll',
    // Cursor
    'cursor-pointer', 'cursor-not-allowed', 'cursor-default',
    // Opacity
    'opacity-0', 'opacity-50', 'opacity-75', 'opacity-100',
    // Group
    'group', 'group-hover',
    // Hover
    'hover:scale-105', 'hover:shadow-lg', 'hover:shadow-glow-green',
    // Focus
    'focus:outline-none', 'focus:ring-2', 'focus:ring-brand-500', 'focus:ring-offset-2',
  ],
};

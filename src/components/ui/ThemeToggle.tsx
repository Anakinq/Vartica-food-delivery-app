// src/components/ui/ThemeToggle.tsx
// Theme Toggle Component for switching between Light and Dark modes

import React, { useState } from 'react';
import { useDarkMode } from '../../contexts/DarkModeContext';
import { Sun, Moon, Monitor } from 'lucide-react';

interface ThemeToggleProps {
  variant?: 'default' | 'button' | 'dropdown';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  variant = 'default',
  size = 'md',
  showLabel = false,
  className = ''
}) => {
  const { darkMode, setDarkMode } = useDarkMode();

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };

  const iconSizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  // Default variant - Simple toggle button
  if (variant === 'default') {
    return (
      <button
        onClick={() => setDarkMode(!darkMode)}
        className={`
          ${sizeClasses[size]} rounded-full
          flex items-center justify-center
          bg-gray-100 dark:bg-slate-800
          text-gray-600 dark:text-slate-300
          hover:bg-gray-200 dark:hover:bg-slate-700
          transition-all duration-200
          ${className}
        `}
        aria-label={`Switch to ${darkMode ? 'light' : 'dark'} mode`}
      >
        {darkMode ? (
          <Sun className={iconSizeClasses[size]} />
        ) : (
          <Moon className={iconSizeClasses[size]} />
        )}
      </button>
    );
  }

  // Button variant - Toggle with text
  if (variant === 'button') {
    return (
      <button
        onClick={() => setDarkMode(!darkMode)}
        className={`
          inline-flex items-center gap-2 px-4 py-2 rounded-lg
          bg-gray-100 dark:bg-slate-800
          text-gray-700 dark:text-slate-200
          hover:bg-gray-200 dark:hover:bg-slate-700
          transition-all duration-200 font-medium
          ${className}
        `}
      >
        {darkMode ? (
          <>
            <Sun className="w-5 h-5" />
            <span>Light Mode</span>
          </>
        ) : (
          <>
            <Moon className="w-5 h-5" />
            <span>Dark Mode</span>
          </>
        )}
      </button>
    );
  }

  // Dropdown variant - With system option
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          ${sizeClasses[size]} rounded-full
          flex items-center justify-center
          bg-gray-100 dark:bg-slate-800
          text-gray-600 dark:text-slate-300
          hover:bg-gray-200 dark:hover:bg-slate-700
          transition-all duration-200
        `}
        aria-label="Select theme"
      >
        {darkMode ? (
          <Moon className={iconSizeClasses[size]} />
        ) : (
          <Sun className={iconSizeClasses[size]} />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 z-50">
          <button
            onClick={() => {
              setDarkMode(false);
              setIsOpen(false);
            }}
            className={`
              w-full flex items-center gap-3 px-4 py-3 text-left
              ${!darkMode 
                ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' 
                : 'text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700'}
            `}
          >
            <Sun className="w-4 h-4" />
            <span>Light</span>
          </button>
          <button
            onClick={() => {
              setDarkMode(true);
              setIsOpen(false);
            }}
            className={`
              w-full flex items-center gap-3 px-4 py-3 text-left
              ${darkMode 
                ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' 
                : 'text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700'}
            `}
          >
            <Moon className="w-4 h-4" />
            <span>Dark</span>
          </button>
          <button
            onClick={() => {
              // System preference - detect from media query
              const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
              setDarkMode(prefersDark);
              setIsOpen(false);
            }}
            className={`
              w-full flex items-center gap-3 px-4 py-3 text-left
              text-gray-700 dark:text-slate-200 
              hover:bg-gray-50 dark:hover:bg-slate-700
              border-t border-gray-200 dark:border-slate-700
            `}
          >
            <Monitor className="w-4 h-4" />
            <span>System</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default ThemeToggle;

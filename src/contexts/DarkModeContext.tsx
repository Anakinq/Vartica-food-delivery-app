// src/contexts/DarkModeContext.tsx
// Dark Mode Context - Updated with system preference detection

import React, { createContext, useContext, useState, useEffect } from 'react';

interface DarkModeContextType {
  darkMode: boolean;
  toggleDarkMode: () => void;
  setDarkMode: (enabled: boolean) => void;
}

const DarkModeContext = createContext<DarkModeContextType | undefined>(undefined);

// Initialize the theme class on app load
const initializeTheme = () => {
  if (typeof window === 'undefined') return false;

  try {
    const savedPreference = localStorage.getItem('darkMode');
    if (savedPreference !== null) {
      const isDark = savedPreference === 'true';
      if (isDark) {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
      }
      return isDark;
    }

    // Check system preference
    if (window.matchMedia) {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
      }
      return prefersDark;
    }

    // Default to dark mode
    document.documentElement.classList.add('dark');
    document.documentElement.classList.remove('light');
    return true;
  } catch (error) {
    // Default to dark mode on error
    document.documentElement.classList.add('dark');
    document.documentElement.classList.remove('light');
    return true;
  }
};

export const DarkModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [darkMode, setDarkModeState] = useState<boolean>(() => {
    return initializeTheme();
  });

  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('darkMode', darkMode.toString());
      }
      // Apply dark mode to document
      if (darkMode) {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
      }
    } catch (error) {
      console.warn('Failed to save dark mode preference:', error);
    }
  }, [darkMode]);

  // Listen for system preference changes
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent) => {
      // Only auto-switch if user hasn't manually set a preference
      if (!localStorage.getItem('darkMode')) {
        setDarkModeState(e.matches);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const toggleDarkMode = () => {
    setDarkModeState(!darkMode);
  };

  const setDarkMode = (enabled: boolean) => {
    setDarkModeState(enabled);
  };

  return (
    <DarkModeContext.Provider value={{ darkMode, toggleDarkMode, setDarkMode }}>
      {children}
    </DarkModeContext.Provider>
  );
};

export const useDarkMode = (): DarkModeContextType => {
  const context = useContext(DarkModeContext);
  if (context === undefined) {
    throw new Error('useDarkMode must be used within a DarkModeProvider');
  }
  return context;
};

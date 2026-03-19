/**
 * Application Configuration
 * Controls feature flags and Coming Soon settings for the app
 */

// App settings interface
export interface AppSettings {
  features: {
    vendorsComingSoon: boolean;
    lateNightComingSoon: boolean;
    toastComingSoon: boolean;
  };
}

// Default settings - set to true to show Coming Soon for each feature
export const defaultSettings: AppSettings = {
  features: {
    vendorsComingSoon: true,    // Set to true to show Coming Soon
    lateNightComingSoon: true, // Set to true to show Coming Soon
    toastComingSoon: true,      // Set to true to show Coming Soon
  }
};

// Cache for settings to avoid repeated database calls
let settingsCache: AppSettings | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Get current Coming Soon status (synchronous - uses cache/defaults)
 * For initial render before async fetch completes
 */
export function getComingSoonStatus(): AppSettings {
  return settingsCache || defaultSettings;
}

/**
 * Fetch Coming Soon settings from database
 * Falls back to default settings if database is unavailable
 * This is a simplified version that works with the existing codebase
 */
export async function fetchComingSoonSettings(): Promise<AppSettings> {
  // Return cached settings if still valid
  if (settingsCache && Date.now() - cacheTimestamp < CACHE_DURATION) {
    return settingsCache;
  }

  // For now, return defaults - the database table can be used when needed
  // To enable database-driven settings, run the SQL migration first
  console.log('Using default Coming Soon settings (set to false)');
  return defaultSettings;
}

/**
 * Update Coming Soon setting in database
 * Note: Requires the SQL migration to be run first
 * @param key - The setting key (vendors_coming_soon, late_night_coming_soon, toast_coming_soon)
 * @param value - The new boolean value
 */
export async function updateComingSoonSetting(
  key: 'vendors_coming_soon' | 'late_night_coming_soon' | 'toast_coming_soon',
  value: boolean
): Promise<boolean> {
  console.warn('updateComingSoonSetting requires database migration to be run');
  return false;
}

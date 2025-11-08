/**
 * Utility functions for the Vartica Food Delivery System
 */

export { fetchCurrentUserProfile, isUserAuthenticated, getCurrentUserId } from './profileFetcher';
export { runSupabaseDiagnostics, printDiagnostics } from './diagnostics';
export { debugUserLogin, checkUserExists, printAuthDebug } from './authDebugger';

/**
 * DiceBear Avatar Utility
 * Generates auto-generated avatars for users based on their name
 * Free to use - no API key required
 */

/**
 * DiceBear avatar styles
 */
export type DiceBearStyle =
    | 'initials'      // Simple initials (e.g., JD for John Doe)
    | 'identicon'     // Geometric patterns
    | 'bottts'        // Robot avatars
    | 'avataaars'     // Cartoon avatars
    | 'adventurer'    // Fantasy adventurer avatars
    | 'big-ears'      // Cute characters
    | 'big-smile'     // Happy faces
    | 'fun-emoji'     // Fun emoji-style
    | 'lorelei'       // Stylish illustrations
    | 'micah'         // Modern illustrations
    | 'notionists'    // Minimalist avatars
    | 'open-peeps'    // Flat illustrations
    | 'personas'      // Diverse personas
    | 'thumbs'        // Thumb-style avatars
    | 'fun-emoji';    // Emoji-style

/**
 * Generate a DiceBear avatar URL
 * @param name - The user's name to generate avatar from
 * @param style - The style of avatar (default: 'initials')
 * @param size - The size in pixels (default: 200)
 * @returns The avatar URL
 */
export function getDiceBearAvatarUrl(
    name: string | null | undefined,
    style: DiceBearStyle = 'initials',
    size: number = 200
): string {
    // Clean the name - remove spaces and special characters for the seed
    const seed = name
        ? name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
        : 'user';

    // Use initials style for simple, clean avatars
    // Or use a fun style like 'avataaars' or 'bottts'
    return `https://api.dicebear.com/7.x/${style}/svg?seed=${seed}&size=${size}`;
}

/**
 * Generate a simple initials avatar URL
 * @param name - The user's name
 * @param size - The size in pixels
 * @returns The initials avatar URL
 */
export function getInitialsAvatarUrl(name: string | null | undefined, size: number = 200): string {
    return getDiceBearAvatarUrl(name, 'initials', size);
}

/**
 * Generate a fun cartoon avatar URL
 * @param name - The user's name
 * @param size - The size in pixels
 * @returns The cartoon avatar URL
 */
export function getCartoonAvatarUrl(name: string | null | undefined, size: number = 200): string {
    return getDiceBearAvatarUrl(name, 'avataaars', size);
}

/**
 * Generate a robot avatar URL
 * @param name - The user's name
 * @param size - The size in pixels
 * @returns The robot avatar URL
 */
export function getRobotAvatarUrl(name: string | null | undefined, size: number = 200): string {
    return getDiceBearAvatarUrl(name, 'bottts', size);
}

/**
 * Get available DiceBear styles for display
 */
export const DICE_BEAR_STYLES: { value: DiceBearStyle; label: string; description: string }[] = [
    { value: 'initials', label: 'Initials', description: 'Simple text initials' },
    { value: 'avataaars', label: 'Cartoon', description: 'Cartoon-style characters' },
    { value: 'bottts', label: 'Robot', description: 'Cute robot avatars' },
    { value: 'adventurer', label: 'Adventurer', description: 'Fantasy adventurer characters' },
    { value: 'big-smile', label: 'Happy', description: 'Happy face characters' },
    { value: 'lorelei', label: 'Stylish', description: 'Stylish illustrations' },
    { value: 'micah', label: 'Modern', description: 'Modern illustration style' },
    { value: 'open-peeps', label: 'Flat', description: 'Flat illustration style' },
];

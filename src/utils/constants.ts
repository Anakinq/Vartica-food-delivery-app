/**
 * Vartica Food Delivery App - Constants
 * All hardcoded business values centralized here
 */

// Business Rules
export const BUSINESS_CONSTANTS = {
    // Delivery Fees
    DELIVERY_FEE_DEFAULT: 500,
    DELIVERY_FEE_NEW_FEMALE_HOSTEL: 1500,
    DELIVERY_FEE_ABUAD_WEMA_HOSTEL: 700,
    DELIVERY_FEE_MALE_HOSTEL_1_2: 1500,
    DELIVERY_FEE_MALE_HOSTEL_3_6: 1000,
    DELIVERY_FEE_MEDICAL_HOSTEL: 2000,

    // Food Pack
    PACK_PRICE: 300,

    // Platform Commission
    PLATFORM_COMMISSION: 200,

    // Minimum Values
    MIN_ORDER_VALUE: 100,
    MIN_WITHDRAWAL_AMOUNT: 100,
    MIN_NGN_VALUE: 100,
};

// Individual exports for convenience
export const MIN_NGN_VALUE = 100;
export const PACK_PRICE = 300;
export const PLATFORM_COMMISSION = 200;
export const DEFAULT_DELIVERY_FEE = 500;

// ============================================
// HOSTEL GROUPS - New Naming Convention
// ============================================

export const HOSTEL_GROUPS = {
    MALE_HALL: 'Male Hall',
    MALE_MEDICAL_HALL: 'Male Medical Hall',
    FEMALE_HALL_1_4: 'Female Hall 1-4',
    FEMALE_HALL_5A_5D: 'Female Hall 5A-5D',
    FEMALE_MEDICAL_HALL: 'Female Medical Hall',
} as const;

export type HostelGroup = typeof HOSTEL_GROUPS[keyof typeof HOSTEL_GROUPS];

// ============================================
// INDIVIDUAL HOSTELS - New Naming Convention
// ============================================

export const HOSTELS = {
    // Male Halls 1-6
    MALE_HALL_1: 'Male Hall 1',
    MALE_HALL_2: 'Male Hall 2',
    MALE_HALL_3: 'Male Hall 3',
    MALE_HALL_4: 'Male Hall 4',
    MALE_HALL_5: 'Male Hall 5',
    MALE_HALL_6: 'Male Hall 6',

    // Male Medical Hall
    MALE_MEDICAL_HALL_1: 'Male Medical Hall 1',
    MALE_MEDICAL_HALL_2: 'Male Medical Hall 2',

    // Female Halls 1-4
    FEMALE_HALL_1: 'Female Hall 1',
    FEMALE_HALL_2: 'Female Hall 2',
    FEMALE_HALL_3: 'Female Hall 3',
    FEMALE_HALL_4: 'Female Hall 4',

    // Female Halls 5A-5D
    FEMALE_HALL_5A: 'Female Hall 5A',
    FEMALE_HALL_5B: 'Female Hall 5B',
    FEMALE_HALL_5C: 'Female Hall 5C',
    FEMALE_HALL_5D: 'Female Hall 5D',

    // Female Medical Halls 1-4
    FEMALE_MEDICAL_HALL_1: 'Female Medical Hall 1',
    FEMALE_MEDICAL_HALL_2: 'Female Medical Hall 2',
    FEMALE_MEDICAL_HALL_3: 'Female Medical Hall 3',
    FEMALE_MEDICAL_HALL_4: 'Female Medical Hall 4',

    // Legacy/Alias Names for backward compatibility
    ABUAD_HOSTEL: 'Abuad Hostel',
    WEMA_HOSTEL: 'Wema Hostel',
} as const;

export type HostelName = typeof HOSTELS[keyof typeof HOSTELS];

// ============================================
// HOSTEL GROUP MAPPING
// Maps each hostel to its group for pricing
// ============================================

export const HOSTEL_TO_GROUP: Record<string, HostelGroup> = {
    // Male Halls 1-6 -> Male Hall group
    [HOSTELS.MALE_HALL_1]: HOSTEL_GROUPS.MALE_HALL,
    [HOSTELS.MALE_HALL_2]: HOSTEL_GROUPS.MALE_HALL,
    [HOSTELS.MALE_HALL_3]: HOSTEL_GROUPS.MALE_HALL,
    [HOSTELS.MALE_HALL_4]: HOSTEL_GROUPS.MALE_HALL,
    [HOSTELS.MALE_HALL_5]: HOSTEL_GROUPS.MALE_HALL,
    [HOSTELS.MALE_HALL_6]: HOSTEL_GROUPS.MALE_HALL,

    // Male Medical Hall
    [HOSTELS.MALE_MEDICAL_HALL]: HOSTEL_GROUPS.MALE_MEDICAL_HALL,

    // Female Halls 1-4
    [HOSTELS.FEMALE_HALL_1]: HOSTEL_GROUPS.FEMALE_HALL_1_4,
    [HOSTELS.FEMALE_HALL_2]: HOSTEL_GROUPS.FEMALE_HALL_1_4,
    [HOSTELS.FEMALE_HALL_3]: HOSTEL_GROUPS.FEMALE_HALL_1_4,
    [HOSTELS.FEMALE_HALL_4]: HOSTEL_GROUPS.FEMALE_HALL_1_4,

    // Female Halls 5A-5D
    [HOSTELS.FEMALE_HALL_5A]: HOSTEL_GROUPS.FEMALE_HALL_5A_5D,
    [HOSTELS.FEMALE_HALL_5B]: HOSTEL_GROUPS.FEMALE_HALL_5A_5D,
    [HOSTELS.FEMALE_HALL_5C]: HOSTEL_GROUPS.FEMALE_HALL_5A_5D,
    [HOSTELS.FEMALE_HALL_5D]: HOSTEL_GROUPS.FEMALE_HALL_5A_5D,

    // Female Medical Halls 1-4
    [HOSTELS.FEMALE_MEDICAL_HALL_1]: HOSTEL_GROUPS.FEMALE_MEDICAL_HALL,
    [HOSTELS.FEMALE_MEDICAL_HALL_2]: HOSTEL_GROUPS.FEMALE_MEDICAL_HALL,
    [HOSTELS.FEMALE_MEDICAL_HALL_3]: HOSTEL_GROUPS.FEMALE_MEDICAL_HALL,
    [HOSTELS.FEMALE_MEDICAL_HALL_4]: HOSTEL_GROUPS.FEMALE_MEDICAL_HALL,

    // Legacy aliases
    [HOSTELS.ABUAD_HOSTEL]: HOSTEL_GROUPS.MALE_HALL,
    [HOSTELS.WEMA_HOSTEL]: HOSTEL_GROUPS.MALE_HALL,
};

// ============================================
// CAFETERIAS
// ============================================

export const CAFETERIAS = {
    CAFETERIA_1: 'Cafeteria 1',
    CAFETERIA_2: 'Cafeteria 2',
    CAFETERIA_3: 'Cafeteria 3',
    CAPTAIN_COOK: 'Captain Cook',
    SMOOTHIE_SHACK: 'Smoothie Shack',
    MED_CAFETERIA: 'Med Cafeteria',
    SEASONS_DELI: 'Seasons Deli',
} as const;

export type CafeteriaName = typeof CAFETERIAS[keyof typeof CAFETERIAS];

// ============================================
// CAFETERIA-TO-HOSTEL DELIVERY PRICING MATRIX
// 7 Cafeterias × 5 Hostel Groups = 35 Price Combinations
// Prices in Naira (NGN)
// ============================================

// ============================================
// CAFETERIA-TO-HOSTEL DELIVERY PRICING MATRIX - USER PROVIDED PRICES
// 7 Cafeterias × 5 Hostel Groups = 35 Price Combinations
// Prices in Naira (NGN)
// ============================================

export const CAFETERIA_HOSTEL_PRICING: Record<CafeteriaName, Record<HostelGroup, number>> = {
    // ============================================
    // CAFETERIA 1 PRICING
    // ============================================
    [CAFETERIAS.CAFETERIA_1]: {
        [HOSTEL_GROUPS.MALE_HALL]: 1300,
        [HOSTEL_GROUPS.MALE_MEDICAL_HALL]: 1200,
        [HOSTEL_GROUPS.FEMALE_HALL_1_4]: 1200,
        [HOSTEL_GROUPS.FEMALE_HALL_5A_5D]: 1500,
        [HOSTEL_GROUPS.FEMALE_MEDICAL_HALL]: 1700,
    },
    // ============================================
    // CAFETERIA 2 PRICING (BASE PRICING REFERENCE)
    // ============================================
    [CAFETERIAS.CAFETERIA_2]: {
        [HOSTEL_GROUPS.MALE_HALL]: 1500,
        [HOSTEL_GROUPS.MALE_MEDICAL_HALL]: 2000,
        [HOSTEL_GROUPS.FEMALE_HALL_1_4]: 1000,
        [HOSTEL_GROUPS.FEMALE_HALL_5A_5D]: 1300,
        [HOSTEL_GROUPS.FEMALE_MEDICAL_HALL]: 2000,
    },
    // ============================================
    // CAFETERIA 3 PRICING
    // ============================================
    [CAFETERIAS.CAFETERIA_3]: {
        [HOSTEL_GROUPS.MALE_HALL]: 1300,
        [HOSTEL_GROUPS.MALE_MEDICAL_HALL]: 1200,
        [HOSTEL_GROUPS.FEMALE_HALL_1_4]: 1200,
        [HOSTEL_GROUPS.FEMALE_HALL_5A_5D]: 1700,
        [HOSTEL_GROUPS.FEMALE_MEDICAL_HALL]: 1700,
    },
    // ============================================
    // CAPTAIN COOK PRICING
    // ============================================
    [CAFETERIAS.CAPTAIN_COOK]: {
        [HOSTEL_GROUPS.MALE_HALL]: 1300,
        [HOSTEL_GROUPS.MALE_MEDICAL_HALL]: 1200,
        [HOSTEL_GROUPS.FEMALE_HALL_1_4]: 1200,
        [HOSTEL_GROUPS.FEMALE_HALL_5A_5D]: 1500,
        [HOSTEL_GROUPS.FEMALE_MEDICAL_HALL]: 1700,
    },
    // ============================================
    // SMOOTHIE SHACK PRICING
    // ============================================
    [CAFETERIAS.SMOOTHIE_SHACK]: {
        [HOSTEL_GROUPS.MALE_HALL]: 1300,
        [HOSTEL_GROUPS.MALE_MEDICAL_HALL]: 1200,
        [HOSTEL_GROUPS.FEMALE_HALL_1_4]: 1200,
        [HOSTEL_GROUPS.FEMALE_HALL_5A_5D]: 1500,
        [HOSTEL_GROUPS.FEMALE_MEDICAL_HALL]: 1700,
    },
    // ============================================
    // MEDICAL CAFETERIA PRICING
    // ============================================
    [CAFETERIAS.MED_CAFETERIA]: {
        [HOSTEL_GROUPS.MALE_HALL]: 1700,
        [HOSTEL_GROUPS.MALE_MEDICAL_HALL]: 800,
        [HOSTEL_GROUPS.FEMALE_HALL_1_4]: 1500,
        [HOSTEL_GROUPS.FEMALE_HALL_5A_5D]: 1800,
        [HOSTEL_GROUPS.FEMALE_MEDICAL_HALL]: 1000,
    },
    // ============================================
    // SEASONS DELI PRICING
    // ============================================
    [CAFETERIAS.SEASONS_DELI]: {
        [HOSTEL_GROUPS.MALE_HALL]: 1700,
        [HOSTEL_GROUPS.MALE_MEDICAL_HALL]: 800,
        [HOSTEL_GROUPS.FEMALE_HALL_1_4]: 1500,
        [HOSTEL_GROUPS.FEMALE_HALL_5A_5D]: 1800,
        [HOSTEL_GROUPS.FEMALE_MEDICAL_HALL]: 1000,
    },
};

// ============================================
// HOSTEL DELIVERY FEES - Base Pricing from Cafeteria 2
// Updated to use new hostel names (User Provided Specifications)
// ============================================

export const HOSTEL_DELIVERY_FEES: Record<string, number> = {
    // Male Halls 1-6 (Base: ₦1500)
    [HOSTELS.MALE_HALL_1]: 1500,
    [HOSTELS.MALE_HALL_2]: 1500,
    [HOSTELS.MALE_HALL_3]: 1500,
    [HOSTELS.MALE_HALL_4]: 1500,
    [HOSTELS.MALE_HALL_5]: 1500,
    [HOSTELS.MALE_HALL_6]: 1500,

    // Male Medical Hall (Base: ₦2000)
    [HOSTELS.MALE_MEDICAL_HALL]: 2000,

    // Female Halls 1-4 (Base: ₦1000)
    [HOSTELS.FEMALE_HALL_1]: 1000,
    [HOSTELS.FEMALE_HALL_2]: 1000,
    [HOSTELS.FEMALE_HALL_3]: 1000,
    [HOSTELS.FEMALE_HALL_4]: 1000,

    // Female Halls 5A-5D (Base: ₦1300)
    [HOSTELS.FEMALE_HALL_5A]: 1300,
    [HOSTELS.FEMALE_HALL_5B]: 1300,
    [HOSTELS.FEMALE_HALL_5C]: 1300,
    [HOSTELS.FEMALE_HALL_5D]: 1300,

    // Female Medical Halls 1-4 (Base: ₦2000)
    [HOSTELS.FEMALE_MEDICAL_HALL_1]: 2000,
    [HOSTELS.FEMALE_MEDICAL_HALL_2]: 2000,
    [HOSTELS.FEMALE_MEDICAL_HALL_3]: 2000,
    [HOSTELS.FEMALE_MEDICAL_HALL_4]: 2000,

    // Legacy aliases (for backward compatibility)
    [HOSTELS.ABUAD_HOSTEL]: 1500,
    [HOSTELS.WEMA_HOSTEL]: 1500,

    // Legacy hostel names (for backward compatibility with existing orders)
    'Male Hostel 1': 1500,
    'Male Hostel 2': 1500,
    'Male Hostel 3': 1500,
    'Male Hostel 4': 1500,
    'Male Hostel 5': 1500,
    'Male Hostel 6': 1500,
    'Medical Male Hostel 1': 2000,
    'Medical Male Hostel 2': 2000,
    'Female Medical Hostel 1': 1000,
    'Female Medical Hostel 2': 1000,
    'Female Medical Hostel 3': 1000,
    'Female Medical Hostel 4': 1000,
    'Female Medical Hostel 5': 1000,
    'Female Medical Hostel 6': 1000,
    'New Female Hostel 1': 700,
    'New Female Hostel 2': 700,
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get delivery fee based on hostel name
 * @param hostelName - The hostel name
 * @returns Delivery fee in Naira
 */
export const getDeliveryFeeByHostel = (hostelName: string): number => {
    return HOSTEL_DELIVERY_FEES[hostelName] || DEFAULT_DELIVERY_FEE;
};

/**
 * Get delivery fee based on cafeteria and hostel
 * @param cafeteriaName - The cafeteria name
 * @param hostelName - The hostel name
 * @returns Delivery fee in Naira
 */
export const getDeliveryFeeByCafeteriaAndHostel = (
    cafeteriaName: CafeteriaName,
    hostelName: string
): number => {
    // First try the matrix pricing
    const hostelGroup = HOSTEL_TO_GROUP[hostelName];
    if (hostelGroup && CAFETERIA_HOSTEL_PRICING[cafeteriaName]) {
        return CAFETERIA_HOSTEL_PRICING[cafeteriaName][hostelGroup] || DEFAULT_DELIVERY_FEE;
    }
    // Fallback to hostel-only pricing
    return getDeliveryFeeByHostel(hostelName);
};

/**
 * Get all hostels as an array for dropdowns
 */
export const getAllHostels = (): string[] => {
    return Object.values(HOSTELS);
};

/**
 * Get hostels by group
 */
export const getHostelsByGroup = (group: HostelGroup): string[] => {
    return Object.entries(HOSTEL_TO_GROUP)
        .filter(([, g]) => g === group)
        .map(([hostel]) => hostel);
};

// ============================================
// LEGACY EXPORTS FOR BACKWARD COMPATIBILITY
// ============================================

// Old hostel names mapping to new (for migration)
export const LEGACY_HOSTEL_MAPPING: Record<string, string> = {
    // Male Hostel -> Male Hall
    'Male Hostel 1': HOSTELS.MALE_HALL_1,
    'Male Hostel 2': HOSTELS.MALE_HALL_2,
    'Male Hostel 3': HOSTELS.MALE_HALL_3,
    'Male Hostel 4': HOSTELS.MALE_HALL_4,
    'Male Hostel 5': HOSTELS.MALE_HALL_5,
    'Male Hostel 6': HOSTELS.MALE_HALL_6,

    // Medical Male Hostel -> Male Medical Hall
    'Medical Male Hostel 1': HOSTELS.MALE_MEDICAL_HALL,
    'Medical Male Hostel 2': HOSTELS.MALE_MEDICAL_HALL,

    // Female Medical Hostel -> Female Medical Hall
    'Female Medical Hostel 1': HOSTELS.FEMALE_MEDICAL_HALL_1,
    'Female Medical Hostel 2': HOSTELS.FEMALE_MEDICAL_HALL_2,
    'Female Medical Hostel 3': HOSTELS.FEMALE_MEDICAL_HALL_3,
    'Female Medical Hostel 4': HOSTELS.FEMALE_MEDICAL_HALL_4,
    'Female Medical Hostel 5': HOSTELS.FEMALE_MEDICAL_HALL_1, // Map to first
    'Female Medical Hostel 6': HOSTELS.FEMALE_MEDICAL_HALL_1, // Map to first

    // New Female Hostel -> Female Hall
    'New Female Hostel 1': HOSTELS.FEMALE_HALL_1,
    'New Female Hostel 2': HOSTELS.FEMALE_HALL_2,

    // Legacy aliases
    'Abuad Hostel': HOSTELS.ABUAD_HOSTEL,
    'Wema Hostel': HOSTELS.WEMA_HOSTEL,
};

// App Version for Cache Busting
export const APP_VERSION = process.env.VITE_APP_VERSION || '2.0.0';
export const CACHE_VERSION = `v${APP_VERSION}`;

// Auth Constants
export const AUTH_CONSTANTS = {
    PASSWORD_MIN_LENGTH: 6,
    PHONE_REGEX: /^\+?[1-9]\d{1,14}$/,
    MATRIC_NUMBER_REGEX: /^[A-Z]{2}\/\d{5,}$/i,
};

// UI Constants
export const UI_CONSTANTS = {
    TOAST_DURATION: 3000,
    DEBOUNCE_DELAY: 300,
    CART_COUNT_MAX_DISPLAY: 99,
    NOTIFICATION_COUNT_MAX_DISPLAY: 99,
};

// Touch Target Sizes
export const TOUCH_TARGETS = {
    MIN_SIZE: 44,
    RECOMMENDED_SIZE: 48,
};

// Animation Durations
export const ANIMATION_DURATIONS = {
    SHORT: 150,
    MEDIUM: 300,
    LONG: 500,
};

// API Endpoints
export const API_ENDPOINTS = {
    SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL || '',
    PAYSTACK_PUBLIC_KEY: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || '',
};

// Nigerian Banks (for Delivery Agent Payouts)
export const BANK_OPTIONS = [
    { code: '044', name: 'Access Bank' },
    { code: '063', name: 'Access Bank (Diamond)' },
    { code: '035A', name: 'ALAT by WEMA' },
    { code: '401', name: 'ASO Savings and Loans' },
    { code: '023', name: 'Citibank Nigeria' },
    { code: '050', name: 'Ecobank Nigeria' },
    { code: '562', name: 'Ekondo Microfinance Bank' },
    { code: '070', name: 'Fidelity Bank' },
    { code: '011', name: 'First Bank of Nigeria' },
    { code: '214', name: 'First City Monument Bank' },
    { code: '901', name: 'FSDH Merchant Bank Limited' },
    { code: '00103', name: 'Globus Bank' },
    { code: '100022', name: 'GoMoney' },
    { code: '058', name: 'Guaranty Trust Bank' },
    { code: '030', name: 'Heritage Bank' },
    { code: '301', name: 'Jaiz Bank' },
    { code: '082', name: 'Keystone Bank' },
    { code: '559', name: 'Kuda Bank' },
    { code: '50211', name: 'Kuda Microfinance Bank' },
    { code: '999992', name: 'OPay' },
    { code: '526', name: 'Parallex Bank' },
    { code: '999991', name: 'PalmPay' },
    { code: '076', name: 'Polaris Bank' },
    { code: '101', name: 'Providus Bank' },
    { code: '125', name: 'Rubies MFB' },
    { code: '51310', name: 'Sparkle Microfinance Bank' },
    { code: '221', name: 'Stanbic IBTC Bank' },
    { code: '068', name: 'Standard Chartered Bank' },
    { code: '232', name: 'Sterling Bank' },
    { code: '100', name: 'Suntrust Bank' },
    { code: '302', name: 'TAJ Bank' },
    { code: '102', name: 'Titan Bank' },
    { code: '032', name: 'Union Bank of Nigeria' },
    { code: '033', name: 'United Bank For Africa' },
    { code: '215', name: 'Unity Bank' },
    { code: '566', name: 'VFD Microfinance Bank' },
    { code: '035', name: 'Wema Bank' },
    { code: '057', name: 'Zenith Bank' },
];

// Category Priority Order - For vendors using default categories
export const CATEGORY_PRIORITY = [
    'Electronics',
    'Accessories',
    'Clothing',
    'Services',
    'Other',
];

// Fallback Images
export const FALLBACK_IMAGES = {
    VENDOR: '/images/1.webp',
    MENU_ITEM: '/images/1.webp',
    CAFETERIA: '/images/1.webp',
};

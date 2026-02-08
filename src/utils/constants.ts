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

// Hostel Delivery Fee Mapping
export const HOSTEL_DELIVERY_FEES: Record<string, number> = {
    'New Female Hostel 1': 1500,
    'New Female Hostel 2': 1500,
    'Abuad Hostel': 700,
    'Wema Hostel': 700,
    'Male Hostel 1': 1500,
    'Male Hostel 2': 1500,
    'Male Hostel 3': 1000,
    'Male Hostel 4': 1000,
    'Male Hostel 5': 1000,
    'Male Hostel 6': 1000,
    'Medical Male Hostel 1': 2000,
    'Medical Male Hostel 2': 2000,
    'Female Medical Hostel 1': 2000,
    'Female Medical Hostel 2': 2000,
    'Female Medical Hostel 3': 2000,
    'Female Medical Hostel 4': 2000,
    'Female Medical Hostel 5': 2000,
    'Female Medical Hostel 6': 2000,
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

// Category Priority Order
export const CATEGORY_PRIORITY = [
    'Main Food',
    'Protein',
    'Swallow',
    'Soup',
    'Other',
    'Rice & Pasta',
    'Proteins & Sides',
    'Drinks',
    'Meals',
    'Main Course',
    'Sides',
    'Snacks',
    'Salad',
];

// Fallback Images
export const FALLBACK_IMAGES = {
    VENDOR: '/images/1.jpg',
    MENU_ITEM: '/images/1.jpg',
    CAFETERIA: '/images/1.jpg',
};

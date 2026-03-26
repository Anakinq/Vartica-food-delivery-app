import { useState, useCallback, useEffect } from 'react';
import { UserRole, OnboardingSlide, TooltipElement } from '../types';

// Local storage keys
const ONBOARDING_COMPLETED_KEY = 'hasCompletedOnboarding';
const ONBOARDING_ROLE_KEY = 'onboardingRole';
const SHOW_TOOLTIPS_KEY = 'showTooltips';

// Default onboarding slides for customers
export const customerSlides: OnboardingSlide[] = [
    {
        id: 'ordering',
        title: 'Ordering Food',
        description: 'Browse through cafeterias and vendors, add items to your cart, and place your order with just a few taps.',
    },
    {
        id: 'tracking',
        title: 'Delivery Tracking',
        description: 'Track your order in real-time from the moment it\'s placed until it\'s delivered to your location.',
    },
    {
        id: 'vendors',
        title: 'Vendor Connection',
        description: 'Connect with your favorite vendors, view their menus, and get exclusive offers.',
    },
];

// Default onboarding slides for delivery agents
export const deliveryAgentSlides: OnboardingSlide[] = [
    {
        id: 'accepting',
        title: 'Accepting Orders',
        description: 'View available delivery requests near you and accept orders that fit your schedule and location.',
    },
    {
        id: 'pickup',
        title: 'Pickup & Delivery',
        description: 'Pick up orders from vendors and deliver them to customers. Track your deliveries and manage your routes.',
    },
    {
        id: 'earnings',
        title: 'Earnings & Payouts',
        description: 'Track your earnings, view your delivery history, and withdraw your earnings directly to your bank account.',
    },
];

// Default onboarding slides for vendors
export const vendorSlides: OnboardingSlide[] = [
    {
        id: 'menu',
        title: 'Managing Menu',
        description: 'Add, edit, and manage your menu items. Set prices, availability, and special offers.',
    },
    {
        id: 'orders',
        title: 'Handling Orders',
        description: 'Receive and manage incoming orders, update order status, and communicate with customers.',
    },
    {
        id: 'earnings',
        title: 'Revenue & Payouts',
        description: 'Track your sales, view earnings reports, and manage your payouts from the platform.',
    },
];

// Tooltip elements for customers
export const customerTooltips: TooltipElement[] = [
    {
        id: 'cart',
        selector: '[data-tooltip="cart"]',
        title: 'Your Cart',
        description: 'View and manage items in your cart here',
        position: 'bottom',
    },
    {
        id: 'orders',
        selector: '[data-tooltip="orders"]',
        title: 'Your Orders',
        description: 'Track all your orders here',
        position: 'bottom',
    },
    {
        id: 'profile',
        selector: '[data-tooltip="profile"]',
        title: 'Profile',
        description: 'Manage your account settings',
        position: 'bottom',
    },
];

// Tooltip elements for delivery agents
export const deliveryAgentTooltips: TooltipElement[] = [
    {
        id: 'available-orders',
        selector: '[data-tooltip="available-orders"]',
        title: 'Available Orders',
        description: 'View and accept delivery requests',
        position: 'bottom',
    },
    {
        id: 'my-deliveries',
        selector: '[data-tooltip="my-deliveries"]',
        title: 'My Deliveries',
        description: 'Manage your active deliveries',
        position: 'bottom',
    },
    {
        id: 'earnings',
        selector: '[data-tooltip="earnings"]',
        title: 'Earnings',
        description: 'View your earnings and withdraw',
        position: 'bottom',
    },
];

// Tooltip elements for vendors
export const vendorTooltips: TooltipElement[] = [
    {
        id: 'menu-management',
        selector: '[data-tooltip="menu-management"]',
        title: 'Menu Management',
        description: 'Add and edit menu items',
        position: 'bottom',
    },
    {
        id: 'orders',
        selector: '[data-tooltip="orders"]',
        title: 'Orders',
        description: 'View and manage incoming orders',
        position: 'bottom',
    },
    {
        id: 'analytics',
        selector: '[data-tooltip="analytics"]',
        title: 'Analytics',
        description: 'View sales and performance reports',
        position: 'bottom',
    },
];

interface UseOnboardingOptions {
    role: UserRole;
    onComplete?: () => void;
}

export function useOnboarding({ role, onComplete }: UseOnboardingOptions) {
    const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean>(false);
    const [currentSlide, setCurrentSlide] = useState<number>(0);
    const [showTooltips, setShowTooltips] = useState<boolean>(false);
    const [currentTooltip, setCurrentTooltip] = useState<number>(0);
    const [isInitialized, setIsInitialized] = useState<boolean>(false);

    // Get slides based on role
    const getSlides = useCallback((): OnboardingSlide[] => {
        switch (role) {
            case 'customer':
                return customerSlides;
            case 'delivery_agent':
                return deliveryAgentSlides;
            case 'vendor':
            case 'cafeteria':
            case 'late_night_vendor':
                return vendorSlides;
            default:
                return customerSlides;
        }
    }, [role]);

    // Get tooltips based on role
    const getTooltips = useCallback((): TooltipElement[] => {
        switch (role) {
            case 'customer':
                return customerTooltips;
            case 'delivery_agent':
                return deliveryAgentTooltips;
            case 'vendor':
            case 'cafeteria':
            case 'late_night_vendor':
                return vendorTooltips;
            default:
                return customerTooltips;
        }
    }, [role]);

    // Initialize from localStorage
    useEffect(() => {
        const storedOnboardingCompleted = localStorage.getItem(`${ONBOARDING_COMPLETED_KEY}_${role}`);
        const storedShowTooltips = localStorage.getItem(SHOW_TOOLTIPS_KEY);

        if (storedOnboardingCompleted === 'true') {
            setHasCompletedOnboarding(true);
        }

        if (storedShowTooltips === 'true') {
            setShowTooltips(true);
        }

        setIsInitialized(true);
    }, [role]);

    // Mark onboarding as complete
    const completeOnboarding = useCallback(() => {
        localStorage.setItem(`${ONBOARDING_COMPLETED_KEY}_${role}`, 'true');
        localStorage.setItem(ONBOARDING_ROLE_KEY, role);
        setHasCompletedOnboarding(true);

        if (onComplete) {
            onComplete();
        }
    }, [role, onComplete]);

    // Skip onboarding
    const skipOnboarding = useCallback(() => {
        completeOnboarding();
    }, [completeOnboarding]);

    // Next slide
    const nextSlide = useCallback(() => {
        const slides = getSlides();
        if (currentSlide < slides.length - 1) {
            setCurrentSlide(currentSlide + 1);
        } else {
            completeOnboarding();
        }
    }, [currentSlide, getSlides, completeOnboarding]);

    // Previous slide
    const prevSlide = useCallback(() => {
        if (currentSlide > 0) {
            setCurrentSlide(currentSlide - 1);
        }
    }, [currentSlide]);

    // Go to specific slide
    const goToSlide = useCallback((index: number) => {
        const slides = getSlides();
        if (index >= 0 && index < slides.length) {
            setCurrentSlide(index);
        }
    }, [getSlides]);

    // Start tooltips
    const startTooltips = useCallback(() => {
        localStorage.setItem(SHOW_TOOLTIPS_KEY, 'true');
        setShowTooltips(true);
        setCurrentTooltip(0);
    }, []);

    // Stop tooltips
    const stopTooltips = useCallback(() => {
        localStorage.removeItem(SHOW_TOOLTIPS_KEY);
        setShowTooltips(false);
        setCurrentTooltip(0);
    }, []);

    // Next tooltip
    const nextTooltip = useCallback(() => {
        const tooltips = getTooltips();
        if (currentTooltip < tooltips.length - 1) {
            setCurrentTooltip(currentTooltip + 1);
        } else {
            stopTooltips();
        }
    }, [currentTooltip, getTooltips, stopTooltips]);

    // Previous tooltip
    const prevTooltip = useCallback(() => {
        if (currentTooltip > 0) {
            setCurrentTooltip(currentTooltip - 1);
        }
    }, [currentTooltip]);

    // Reset onboarding (for testing or re-onboarding)
    const resetOnboarding = useCallback(() => {
        localStorage.removeItem(`${ONBOARDING_COMPLETED_KEY}_${role}`);
        localStorage.removeItem(ONBOARDING_ROLE_KEY);
        localStorage.removeItem(SHOW_TOOLTIPS_KEY);
        setHasCompletedOnboarding(false);
        setCurrentSlide(0);
        setShowTooltips(false);
        setCurrentTooltip(0);
    }, [role]);

    return {
        // State
        hasCompletedOnboarding,
        currentSlide,
        showTooltips,
        currentTooltip,
        isInitialized,
        slides: getSlides(),
        tooltips: getTooltips(),

        // Actions
        completeOnboarding,
        skipOnboarding,
        nextSlide,
        prevSlide,
        goToSlide,
        startTooltips,
        stopTooltips,
        nextTooltip,
        prevTooltip,
        resetOnboarding,
    };
}

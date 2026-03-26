import React, { useState, useEffect, useCallback } from 'react';
import {
    ChevronLeft,
    ChevronRight,
    X,
    ShoppingCart,
    MapPin,
    Store,
    Truck,
    DollarSign,
    Utensils,
    BarChart3,
    Package
} from 'lucide-react';
import { UserRole } from '../../types';
import { useOnboarding } from '../../hooks/useOnboarding';

// Icon mapping for slides
const getSlideIcon = (slideId: string, role: UserRole): React.ReactNode => {
    // Customer icons
    if (role === 'customer') {
        switch (slideId) {
            case 'ordering':
                return <ShoppingCart className="w-16 h-16 text-green-500" />;
            case 'tracking':
                return <MapPin className="w-16 h-16 text-blue-500" />;
            case 'vendors':
                return <Store className="w-16 h-16 text-purple-500" />;
            default:
                return <ShoppingCart className="w-16 h-16 text-green-500" />;
        }
    }

    // Delivery agent icons
    if (role === 'delivery_agent') {
        switch (slideId) {
            case 'accepting':
                return <Package className="w-16 h-16 text-orange-500" />;
            case 'pickup':
                return <Truck className="w-16 h-16 text-blue-500" />;
            case 'earnings':
                return <DollarSign className="w-16 h-16 text-green-500" />;
            default:
                return <Truck className="w-16 h-16 text-blue-500" />;
        }
    }

    // Vendor icons
    if (['vendor', 'cafeteria', 'late_night_vendor'].includes(role)) {
        switch (slideId) {
            case 'menu':
                return <Utensils className="w-16 h-16 text-purple-500" />;
            case 'orders':
                return <Package className="w-16 h-16 text-blue-500" />;
            case 'earnings':
                return <DollarSign className="w-16 h-16 text-green-500" />;
            default:
                return <Store className="w-16 h-16 text-purple-500" />;
        }
    }

    return <ShoppingCart className="w-16 h-16 text-green-500" />;
};

// Get role-specific title
const getRoleTitle = (role: UserRole): string => {
    switch (role) {
        case 'customer':
            return 'Welcome to Vartica Food Delivery';
        case 'delivery_agent':
            return 'Welcome to Vartica Delivery Partner';
        case 'vendor':
        case 'cafeteria':
        case 'late_night_vendor':
            return 'Welcome to Vartica Vendor Portal';
        default:
            return 'Welcome to Vartica';
    }
};

// Get role-specific subtitle
const getRoleSubtitle = (role: UserRole): string => {
    switch (role) {
        case 'customer':
            return 'Your guide to ordering food on campus';
        case 'delivery_agent':
            return 'Your guide to delivering orders';
        case 'vendor':
        case 'cafeteria':
        case 'late_night_vendor':
            return 'Your guide to managing your business';
        default:
            return 'Your guide to getting started';
    }
};

interface OnboardingModalProps {
    role: UserRole;
    isOpen: boolean;
    onComplete?: () => void;
    onSkip?: () => void;
}

export function OnboardingModal({ role, isOpen, onComplete, onSkip }: OnboardingModalProps) {
    const {
        currentSlide,
        slides,
        nextSlide,
        prevSlide,
        goToSlide,
        skipOnboarding,
        completeOnboarding,
        hasCompletedOnboarding,
    } = useOnboarding({ role, onComplete });

    const [isAnimating, setIsAnimating] = useState(false);

    // Handle escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                handleSkip();
            }
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [isOpen]);

    // Prevent body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    const handleSkip = useCallback(() => {
        skipOnboarding();
        if (onSkip) {
            onSkip();
        }
    }, [skipOnboarding, onSkip]);

    const handleNext = useCallback(() => {
        setIsAnimating(true);
        setTimeout(() => {
            nextSlide();
            setIsAnimating(false);
        }, 150);
    }, [nextSlide]);

    const handlePrev = useCallback(() => {
        setIsAnimating(true);
        setTimeout(() => {
            prevSlide();
            setIsAnimating(false);
        }, 150);
    }, [prevSlide]);

    const handleComplete = useCallback(() => {
        completeOnboarding();
        if (onComplete) {
            onComplete();
        }
    }, [completeOnboarding, onComplete]);

    if (!isOpen || hasCompletedOnboarding) {
        return null;
    }

    const currentSlideData = slides[currentSlide];
    const isLastSlide = currentSlide === slides.length - 1;
    const isFirstSlide = currentSlide === 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={handleSkip}
            />

            {/* Modal Content */}
            <div className="relative w-full max-w-lg mx-4 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden">
                {/* Close Button */}
                <button
                    onClick={handleSkip}
                    className="absolute top-4 right-4 z-10 p-2 rounded-full bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                    aria-label="Skip onboarding"
                >
                    <X className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                </button>

                {/* Progress Indicator */}
                <div className="flex items-center justify-center gap-2 pt-6">
                    {slides.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => goToSlide(index)}
                            className={`w-2 h-2 rounded-full transition-all duration-300 ${index === currentSlide
                                ? 'w-8 bg-green-500'
                                : index < currentSlide
                                    ? 'bg-green-500'
                                    : 'bg-slate-300 dark:bg-slate-600'
                                }`}
                            aria-label={`Go to slide ${index + 1}`}
                        />
                    ))}
                </div>

                {/* Slide Content */}
                <div className={`px-8 py-8 transition-opacity duration-150 ${isAnimating ? 'opacity-0' : 'opacity-100'}`}>
                    {/* Icon */}
                    <div className="flex justify-center mb-6">
                        <div className="p-6 rounded-full bg-slate-50 dark:bg-slate-700">
                            {getSlideIcon(currentSlideData.id, role)}
                        </div>
                    </div>

                    {/* Title */}
                    <h2 className="text-2xl font-bold text-center text-slate-800 dark:text-white mb-2">
                        {currentSlideData.title}
                    </h2>

                    {/* Description */}
                    <p className="text-center text-slate-600 dark:text-slate-300 text-lg leading-relaxed">
                        {currentSlideData.description}
                    </p>
                </div>

                {/* Navigation Buttons */}
                <div className="flex items-center justify-between px-8 pb-8">
                    {/* Previous Button */}
                    <button
                        onClick={handlePrev}
                        disabled={isFirstSlide}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${isFirstSlide
                            ? 'text-slate-400 cursor-not-allowed'
                            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                            }`}
                    >
                        <ChevronLeft className="w-5 h-5" />
                        Previous
                    </button>

                    {/* Skip Button (visible on all except last slide) */}
                    {!isLastSlide && (
                        <button
                            onClick={handleSkip}
                            className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                        >
                            Skip
                        </button>
                    )}

                    {/* Next/Finish Button */}
                    <button
                        onClick={isLastSlide ? handleComplete : handleNext}
                        className="flex items-center gap-2 px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors"
                    >
                        {isLastSlide ? (
                            <>
                                Finish
                                <Store className="w-5 h-5" />
                            </>
                        ) : (
                            <>
                                Next
                                <ChevronRight className="w-5 h-5" />
                            </>
                        )}
                    </button>
                </div>

                {/* Welcome Screen (First Slide Only) */}
                {currentSlide === 0 && (
                    <div className="absolute inset-0 bg-white dark:bg-slate-800 flex flex-col items-center justify-center pointer-events-none">
                        <div className="text-center">
                            <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">
                                {getRoleTitle(role)}
                            </h1>
                            <p className="text-slate-600 dark:text-slate-300">
                                {getRoleSubtitle(role)}
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default OnboardingModal;

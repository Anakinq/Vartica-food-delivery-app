// src/components/ui/AccessibilityUtils.tsx
// Accessibility utilities and micro-interactions for Vartica App

import React, { useState, useEffect } from 'react';

// Focus management hook
export const useFocusTrap = (isActive: boolean) => {
    useEffect(() => {
        if (!isActive) return;

        const focusableElements = document.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );

        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

        const handleTabKey = (e: KeyboardEvent) => {
            if (e.key === 'Tab') {
                if (e.shiftKey) {
                    if (document.activeElement === firstElement) {
                        lastElement.focus();
                        e.preventDefault();
                    }
                } else {
                    if (document.activeElement === lastElement) {
                        firstElement.focus();
                        e.preventDefault();
                    }
                }
            }
        };

        document.addEventListener('keydown', handleTabKey);
        firstElement?.focus();

        return () => {
            document.removeEventListener('keydown', handleTabKey);
        };
    }, [isActive]);
};

// Keyboard navigation hook
export const useKeyboardNavigation = (onEscape?: () => void) => {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && onEscape) {
                onEscape();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onEscape]);
};

// Reduced motion detection
export const useReducedMotion = () => {
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        setPrefersReducedMotion(mediaQuery.matches);

        const handleChange = (e: MediaQueryListEvent) => {
            setPrefersReducedMotion(e.matches);
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, []);

    return prefersReducedMotion;
};

// Screen reader announcement
export const announceToScreenReader = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const element = document.createElement('div');
    element.setAttribute('aria-live', priority);
    element.setAttribute('aria-atomic', 'true');
    element.className = 'sr-only';
    element.textContent = message;

    document.body.appendChild(element);

    // Remove after announcement
    setTimeout(() => {
        document.body.removeChild(element);
    }, 1000);
};

// ARIA label generator
export const generateAriaLabel = (baseLabel: string, additionalInfo?: string) => {
    return additionalInfo ? `${baseLabel} - ${additionalInfo}` : baseLabel;
};

// Micro-interaction animations
interface AnimationProps {
    className?: string;
    children: React.ReactNode;
    animation?: 'fadeIn' | 'slideIn' | 'scaleIn' | 'bounce';
    duration?: 'fast' | 'normal' | 'slow';
}

export const Animated: React.FC<AnimationProps> = ({
    className = '',
    children,
    animation = 'fadeIn',
    duration = 'normal'
}) => {
    const durationClasses = {
        fast: 'duration-150',
        normal: 'duration-300',
        slow: 'duration-500'
    };

    const animationClasses = {
        fadeIn: 'animate-fadeIn',
        slideIn: 'animate-slideIn',
        scaleIn: 'animate-scaleIn',
        bounce: 'animate-bounce'
    };

    return (
        <div className={`${animationClasses[animation]} ${durationClasses[duration]} ${className}`}>
            {children}
        </div>
    );
};

// Focus visible utility
export const FocusVisible: React.FC<{ children: React.ReactNode; className?: string }> = ({
    children,
    className = ''
}) => {
    return (
        <div
            className={`focus-visible:outline-2 focus-visible:outline-green-500 focus-visible:outline-offset-2 rounded ${className}`}
            tabIndex={0}
        >
            {children}
        </div>
    );
};

// Hover effect with smooth transition
export const HoverCard: React.FC<{
    children: React.ReactNode;
    className?: string;
    elevation?: 'sm' | 'md' | 'lg';
}> = ({
    children,
    className = '',
    elevation = 'md'
}) => {
        const elevationClasses = {
            sm: 'hover:shadow-md hover:shadow-green-500/10',
            md: 'hover:shadow-lg hover:shadow-green-500/20',
            lg: 'hover:shadow-xl hover:shadow-green-500/30'
        };

        return (
            <div className={`transition-all duration-200 ${elevationClasses[elevation]} ${className}`}>
                {children}
            </div>
        );
    };

// Loading state with accessibility
export const AccessibleLoading: React.FC<{
    label: string;
    isLoading: boolean;
    className?: string;
}> = ({
    label,
    isLoading,
    className = ''
}) => {
        if (!isLoading) return null;

        return (
            <div
                className={`flex items-center justify-center ${className}`}
                role="status"
                aria-label={label}
            >
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500 mr-2"></div>
                <span className="text-slate-400">{label}</span>
            </div>
        );
    };

// Skip to content link for accessibility
export const SkipToContent: React.FC = () => {
    return (
        <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-green-600 text-white px-4 py-2 rounded-lg z-50"
        >
            Skip to main content
        </a>
    );
};
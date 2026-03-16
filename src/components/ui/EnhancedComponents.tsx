// src/components/ui/EnhancedComponents.tsx
// Enhanced Card, Modal, and Layout Components for Vartica App

import React, { useState, useEffect, useRef, useCallback } from 'react';

// ============================================
// Enhanced Card Components
// ============================================

interface CardProps {
    children: React.ReactNode;
    className?: string;
    variant?: 'default' | 'surface' | 'elevated' | 'glass' | 'gradient';
    hover?: boolean;
    onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({
    children,
    className = '',
    variant = 'default',
    hover = false,
    onClick
}) => {
    const variantClasses = {
        default: 'bg-slate-800 border border-slate-700',
        surface: 'bg-slate-700 border border-slate-600',
        elevated: 'bg-slate-800 border border-slate-700 shadow-lg',
        glass: 'glass-card',
        gradient: 'bg-gradient-card',
    };

    return (
        <div
            onClick={onClick}
            className={`
                rounded-xl overflow-hidden
                ${variantClasses[variant]}
                ${hover ? 'card-hover hover-lift cursor-pointer' : ''}
                ${className}
            `}
        >
            {children}
        </div>
    );
};

// Glass Card
interface GlassCardProps {
    children: React.ReactNode;
    className?: string;
    hover?: boolean;
    glow?: 'green' | 'purple' | 'pink' | 'orange' | 'none';
}

export const GlassCard: React.FC<GlassCardProps> = ({
    children,
    className = '',
    hover = false,
    glow = 'none'
}) => {
    const glowClasses = {
        green: 'hover:shadow-glow-green',
        purple: 'hover:shadow-glow-purple',
        pink: 'hover:shadow-glow-pink',
        orange: 'hover:shadow-glow-orange',
        none: '',
    };

    return (
        <div
            className={`
                glass-card rounded-2xl p-6
                ${hover ? `hover-lift cursor-pointer ${glowClasses[glow]}` : ''}
                ${className}
            `}
        >
            {children}
        </div>
    );
};

// Interactive Hover Card
interface HoverCardProps {
    children: React.ReactNode;
    className?: string;
    elevation?: 'sm' | 'md' | 'lg';
    onClick?: () => void;
}

export const HoverCard: React.FC<HoverCardProps> = ({
    children,
    className = '',
    elevation = 'md',
    onClick
}) => {
    const elevationClasses = {
        sm: 'hover:shadow-md hover:shadow-green-500/10',
        md: 'hover:shadow-lg hover:shadow-green-500/20',
        lg: 'hover:shadow-xl hover:shadow-green-500/30',
    };

    return (
        <div
            onClick={onClick}
            className={`
                bg-slate-800 border border-slate-700 rounded-xl p-4
                transition-all duration-300 ease-out
                cursor-pointer
                ${elevationClasses[elevation]}
                ${className}
            `}
        >
            {children}
        </div>
    );
};

// Stat Card
interface StatCardProps {
    title: string;
    value: string | number;
    icon?: React.ReactNode;
    trend?: {
        value: number;
        isPositive: boolean;
    };
    className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
    title,
    value,
    icon,
    trend,
    className = ''
}) => {
    return (
        <div className={`glass-card rounded-xl p-5 ${className}`}>
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-slate-400 text-sm">{title}</p>
                    <p className="text-2xl font-bold text-white mt-1">{value}</p>
                    {trend && (
                        <p className={`text-sm mt-2 ${trend.isPositive ? 'text-green-400' : 'text-red-400'}`}>
                            {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
                        </p>
                    )}
                </div>
                {icon && (
                    <div className="text-green-500">
                        {icon}
                    </div>
                )}
            </div>
        </div>
    );
};

// ============================================
// Modal & Dialog Components
// ============================================

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
    showCloseButton?: boolean;
    closeOnOverlayClick?: boolean;
    closeOnEscape?: boolean;
    className?: string;
}

export const Modal: React.FC<ModalProps> = ({
    isOpen,
    onClose,
    children,
    size = 'md',
    showCloseButton = true,
    closeOnOverlayClick = true,
    closeOnEscape = true,
    className = ''
}) => {
    const modalRef = useRef<HTMLDivElement>(null);

    // Close on escape
    useEffect(() => {
        if (!closeOnEscape) return;

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            // Lock scroll
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = '';
        };
    }, [isOpen, onClose, closeOnEscape]);

    // Focus trap
    useEffect(() => {
        if (isOpen && modalRef.current) {
            const focusableElements = modalRef.current.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            const firstElement = focusableElements[0] as HTMLElement;
            firstElement?.focus();
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const sizeClasses = {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-xl',
        full: 'max-w-full mx-4',
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Overlay */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fadeIn"
                onClick={closeOnOverlayClick ? onClose : undefined}
            />

            {/* Modal Content */}
            <div
                ref={modalRef}
                className={`
                    relative bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl
                    w-full ${sizeClasses[size]} max-h-[90vh] overflow-auto
                    animate-zoom-in
                    ${className}
                `}
                role="dialog"
                aria-modal="true"
            >
                {showCloseButton && (
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
                        aria-label="Close modal"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                )}
                {children}
            </div>
        </div>
    );
};

// Side Drawer
interface DrawerProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    position?: 'left' | 'right';
    size?: 'sm' | 'md' | 'lg';
    title?: string;
    className?: string;
}

export const Drawer: React.FC<DrawerProps> = ({
    isOpen,
    onClose,
    children,
    position = 'right',
    size = 'md',
    title,
    className = ''
}) => {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const sizeClasses = {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
    };

    const positionClasses = {
        left: 'left-0',
        right: 'right-0',
    };

    const animationClasses = {
        left: 'animate-slide-in-left',
        right: 'animate-slide-in-right',
    };

    return (
        <div className="fixed inset-0 z-50">
            {/* Overlay */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Drawer Content */}
            <div
                className={`
                    absolute top-0 ${positionClasses[position]} h-full w-full ${sizeClasses[size]}
                    bg-slate-800 border-${position === 'left' ? 'r' : 'l'} border-slate-700
                    shadow-2xl overflow-auto
                    ${animationClasses[position]}
                    ${className}
                `}
            >
                {title && (
                    <div className="flex items-center justify-between p-4 border-b border-slate-700">
                        <h2 className="text-lg font-semibold text-white">{title}</h2>
                        <button
                            onClick={onClose}
                            className="text-slate-400 hover:text-white"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                )}
                <div className="p-4">
                    {children}
                </div>
            </div>
        </div>
    );
};

// Bottom Sheet (Mobile)
interface BottomSheetProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    className?: string;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
    isOpen,
    onClose,
    children,
    className = ''
}) => {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end">
            {/* Overlay */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fadeIn"
                onClick={onClose}
            />

            {/* Bottom Sheet Content */}
            <div
                className={`
                    relative w-full bg-slate-800 border-t border-slate-700
                    rounded-t-2xl shadow-2xl max-h-[80vh] overflow-auto
                    animate-slide-up
                    ${className}
                `}
            >
                {/* Handle */}
                <div className="flex justify-center py-3">
                    <div className="w-12 h-1 bg-slate-600 rounded-full" />
                </div>
                {children}
            </div>
        </div>
    );
};

// ============================================
// Navigation Components
// ============================================

// Tabs
interface TabsProps {
    tabs: { id: string; label: string; icon?: React.ReactNode }[];
    activeTab: string;
    onChange: (tabId: string) => void;
    variant?: 'underline' | 'pill' | 'enclosed';
    className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
    tabs,
    activeTab,
    onChange,
    variant = 'underline',
    className = ''
}) => {
    const variantClasses = {
        underline: 'border-b border-slate-700',
        pill: '',
        enclosed: 'border border-slate-700 rounded-lg p-1',
    };

    const tabVariantClasses = {
        underline: {
            active: 'border-b-2 border-green-500 text-green-500',
            inactive: 'text-slate-400 hover:text-white',
        },
        pill: {
            active: 'bg-green-500 text-white',
            inactive: 'text-slate-400 hover:text-white hover:bg-slate-700',
        },
        enclosed: {
            active: 'bg-slate-700 text-white',
            inactive: 'text-slate-400 hover:text-white',
        },
    };

    return (
        <div className={`flex gap-1 ${variantClasses[variant]} ${className}`}>
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => onChange(tab.id)}
                    className={`
                        flex items-center gap-2 px-4 py-2 rounded-lg transition-all
                        ${activeTab === tab.id
                            ? tabVariantClasses[variant].active
                            : tabVariantClasses[variant].inactive
                        }
                    `}
                >
                    {tab.icon}
                    {tab.label}
                </button>
            ))}
        </div>
    );
};

// Breadcrumbs
interface BreadcrumbsProps {
    items: { label: string; href?: string; onClick?: () => void }[];
    className?: string;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({
    items,
    className = ''
}) => {
    return (
        <nav className={`flex items-center gap-2 text-sm ${className}`}>
            {items.map((item, index) => (
                <React.Fragment key={index}>
                    {index > 0 && (
                        <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    )}
                    {item.href ? (
                        <a
                            href={item.href}
                            className="text-slate-400 hover:text-green-500 transition-colors"
                        >
                            {item.label}
                        </a>
                    ) : (
                        <span className="text-white font-medium">{item.label}</span>
                    )}
                </React.Fragment>
            ))}
        </nav>
    );
};

// Stepper
interface StepperProps {
    steps: { label: string; description?: string }[];
    currentStep: number;
    className?: string;
}

export const Stepper: React.FC<StepperProps> = ({
    steps,
    currentStep,
    className = ''
}) => {
    return (
        <div className={`flex items-center ${className}`}>
            {steps.map((step, index) => (
                <React.Fragment key={index}>
                    <div className="flex flex-col items-center">
                        <div
                            className={`
                                w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                                transition-colors
                                ${index < currentStep
                                    ? 'bg-green-500 text-white'
                                    : index === currentStep
                                        ? 'bg-green-500/20 text-green-500 border-2 border-green-500'
                                        : 'bg-slate-700 text-slate-400'
                                }
                            `}
                        >
                            {index < currentStep ? (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            ) : (
                                index + 1
                            )}
                        </div>
                        <span className={`text-xs mt-2 ${index <= currentStep ? 'text-white' : 'text-slate-400'}`}>
                            {step.label}
                        </span>
                    </div>
                    {index < steps.length - 1 && (
                        <div
                            className={`w-16 h-0.5 mx-2 ${index < currentStep ? 'bg-green-500' : 'bg-slate-700'}`}
                        />
                    )}
                </React.Fragment>
            ))}
        </div>
    );
};

// ============================================
// Badge Components
// ============================================

interface BadgeProps {
    children: React.ReactNode;
    variant?: 'success' | 'warning' | 'error' | 'info' | 'purple' | 'default';
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
    children,
    variant = 'default',
    size = 'md',
    className = ''
}) => {
    const variantClasses = {
        success: 'bg-green-500/20 text-green-400 border border-green-500/30',
        warning: 'bg-orange-500/20 text-orange-400 border border-orange-500/30',
        error: 'bg-red-500/20 text-red-400 border border-red-500/30',
        info: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
        purple: 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
        default: 'bg-slate-700 text-slate-300 border border-slate-600',
    };

    const sizeClasses = {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-3 py-1 text-sm',
        lg: 'px-4 py-1.5 text-base',
    };

    return (
        <span className={`inline-flex items-center rounded-full font-medium ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}>
            {children}
        </span>
    );
};

// ============================================
// Avatar Components
// ============================================

interface AvatarProps {
    src?: string;
    alt?: string;
    name?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    status?: 'online' | 'offline' | 'busy' | 'away';
    className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
    src,
    alt,
    name,
    size = 'md',
    status,
    className = ''
}) => {
    const sizeClasses = {
        sm: 'w-8 h-8 text-xs',
        md: 'w-10 h-10 text-sm',
        lg: 'w-12 h-12 text-base',
        xl: 'w-16 h-16 text-lg',
    };

    const statusClasses = {
        online: 'status-online',
        offline: 'status-offline',
        busy: 'status-busy',
        away: 'status-away',
    };

    // Generate initials from name
    const getInitials = (name?: string) => {
        if (!name) return '?';
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    return (
        <div className={`relative inline-block ${className}`}>
            {src ? (
                <img
                    src={src}
                    alt={alt || name || 'Avatar'}
                    className={`${sizeClasses[size]} rounded-full object-cover`}
                />
            ) : (
                <div className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-green-500 to-brand-600 flex items-center justify-center text-white font-medium`}>
                    {getInitials(name)}
                </div>
            )}
            {status && (
                <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full ${statusClasses[status]} border-2 border-slate-800`} />
            )}
        </div>
    );
};

// Avatar Group
interface AvatarGroupProps {
    avatars: { src?: string; name?: string }[];
    max?: number;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

export const AvatarGroup: React.FC<AvatarGroupProps> = ({
    avatars,
    max = 4,
    size = 'md',
    className = ''
}) => {
    const visibleAvatars = avatars.slice(0, max);
    const remainingCount = avatars.length - max;

    const sizeClasses = {
        sm: 'w-6 h-6 text-xs -ml-2',
        md: 'w-8 h-8 text-sm -ml-3',
        lg: 'w-10 h-10 text-base -ml-4',
    };

    return (
        <div className={`flex items-center ${className}`}>
            {visibleAvatars.map((avatar, index) => (
                <div key={index} className={`${index > 0} ${sizeClasses[size]}`}>
                    <Avatar src={avatar.src} name={avatar.name} size={size} />
                </div>
            ))}
            {remainingCount > 0 && (
                <div className={`${sizeClasses[size]} rounded-full bg-slate-600 flex items-center justify-center text-white font-medium border-2 border-slate-800`}>
                    +{remainingCount}
                </div>
            )}
        </div>
    );
};

export default {
    Card,
    GlassCard,
    HoverCard,
    StatCard,
    Modal,
    Drawer,
    BottomSheet,
    Tabs,
    Breadcrumbs,
    Stepper,
    Badge,
    Avatar,
    AvatarGroup,
};

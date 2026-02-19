// src/components/ui/DesignSystem.tsx
// Consistent Design System for Vartica App

import React from 'react';

// Design Tokens
export const COLORS = {
    // Primary Colors
    primary: '#22c55e',      // Green - primary actions
    primaryDark: '#16a34a',  // Darker green
    primaryLight: '#4ade80', // Lighter green

    // Secondary Colors
    secondary: '#f59e0b',    // Orange - accents and warnings
    secondaryDark: '#d97706', // Darker orange
    secondaryLight: '#fbbf24', // Lighter orange

    // Background Colors
    background: '#0f172a',   // Dark background
    surface: '#1e293b',      // Card surfaces
    surfaceLight: '#334155', // Lighter surfaces

    // Text Colors
    textPrimary: '#ffffff',  // Primary text
    textSecondary: '#cbd5e1', // Secondary text
    textTertiary: '#94a3b8',  // Tertiary text

    // Status Colors
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',

    // Border Colors
    border: '#334155',
    borderLight: '#475569',

    // Overlay
    overlay: 'rgba(15, 23, 42, 0.8)',
};

export const SPACING = {
    xs: '0.25rem',    // 4px
    sm: '0.5rem',     // 8px
    md: '1rem',       // 16px
    lg: '1.5rem',     // 24px
    xl: '2rem',       // 32px
    '2xl': '3rem',    // 48px
    '3xl': '4rem',    // 64px
};

export const TYPOGRAPHY = {
    h1: {
        fontSize: '1.875rem',  // 30px
        fontWeight: '700',
        lineHeight: '1.2',
    },
    h2: {
        fontSize: '1.5rem',    // 24px
        fontWeight: '600',
        lineHeight: '1.3',
    },
    h3: {
        fontSize: '1.25rem',   // 20px
        fontWeight: '600',
        lineHeight: '1.4',
    },
    body: {
        fontSize: '1rem',      // 16px
        fontWeight: '400',
        lineHeight: '1.5',
    },
    caption: {
        fontSize: '0.875rem',  // 14px
        fontWeight: '400',
        lineHeight: '1.4',
    },
    small: {
        fontSize: '0.75rem',   // 12px
        fontWeight: '400',
        lineHeight: '1.4',
    },
};

export const BORDER_RADIUS = {
    sm: '0.5rem',    // 8px
    md: '0.75rem',   // 12px
    lg: '1rem',      // 16px
    xl: '1.5rem',    // 24px
    full: '9999px',
};

export const SHADOWS = {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
};

// Reusable Components
interface ButtonProps {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    className?: string;
    type?: 'button' | 'submit' | 'reset';
}

export const Button: React.FC<ButtonProps> = ({
    variant = 'primary',
    size = 'md',
    children,
    onClick,
    disabled = false,
    className = '',
    type = 'button'
}) => {
    const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900';

    const variantClasses = {
        primary: 'bg-green-500 hover:bg-green-600 focus:ring-green-500 text-white',
        secondary: 'bg-orange-500 hover:bg-orange-600 focus:ring-orange-500 text-white',
        outline: 'border border-slate-600 hover:bg-slate-800 focus:ring-slate-500 text-slate-200',
        ghost: 'hover:bg-slate-800 focus:ring-slate-500 text-slate-200',
    };

    const sizeClasses = {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-4 py-2 text-base',
        lg: 'px-6 py-3 text-lg',
    };

    const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer';

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${disabledClasses} ${className}`}
        >
            {children}
        </button>
    );
};

interface CardProps {
    children: React.ReactNode;
    className?: string;
    variant?: 'default' | 'surface' | 'elevated';
}

export const Card: React.FC<CardProps> = ({
    children,
    className = '',
    variant = 'default'
}) => {
    const baseClasses = 'rounded-xl overflow-hidden';

    const variantClasses = {
        default: 'bg-slate-800 border border-slate-700',
        surface: 'bg-slate-700 border border-slate-600',
        elevated: 'bg-slate-800 border border-slate-700 shadow-lg',
    };

    return (
        <div className={`${baseClasses} ${variantClasses[variant]} ${className}`}>
            {children}
        </div>
    );
};

interface InputProps {
    label?: string;
    placeholder?: string;
    value?: string;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    type?: string;
    error?: string;
    className?: string;
    disabled?: boolean;
}

export const Input: React.FC<InputProps> = ({
    label,
    placeholder,
    value,
    onChange,
    type = 'text',
    error,
    className = '',
    disabled = false
}) => {
    return (
        <div className={`space-y-2 ${className}`}>
            {label && (
                <label className="block text-sm font-medium text-slate-200">
                    {label}
                </label>
            )}
            <input
                type={type}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                disabled={disabled}
                className={`w-full px-4 py-3 bg-slate-800 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all text-slate-100 placeholder-slate-500 ${error ? 'border-red-500' : 'border-slate-700'
                    } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            />
            {error && (
                <p className="text-sm text-red-400">{error}</p>
            )}
        </div>
    );
};

interface StatusBadgeProps {
    status: 'success' | 'warning' | 'error' | 'info' | 'pending';
    children: React.ReactNode;
    className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
    status,
    children,
    className = ''
}) => {
    const statusClasses = {
        success: 'bg-green-500/20 text-green-400 border border-green-500/30',
        warning: 'bg-orange-500/20 text-orange-400 border border-orange-500/30',
        error: 'bg-red-500/20 text-red-400 border border-red-500/30',
        info: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
        pending: 'bg-slate-500/20 text-slate-400 border border-slate-500/30',
    };

    return (
        <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold ${statusClasses[status]} ${className}`}>
            {children}
        </span>
    );
};

// Loading Skeleton Components
export const Skeleton = {
    Text: ({ className = '', width = 'w-full' }: { className?: string; width?: string }) => (
        <div className={`h-4 bg-slate-700 rounded animate-pulse ${width} ${className}`} />
    ),

    Card: ({ className = '', height = 'h-32' }: { className?: string; height?: string }) => (
        <div className={`bg-slate-800 border border-slate-700 rounded-xl p-4 animate-pulse ${height} ${className}`} />
    ),

    Avatar: ({ className = '', size = 'w-12 h-12' }: { className?: string; size?: string }) => (
        <div className={`bg-slate-700 rounded-full animate-pulse ${size} ${className}`} />
    ),

    Button: ({ className = '', width = 'w-24' }: { className?: string; width?: string }) => (
        <div className={`h-10 bg-slate-700 rounded-lg animate-pulse ${width} ${className}`} />
    ),

    Line: ({ className = '', width = 'w-full' }: { className?: string; width?: string }) => (
        <div className={`h-0.5 bg-slate-700 rounded-full animate-pulse ${width} ${className}`} />
    ),
};

// Loading State Component
interface LoadingStateProps {
    type?: 'spinner' | 'skeleton' | 'progress';
    message?: string;
    className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
    type = 'spinner',
    message = 'Loading...',
    className = ''
}) => {
    if (type === 'skeleton') {
        return (
            <div className={`space-y-4 ${className}`}>
                <Skeleton.Card className="h-24" />
                <Skeleton.Card className="h-24" />
                <Skeleton.Card className="h-24" />
            </div>
        );
    }

    if (type === 'progress') {
        return (
            <div className={`text-center py-8 ${className}`}>
                <div className="inline-block relative w-12 h-12 mb-4">
                    <div className="absolute inset-0 rounded-full border-4 border-slate-700"></div>
                    <div className="absolute inset-0 rounded-full border-4 border-green-500 border-t-transparent animate-spin"></div>
                </div>
                <p className="text-slate-400">{message}</p>
            </div>
        );
    }

    return (
        <div className={`flex items-center justify-center py-8 ${className}`}>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
            {message && <span className="ml-3 text-slate-400">{message}</span>}
        </div>
    );
};

// Empty State Component
interface EmptyStateProps {
    icon: React.ReactNode;
    title: string;
    description: string;
    action?: React.ReactNode;
    className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
    icon,
    title,
    description,
    action,
    className = ''
}) => {
    return (
        <div className={`text-center py-12 ${className}`}>
            <div className="mx-auto mb-4 text-slate-600 w-16 h-16 flex items-center justify-center bg-slate-800 rounded-full">
                {icon}
            </div>
            <h3 className="text-lg font-semibold text-slate-200 mb-2">{title}</h3>
            <p className="text-slate-400 mb-6 max-w-md mx-auto">{description}</p>
            {action}
        </div>
    );
};
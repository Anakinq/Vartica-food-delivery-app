import React, { ButtonHTMLAttributes, forwardRef, useState } from 'react';

// ============================================
// Type Definitions
// ============================================

export type ButtonVariant =
    | 'primary'
    | 'secondary'
    | 'outline'
    | 'danger'
    | 'success'
    | 'ghost'
    | 'gradient'
    | 'glass'
    | 'glow'
    | 'soft';

export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export type ButtonType = 'button' | 'submit' | 'reset';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    isLoading?: boolean;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    // New props
    isIconOnly?: boolean;
    isFAB?: boolean;
    isCircle?: boolean;
    fullWidth?: boolean;
    rippleEffect?: boolean;
}

// ============================================
// Ripple Effect Component
// ============================================

interface RippleProps {
    x: number;
    y: number;
    onComplete: () => void;
}

const Ripple: React.FC<RippleProps> = ({ x, y, onComplete }) => {
    return (
        <span
            className="absolute rounded-full animate-ripple"
            style={{
                left: x,
                top: y,
                width: '100px',
                height: '100px',
                marginLeft: '-50px',
                marginTop: '-50px',
                backgroundColor: 'rgba(255, 255, 255, 0.4)',
            }}
            onAnimationEnd={onComplete}
        />
    );
};

// ============================================
// Button Component
// ============================================

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    (
        {
            children,
            variant = 'primary',
            size = 'md',
            isLoading = false,
            leftIcon,
            rightIcon,
            disabled,
            className = '',
            isIconOnly = false,
            isFAB = false,
            isCircle = false,
            fullWidth = false,
            rippleEffect = false,
            type = 'button',
            ...props
        },
        ref
    ) => {
        const [ripples, setRipples] = useState<RippleProps[]>([]);

        // Base styles
        const baseStyles = `
      inline-flex items-center justify-center font-semibold
      transition-all duration-200 ease-in-out
      focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
      disabled:opacity-50 disabled:cursor-not-allowed
      touch-target
      relative overflow-hidden
    `;

        // Variant styles
        const variantStyles: Record<ButtonVariant, string> = {
            primary: `
        bg-orange-500 text-white hover:bg-orange-600 active:bg-orange-700 
        focus-visible:ring-orange-500 shadow-md hover:shadow-lg
      `,
            secondary: `
        bg-gray-200 text-gray-900 hover:bg-gray-300 active:bg-gray-400 
        focus-visible:ring-gray-500
      `,
            outline: `
        border-2 border-gray-300 text-gray-700 hover:bg-gray-50 active:bg-gray-100 
        focus-visible:ring-gray-500 bg-transparent
      `,
            danger: `
        bg-red-500 text-white hover:bg-red-600 active:bg-red-700 
        focus-visible:ring-red-500 shadow-md hover:shadow-lg
      `,
            success: `
        bg-green-500 text-white hover:bg-green-600 active:bg-green-700 
        focus-visible:ring-green-500 shadow-md hover:shadow-lg
      `,
            ghost: `
        bg-transparent text-gray-700 hover:bg-gray-100 active:bg-gray-200 
        focus-visible:ring-gray-500
      `,
            gradient: `
        bg-gradient-to-r from-brand-500 to-brand-600 text-white 
        hover:from-brand-600 hover:to-brand-700
        focus-visible:ring-brand-500 shadow-md hover:shadow-lg
      `,
            glass: `
        glass-button text-white
        hover:bg-white/20 focus-visible:ring-white/50
      `,
            glow: `
        bg-brand-500 text-white hover:bg-brand-600
        focus-visible:ring-brand-500 shadow-glow-green hover:shadow-[0_0_30px_rgba(34,197,94,0.6)]
      `,
            soft: `
        bg-brand-100 text-brand-700 hover:bg-brand-200 active:bg-brand-300 
        focus-visible:ring-brand-500
      `,
        };

        // Size styles
        const sizeStyles: Record<ButtonSize, string> = {
            xs: isIconOnly
                ? 'w-6 h-6 p-0 text-xs'
                : 'px-2 py-1 text-xs min-h-[28px] min-w-[60px]',
            sm: isIconOnly
                ? 'w-8 h-8 p-0 text-sm'
                : 'px-3 py-1.5 text-sm min-h-[36px] min-w-[80px]',
            md: isIconOnly
                ? 'w-10 h-10 p-0 text-base'
                : 'px-4 py-2.5 text-base min-h-[44px] min-w-[100px]',
            lg: isIconOnly
                ? 'w-12 h-12 p-0 text-lg'
                : 'px-6 py-3 text-lg min-h-[52px] min-w-[120px]',
            xl: isIconOnly
                ? 'w-14 h-14 p-0 text-xl'
                : 'px-8 py-4 text-xl min-h-[60px] min-w-[140px]',
        };

        // FAB (Floating Action Button) styles
        const fabStyles = isFAB ? `
      fixed bottom-6 right-6 z-50 
      w-14 h-14 rounded-full 
      shadow-lg hover:shadow-xl 
      bg-brand-500 text-white 
      hover:bg-brand-600
      animate-bounce-slow
    ` : '';

        // Circle styles
        const circleStyles = isCircle && !isFAB ? 'rounded-full' : '';

        // Full width styles
        const fullWidthStyles = fullWidth ? 'w-full' : '';

        // Handle ripple click
        const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
            if (rippleEffect && !disabled && !isLoading) {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const newRipple: RippleProps = { x, y, onComplete: () => { } };

                setRipples([...ripples, {
                    ...newRipple, onComplete: () => {
                        setRipples(prev => prev.filter(r => r !== newRipple));
                    }
                }]);
            }

            props.onClick?.(e);
        };

        return (
            <button
                ref={ref}
                type={type}
                disabled={disabled || isLoading}
                className={`
          ${baseStyles} 
          ${variantStyles[variant]} 
          ${sizeStyles[size]} 
          ${fabStyles}
          ${circleStyles}
          ${fullWidthStyles}
          ${className}
        `}
                onClick={handleClick}
                {...props}
            >
                {/* Ripple effects */}
                {rippleEffect && ripples.map((ripple, index) => (
                    <Ripple
                        key={index}
                        x={ripple.x}
                        y={ripple.y}
                        onComplete={ripple.onComplete}
                    />
                ))}

                {/* Loading state */}
                {isLoading ? (
                    <>
                        <svg
                            className="animate-spin -ml-1 mr-2 h-4 w-4"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                        >
                            <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                            />
                            <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                        </svg>
                        <span>Loading...</span>
                    </>
                ) : (
                    <>
                        {/* Icon-only button (no text) */}
                        {isIconOnly ? (
                            <span className="flex items-center justify-center w-full h-full">
                                {children || leftIcon || rightIcon}
                            </span>
                        ) : (
                            <>
                                {leftIcon && <span className="mr-2 flex-shrink-0">{leftIcon}</span>}
                                <span className="truncate">{children}</span>
                                {rightIcon && <span className="ml-2 flex-shrink-0">{rightIcon}</span>}
                            </>
                        )}
                    </>
                )}
            </button>
        );
    }
);

Button.displayName = 'Button';

// ============================================
// Icon Button Component (Specialized)
// ============================================

interface IconButtonProps extends ButtonProps {
    icon: React.ReactNode;
    label: string; // For accessibility
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
    ({ icon, label, className = '', ...props }, ref) => {
        return (
            <Button
                ref={ref}
                isIconOnly
                aria-label={label}
                className={className}
                {...props}
            >
                {icon}
            </Button>
        );
    }
);

IconButton.displayName = 'IconButton';

// ============================================
// Floating Action Button (FAB) Component
// ============================================

interface FABProps {
    icon: React.ReactNode;
    onClick: () => void;
    variant?: ButtonVariant;
    size?: 'sm' | 'md' | 'lg';
    label?: string;
    className?: string;
}

export const FAB: React.FC<FABProps> = ({
    icon,
    onClick,
    variant = 'gradient',
    size = 'md',
    label,
    className = '',
}) => {
    const sizeClasses = {
        sm: 'w-12 h-12',
        md: 'w-14 h-14',
        lg: 'w-16 h-16',
    };

    const iconSizeClasses = {
        sm: 'w-5 h-5',
        md: 'w-6 h-6',
        lg: 'w-7 h-7',
    };

    return (
        <button
            onClick={onClick}
            aria-label={label}
            className={`
        fixed bottom-6 right-6 z-50
        ${sizeClasses[size]}
        rounded-full
        ${variantStyles[variant]}
        shadow-lg hover:shadow-xl
        transition-all duration-200
        focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
        focus-visible:ring-brand-500
        flex items-center justify-center
        animate-bounce-slow
        ${className}
      `}
        >
            <span className={iconSizeClasses[size]}>{icon}</span>
        </button>
    );
};

// Helper to access variant styles
const variantStyles: Record<ButtonVariant, string> = {
    primary: 'bg-orange-500 text-white hover:bg-orange-600 active:bg-orange-700',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 active:bg-gray-400',
    outline: 'border-2 border-gray-300 text-gray-700 hover:bg-gray-50 bg-transparent',
    danger: 'bg-red-500 text-white hover:bg-red-600 active:bg-red-700',
    success: 'bg-green-500 text-white hover:bg-green-600 active:bg-green-700',
    ghost: 'bg-transparent text-gray-700 hover:bg-gray-100',
    gradient: 'bg-gradient-to-r from-brand-500 to-brand-600 text-white hover:from-brand-600 hover:to-brand-700',
    glass: 'glass-button text-white',
    glow: 'bg-brand-500 text-white hover:bg-brand-600 shadow-glow-green',
    soft: 'bg-brand-100 text-brand-700 hover:bg-brand-200',
};

// ============================================
// Button Group Component
// ============================================

interface ButtonGroupProps {
    children: React.ReactNode;
    className?: string;
    variant?: 'default' | 'outline' | 'soft';
}

export const ButtonGroup: React.FC<ButtonGroupProps> = ({
    children,
    className = '',
    variant = 'default',
}) => {
    const variantClasses = {
        default: 'divide-x divide-gray-200',
        outline: 'divide-x divide-gray-300',
        soft: 'divide-x divide-brand-200',
    };

    return (
        <div className={`inline-flex rounded-lg overflow-hidden ${variantClasses[variant]} ${className}`}>
            {children}
        </div>
    );
};

// ============================================
// Split Button Component
// ============================================

interface SplitButtonProps {
    primaryButton: {
        label: string;
        onClick: () => void;
    };
    menuItems: {
        label: string;
        onClick: () => void;
        icon?: React.ReactNode;
    }[];
    variant?: ButtonVariant;
    size?: ButtonSize;
    className?: string;
}

export const SplitButton: React.FC<SplitButtonProps> = ({
    primaryButton,
    menuItems,
    variant = 'primary',
    size = 'md',
    className = '',
}) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className={`inline-flex ${className}`}>
            <Button variant={variant} size={size} onClick={primaryButton.onClick}>
                {primaryButton.label}
            </Button>
            <div className="relative">
                <Button
                    variant={variant}
                    size={size}
                    isIconOnly
                    onClick={() => setIsOpen(!isOpen)}
                    aria-expanded={isOpen}
                    aria-haspopup="true"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </Button>

                {isOpen && (
                    <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg py-1 z-10">
                        {menuItems.map((item, index) => (
                            <button
                                key={index}
                                onClick={() => {
                                    item.onClick();
                                    setIsOpen(false);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                            >
                                {item.icon && <span>{item.icon}</span>}
                                {item.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Button;

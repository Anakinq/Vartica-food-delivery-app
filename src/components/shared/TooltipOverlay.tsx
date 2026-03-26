import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, Info } from 'lucide-react';

interface TooltipElement {
    id: string;
    selector: string;
    title: string;
    description: string;
    position: 'top' | 'bottom' | 'left' | 'right';
}

// Default tooltips for different roles
const getDefaultTooltips = (role: string): TooltipElement[] => {
    switch (role) {
        case 'customer':
            return [
                { id: 'cart', selector: '[data-tooltip="cart"]', title: 'Your Cart', description: 'View and manage items in your cart here', position: 'bottom' },
                { id: 'orders', selector: '[data-tooltip="orders"]', title: 'Your Orders', description: 'Track all your orders here', position: 'bottom' },
                { id: 'profile', selector: '[data-tooltip="profile"]', title: 'Profile', description: 'Manage your account settings', position: 'bottom' },
            ];
        case 'delivery_agent':
            return [
                { id: 'available-orders', selector: '[data-tooltip="available-orders"]', title: 'Available Orders', description: 'View and accept delivery requests', position: 'bottom' },
                { id: 'my-deliveries', selector: '[data-tooltip="my-deliveries"]', title: 'My Deliveries', description: 'Manage your active deliveries', position: 'bottom' },
                { id: 'earnings', selector: '[data-tooltip="earnings"]', title: 'Earnings', description: 'View your earnings and withdraw', position: 'bottom' },
            ];
        case 'vendor':
        case 'cafeteria':
        case 'late_night_vendor':
            return [
                { id: 'menu-management', selector: '[data-tooltip="menu-management"]', title: 'Menu Management', description: 'Add and edit menu items', position: 'bottom' },
                { id: 'orders', selector: '[data-tooltip="orders"]', title: 'Orders', description: 'View and manage incoming orders', position: 'bottom' },
                { id: 'analytics', selector: '[data-tooltip="analytics"]', title: 'Analytics', description: 'View sales and performance reports', position: 'bottom' },
            ];
        default:
            return [];
    }
};

interface TooltipOverlayProps {
    role: 'customer' | 'delivery_agent' | 'vendor' | 'cafeteria' | 'late_night_vendor';
    isOpen: boolean;
    onClose?: () => void;
}

export function TooltipOverlay({ role, isOpen, onClose }: TooltipOverlayProps) {
    const [currentTooltip, setCurrentTooltip] = useState(0);
    const tooltips = getDefaultTooltips(role);
    const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
    const [isVisible, setIsVisible] = useState(false);
    const tooltipRef = useRef<HTMLDivElement>(null);

    const nextTooltip = useCallback(() => {
        if (currentTooltip < tooltips.length - 1) {
            setCurrentTooltip(currentTooltip + 1);
        } else {
            handleClose();
        }
    }, [currentTooltip, tooltips.length]);

    const prevTooltip = useCallback(() => {
        if (currentTooltip > 0) {
            setCurrentTooltip(currentTooltip - 1);
        }
    }, [currentTooltip]);

    const handleClose = useCallback(() => {
        setIsVisible(false);
        if (onClose) {
            onClose();
        }
    }, [onClose]);

    // Find element position
    useEffect(() => {
        if (!isOpen || !tooltips[currentTooltip]) {
            setIsVisible(false);
            return;
        }

        const findPosition = () => {
            const element = document.querySelector(tooltips[currentTooltip].selector);
            if (element) {
                const rect = element.getBoundingClientRect();
                const position = tooltips[currentTooltip].position;

                let top = 0;
                let left = 0;

                switch (position) {
                    case 'top':
                        top = rect.top - 200;
                        left = rect.left + rect.width / 2 - 150;
                        break;
                    case 'bottom':
                        top = rect.bottom + 20;
                        left = rect.left + rect.width / 2 - 150;
                        break;
                    case 'left':
                        top = rect.top + rect.height / 2 - 75;
                        left = rect.left - 320;
                        break;
                    case 'right':
                        top = rect.top + rect.height / 2 - 75;
                        left = rect.right + 20;
                        break;
                    default:
                        top = rect.bottom + 20;
                        left = rect.left + rect.width / 2 - 150;
                }

                setTooltipPosition({ top: Math.max(10, top), left: Math.max(10, left) });
                setIsVisible(true);
            } else {
                // Element not found, try next tooltip
                if (currentTooltip < tooltips.length - 1) {
                    setCurrentTooltip(currentTooltip + 1);
                } else {
                    setIsVisible(false);
                }
            }
        };

        // Small delay to ensure DOM is ready
        const timeoutId = setTimeout(findPosition, 100);
        return () => clearTimeout(timeoutId);
    }, [isOpen, currentTooltip, tooltips]);

    // Handle escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                handleClose();
            }
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [isOpen, handleClose]);

    // Prevent body scroll when tooltip is open
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

    if (!isOpen || !isVisible || !tooltips[currentTooltip]) {
        return null;
    }

    const currentTooltipData = tooltips[currentTooltip];
    const isLastTooltip = currentTooltip === tooltips.length - 1;
    const isFirstTooltip = currentTooltip === 0;

    return (
        <div className="fixed inset-0 z-50">
            {/* Highlight overlay */}
            <div className="absolute inset-0 bg-black/40 pointer-events-none" />

            {/* Tooltip Card */}
            <div
                ref={tooltipRef}
                className="absolute w-[300px] bg-white dark:bg-slate-800 rounded-xl shadow-2xl overflow-hidden animate-fade-in"
                style={{
                    top: tooltipPosition.top,
                    left: tooltipPosition.left,
                }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 bg-green-500 text-white">
                    <div className="flex items-center gap-2">
                        <Info className="w-4 h-4" />
                        <span className="font-semibold">{currentTooltipData.title}</span>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-1 hover:bg-green-600 rounded-full transition-colors"
                        aria-label="Close tour"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4">
                    <p className="text-slate-600 dark:text-slate-300 text-sm">
                        {currentTooltipData.description}
                    </p>
                </div>

                {/* Navigation */}
                <div className="flex items-center justify-between px-4 pb-4">
                    <button
                        onClick={prevTooltip}
                        disabled={isFirstTooltip}
                        className={`flex items-center gap-1 text-sm ${isFirstTooltip
                                ? 'text-slate-400 cursor-not-allowed'
                                : 'text-slate-600 dark:text-slate-300 hover:text-green-500'
                            }`}
                    >
                        <ChevronLeft className="w-4 h-4" />
                        Previous
                    </button>

                    <span className="text-sm text-slate-500 dark:text-slate-400">
                        {currentTooltip + 1} / {tooltips.length}
                    </span>

                    <button
                        onClick={nextTooltip}
                        className={`flex items-center gap-1 text-sm ${isLastTooltip
                                ? 'text-green-500 hover:text-green-600 font-medium'
                                : 'text-slate-600 dark:text-slate-300 hover:text-green-500'
                            }`}
                    >
                        {isLastTooltip ? 'Done' : 'Next'}
                        {isLastTooltip ? null : <ChevronRight className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            {/* Arrow connector */}
            <div
                className="absolute w-4 h-4 bg-white dark:bg-slate-800 transform rotate-45"
                style={{
                    top: tooltips[currentTooltip].position === 'top'
                        ? tooltipPosition.top + 160
                        : tooltipPosition.top - 10,
                    left: tooltipPosition.left + 148,
                }}
            />
        </div>
    );
}

export default TooltipOverlay;

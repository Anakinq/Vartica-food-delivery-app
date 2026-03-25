// src/components/shared/FloatingCartButton.tsx
// Uber Eats / DoorDash style floating cart button
// Shows cart count and opens cart with a single tap

import React, { useState, useEffect } from 'react';
import { ShoppingCart } from 'lucide-react';

interface FloatingCartButtonProps {
    cartCount: number;
    cartTotal?: number;
    onClick: () => void;
    className?: string;
}

export const FloatingCartButton: React.FC<FloatingCartButtonProps> = ({
    cartCount,
    cartTotal = 0,
    onClick,
    className = ''
}) => {
    const [isVisible, setIsVisible] = useState(false);
    const [isPulsing, setIsPulsing] = useState(false);

    // Show button when cart has items
    useEffect(() => {
        setIsVisible(cartCount > 0);

        // Pulse animation when item is added
        if (cartCount > 0) {
            setIsPulsing(true);
            const timer = setTimeout(() => setIsPulsing(false), 300);
            return () => clearTimeout(timer);
        }
    }, [cartCount]);

    // Don't render if cart is empty
    if (!isVisible) return null;

    return (
        <button
            onClick={onClick}
            className={`fixed bottom-24 sm:bottom-20 right-4 z-40 flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white font-bold rounded-full shadow-lg hover:shadow-xl transition-all duration-300 ease-out transform hover:scale-105 active:scale-95 ${isPulsing ? 'animate-pulse' : ''} ${className}`}
            aria-label={`Open cart with ${cartCount} items`}
            style={{
                padding: '12px 20px',
                boxShadow: '0 4px 20px rgba(34, 197, 94, 0.4)',
            }}
        >
            {/* Cart Icon with Badge */}
            <div className="relative">
                <ShoppingCart size={24} />
                {/* Item Count Badge */}
                <span
                    className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-bounce"
                    style={{
                        minWidth: '20px',
                        height: '20px',
                        fontSize: '11px',
                    }}
                >
                    {cartCount > 99 ? '99+' : cartCount}
                </span>
            </div>

            {/* Total Price */}
            {cartTotal > 0 && (
                <span className="text-sm">₦{cartTotal.toLocaleString()}</span>
            )}

            {/* View Text */}
            <span className="text-sm opacity-90">View</span>
        </button>
    );
};

// Mini FAB - just the cart icon with count (for when you want something smaller)
export const MiniCartFAB: React.FC<FloatingCartButtonProps> = ({
    cartCount,
    onClick,
    className = ''
}) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        setIsVisible(cartCount > 0);
    }, [cartCount]);

    if (!isVisible) return null;

    return (
        <button
            onClick={onClick}
            className={`
        mini-cart-fab
        fixed bottom-20 right-4 z-40
        bg-green-500 hover:bg-green-600
        text-white
        rounded-full
        shadow-lg
        transition-all duration-200
        animate-bounce-subtle
        ${className}
      `}
            style={{
                width: '56px',
                height: '56px',
                boxShadow: '0 4px 15px rgba(34, 197, 94, 0.4)',
            }}
            aria-label={`Cart with ${cartCount} items`}
        >
            <div className="relative">
                <ShoppingCart size={24} />
                <span
                    className="
            absolute -top-2 -right-2 
            bg-red-500 text-white 
            text-xs font-bold 
            rounded-full 
            flex items-center justify-center
          "
                    style={{
                        minWidth: '18px',
                        height: '18px',
                        padding: '0 4px',
                        fontSize: '10px',
                    }}
                >
                    {cartCount > 99 ? '99+' : cartCount}
                </span>
            </div>
        </button>
    );
};

export default FloatingCartButton;

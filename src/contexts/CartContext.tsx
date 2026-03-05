import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { MenuItem } from '../lib/supabase';
import { Cart } from '../components/customer/Cart';

const CART_STORAGE_KEY = 'vartica_cart';
const CART_PACK_KEY = 'vartica_cart_pack';

// Load cart from localStorage safely
const loadCartFromStorage = (): { items: CartItem[], packCount: number } => {
    if (typeof window === 'undefined') return { items: [], packCount: 0 };

    try {
        const savedItems = localStorage.getItem(CART_STORAGE_KEY);
        const savedPackCount = localStorage.getItem(CART_PACK_KEY);
        return {
            items: savedItems ? JSON.parse(savedItems) : [],
            packCount: savedPackCount ? parseInt(savedPackCount, 10) : 0
        };
    } catch (error) {
        console.error('Error loading cart from storage:', error);
        return { items: [], packCount: 0 };
    }
};

interface CartItem extends MenuItem {
    quantity: number;
}

interface CartContextType {
    items: CartItem[];
    isCartOpen: boolean;
    openCart: () => void;
    closeCart: () => void;
    addItem: (item: MenuItem) => void;
    removeItem: (itemId: string) => void;
    updateQuantity: (itemId: string, quantity: number) => void;
    clearCart: () => void;
    cartCount: number;
    subtotal: number;
    cartPackCount: number;
    setCartPackCount: (count: number) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // Initialize from localStorage for persistence across page refreshes
    const [items, setItems] = useState<CartItem[]>(() => loadCartFromStorage().items);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [cartPackCount, setCartPackCount] = useState<number>(() => loadCartFromStorage().packCount);

    // Persist cart to localStorage whenever it changes
    useEffect(() => {
        if (typeof window !== 'undefined') {
            try {
                localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
            } catch (error) {
                console.error('Error saving cart to storage:', error);
            }
        }
    }, [items]);

    // Persist pack count to localStorage
    useEffect(() => {
        if (typeof window !== 'undefined') {
            try {
                localStorage.setItem(CART_PACK_KEY, cartPackCount.toString());
            } catch (error) {
                console.error('Error saving pack count to storage:', error);
            }
        }
    }, [cartPackCount]);

    const openCart = useCallback(() => setIsCartOpen(true), []);
    const closeCart = useCallback(() => setIsCartOpen(false), []);

    const addItem = useCallback((item: MenuItem) => {
        setItems(prev => {
            const existing = prev.find(i => i.id === item.id);
            if (existing) {
                return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
            }
            return [...prev, { ...item, quantity: 1 }];
        });
    }, []);

    const removeItem = useCallback((itemId: string) => {
        setItems(prev => prev.filter(i => i.id !== itemId));
    }, []);

    const updateQuantity = useCallback((itemId: string, quantity: number) => {
        if (quantity === 0) {
            removeItem(itemId);
        } else {
            setItems(prev => prev.map(i => i.id === itemId ? { ...i, quantity } : i));
        }
    }, [removeItem]);

    const clearCart = useCallback(() => {
        setItems([]);
        setCartPackCount(0);
        // Clear from localStorage
        if (typeof window !== 'undefined') {
            try {
                localStorage.removeItem(CART_STORAGE_KEY);
                localStorage.removeItem(CART_PACK_KEY);
            } catch (error) {
                console.error('Error clearing cart from storage:', error);
            }
        }
        closeCart();
    }, [closeCart]);

    const cartCount = items.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    return (
        <CartContext.Provider value={{ items, isCartOpen, openCart, closeCart, addItem, removeItem, updateQuantity, clearCart, cartCount, subtotal, cartPackCount, setCartPackCount }}>
            {children}
            {isCartOpen && (
                <Cart
                    items={items}
                    onUpdateQuantity={updateQuantity}
                    onClear={() => {
                        setItems([]);
                        setCartPackCount(0);
                    }}
                    onClose={closeCart}
                    cartPackCount={cartPackCount}
                    onCartPackChange={setCartPackCount}
                    onCheckout={() => {
                        closeCart();
                        window.location.hash = '#/checkout';
                    }}
                />
            )}
        </CartContext.Provider>
    );
};

export const useCart = () => {
    const context = useContext(CartContext);
    if (!context) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
};

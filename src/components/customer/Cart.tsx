import React, { useState } from 'react';
import { X, Minus, Plus, Trash2, ShoppingBag, ShoppingCart } from 'lucide-react';
import { MenuItem } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface CartItem extends MenuItem {
  quantity: number;
}

interface CartProps {
  items: CartItem[];
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onClear: () => void;
  onClose: () => void;
  cartPackCount?: number;
  onCartPackChange?: (count: number) => void;
  onCheckout: () => void;
}

// Animated quantity button component
const QuantityButton: React.FC<{
  quantity: number;
  itemName: string;
  onDecrease: () => void;
  onIncrease: () => void;
}> = ({ quantity, itemName, onDecrease, onIncrease }) => {
  const [animating, setAnimating] = useState<'decrease' | 'increase' | null>(null);

  const handleDecrease = () => {
    setAnimating('decrease');
    onDecrease();
    setTimeout(() => setAnimating(null), 200);
  };

  const handleIncrease = () => {
    setAnimating('increase');
    onIncrease();
    setTimeout(() => setAnimating(null), 200);
  };

  return (
    <div className="flex items-center space-x-2">
      <button
        onClick={handleDecrease}
        disabled={quantity <= 1}
        className={`relative p-2 rounded-full transition-all duration-200 ${quantity <= 1
          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
          : 'bg-gray-200 text-gray-700 hover:bg-gray-300 active:scale-95'
          }`}
        aria-label={`Decrease ${itemName} quantity`}
      >
        <Minus className={`h-4 w-4 ${animating === 'decrease' ? 'scale-75' : ''}`} />
      </button>
      <span
        className={`w-10 text-center font-bold text-lg transition-all duration-200 ${animating ? 'scale-125 text-orange-500' : ''
          }`}
      >
        {quantity}
      </span>
      <button
        onClick={handleIncrease}
        className="p-2 rounded-full bg-orange-100 text-orange-600 hover:bg-orange-200 active:scale-95 transition-all duration-200"
        aria-label={`Increase ${itemName} quantity`}
      >
        <Plus className={`h-4 w-4 ${animating === 'increase' ? 'scale-75' : ''}`} />
      </button>
    </div>
  );
};

export const Cart: React.FC<CartProps> = ({
  items,
  onUpdateQuantity,
  onClear,
  onClose,
  cartPackCount = 0,
  onCartPackChange,
  onCheckout,
}) => {
  const { profile } = useAuth();
  const isBusinessVendor = profile?.vendor?.vendor_type === 'student';
  const isLateNightVendor = profile?.vendor?.vendor_type === 'late_night';
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryFee = 500.00;
  const packPrice = 300.00;
  const total = subtotal + (packPrice * cartPackCount) + deliveryFee;
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <ShoppingCart className="h-6 w-6 text-orange-500" />
              {itemCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                  {itemCount}
                </span>
              )}
            </div>
            <h2 className="text-2xl font-bold text-black">Your Cart</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Empty State */}
        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-24 h-24 bg-orange-100 rounded-full flex items-center justify-center mb-4">
              <ShoppingBag className="h-12 w-12 text-orange-400" />
            </div>
            <h3 className="text-xl font-semibold text-black mb-2">Your cart is empty</h3>
            <p className="text-gray-600 mb-6">Add some delicious items to get started!</p>
            <button
              onClick={onClose}
              className="px-8 py-3 bg-black text-white rounded-full font-semibold hover:bg-gray-800 transition-colors shadow-lg hover:shadow-xl"
            >
              Browse Menu
            </button>
          </div>
        ) : (
          <>
            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {items.map(item => (
                <div
                  key={item.id}
                  className="flex items-center space-x-4 bg-gray-50 rounded-xl p-4 transition-all hover:bg-gray-100"
                >
                  {/* Item Image Placeholder */}
                  <div className="w-16 h-16 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-full h-full object-cover rounded-lg"
                        loading="lazy"
                      />
                    ) : (
                      <ShoppingBag className="h-8 w-8 text-orange-400" />
                    )}
                  </div>

                  {/* Item Details */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-black truncate">{item.name}</h3>
                    <p className="text-sm text-gray-600">₦{item.price.toLocaleString()} each</p>
                    <p className="text-sm font-bold text-orange-600 mt-1">
                      ₦{(item.price * item.quantity).toLocaleString()}
                    </p>
                  </div>

                  {/* Quantity Controls */}
                  <QuantityButton
                    quantity={item.quantity}
                    itemName={item.name}
                    onDecrease={() => onUpdateQuantity(item.id, item.quantity - 1)}
                    onIncrease={() => onUpdateQuantity(item.id, item.quantity + 1)}
                  />

                  {/* Remove Button */}
                  <button
                    onClick={() => onUpdateQuantity(item.id, 0)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"
                    aria-label="Remove item"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-100 p-6 space-y-4 bg-white">
              {/* Food Pack Selector - Only show for food vendors */}
              {!isBusinessVendor && (
                <div className="bg-orange-50 rounded-xl p-4">
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-semibold text-black">Food Pack</span>
                    <span className="text-sm text-gray-600">₦{packPrice.toLocaleString()} each</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Quantity</span>
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => cartPackCount > 0 && onCartPackChange && onCartPackChange(cartPackCount - 1)}
                        disabled={cartPackCount <= 0}
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold transition-all ${cartPackCount <= 0
                          ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          : 'bg-white text-gray-700 hover:bg-gray-100 shadow-sm active:scale-95'
                          }`}
                      >
                        –
                      </button>
                      <span className="w-10 text-center font-bold text-lg">{cartPackCount}</span>
                      <button
                        onClick={() => onCartPackChange && onCartPackChange(cartPackCount + 1)}
                        className="w-10 h-10 rounded-full bg-orange-500 text-white flex items-center justify-center text-xl font-bold hover:bg-orange-600 shadow-sm active:scale-95 transition-all"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  {cartPackCount > 0 && (
                    <p className="text-sm text-orange-600 mt-2 font-medium">
                      Food pack total: ₦{(packPrice * cartPackCount).toLocaleString()}
                    </p>
                  )}
                </div>
              )}

              {/* Order Summary */}
              <div className="space-y-2">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span className="font-medium">₦{subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Delivery Fee</span>
                  <span className="font-medium">₦{deliveryFee.toLocaleString()}</span>
                </div>
                {!isBusinessVendor && cartPackCount > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Food Packs ({cartPackCount}x)</span>
                    <span className="font-medium">₦{(packPrice * cartPackCount).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-xl font-bold text-black pt-3 border-t border-gray-200">
                  <span>Total</span>
                  <span className="text-orange-600">₦{total.toLocaleString()}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <button
                  onClick={onClear}
                  className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-full font-semibold hover:bg-gray-50 transition-colors flex items-center justify-center space-x-2"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Clear</span>
                </button>
                <button
                  onClick={onCheckout}
                  disabled={items.length === 0}
                  className="flex-1 py-3 bg-green-600 text-white rounded-full font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
                >
                  <span>Checkout</span>
                  <span className="text-green-200">•</span>
                  <span>₦{total.toLocaleString()}</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

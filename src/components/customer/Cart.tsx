import React from 'react';
import { X, Minus, Plus, Trash2, ShoppingBag } from 'lucide-react';
import { MenuItem } from '../../lib/supabase';

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
  onCheckout: () => void; // ✅ Required now
}

export const Cart: React.FC<CartProps> = ({ 
  items, 
  onUpdateQuantity, 
  onClear, 
  onClose,
  cartPackCount = 1,
  onCartPackChange,
  onCheckout // ✅ Destructure it
}) => {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryFee = 500.00;
  const packPrice = 300.00;
  const total = subtotal + (packPrice * cartPackCount) + deliveryFee;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Your Cart</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="h-6 w-6" />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <ShoppingBag className="h-16 w-16 text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Your cart is empty</h3>
            <p className="text-gray-600 mb-6">Add some delicious items to get started!</p>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
            >
              Browse Menu
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {items.map(item => (
                <div key={item.id} className="flex items-center space-x-4 bg-gray-50 rounded-lg p-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{item.name}</h3>
                    <p className="text-sm text-gray-600">₦{item.price.toLocaleString()} each</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                      className="p-1 rounded-full hover:bg-gray-200"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-8 text-center font-semibold">{item.quantity}</span>
                    <button
                      onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                      className="p-1 rounded-full hover:bg-gray-200"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="text-right min-w-[4rem]">
                    <p className="font-bold text-gray-900">₦{(item.price * item.quantity).toLocaleString()}</p>
                  </div>
                  <button
                    onClick={() => onUpdateQuantity(item.id, 0)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-full"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-200 p-6 space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>₦{subtotal.toLocaleString()}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Food Pack</span>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => cartPackCount > 1 && onCartPackChange && onCartPackChange(cartPackCount - 1)}
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold ${
                        cartPackCount <= 1
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                      aria-label="Decrease packs"
                    >
                      –
                    </button>
                    <span className="w-8 text-center font-semibold">{cartPackCount}</span>
                    <button
                      onClick={() => onCartPackChange && onCartPackChange(cartPackCount + 1)}
                      className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center text-lg font-bold hover:bg-orange-600"
                      aria-label="Increase packs"
                    >
                      +
                    </button>
                    <span className="text-gray-900 font-bold">
                      ₦{(packPrice * cartPackCount).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between text-gray-600">
                  <span>Delivery Fee</span>
                  <span>₦{deliveryFee.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xl font-bold text-gray-900 pt-2 border-t border-gray-200">
                  <span>Total</span>
                  <span>₦{total.toLocaleString()}</span>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={onClear}
                  className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50"
                >
                  Clear Cart
                </button>
                {/* ✅ DIRECT PLACE ORDER BUTTON */}
                <button
                  onClick={onCheckout}
                  disabled={items.length === 0}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Place Order
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
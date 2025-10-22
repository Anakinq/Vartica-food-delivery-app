import React from 'react';
import { MenuItem } from '../../lib/supabase';

interface MenuItemCardProps {
  item: MenuItem;
  quantity: number;
  onQuantityChange: (itemId: string, newQuantity: number) => void;
}

export const MenuItemCard: React.FC<MenuItemCardProps> = ({ item, quantity, onQuantityChange }) => {
  // Fix: remove extra space in fallback URL
  const imageUrl = item.image_url || '/images/food-placeholder.png';

  const handleIncrement = () => {
    onQuantityChange(item.id, quantity + 1);
  };

  const handleDecrement = () => {
    if (quantity > 0) {
      onQuantityChange(item.id, quantity - 1);
    }
  };

  const totalPrice = item.price * quantity;

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm transform transition-all duration-300 hover:scale-[1.02] hover:shadow-md animate-fadeIn">
      <div className="relative h-40 w-full overflow-hidden">
        <img
          src={imageUrl}
          alt={item.name}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/images/food-placeholder.png';
          }}
        />
      </div>

      <div className="p-4">
        <h3 className="font-bold text-stone-800 text-lg leading-tight line-clamp-1">{item.name}</h3>

        {/* Unit price */}
        <p className="text-emerald-600 font-semibold mt-1">₦{item.price.toLocaleString()}</p>

        {/* Quantity Controls */}
        <div className="flex items-center mt-3">
          <button
            onClick={handleDecrement}
            disabled={quantity === 0}
            className={`w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold transition-all duration-200 ${quantity === 0
                ? 'bg-stone-100 text-stone-400 cursor-not-allowed opacity-60'
                : 'bg-stone-200 text-stone-700 hover:bg-stone-300 active:scale-95'
              }`}
            aria-label="Decrease quantity"
          >
            –
          </button>

          <span className="mx-3 text-lg font-medium min-w-[24px] text-center text-stone-800">
            {quantity}
          </span>

          <button
            onClick={handleIncrement}
            className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center text-lg font-bold hover:bg-orange-600 active:scale-95 transition-all duration-200"
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>

        {/* Total price when quantity > 0 */}
        {quantity > 0 && (
          <p className="text-stone-500 text-sm mt-2 leading-tight">
            ₦{item.price.toLocaleString()} × {quantity} ={' '}
            <span className="font-bold text-stone-800">₦{totalPrice.toLocaleString()}</span>
          </p>
        )}
      </div>
    </div>
  );
};
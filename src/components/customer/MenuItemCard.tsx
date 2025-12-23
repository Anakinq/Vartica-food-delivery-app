import React from 'react';
import { MenuItem } from '../../lib/supabase';

interface MenuItemCardProps {
  item: MenuItem;
  quantity: number;
  onQuantityChange: (itemId: string, newQuantity: number) => void;
}

export const MenuItemCard: React.FC<MenuItemCardProps> = ({ item, quantity, onQuantityChange }) => {
  // Fix: remove extra space in fallback URL
  const imageUrl = item.image_url ? decodeURIComponent(item.image_url) : '/images/food-placeholder.png';

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
    <div className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300">
      <div className="relative h-48 w-full overflow-hidden bg-gray-100">
        <img
          src={imageUrl}
          alt={item.name}
          className="absolute inset-0 w-full h-full object-cover"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            const currentSrc = target.src;

            // If the current src is not already the fallback, try the fallback
            if (!currentSrc.includes('food-placeholder.png')) {
              target.src = '/images/food-placeholder.png';
            } else {
              // If already showing fallback, try the other fallback
              target.src = 'https://placehold.co/600x400/e2e8f0/64748b?text=No+Image';
            }
          }}
        />
      </div>

      <div className="p-4">
        <h3 className="font-bold text-black text-lg leading-tight line-clamp-1">{item.name}</h3>

        {/* Unit price */}
        <p className="text-green-600 font-bold mt-1">₦{item.price.toLocaleString()}</p>

        {/* Quantity Controls */}
        <div className="flex items-center mt-3">
          <button
            onClick={handleDecrement}
            disabled={quantity === 0}
            className={`w-9 h-9 rounded-full flex items-center justify-center text-lg font-bold transition-all duration-200 ${quantity === 0
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-gray-200 text-black hover:bg-gray-300 active:scale-95'
              }`}
            aria-label="Decrease quantity"
          >
            –
          </button>

          <span className="mx-4 text-lg font-bold min-w-[24px] text-center text-black">
            {quantity}
          </span>

          <button
            onClick={handleIncrement}
            className="w-9 h-9 rounded-full bg-green-600 text-white flex items-center justify-center text-lg font-bold hover:bg-green-700 active:scale-95 transition-all duration-200"
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>

        {/* Total price when quantity > 0 */}
        {quantity > 0 && (
          <p className="text-gray-600 text-sm mt-2 leading-tight">
            ₦{item.price.toLocaleString()} × {quantity} ={' '}
            <span className="font-bold text-black">₦{totalPrice.toLocaleString()}</span>
          </p>
        )}
      </div>
    </div>
  );
};
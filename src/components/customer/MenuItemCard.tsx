import React, { useState } from 'react';
import { MenuItem } from '../../lib/supabase';
import { LazyImage } from '../shared/LazyImage';

interface MenuItemCardProps {
  item: MenuItem;
  quantity: number;
  onQuantityChange: (itemId: string, newQuantity: number) => void;
}

// Fallback image URL
const FALLBACK_IMAGE = '/images/1.jpg';
const PLACEHOLDER_IMAGE = 'https://placehold.co/600x400/e2e8f0/64748b?text=No+Image';

// Properly format the image URL to handle special characters and ensure validity
const getImageUrl = (imageUrl: string | null | undefined): string => {
  if (!imageUrl) return FALLBACK_IMAGE;

  try {
    // Check if it's already a full URL
    if (imageUrl.startsWith('http')) {
      // Supabase storage URLs don't include /public/ in the path
      // URL format: https://project.supabase.co/storage/v1/object/menu-images/filename
      return decodeURIComponent(imageUrl);
    }
    return imageUrl;
  } catch (error) {
    console.warn('Error processing image URL:', error);
    return FALLBACK_IMAGE;
  }
};

export const MenuItemCard: React.FC<MenuItemCardProps> = ({ item, quantity, onQuantityChange }) => {
  const [isAnimating, setIsAnimating] = useState<'increment' | 'decrement' | null>(null);
  const imageUrl = getImageUrl(item.image_url);

  const handleIncrement = () => {
    setIsAnimating('increment');
    onQuantityChange(item.id, quantity + 1);
    setTimeout(() => setIsAnimating(null), 200);
  };

  const handleDecrement = () => {
    if (quantity > 0) {
      setIsAnimating('decrement');
      onQuantityChange(item.id, quantity - 1);
      setTimeout(() => setIsAnimating(null), 200);
    }
  };

  const totalPrice = item.price * quantity;

  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300">
      {/* Image with Lazy Loading */}
      <div className="relative h-48 w-full overflow-hidden bg-gray-100">
        <LazyImage
          src={imageUrl}
          alt={item.name}
          aspectRatio="16/9"
          objectFit="cover"
        />

        {/* Quantity Badge Overlay */}
        {quantity > 0 && (
          <div className="absolute top-3 right-3 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg">
            {quantity} in cart
          </div>
        )}
      </div>

      <div className="p-4">
        {/* Item Name */}
        <h3 className="font-bold text-black text-lg leading-tight line-clamp-1">{item.name}</h3>

        {/* Unit Price */}
        <p className="text-orange-600 font-bold text-xl mt-1">₦{item.price.toLocaleString()}</p>

        {/* Quantity Controls */}
        <div className="flex items-center mt-4">
          <button
            onClick={handleDecrement}
            disabled={quantity === 0}
            className={`relative w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold transition-all duration-200 ${quantity === 0
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-gray-200 text-black hover:bg-gray-300 active:scale-95'
              }`}
            aria-label="Decrease quantity"
          >
            <span className={isAnimating === 'decrement' ? 'scale-75' : ''}>–</span>
          </button>

          <span
            className={`mx-4 text-xl font-bold min-w-[32px] text-center text-black transition-transform duration-200 ${isAnimating ? 'scale-125 text-orange-500' : ''
              }`}
          >
            {quantity}
          </span>

          <button
            onClick={handleIncrement}
            className="w-10 h-10 rounded-full bg-orange-500 text-white flex items-center justify-center text-xl font-bold hover:bg-orange-600 active:scale-95 transition-all duration-200 shadow-lg hover:shadow-orange-500/30"
            aria-label="Increase quantity"
          >
            <span className={isAnimating === 'increment' ? 'scale-75' : ''}>+</span>
          </button>
        </div>

        {/* Total Price */}
        {quantity > 0 && (
          <div className="mt-3 bg-orange-50 rounded-lg p-3">
            <p className="text-gray-700 text-sm">
              <span className="font-medium">₦{item.price.toLocaleString()}</span> × {quantity} ={' '}
              <span className="font-bold text-black text-lg">₦{totalPrice.toLocaleString()}</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

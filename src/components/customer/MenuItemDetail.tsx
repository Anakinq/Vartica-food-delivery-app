import React, { useState, useEffect } from 'react';
import { MenuItem } from '../../lib/supabase';
import { supabase } from '../../lib/supabase';

interface MenuItemDetailProps {
  item: MenuItem;
  onBack: () => void;
  onAddToCart: (item: MenuItem, quantity: number) => void;
}

export const MenuItemDetail: React.FC<MenuItemDetailProps> = ({
  item,
  onBack,
  onAddToCart
}) => {
  const [quantity, setQuantity] = useState(1);
  const [recommendedSides, setRecommendedSides] = useState<MenuItem[]>([]);
  const [loadingSides, setLoadingSides] = useState(true);

  // Fetch recommended sides (same seller, different category, available)
  useEffect(() => {
    const fetchSides = async () => {
      if (!item.seller_id) return;

      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('seller_id', item.seller_id)
        .neq('id', item.id)
        .eq('is_available', true)
        .not('category', 'is', null)
        .neq('category', item.category || '')
        .limit(3);

      if (!error) {
        setRecommendedSides(data || []);
      }
      setLoadingSides(false);
    };

    fetchSides();
  }, [item]);

  const handleAddToCart = () => {
    onAddToCart(item, quantity);
  };

  const imageUrl = item.image_url ? decodeURIComponent(item.image_url) : '/images/1.jpg';

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="flex items-center px-4 pt-4">
        <button
          onClick={onBack}
          className="p-2 mr-3 text-gray-600 hover:bg-gray-100 rounded-full"
        >
          ←
        </button>
        <h1 className="text-xl font-bold text-gray-900 flex-1">Menu</h1>
        <div className="text-xl">🛒</div>
      </div>

      {/* Product Image */}
      <div className="px-4 mt-2">
        <div className="h-64 rounded-xl overflow-hidden bg-gray-100">
          <img
            src={imageUrl}
            alt={item.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              const currentSrc = target.src;

              // If the current src is not already the fallback, try the fallback
              if (!currentSrc.includes('placehold.co')) {
                target.src = 'https://placehold.co/600x400/e2e8f0/64748b?text=Image+Error';
              } else {
                // If already showing fallback, try the local fallback
                target.src = '/images/1.jpg';
              }
            }}
          />
        </div>
      </div>

      {/* Product Info */}
      <div className="px-4 mt-4">
        <h2 className="text-2xl font-bold text-gray-900">{item.name}</h2>

        {/* Rating (mocked) */}
        <div className="flex items-center mt-1">
          <div className="flex text-yellow-400">⭐⭐⭐⭐☆</div>
          <span className="text-sm text-gray-500 ml-2">(99 ratings)</span>
        </div>

        <div className="text-2xl font-bold text-blue-600 mt-2">
          ₦{item.price.toLocaleString()}
        </div>

        {/* Quantity Selector */}
        <div className="flex items-center mt-4">
          <button
            onClick={() => setQuantity(q => Math.max(1, q - 1))}
            className="w-10 h-10 flex items-center justify-center bg-gray-100 rounded-full text-lg"
          >
            -
          </button>
          <span className="mx-4 text-lg font-medium">{quantity}</span>
          <button
            onClick={() => setQuantity(q => q + 1)}
            className="w-10 h-10 flex items-center justify-center bg-gray-100 rounded-full text-lg"
          >
            +
          </button>
        </div>

        {/* Description */}
        <div className="mt-6">
          <h3 className="font-bold text-gray-900">Description</h3>
          <p className="text-gray-600 mt-2 leading-relaxed">
            {item.description || 'Delicious meal prepared with fresh ingredients.'}
          </p>
        </div>

        {/* Recommended Sides */}
        {recommendedSides.length > 0 && (
          <div className="mt-6">
            <h3 className="font-bold text-gray-900">Recommended sides</h3>
            <div className="grid grid-cols-3 gap-3 mt-3">
              {recommendedSides.map(side => (
                <div key={side.id} className="bg-gray-50 rounded-lg p-2 text-center">
                  <div className="h-16 w-full rounded-md bg-gray-200 overflow-hidden mb-2">
                    <img
                      src={side.image_url ? decodeURIComponent(side.image_url) : '/images/1.jpg'}
                      alt={side.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = '/images/1.jpg';
                      }}
                    />
                  </div>
                  <p className="text-xs font-medium text-gray-800 line-clamp-1">{side.name}</p>
                  <p className="text-xs text-blue-600 font-bold">₦{side.price.toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Fixed Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 flex justify-between items-center max-w-md mx-auto">
        <div className="font-bold text-lg">
          Total: ₦{(item.price * quantity).toLocaleString()}
        </div>
        <button
          onClick={handleAddToCart}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold flex items-center"
        >
          🛒 Add to Cart
        </button>
      </div>
    </div>
  );
};
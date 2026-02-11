import React, { useState, useEffect } from 'react';
import { MenuItem } from '../../lib/supabase';
import { supabase } from '../../lib/supabase';
import { LazyImage } from '../common/LazyImage';
import { X, Star } from 'lucide-react';
import { ReviewModal } from '../shared/ReviewModal';
import { VendorReviewService } from '../../services/supabase/vendor.service';

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
  const [vendorRating, setVendorRating] = useState<number>(0);
  const [reviewCount, setReviewCount] = useState<number>(0);
  const [showReviewModal, setShowReviewModal] = useState(false);

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

  // Fetch vendor rating
  useEffect(() => {
    const fetchVendorRating = async () => {
      if (!item.seller_id) return;

      const [avgRating, count] = await Promise.all([
        VendorReviewService.getVendorAverageRating(item.seller_id),
        VendorReviewService.getVendorReviewCount(item.seller_id)
      ]);

      setVendorRating(avgRating);
      setReviewCount(count);
    };

    fetchVendorRating();
  }, [item.seller_id]);

  const handleAddToCart = () => {
    onAddToCart(item, quantity);
  };

  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Star
          key={i}
          className={`h-4 w-4 ${i <= Math.round(rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
        />
      );
    }
    return stars;
  };

  const imageUrl = item.image_url ? decodeURIComponent(item.image_url) : '/images/1.jpg';

  return (
    <>
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
          <button
            onClick={() => setShowReviewModal(true)}
            className="p-2 text-purple-600 hover:bg-purple-50 rounded-full"
            title="Rate this vendor"
          >
            <Star className="h-5 w-5" />
          </button>
        </div>

        {/* Product Image */}
        <div className="px-4 mt-2">
          <div className="h-64 rounded-xl overflow-hidden bg-gray-100">
            <LazyImage
              src={imageUrl}
              alt={item.name}
              className="w-full h-full object-cover"
              placeholder={imageUrl}
            />
          </div>
        </div>

        {/* Product Info */}
        <div className="px-4 mt-4">
          <h2 className="text-2xl font-bold text-gray-900">{item.name}</h2>

          {/* Rating - Real data */}
          <div className="flex items-center mt-2">
            <div className="flex items-center">
              {renderStars(vendorRating)}
            </div>
            <span className="text-sm text-gray-500 ml-2">
              {vendorRating > 0 ? vendorRating.toFixed(1) : 'No ratings'} ({reviewCount} reviews)
            </span>
          </div>

          <div className="text-2xl font-bold text-blue-600 mt-2">
            ₦{item.price.toLocaleString()}
          </div>

          {/* Out of Stock Badge */}
          {!item.is_available && (
            <div className="mt-3 inline-flex items-center px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
              <X className="h-4 w-4 mr-1" />
              Out of Stock
            </div>
          )}

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
            disabled={!item.is_available}
            className={`${item.is_available
              ? 'bg-blue-600 hover:bg-blue-700'
              : 'bg-gray-400 cursor-not-allowed'
              } text-white px-6 py-3 rounded-lg font-semibold flex items-center`}
          >
            {item.is_available ? '🛒 Add to Cart' : '❌ Out of Stock'}
          </button>
        </div>
      </div>

      {/* Review Modal */}
      {showReviewModal && item.seller_id && (
        <ReviewModal
          vendorId={item.seller_id}
          onClose={() => setShowReviewModal(false)}
          onSubmit={() => {
            // Refresh rating after submitting review
            VendorReviewService.getVendorAverageRating(item.seller_id!).then(setVendorRating);
            VendorReviewService.getVendorReviewCount(item.seller_id!).then(setReviewCount);
          }}
        />
      )}
    </>
  );
};
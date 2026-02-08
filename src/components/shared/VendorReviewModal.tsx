import React, { useState, useEffect } from 'react';
import { X, Star } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { VendorReviewService } from '../../services/supabase/vendor.service';
import { supabase } from '../../lib/supabase/client';

interface VendorReviewModalProps {
    orderId: string;
    vendorId: string;
    onClose: () => void;
}

export const VendorReviewModal: React.FC<VendorReviewModalProps> = ({
    orderId,
    vendorId,
    onClose
}) => {
    const { user } = useAuth();
    const { success: showSuccess, error: showError } = useToast();
    const [rating, setRating] = useState(0);
    const [hover, setHover] = useState(0);
    const [reviewText, setReviewText] = useState('');
    const [loading, setLoading] = useState(false);
    const [hasReviewed, setHasReviewed] = useState(false);
    const [existingReview, setExistingReview] = useState<any>(null);

    useEffect(() => {
        checkExistingReview();
    }, []);

    const checkExistingReview = async () => {
        if (!user) return;

        try {
            const hasReview = await VendorReviewService.hasCustomerReviewedOrder(user.id, orderId);
            if (hasReview) {
                setHasReviewed(true);
                // Fetch existing review
                const { data, error } = await supabase
                    .from('vendor_reviews')
                    .select('*')
                    .eq('customer_id', user.id)
                    .eq('order_id', orderId)
                    .maybeSingle();

                if (data && !error) {
                    setExistingReview(data);
                    setRating(data.rating);
                    setReviewText(data.review_text || '');
                }
            }
        } catch (error) {
            console.error('Error checking existing review:', error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || rating === 0) return;

        setLoading(true);

        try {
            if (hasReviewed && existingReview) {
                // Update existing review
                const success = await VendorReviewService.updateReview(existingReview.id, {
                    rating,
                    review_text: reviewText
                });

                if (success) {
                    showSuccess('Review updated successfully!');
                    onClose();
                } else {
                    showError('Failed to update review. Please try again.');
                }
            } else {
                // Create new review
                const review = await VendorReviewService.createReview({
                    vendor_id: vendorId,
                    customer_id: user.id,
                    order_id: orderId,
                    rating,
                    review_text: reviewText
                });

                if (review) {
                    showSuccess('Review submitted successfully!');
                    onClose();
                } else {
                    showError('Failed to submit review. Please try again.');
                }
            }
        } catch (error) {
            console.error('Error submitting review:', error);
            showError('An error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!existingReview) return;

        if (window.confirm('Are you sure you want to delete this review?')) {
            try {
                const success = await VendorReviewService.deleteReview(existingReview.id);
                if (success) {
                    showSuccess('Review deleted successfully!');
                    onClose();
                } else {
                    showError('Failed to delete review. Please try again.');
                }
            } catch (error) {
                console.error('Error deleting review:', error);
                showError('An error occurred. Please try again.');
            }
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full">
                <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-gray-900">
                            {hasReviewed ? 'Update Your Review' : 'Rate This Vendor'}
                        </h2>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-full hover:bg-gray-100"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-3">
                                Your Rating
                            </label>
                            <div className="flex items-center">
                                {[...Array(5)].map((_, index) => {
                                    const ratingValue = index + 1;
                                    return (
                                        <button
                                            key={ratingValue}
                                            type="button"
                                            onClick={() => setRating(ratingValue)}
                                            onMouseEnter={() => setHover(ratingValue)}
                                            onMouseLeave={() => setHover(0)}
                                            className="p-1"
                                        >
                                            <Star
                                                className={`w-8 h-8 ${ratingValue <= (hover || rating)
                                                    ? 'text-yellow-400 fill-current'
                                                    : 'text-gray-300'
                                                    }`}
                                            />
                                        </button>
                                    );
                                })}
                                <span className="ml-3 text-gray-600">
                                    {rating > 0 ? `${rating} star${rating !== 1 ? 's' : ''}` : 'Select rating'}
                                </span>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Your Review (Optional)
                            </label>
                            <textarea
                                value={reviewText}
                                onChange={(e) => setReviewText(e.target.value)}
                                rows={4}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                placeholder="Share your experience with this vendor..."
                            />
                        </div>

                        <div className="flex space-x-3 pt-4">
                            {hasReviewed && existingReview && (
                                <button
                                    type="button"
                                    onClick={handleDelete}
                                    disabled={loading}
                                    className="px-6 py-3 border border-red-300 text-red-600 rounded-lg font-medium hover:bg-red-50 disabled:opacity-50"
                                >
                                    Delete Review
                                </button>
                            )}

                            <button
                                type="button"
                                onClick={onClose}
                                disabled={loading}
                                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50"
                            >
                                Cancel
                            </button>

                            <button
                                type="submit"
                                disabled={loading || rating === 0}
                                className="px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 flex items-center space-x-2"
                            >
                                <span>{loading ? 'Submitting...' : (hasReviewed ? 'Update Review' : 'Submit Review')}</span>
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};
import React, { useState } from 'react';
import { X, Star } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { VendorReviewService } from '../../services/supabase/vendor.service';

interface ReviewModalProps {
    vendorId: string;
    orderId?: string;
    onClose: () => void;
    onSubmit?: () => void;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
    vendorId,
    orderId,
    onClose,
    onSubmit
}) => {
    const { profile } = useAuth();
    const { showToast } = useToast();
    const [rating, setRating] = useState(5);
    const [reviewText, setReviewText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!profile) {
            showToast({ type: 'error', message: 'Please sign in to leave a review' });
            return;
        }

        if (rating < 1) {
            showToast({ type: 'error', message: 'Please select a rating' });
            return;
        }

        setIsSubmitting(true);

        try {
            const result = await VendorReviewService.createReview({
                vendor_id: vendorId,
                customer_id: profile.id,
                order_id: orderId || '',
                rating,
                review_text: reviewText.trim() || undefined
            });

            if (result) {
                showToast({ type: 'success', message: 'Review submitted successfully!' });
                onSubmit?.();
                onClose();
            } else {
                showToast({ type: 'error', message: 'Failed to submit review' });
            }
        } catch (error) {
            console.error('Error submitting review:', error);
            showToast({ type: 'error', message: 'Failed to submit review' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-900">Rate Your Experience</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="space-y-6">
                    {/* Rating Stars */}
                    <div className="text-center">
                        <p className="text-sm text-gray-600 mb-3">How was your experience?</p>
                        <div className="flex justify-center gap-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    onClick={() => setRating(star)}
                                    className={`p-1 transition-transform hover:scale-110 ${rating >= star ? 'text-yellow-400' : 'text-gray-300'
                                        }`}
                                >
                                    <Star
                                        className={`h-10 w-10 ${rating >= star ? 'fill-current' : ''}`}
                                    />
                                </button>
                            ))}
                        </div>
                        <p className="text-sm text-gray-500 mt-2">
                            {rating === 5 ? 'Excellent!' : rating === 4 ? 'Good' : rating === 3 ? 'Average' : rating === 2 ? 'Poor' : 'Terrible'}
                        </p>
                    </div>

                    {/* Review Text */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Your Review (optional)
                        </label>
                        <textarea
                            value={reviewText}
                            onChange={(e) => setReviewText(e.target.value)}
                            placeholder="Tell us about your experience..."
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                            rows={4}
                        />
                    </div>

                    {/* Submit Button */}
                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={onClose}
                            className="flex-1 py-3 px-4 border border-gray-300 rounded-lg font-medium hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="flex-1 py-3 px-4 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                                    Submitting...
                                </>
                            ) : (
                                <>
                                    <Star className="h-4 w-4" />
                                    Submit Review
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

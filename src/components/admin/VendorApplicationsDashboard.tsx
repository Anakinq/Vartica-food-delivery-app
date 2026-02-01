// src/components/admin/VendorApplicationsDashboard.tsx
import React, { useEffect, useState } from 'react';
import { Check, X, Clock, AlertCircle, User, Store } from 'lucide-react';
import { supabase } from '../../lib/supabase/client';

interface VendorApplication {
    id: string;
    user_id: string;
    store_name: string;
    description: string;
    vendor_type: string;
    matric_number?: string;
    department?: string;
    available_from?: string;
    available_until?: string;
    delivery_option: string;
    application_status: string;
    application_submitted_at: string;
    application_reviewed_at?: string;
    rejection_reason?: string;
    user_email: string;
    user_full_name: string;
}

export const VendorApplicationsDashboard: React.FC = () => {
    const [applications, setApplications] = useState<VendorApplication[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState<string | null>(null);

    useEffect(() => {
        fetchApplications();
    }, []);

    const fetchApplications = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('vendors')
                .select(`
          *,
          profile:profiles(id, email, full_name)
        `)
                .order('application_submitted_at', { ascending: false });

            if (error) throw error;

            const enrichedData = data?.map(vendor => ({
                ...vendor,
                user_email: vendor.profile?.email || 'Unknown',
                user_full_name: vendor.profile?.full_name || 'Unknown'
            })) || [];

            setApplications(enrichedData);
        } catch (err) {
            console.error('Error fetching applications:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleReview = async (vendorId: string, action: 'approve' | 'reject', reason?: string) => {
        setProcessing(vendorId);
        try {
            // Get current user ID for reviewer identification
            const { data: { user } } = await supabase.auth.getUser();

            // Call the actual RPC function to update the database
            const { data, error } = await supabase.rpc('review_vendor_application', {
                p_vendor_id: vendorId,
                p_action: action,
                p_reviewer_id: user?.id,
                p_rejection_reason: reason || null
            });

            if (error) throw new Error(error.message);

            if (data && !data.success) {
                throw new Error(data.error);
            }

            // Update local state to reflect the change
            setApplications(prev => prev.map(app =>
                app.id === vendorId
                    ? {
                        ...app,
                        application_status: action === 'approve' ? 'approved' : 'rejected',
                        application_reviewed_at: new Date().toISOString(),
                        rejection_reason: action === 'reject' ? reason : undefined
                    }
                    : app
            ));

            // Show success message
            alert(`${action === 'approve' ? 'Approved' : 'Rejected'} vendor application successfully!`);

        } catch (err) {
            console.error('Error reviewing application:', err);
            alert(`Error: ${(err as Error).message}`);
        } finally {
            setProcessing(null);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending':
                return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">Pending</span>;
            case 'approved':
                return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">Approved</span>;
            case 'rejected':
                return <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">Rejected</span>;
            default:
                return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">Unknown</span>;
        }
    };

    if (loading) {
        return (
            <div className="p-6">
                <div className="animate-pulse space-y-4">
                    <div className="h-8 bg-gray-200 rounded w-1/3"></div>
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="border border-gray-200 rounded-lg p-4">
                            <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Vendor Applications</h1>
                <p className="text-gray-600 mt-1">Review and manage vendor applications</p>
            </div>

            {applications.length === 0 ? (
                <div className="text-center py-12">
                    <Store className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-1">No Applications</h3>
                    <p className="text-gray-500">There are no vendor applications to review.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {applications.map(application => (
                        <div key={application.id} className="border border-gray-200 rounded-lg p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <div className="flex items-center space-x-3 mb-2">
                                        <h3 className="text-lg font-semibold text-gray-900">{application.store_name}</h3>
                                        {getStatusBadge(application.application_status)}
                                    </div>
                                    <p className="text-gray-600 text-sm mb-1">
                                        <User className="h-4 w-4 inline mr-1" />
                                        {application.user_full_name} ({application.user_email})
                                    </p>
                                    <p className="text-gray-500 text-sm">
                                        Submitted: {new Date(application.application_submitted_at).toLocaleDateString()}
                                    </p>
                                </div>

                                {application.application_status === 'pending' && (
                                    <div className="flex space-x-2">
                                        <button
                                            onClick={() => handleReview(application.id, 'approve')}
                                            disabled={processing === application.id}
                                            className="flex items-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                                        >
                                            {processing === application.id ? (
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                            ) : (
                                                <Check className="h-4 w-4 mr-2" />
                                            )}
                                            Approve
                                        </button>
                                        <button
                                            onClick={() => {
                                                const reason = prompt('Enter rejection reason:');
                                                if (reason) {
                                                    handleReview(application.id, 'reject', reason);
                                                }
                                            }}
                                            disabled={processing === application.id}
                                            className="flex items-center px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                                        >
                                            {processing === application.id ? (
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                            ) : (
                                                <X className="h-4 w-4 mr-2" />
                                            )}
                                            Reject
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div>
                                    <h4 className="font-medium text-gray-700 mb-2">Business Details</h4>
                                    <p className="text-sm text-gray-600 mb-1"><span className="font-medium">Type:</span> {application.vendor_type}</p>
                                    <p className="text-sm text-gray-600 mb-1"><span className="font-medium">Delivery:</span> {application.delivery_option.replace('_', ' ')}</p>
                                    {application.vendor_type === 'student' && (
                                        <>
                                            <p className="text-sm text-gray-600 mb-1"><span className="font-medium">Matric:</span> {application.matric_number}</p>
                                            <p className="text-sm text-gray-600"><span className="font-medium">Department:</span> {application.department}</p>
                                        </>
                                    )}
                                    {application.vendor_type === 'late_night' && (
                                        <>
                                            <p className="text-sm text-gray-600 mb-1"><span className="font-medium">Hours:</span> {application.available_from} - {application.available_until}</p>
                                        </>
                                    )}
                                </div>

                                <div>
                                    <h4 className="font-medium text-gray-700 mb-2">Description</h4>
                                    <p className="text-sm text-gray-600">{application.description}</p>
                                </div>
                            </div>

                            {application.application_status === 'rejected' && application.rejection_reason && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                    <div className="flex items-start">
                                        <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
                                        <div>
                                            <h4 className="font-medium text-red-900 mb-1">Rejection Reason</h4>
                                            <p className="text-sm text-red-700">{application.rejection_reason}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {application.application_reviewed_at && (
                                <p className="text-sm text-gray-500">
                                    <Clock className="h-4 w-4 inline mr-1" />
                                    Reviewed on {new Date(application.application_reviewed_at).toLocaleDateString()}
                                </p>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
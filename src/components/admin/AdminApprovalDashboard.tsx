import React, { useState, useEffect } from 'react';
import { User, Check, X, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { databaseService } from '../../services';

interface ApprovalRequest {
  id: string;
  email: string;
  full_name: string;
  role: 'vendor' | 'delivery_agent';
  created_at: string;
  vendor_approved?: boolean | null;
  delivery_approved?: boolean | null;
}

export const AdminApprovalDashboard: React.FC = () => {
  const { user } = useAuth();
  const [approvalRequests, setApprovalRequests] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchApprovalRequests();
    }
  }, [user]);

  const fetchApprovalRequests = async () => {
    try {
      setLoading(true);
      const result = await databaseService.getPendingApprovals();
      if (result.data) {
        setApprovalRequests(result.data as ApprovalRequest[]);
      }
    } catch (error) {
      console.error('Error fetching approval requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (userId: string, role: 'vendor' | 'delivery_agent', approved: boolean) => {
    try {
      setApprovingId(userId);
      const result = await databaseService.updateApproval(userId, role, approved, user?.id);
      if (result.success) {
        // Refresh the list after successful approval
        fetchApprovalRequests();
      } else {
        throw new Error(result.error?.message || 'Failed to update approval');
      }
    } catch (error: any) {
      console.error('Error updating approval:', error);
      alert(`Failed to ${approved ? 'approve' : 'reject'} ${role}: ${error.message || 'An error occurred'}`);
      // Refresh the list to ensure UI consistency
      fetchApprovalRequests();
    } finally {
      setApprovingId(null);
    }
  };

  if (!user) {
    return <div>Please sign in to access admin features</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Approval Requests</h1>
        <p className="text-gray-600">Manage pending vendor and delivery agent registrations</p>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
        </div>
      ) : (
        <div className="space-y-6">
          {approvalRequests.length === 0 ? (
            <div className="text-center py-12">
              <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">No pending requests</h3>
              <p className="text-gray-500">There are no pending approval requests at this time.</p>
            </div>
          ) : (
            approvalRequests.map((request) => {
              const isPending = request.role === 'vendor'
                ? request.vendor_approved === null
                : request.delivery_approved === null;

              return (
                <div
                  key={request.id}
                  className="bg-white rounded-xl shadow-md p-6 border border-gray-200"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-bold">
                          {request.full_name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900">{request.full_name}</h3>
                          <p className="text-gray-600 text-sm">{request.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span className="px-2 py-1 bg-gray-100 rounded-full capitalize">
                          {request.role.replace('_', ' ')}
                        </span>
                        <span></span>
                        <span>{new Date(request.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {isPending && (
                      <div className="flex gap-2 min-w-max">
                        <button
                          onClick={() => handleApproval(request.id, request.role as 'vendor' | 'delivery_agent', true)}
                          disabled={approvingId === request.id}
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {approvingId === request.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Check className="h-4 w-4" />
                              Approve
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => handleApproval(request.id, request.role as 'vendor' | 'delivery_agent', false)}
                          disabled={approvingId === request.id}
                          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {approvingId === request.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <X className="h-4 w-4" />
                              Reject
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {!isPending && (
                      <div className="text-sm font-medium px-3 py-1 rounded-full bg-gray-100 text-gray-800">
                        {request.role === 'vendor'
                          ? request.vendor_approved ? 'Approved' : 'Rejected'
                          : request.delivery_approved ? 'Approved' : 'Rejected'
                        }
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
// src/components/shared/RoleSwitcher.tsx
import React, { useState } from 'react';
import { User, Store, ArrowLeftRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase/client';

interface RoleSwitcherProps {
    currentRole: 'customer' | 'vendor' | 'late_night_vendor' | 'cafeteria' | 'delivery_agent' | 'admin';
    onRoleSwitch: (newRole: 'customer' | 'vendor') => void;
}

export const RoleSwitcher: React.FC<RoleSwitcherProps> = ({
    currentRole,
    onRoleSwitch
}) => {
    const { profile, refreshProfile } = useAuth();
    const [isSwitching, setIsSwitching] = useState(false);
    const [showConfirmation, setShowConfirmation] = useState(false);

    // Check if user has both customer and vendor capabilities
    const canSwitchRoles = profile &&
        (['customer', 'vendor', 'late_night_vendor'].includes(profile.role)) &&
        // User must have a vendor record to switch to vendor view
        (currentRole === 'customer' ?
            // Check if user has vendor application/approval
            true : // For now, assume they can switch back to customer
            true);

    const handleRoleSwitch = async () => {
        if (!profile || !canSwitchRoles) return;

        setIsSwitching(true);
        try {
            // For this implementation, we'll use a temporary session-based approach
            // In a real app, you might want to store this preference in the database
            const newRole = currentRole === 'customer' ? 'vendor' : 'customer';

            // Store the preferred role in sessionStorage
            sessionStorage.setItem('preferredRole', newRole);

            // Trigger the role switch callback
            onRoleSwitch(newRole as 'customer' | 'vendor');

            // Close confirmation dialog
            setShowConfirmation(false);

        } catch (error) {
            console.error('Error switching roles:', error);
            alert('Failed to switch roles. Please try again.');
        } finally {
            setIsSwitching(false);
        }
    };

    const getRoleDisplayInfo = (role: string) => {
        switch (role) {
            case 'customer':
                return {
                    icon: User,
                    label: 'Customer View',
                    description: 'Browse and order food'
                };
            case 'vendor':
            case 'late_night_vendor':
                return {
                    icon: Store,
                    label: 'Vendor View',
                    description: 'Manage your store and orders'
                };
            default:
                return {
                    icon: User,
                    label: 'Customer View',
                    description: 'Browse and order food'
                };
        }
    };

    const currentRoleInfo = getRoleDisplayInfo(currentRole);
    const targetRole = currentRole === 'customer' ? 'vendor' : 'customer';
    const targetRoleInfo = getRoleDisplayInfo(targetRole);

    if (!canSwitchRoles) {
        return null;
    }

    return (
        <div className="fixed top-20 right-4 z-50">
            {/* Main switcher button */}
            <button
                onClick={() => setShowConfirmation(true)}
                disabled={isSwitching}
                className="flex items-center space-x-2 bg-white border border-gray-200 rounded-lg px-4 py-2 shadow-lg hover:shadow-xl transition-all duration-200 hover:border-blue-300 disabled:opacity-50"
                aria-label="Switch between customer and vendor views"
            >
                <ArrowLeftRight className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">
                    Switch to {targetRoleInfo.label}
                </span>
            </button>

            {/* Confirmation Modal */}
            {showConfirmation && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <ArrowLeftRight className="h-8 w-8 text-blue-600" />
                            </div>

                            <h3 className="text-xl font-bold text-gray-900 mb-2">
                                Switch Roles?
                            </h3>

                            <div className="space-y-4 mb-6">
                                <div className="text-left p-3 bg-gray-50 rounded-lg">
                                    <div className="flex items-center space-x-2 mb-1">
                                        {React.createElement(currentRoleInfo.icon, { className: "h-4 w-4 text-gray-600" })}
                                        <span className="font-medium text-gray-900">{currentRoleInfo.label}</span>
                                    </div>
                                    <p className="text-sm text-gray-600">{currentRoleInfo.description}</p>
                                </div>

                                <div className="flex justify-center">
                                    <ArrowLeftRight className="h-5 w-5 text-gray-400" />
                                </div>

                                <div className="text-left p-3 bg-blue-50 rounded-lg border border-blue-100">
                                    <div className="flex items-center space-x-2 mb-1">
                                        {React.createElement(targetRoleInfo.icon, { className: "h-4 w-4 text-blue-600" })}
                                        <span className="font-medium text-blue-900">{targetRoleInfo.label}</span>
                                    </div>
                                    <p className="text-sm text-blue-700">{targetRoleInfo.description}</p>
                                </div>
                            </div>

                            <div className="flex space-x-3">
                                <button
                                    onClick={() => setShowConfirmation(false)}
                                    className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleRoleSwitch}
                                    disabled={isSwitching}
                                    className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50 flex items-center justify-center"
                                >
                                    {isSwitching ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                            Switching...
                                        </>
                                    ) : (
                                        'Confirm Switch'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
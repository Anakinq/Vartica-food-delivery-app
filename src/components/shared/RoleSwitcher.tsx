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
    // User can switch TO vendor view if:
    // 1. They have a profile
    // 2. Their role includes vendor capability
    // 3. They have an approved vendor record OR their role is 'vendor' (pending approval)
    const canSwitchToVendor = profile &&
        (['customer', 'vendor', 'late_night_vendor'].includes(profile.role)) &&
        // Check if vendor record exists (vendor_id is present or role is vendor with no vendor_id)
        (profile.vendor_id || profile.role === 'vendor' || profile.role === 'late_night_vendor');

    // User can switch TO customer view if:
    // 1. They have a profile
    // 2. Their current role is vendor (with or without vendor record)
    const canSwitchToCustomer = profile &&
        (currentRole === 'vendor' || currentRole === 'late_night_vendor');

    // Can switch if switching to a valid role for this user
    const canSwitchRoles = currentRole === 'customer' ? canSwitchToVendor : canSwitchToCustomer;

    const handleRoleSwitch = async () => {
        console.log('[RoleSwitch] Starting switch...');
        console.log('[RoleSwitch] Current profile:', profile);
        console.log('[RoleSwitch] Current role:', currentRole);
        console.log('[RoleSwitch] Has vendor_id:', profile?.vendor_id);
        console.log('[RoleSwitch] Profile role:', profile?.role);

        if (!profile) {
            console.error('[RoleSwitch] ERROR: No profile found!');
            alert('Please sign in to switch roles.');
            return;
        }

        setIsSwitching(true);
        try {
            const newRole = currentRole === 'customer' ? 'vendor' : 'customer';
            console.log('[RoleSwitch] Switching to role:', newRole);

            // Store the preferred role in sessionStorage
            sessionStorage.setItem('preferredRole', newRole);

            // If switching to customer and no vendor record exists, clear any vendor-related state
            if (newRole === 'customer' && !profile.vendor_id) {
                console.log('[RoleSwitch] No vendor record exists, clearing vendor state...');
            }

            // Trigger the role switch callback
            onRoleSwitch(newRole as 'customer' | 'vendor');

            // Refresh profile to ensure we have latest data
            await refreshProfile();
            console.log('[RoleSwitch] Profile refreshed, new state:', profile);

            // Close confirmation dialog
            setShowConfirmation(false);
            console.log('[RoleSwitch] Switch completed successfully!');

        } catch (error) {
            console.error('[RoleSwitch] Error during switch:', error);
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

    // Determine if switch is allowed
    const isSwitchAllowed = currentRole === 'customer' ? canSwitchToVendor : canSwitchToCustomer;

    // Show warning if no vendor record exists
    const showNoVendorWarning = currentRole === 'customer' &&
        profile &&
        !profile.vendor_id &&
        (profile.role === 'vendor' || profile.role === 'late_night_vendor');

    if (!isSwitchAllowed) {
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
                                {/* Warning if no vendor record exists */}
                                {showNoVendorWarning && (
                                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                        <p className="text-sm text-yellow-800">
                                            <strong>Note:</strong> You don't have an approved vendor record yet.
                                            You'll be able to browse as a customer but not access vendor features.
                                        </p>
                                    </div>
                                )}

                                {/* Customer view */}
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

                                {/* Target view */}
                                <div className={`text-left p-3 rounded-lg border ${targetRole === 'vendor' && !canSwitchToVendor
                                        ? 'bg-red-50 border-red-200'
                                        : 'bg-blue-50 border-blue-100'
                                    }`}>
                                    <div className="flex items-center space-x-2 mb-1">
                                        {React.createElement(targetRoleInfo.icon, {
                                            className: `h-4 w-4 ${targetRole === 'vendor' && !canSwitchToVendor ? 'text-red-600' : 'text-blue-600'}`
                                        })}
                                        <span className={`font-medium ${targetRole === 'vendor' && !canSwitchToVendor
                                                ? 'text-red-900'
                                                : 'text-blue-900'
                                            }`}>
                                            {targetRole === 'vendor' && !canSwitchToVendor
                                                ? 'Cannot Switch to Vendor'
                                                : targetRoleInfo.label}
                                        </span>
                                    </div>
                                    <p className={`text-sm ${targetRole === 'vendor' && !canSwitchToVendor
                                            ? 'text-red-700'
                                            : 'text-blue-700'
                                        }`}>
                                        {targetRole === 'vendor' && !canSwitchToVendor
                                            ? 'No vendor record linked to this account'
                                            : targetRoleInfo.description}
                                    </p>
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
                                    disabled={isSwitching || (targetRole === 'vendor' && !canSwitchToVendor)}
                                    className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center ${targetRole === 'vendor' && !canSwitchToVendor
                                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                            : 'bg-blue-600 text-white hover:bg-blue-700'
                                        }`}
                                >
                                    {isSwitching ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                            Switching...
                                        </>
                                    ) : (
                                        targetRole === 'vendor' && !canSwitchToVendor
                                            ? 'Vendor Record Required'
                                            : 'Confirm Switch'
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
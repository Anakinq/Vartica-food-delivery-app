// src/components/shared/RoleSwitcher.tsx
import React, { useState } from 'react';
import { User, Store, Truck, ArrowLeftRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { supabase } from '../../lib/supabase/client';

interface RoleSwitcherProps {
    currentRole: 'customer' | 'vendor' | 'late_night_vendor' | 'cafeteria' | 'delivery_agent' | 'admin';
    onRoleSwitch?: (newRole: 'customer' | 'vendor' | 'delivery_agent') => void;
    id?: string;
}

export const RoleSwitcher: React.FC<RoleSwitcherProps> = ({
    currentRole,
    onRoleSwitch,
    id
}) => {
    const { profile, refreshProfile, hasRole, getUserRoles } = useAuth();
    const { error: showError } = useToast();
    const [isSwitching, setIsSwitching] = useState(false);
    const [showConfirmation, setShowConfirmation] = useState(false);

    // Get the effective current role - use sessionStorage preferred role if set
    const getEffectiveCurrentRole = () => {
        const preferredRole = sessionStorage.getItem('preferredRole');
        if (preferredRole && ['customer', 'vendor', 'delivery_agent', 'cafeteria', 'late_night_vendor', 'admin'].includes(preferredRole)) {
            return preferredRole;
        }
        return currentRole;
    };

    const effectiveCurrentRole = getEffectiveCurrentRole();

    // Get available roles for this user
    const availableRoles = getUserRoles();

    // Check capabilities
    const canSwitchToVendor = hasRole('vendor');
    const canSwitchToDelivery = hasRole('delivery_agent');
    const canSwitchToCustomer = true; // Everyone can be a customer

    // Determine available target roles (exclude current effective role)
    const targetRoles = availableRoles.filter(role => role !== effectiveCurrentRole);

    const handleRoleSwitch = async (targetRole: 'customer' | 'vendor' | 'delivery_agent') => {
        if (!profile) {
            showError('Please sign in to switch roles.');
            return;
        }

        setIsSwitching(true);
        try {

            // Store the preferred role in sessionStorage
            sessionStorage.setItem('preferredRole', targetRole);

            // Update URL hash for routing without page reload
            switch (targetRole) {
                case 'vendor':
                    window.location.hash = '#/vendor';
                    break;
                case 'delivery_agent':
                    window.location.hash = '#/delivery';
                    break;
                default:
                    window.location.hash = '';
                    break;
            }

            // Trigger the role switch callback if provided
            if (onRoleSwitch) {
                onRoleSwitch(targetRole);
            }

            // Refresh profile to ensure we have latest data
            await refreshProfile();

            // Close confirmation dialog
            setShowConfirmation(false);
        } catch (error) {
            console.error('[RoleSwitch] Error during switch:', error);
            showError('Failed to switch roles. Please try again.');
        } finally {
            setIsSwitching(false);
        }
    };

    // Handle switching back to primary role (clears preferred role)
    const handleSwitchToPrimaryRole = async () => {
        if (!profile) {
            showError('Please sign in.');
            return;
        }

        setIsSwitching(true);
        try {
            // Clear the preferred role from sessionStorage
            sessionStorage.removeItem('preferredRole');

            // Update URL hash based on primary role
            const primaryRole = profile.role as string;
            switch (primaryRole) {
                case 'vendor':
                case 'late_night_vendor':
                    window.location.hash = '#/vendor';
                    break;
                case 'delivery_agent':
                    window.location.hash = '#/delivery';
                    break;
                default:
                    window.location.hash = '';
                    break;
            }

            // Trigger the role switch callback if provided
            if (onRoleSwitch) {
                onRoleSwitch(primaryRole as 'customer' | 'vendor' | 'delivery_agent');
            }

            // Refresh profile to ensure we have latest data
            await refreshProfile();

            // Close confirmation dialog
            setShowConfirmation(false);
        } catch (error) {
            console.error('[RoleSwitch] Error switching to primary role:', error);
            showError('Failed to switch roles. Please try again.');
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
                    description: 'Browse and order food',
                    color: 'blue'
                };
            case 'vendor':
            case 'late_night_vendor':
                return {
                    icon: Store,
                    label: 'Vendor View',
                    description: 'Manage your store and orders',
                    color: 'green'
                };
            case 'delivery_agent':
                return {
                    icon: Truck,
                    label: 'Delivery View',
                    description: 'Manage deliveries and earnings',
                    color: 'orange'
                };
            default:
                return {
                    icon: User,
                    label: 'Customer View',
                    description: 'Browse and order food',
                    color: 'blue'
                };
        }
    };

    const currentRoleInfo = getRoleDisplayInfo(currentRole);

    // Show switcher if user has multiple roles
    if (availableRoles.length <= 1) {
        return null;
    }

    return (
        <div className="fixed top-20 right-4 z-50">
            {/* Main switcher button */}
            <button
                onClick={() => setShowConfirmation(true)}
                disabled={isSwitching}
                className="flex items-center space-x-2 bg-white border border-gray-200 rounded-lg px-4 py-2 shadow-lg hover:shadow-xl transition-all duration-200 hover:border-blue-300 disabled:opacity-50"
                aria-label="Switch between roles"
                id={id}
            >
                <ArrowLeftRight className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">
                    Switch Role
                </span>
            </button>

            {/* Confirmation Modal */}
            {showConfirmation && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 my-auto">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <ArrowLeftRight className="h-8 w-8 text-blue-600" />
                            </div>

                            <h3 className="text-xl font-bold text-gray-900 mb-2">
                                Switch Roles
                            </h3>
                            <p className="text-gray-600 mb-4">
                                Choose which view you want to access
                            </p>

                            <div className="space-y-3 mb-6">
                                {/* Current role */}
                                <div className="text-left p-3 bg-gray-100 rounded-lg border border-gray-200">
                                    <div className="flex items-center space-x-2 mb-1">
                                        {React.createElement(currentRoleInfo.icon, { className: "h-4 w-4 text-gray-600" })}
                                        <span className="font-medium text-gray-900">Current: {currentRoleInfo.label}</span>
                                    </div>
                                    <p className="text-sm text-gray-600">{currentRoleInfo.description}</p>
                                </div>

                                {/* Show primary role option if different from current */}
                                {effectiveCurrentRole !== currentRole && profile && (
                                    <>
                                        <div className="flex items-center justify-center py-2">
                                            <div className="border-t border-gray-300 w-full"></div>
                                            <span className="px-3 text-xs text-gray-500 uppercase tracking-wide bg-white">or</span>
                                            <div className="border-t border-gray-300 w-full"></div>
                                        </div>
                                        <button
                                            onClick={handleSwitchToPrimaryRole}
                                            disabled={isSwitching}
                                            className="w-full text-left p-3 rounded-lg border border-green-200 bg-green-50 hover:bg-green-100 transition-all"
                                        >
                                            <div className="flex items-center space-x-3">
                                                <User className="h-5 w-5 text-green-600" />
                                                <div>
                                                    <div className="font-medium text-gray-900">
                                                        Switch to Primary Role
                                                    </div>
                                                    <div className="text-sm text-green-700">
                                                        {getRoleDisplayInfo(profile.role).label}
                                                    </div>
                                                </div>
                                            </div>
                                        </button>
                                    </>
                                )}

                                {/* Available roles to switch to */}
                                <div className="space-y-2">
                                    <p className="text-sm font-medium text-gray-700">Switch to:</p>
                                    {targetRoles.map(role => {
                                        const roleInfo = getRoleDisplayInfo(role);
                                        const isAvailable =
                                            role === 'vendor' ? canSwitchToVendor :
                                                role === 'delivery_agent' ? canSwitchToDelivery :
                                                    canSwitchToCustomer;

                                        return (
                                            <button
                                                key={role}
                                                onClick={() => handleRoleSwitch(role as any)}
                                                disabled={!isAvailable || isSwitching}
                                                className={`w-full text-left p-3 rounded-lg border transition-all ${isAvailable
                                                    ? 'hover:border-blue-300 hover:bg-blue-50 cursor-pointer'
                                                    : 'bg-gray-100 border-gray-200 cursor-not-allowed opacity-50'
                                                    }`}
                                            >
                                                <div className="flex items-center space-x-3">
                                                    {React.createElement(roleInfo.icon, {
                                                        className: `h-5 w-5 ${isAvailable ? `text-${roleInfo.color}-600` : 'text-gray-400'}`
                                                    })}
                                                    <div>
                                                        <div className="font-medium text-gray-900">
                                                            {roleInfo.label}
                                                        </div>
                                                        <div className={`text-sm ${isAvailable ? `text-${roleInfo.color}-700` : 'text-gray-500'}`}>
                                                            {roleInfo.description}
                                                        </div>
                                                        {!isAvailable && (
                                                            <div className="text-xs text-red-600 mt-1">
                                                                {role === 'vendor' ? 'Vendor approval required' :
                                                                    role === 'delivery_agent' ? 'Delivery agent approval required' :
                                                                        'Not available'}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <button
                                onClick={() => setShowConfirmation(false)}
                                className="w-full py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
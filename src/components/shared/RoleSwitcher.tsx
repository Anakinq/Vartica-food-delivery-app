// src/components/shared/RoleSwitcher.tsx
import React, { useState } from 'react';
import { User, Store, Truck, ArrowLeftRight, X } from 'lucide-react';
import { useRole } from '../../contexts/RoleContext';
import { useRoleSwitching } from '../../hooks/useRoleSwitching';
import { useToast } from '../../contexts/ToastContext';

interface RoleSwitcherProps {
    variant?: 'floating' | 'compact' | 'inline';
    className?: string;
}

export const RoleSwitcher: React.FC<RoleSwitcherProps> = ({
    variant = 'floating',
    className = ''
}) => {
    const { currentRole, primaryRole, availableRoles } = useRole();
    const { switchRole, isSwitching, canSwitchTo } = useRoleSwitching();
    const { error: showError } = useToast();
    const [showDialog, setShowDialog] = useState(false);

    // Show switcher only if user has multiple roles
    if (availableRoles.length <= 1) {
        return null;
    }

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

    const handleRoleSwitch = async (targetRole: 'customer' | 'vendor' | 'delivery_agent') => {
        try {
            await switchRole(targetRole);
            setShowDialog(false);
        } catch (error) {
            console.error('Role switch failed:', error);
        }
    };

    const currentRoleInfo = getRoleDisplayInfo(currentRole);

    // Main switcher button
    const renderSwitcherButton = () => {
        const baseClasses = "flex items-center space-x-2 bg-gray-800 border border-gray-600 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 hover:border-blue-400 disabled:opacity-50";
        const sizeClasses = variant === 'compact'
            ? 'px-2 py-1 text-xs'
            : variant === 'inline'
                ? 'px-3 py-2 text-sm'
                : 'px-4 py-2 text-sm';
        const positionClasses = variant === 'floating' ? 'fixed top-20 right-4 z-50' : '';

        return (
            <button
                onClick={() => setShowDialog(true)}
                disabled={isSwitching}
                className={`${baseClasses} ${sizeClasses} ${positionClasses} ${className}`}
                aria-label="Switch between roles"
            >
                <ArrowLeftRight className={variant === 'compact' ? 'h-3 w-3 text-gray-300' : 'h-4 w-4 text-gray-300'} />
                <span className={variant === 'compact' ? 'text-xs font-medium text-gray-200' : 'text-sm font-medium text-gray-200'}>
                    {variant === 'compact' ? 'Switch' : 'Switch Role'}
                </span>
                {isSwitching && (
                    <div className="w-3 h-3 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                )}
            </button>
        );
    };

    // Role switch dialog
    const renderDialog = () => {
        if (!showDialog) return null;

        const targetRoles = availableRoles.filter(role => role !== currentRole);

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl max-w-md w-full p-6 relative">
                    {/* Close button */}
                    <button
                        onClick={() => setShowDialog(false)}
                        className="absolute top-4 right-4 p-1 rounded-full hover:bg-gray-100 transition-colors"
                        aria-label="Close dialog"
                    >
                        <X className="h-5 w-5 text-gray-500" />
                    </button>

                    <div className="text-center">
                        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <ArrowLeftRight className="h-8 w-8 text-blue-600" />
                        </div>

                        <h3 className="text-xl font-bold text-gray-900 mb-2">
                            Switch Roles
                        </h3>
                        <p className="text-gray-600 mb-6">
                            Choose which view you want to access
                        </p>

                        <div className="space-y-4">
                            {/* Current role display */}
                            <div className="text-left p-4 bg-gray-50 rounded-lg border border-gray-200">
                                <div className="flex items-center space-x-3 mb-2">
                                    {React.createElement(currentRoleInfo.icon, { className: "h-5 w-5 text-gray-600" })}
                                    <span className="font-medium text-gray-900">Current: {currentRoleInfo.label}</span>
                                </div>
                                <p className="text-sm text-gray-600 ml-8">{currentRoleInfo.description}</p>
                            </div>

                            {/* Show primary role option if different from current */}
                            {currentRole !== primaryRole && (
                                <div className="space-y-3">
                                    <div className="flex items-center">
                                        <div className="border-t border-gray-300 flex-grow"></div>
                                        <span className="px-3 text-xs text-gray-500 uppercase tracking-wide">or</span>
                                        <div className="border-t border-gray-300 flex-grow"></div>
                                    </div>

                                    <button
                                        onClick={() => handleRoleSwitch(primaryRole as any)}
                                        disabled={isSwitching}
                                        className="w-full text-left p-4 rounded-lg border-2 border-green-200 bg-green-50 hover:bg-green-100 transition-all flex items-center space-x-3"
                                    >
                                        <User className="h-5 w-5 text-green-600 flex-shrink-0" />
                                        <div className="flex-grow text-left">
                                            <div className="font-medium text-gray-900">
                                                Switch to Primary Role
                                            </div>
                                            <div className="text-sm text-green-700">
                                                {getRoleDisplayInfo(primaryRole).label}
                                            </div>
                                        </div>
                                        {isSwitching && currentRole !== primaryRole && (
                                            <div className="w-4 h-4 border-2 border-green-300 border-t-transparent rounded-full animate-spin"></div>
                                        )}
                                    </button>
                                </div>
                            )}

                            {/* Available roles to switch to */}
                            <div className="space-y-3">
                                <p className="text-sm font-medium text-gray-700 text-left">Switch to:</p>
                                {targetRoles.map(role => {
                                    const roleInfo = getRoleDisplayInfo(role);
                                    const isAvailable = canSwitchTo(role as any);
                                    const isSwitchingToThis = isSwitching && currentRole !== role;

                                    return (
                                        <button
                                            key={role}
                                            onClick={() => handleRoleSwitch(role as any)}
                                            disabled={!isAvailable || isSwitching}
                                            className={`w-full text-left p-4 rounded-lg border-2 transition-all flex items-center space-x-3 ${isAvailable
                                                    ? 'border-gray-200 hover:border-blue-300 hover:bg-blue-50 cursor-pointer'
                                                    : 'bg-gray-100 border-gray-200 cursor-not-allowed opacity-50'
                                                }`}
                                        >
                                            {React.createElement(roleInfo.icon, {
                                                className: `h-5 w-5 flex-shrink-0 ${isAvailable ? `text-${roleInfo.color}-600` : 'text-gray-400'}`
                                            })}
                                            <div className="flex-grow text-left">
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
                                            {isSwitchingToThis && (
                                                <div className={`w-4 h-4 border-2 border-${roleInfo.color}-300 border-t-transparent rounded-full animate-spin`}></div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <>
            {renderSwitcherButton()}
            {renderDialog()}
        </>
    );
};
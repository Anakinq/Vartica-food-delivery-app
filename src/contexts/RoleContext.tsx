// src/contexts/RoleContext.tsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

type UserRole = 'customer' | 'vendor' | 'delivery_agent' | 'admin' | 'cafeteria' | 'late_night_vendor';

interface RoleContextType {
    currentRole: UserRole;
    primaryRole: UserRole;
    availableRoles: UserRole[];
    isSwitching: boolean;
    switchRole: (targetRole: UserRole) => Promise<void>;
    canSwitchTo: (role: UserRole) => boolean;
    refreshRoles: () => Promise<void>;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export const useRole = () => {
    const context = useContext(RoleContext);
    if (!context) {
        throw new Error('useRole must be used within RoleProvider');
    }
    return context;
};

export const RoleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { profile, refreshProfile } = useAuth();
    const { error: showError } = useToast();
    const [isSwitching, setIsSwitching] = useState(false);
    const [currentRole, setCurrentRole] = useState<UserRole>('customer');

    // Determine primary role based on profile
    const primaryRole = profile?.role === 'admin'
        ? 'admin'
        : profile?.role === 'vendor' || (profile as any)?.role === 'late_night_vendor'
            ? 'vendor'
            : profile?.role === 'delivery_agent'
                ? 'delivery_agent'
                : profile?.role === 'cafeteria'
                    ? 'cafeteria'
                    : 'customer';

    // Determine available roles
    const availableRoles = ['customer'] as UserRole[];
    if (profile?.role === 'admin') {
        availableRoles.push('admin');
    }
    if (profile?.role === 'cafeteria') {
        availableRoles.push('cafeteria');
    }
    if (profile?.role === 'vendor' || (profile as any)?.role === 'late_night_vendor' || (profile as any)?.is_vendor) {
        availableRoles.push('vendor');
    }
    if (profile?.role === 'delivery_agent' || (profile as any)?.is_delivery_agent) {
        availableRoles.push('delivery_agent');
    }

    // Handle hash-based navigation to sync currentRole
    useEffect(() => {
        const handleHashChange = () => {
            const hash = window.location.hash;
            if (hash.startsWith('#/vendor')) {
                setCurrentRole('vendor');
            } else if (hash.startsWith('#/delivery')) {
                setCurrentRole('delivery_agent');
            } else if (hash.startsWith('#/customer')) {
                setCurrentRole('customer');
            } else {
                setCurrentRole(primaryRole);
            }
        };

        // Set initial role based on current hash
        handleHashChange();

        // Listen for hash changes
        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, [primaryRole]);

    // Enhanced role switching with proper cache management
    const switchRole = useCallback(async (targetRole: UserRole) => {
        if (!profile || isSwitching) {
            throw new Error('Cannot switch roles at this time');
        }

        // Validate target role
        if (!availableRoles.includes(targetRole)) {
            throw new Error(`User cannot switch to ${targetRole} role`);
        }

        setIsSwitching(true);

        try {
            // Mark this as a role switching operation for cache invalidation
            sessionStorage.setItem('role_switching_operation', 'true');
            sessionStorage.setItem('role_switch_target', targetRole);

            // Clear profile cache to ensure fresh data
            sessionStorage.removeItem(`profile_with_vendor_${profile.id}`);

            // Determine target hash
            let targetHash = '';
            switch (targetRole) {
                case 'admin':
                    targetHash = '#/admin';
                    break;
                case 'vendor':
                    targetHash = '#/vendor';
                    break;
                case 'cafeteria':
                    targetHash = '#/cafeteria';
                    break;
                case 'delivery_agent':
                    targetHash = '#/delivery';
                    break;
                case 'customer':
                    targetHash = '#/customer';
                    break;
                default:
                    targetHash = '';
                    break;
            }

            // Update URL hash for navigation
            window.location.hash = targetHash;

            // Refresh profile data to ensure consistency
            await refreshProfile();

            // Add visual feedback
            document.body.classList.add('role-switching');
            setTimeout(() => {
                document.body.classList.remove('role-switching');
                sessionStorage.removeItem('role_switching_operation');
                sessionStorage.removeItem('role_switch_target');
            }, 300);

        } catch (error) {
            console.error('Role switching failed:', error);
            sessionStorage.removeItem('role_switching_operation');
            sessionStorage.removeItem('role_switch_target');
            throw error;
        } finally {
            setIsSwitching(false);
        }
    }, [profile, isSwitching, availableRoles, refreshProfile, primaryRole]);

    const canSwitchTo = useCallback((role: UserRole): boolean => {
        return availableRoles.includes(role);
    }, [availableRoles]);

    const refreshRoles = useCallback(async () => {
        if (profile) {
            await refreshProfile();
        }
    }, [profile, refreshProfile]);

    const value: RoleContextType = {
        currentRole,
        primaryRole,
        availableRoles,
        isSwitching,
        switchRole,
        canSwitchTo,
        refreshRoles
    };

    return (
        <RoleContext.Provider value={value}>
            {children}
        </RoleContext.Provider>
    );
};
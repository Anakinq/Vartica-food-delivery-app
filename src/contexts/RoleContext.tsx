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

    // Initialize currentRole from localStorage if available, otherwise default to 'customer'
    // This ensures the role persists across navigation and page reloads
    const [currentRole, setCurrentRole] = useState<UserRole>(() => {
        if (typeof window !== 'undefined') {
            const savedRole = localStorage.getItem('activeRole');
            if (savedRole) {
                return savedRole as UserRole;
            }
        }
        return 'customer';
    });

    // Determine primary role based on profile (this is what the user IS, not what they VIEW)
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

    // Handle hash-based navigation - ONLY update role if it's a role switch operation
    // This prevents unwanted role changes when navigating back from Profile or other pages
    useEffect(() => {
        let hashChangeTimeout: ReturnType<typeof setTimeout>;
        let isInitialSync = true;

        const handleHashChange = () => {
            const isRoleSwitch = sessionStorage.getItem('role_switching_operation');
            const hash = window.location.hash;

            let hashRole: UserRole | null = null;
            if (hash.startsWith('#/vendor')) hashRole = 'vendor';
            else if (hash.startsWith('#/delivery')) hashRole = 'delivery_agent';
            else if (hash.startsWith('#/customer')) hashRole = 'customer';
            else if (hash.startsWith('#/admin')) hashRole = 'admin';
            else if (hash.startsWith('#/cafeteria')) hashRole = 'cafeteria';

            // On initial load, sync role from hash if no saved role exists
            if (isInitialSync && hashRole) {
                const savedRole = localStorage.getItem('activeRole');
                if (!savedRole) {
                    setCurrentRole(hashRole);
                    localStorage.setItem('activeRole', hashRole);
                }
                isInitialSync = false;
            }

            // Clear the sessionStorage flag after handling navigation
            if (isRoleSwitch) {
                hashChangeTimeout = setTimeout(() => {
                    sessionStorage.removeItem('role_switching_operation');
                    sessionStorage.removeItem('role_switch_target');
                }, 100);
            }

            if (isRoleSwitch && hashRole) {
                setCurrentRole(hashRole);
            }
        };

        // Set initial role based on current hash (only on first load)
        handleHashChange();

        // Listen for hash changes
        window.addEventListener('hashchange', handleHashChange);
        return () => {
            window.removeEventListener('hashchange', handleHashChange);
            if (hashChangeTimeout) clearTimeout(hashChangeTimeout);
        };
    }, []); // Empty dependency array - this effect should only run once on mount

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

            // Save the selected role to localStorage so it persists across navigation and page reloads
            localStorage.setItem('activeRole', targetRole);

            // Update currentRole immediately for responsive UI
            setCurrentRole(targetRole);

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
// src/hooks/useRoleSwitching.ts
import { useCallback, useState } from 'react';
import { useRole } from '../contexts/RoleContext';
import { useToast } from '../contexts/ToastContext';

interface UseRoleSwitchingReturn {
    switchRole: (role: 'customer' | 'vendor' | 'delivery_agent') => Promise<void>;
    isSwitching: boolean;
    canSwitchTo: (role: 'customer' | 'vendor' | 'delivery_agent') => boolean;
    getCurrentRole: () => string;
    getAvailableRoles: () => string[];
}

export const useRoleSwitching = (): UseRoleSwitchingReturn => {
    const {
        switchRole: contextSwitchRole,
        isSwitching,
        canSwitchTo,
        currentRole,
        availableRoles
    } = useRole();
    const { success: showSuccess, error: showError } = useToast();
    const [localSwitching, setLocalSwitching] = useState(false);

    const switchRole = useCallback(async (targetRole: 'customer' | 'vendor' | 'delivery_agent') => {
        if (localSwitching) {
            return;
        }

        if (currentRole === targetRole) {
            // Already in the target role
            return;
        }

        if (!canSwitchTo(targetRole)) {
            showError(`You don't have permission to switch to ${targetRole} role`);
            return;
        }

        setLocalSwitching(true);

        try {
            // Add loading state to UI
            document.body.classList.add('role-switching-loading');

            await contextSwitchRole(targetRole);

            // Show success message
            const roleNames: Record<string, string> = {
                'customer': 'Customer',
                'vendor': 'Vendor',
                'delivery_agent': 'Delivery Agent'
            };

            showSuccess(`Switched to ${roleNames[targetRole]} view`);

        } catch (error) {
            console.error('Role switching error:', error);
            showError('Failed to switch roles. Please try again.');
            throw error;
        } finally {
            setLocalSwitching(false);
            document.body.classList.remove('role-switching-loading');
        }
    }, [contextSwitchRole, currentRole, canSwitchTo, localSwitching, showError, showSuccess]);

    return {
        switchRole,
        isSwitching: isSwitching || localSwitching,
        canSwitchTo,
        getCurrentRole: () => currentRole,
        getAvailableRoles: () => availableRoles
    };
};
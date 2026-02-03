/**
 * Input validation utilities
 */

export interface ValidationError {
    field: string;
    message: string;
}

export interface ValidationRules {
    [key: string]: (value: any) => string | null;
}

/**
 * Validate form data against rules
 */
export function validateForm(data: Record<string, any>, rules: ValidationRules): ValidationError[] {
    const errors: ValidationError[] = [];

    Object.entries(rules).forEach(([field, validator]) => {
        const value = data[field];
        const error = validator(value);
        if (error) {
            errors.push({ field, message: error });
        }
    });

    return errors;
}

/**
 * Common validation rules
 */
export const ValidationRules = {
    required: (fieldName: string) => (value: any): string | null => {
        if (value === null || value === undefined || value === '') {
            return `${fieldName} is required`;
        }
        return null;
    },

    email: (value: string): string | null => {
        if (!value) return null;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
            return 'Please enter a valid email address';
        }
        return null;
    },

    phone: (value: string): string | null => {
        if (!value) return null;
        // Nigerian phone number validation
        const phoneRegex = /^(\+?234|0)[789]\d{9}$/;
        if (!phoneRegex.test(value.replace(/\s/g, ''))) {
            return 'Please enter a valid Nigerian phone number';
        }
        return null;
    },

    minLength: (min: number) => (value: string): string | null => {
        if (value && value.length < min) {
            return `Must be at least ${min} characters long`;
        }
        return null;
    },

    maxLength: (max: number) => (value: string): string | null => {
        if (value && value.length > max) {
            return `Must be no more than ${max} characters long`;
        }
        return null;
    },

    min: (min: number) => (value: number): string | null => {
        if (value !== undefined && value !== null && value < min) {
            return `Must be at least ${min}`;
        }
        return null;
    },

    max: (max: number) => (value: number): string | null => {
        if (value !== undefined && value !== null && value > max) {
            return `Must be no more than ${max}`;
        }
        return null;
    },

    password: (value: string): string | null => {
        if (!value) return null;
        if (value.length < 8) {
            return 'Password must be at least 8 characters long';
        }
        if (!/[A-Z]/.test(value)) {
            return 'Password must contain at least one uppercase letter';
        }
        if (!/[a-z]/.test(value)) {
            return 'Password must contain at least one lowercase letter';
        }
        if (!/\d/.test(value)) {
            return 'Password must contain at least one number';
        }
        if (!/[!@#$%^&*(),.?":{}|<>]/.test(value)) {
            return 'Password must contain at least one special character';
        }
        return null;
    },

    confirmPassword: (originalPassword: string) => (value: string): string | null => {
        if (value !== originalPassword) {
            return 'Passwords do not match';
        }
        return null;
    },

    matricNumber: (value: string): string | null => {
        if (!value) return null;
        // Basic matric number validation (adjust pattern as needed)
        const matricRegex = /^[A-Z]{2,4}\/\d{2,4}\/\d{2,4}$/i;
        if (!matricRegex.test(value)) {
            return 'Please enter a valid matriculation number (e.g., CS/2020/001)';
        }
        return null;
    }
};

/**
 * Validate signup form data
 */
export function validateSignupForm(data: {
    email: string;
    password: string;
    fullName: string;
    role: string;
    phone?: string;
    storeName?: string;
    matricNumber?: string;
    department?: string;
}): ValidationError[] {
    const rules: ValidationRules = {
        email: ValidationRules.required('Email'),
        password: ValidationRules.required('Password'),
        fullName: ValidationRules.required('Full name'),
        role: ValidationRules.required('Role')
    };

    // Add email validation
    rules.email = (value) => {
        const requiredError = ValidationRules.required('Email')(value);
        if (requiredError) return requiredError;
        return ValidationRules.email(value);
    };

    // Add password validation
    rules.password = (value) => {
        const requiredError = ValidationRules.required('Password')(value);
        if (requiredError) return requiredError;
        return ValidationRules.password(value);
    };

    // Add phone validation if provided
    if (data.phone) {
        rules.phone = ValidationRules.phone;
    }

    // Role-specific validations
    if (data.role === 'vendor' || data.role === 'late_night_vendor') {
        rules.storeName = ValidationRules.required('Store name');

        if (data.role === 'vendor') {
            rules.matricNumber = ValidationRules.required('Matriculation number');
            rules.department = ValidationRules.required('Department');
            rules.matricNumber = (value) => {
                const requiredError = ValidationRules.required('Matriculation number')(value);
                if (requiredError) return requiredError;
                return ValidationRules.matricNumber(value);
            };
        }
    }

    return validateForm(data, rules);
}

/**
 * Validate login form data
 */
export function validateLoginForm(data: {
    email: string;
    password: string;
}): ValidationError[] {
    const rules: ValidationRules = {
        email: ValidationRules.required('Email'),
        password: ValidationRules.required('Password')
    };

    // Add email validation
    rules.email = (value) => {
        const requiredError = ValidationRules.required('Email')(value);
        if (requiredError) return requiredError;
        return ValidationRules.email(value);
    };

    return validateForm(data, rules);
}

/**
 * Format validation errors for display
 */
export function formatValidationErrors(errors: ValidationError[]): string {
    return errors.map(error => error.message).join('\n');
}
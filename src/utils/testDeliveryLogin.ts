/**
 * Quick test script for delivery driver login
 * Run this in browser console to debug the delivery1@vartica.edu account
 */

import { debugUserLogin, printAuthDebug } from './authDebugger';

/**
 * Test the delivery driver account
 */
export async function testDeliveryDriverLogin() {
    console.log('🔍 Testing Delivery Driver Login...\n');

    const email = 'delivery1@vartica.edu';
    const password = 'Delivery2024!';

    console.log(`Email: ${email}`);
    console.log(`Password: ${password}\n`);

    const results = await debugUserLogin(email, password);
    printAuthDebug(results);

    return results;
}

// For direct console testing
if (typeof window !== 'undefined') {
    (window as any).testDeliveryLogin = testDeliveryDriverLogin;
    console.log('💡 Run testDeliveryLogin() in console to test the delivery driver account');
}

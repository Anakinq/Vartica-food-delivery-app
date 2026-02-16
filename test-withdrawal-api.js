// Test the deployed withdrawal API
async function testWithdrawalAPI() {
    try {
        console.log('Testing withdrawal API...');

        const response = await fetch('https://vartica-food-delivery-app.vercel.app/api/withdraw', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                agent_id: 'non-existent-test-id',
                amount: 1000
            })
        });

        const result = await response.json();
        console.log('Response status:', response.status);
        console.log('Response:', JSON.stringify(result, null, 2));

        if (response.status === 500) {
            console.log('❌ API still returning 500 error');
            console.log('This indicates the database schema issues need to be resolved');
        } else if (response.status === 404) {
            console.log('✅ API is working - returned 404 for non-existent agent (expected)');
        } else {
            console.log('✅ API returned:', response.status);
        }

    } catch (error) {
        console.error('Error testing API:', error);
    }
}

testWithdrawalAPI();
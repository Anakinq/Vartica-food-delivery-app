// Test the fixed withdrawal API
async function testFixedAPI() {
    try {
        console.log('🧪 Testing fixed withdrawal API...');

        const response = await fetch('https://vartica-food-delivery-siymixx1b-legendanakin-4117s-projects.vercel.app/api/withdraw', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                agent_id: 'test-agent-id',
                amount: 1000
            })
        });

        const result = await response.json();
        console.log('✅ Response status:', response.status);
        console.log('✅ Response:', JSON.stringify(result, null, 2));

        if (response.status === 500) {
            console.log('❌ API still returning 500 - check logs');
        } else if (response.status === 404) {
            console.log('✅ API working correctly - returned 404 for non-existent agent');
        } else {
            console.log('✅ API returned:', response.status);
        }

    } catch (error) {
        console.error('❌ Error testing API:', error);
    }
}

testFixedAPI();
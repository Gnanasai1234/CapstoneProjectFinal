function generateTestData() {
    // Function to generate test data
    return {
        user: {
            name: "Test User",
            email: "testuser@example.com"
        },
        product: {
            id: 1,
            name: "Test Product",
            price: 100
        }
    };
}

function apiCall(endpoint, method = 'GET', data = null) {
    // Function to make API calls
    const options = {
        method: method,
        headers: {
            'Content-Type': 'application/json'
        },
        body: data ? JSON.stringify(data) : null
    };

    return fetch(endpoint, options)
        .then(response => response.json())
        .catch(error => {
            console.error('API call error:', error);
            throw error;
        });
}

export { generateTestData, apiCall };
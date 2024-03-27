const express = require('express');
const app = express();

// Function to simulate verification (for demonstration purposes)
async function verify(idToken, netID) {
    // Simulate verification logic
    if (idToken === 'mock_id_token' && netID === 'mock_netid') {
        return { verified: true };
    } else {
        return { verified: false, error: 'Invalid token or netID' };
    }
}

// Mock endpoint to simulate Google's OAuth service
app.post('/mock-google-auth', express.json(), async (req, res) => {
    const { idtoken, netid } = req.body;
    const result = await verify(idtoken, netid);
    if (result.verified) {
        res.json({ verified: true });
    } else {
        res.status(401).json({ verified: false, error: 'Invalid token or netID' });
    }
});

// Example usage of the mock endpoint
app.post('/tokensignin', express.json(), async (req, res) => {
    const { idtoken, netid } = req.body;
    const result = await verify(idtoken, netid);
    if (result.verified) {
        res.send('success');
    } else {
        res.status(401).send('Authentication failed: ' + result.error);
    }
});

app.listen(3000, () => {
    console.log('Server started on port 3000');
});

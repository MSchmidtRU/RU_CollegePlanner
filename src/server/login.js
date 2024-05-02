const express = require('express');
const { OAuth2Client } = require('google-auth-library');
const app = express();

const CLIENT_ID = '687862985843-b9rm079labqpm3cku18cv5qbd7g212co.apps.googleusercontent.com';
const client = new OAuth2Client(CLIENT_ID);

async function verify(idToken) {
    const ticket = await client.verifyIdToken({
        idToken: idToken,
        audience: CLIENT_ID,
    });
    const payload = ticket.getPayload();
    return payload; // This contains user information
}

app.post('/tokensignin', express.json(), async (req, res) => {
    const { idtoken } = req.body;
    try {
        const result = await verify(idtoken);
        if (result) {
            res.send('success');
        } else {
            res.status(401).send('Authentication failed');
        }
    } catch (error) {
        res.status(401).send('Authentication failed: ' + error);
    }
});

app.get('/guest', (req, res) => {
    res.send('Welcome, guest!');
});

app.listen(3000, () => {
    console.log('Server started on port 3000');
});

function onSignIn(googleUser) {
    var id_token = googleUser.getAuthResponse().id_token;
    var xhr = new XMLHttpRequest();
    xhr.open('POST', 'http://localhost:3000/tokensignin');
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onload = function() {
        if (xhr.responseText === 'success') {
            window.location.href = '../4yrplan.html';
        } else {
            alert('Authentication failed. Please check your NetID and try again.');
        }
    };
    xhr.send(JSON.stringify({ idtoken: id_token }));
}

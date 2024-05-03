const CLIENT_ID = '687862985843-b9rm079labqpm3cku18cv5qbd7g212co.apps.googleusercontent.com'; // Your Google OAuth client ID
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(CLIENT_ID);


// Function called when Google Sign-In is successful
function onSignIn(googleUser) {
  // Get the Google Auth response
  var authResponse = googleUser.getAuthResponse();
  // Get the ID token
  var idToken = authResponse.id_token;

  // Send the token to your backend
  sendTokenToServer(idToken);
}

// Function to initialize Google Sign-In
function initGoogleSignIn() {
  console.log("auth has begun");
  gapi.load('auth2', function() {
      gapi.auth2.init({
          client_id: CLIENT_ID, // Replace with your actual client ID
          cookiePolicy: 'single_host_origin'
      }).then(function(auth2) {
          // Sign in the user with Google
          auth2.signIn().then(function() {
              var user = auth2.currentUser.get();
              onSignIn(user); // Call onSignIn with the signed-in user
          });
      }).catch(function(error) {
        // Initialization failed, handle error
        console.error('Google Sign-In initialization failed:', error);
      });;
  });
}























async function verifyTokenOfStudent(token) {
  try {
    const ticket = await client.verifyIdToken({
      idToken: token.substring(7),
      audience: CLIENT_ID,
    });
    const payload = ticket.getPayload();
    let email = payload.email;
    console.log(email);
    let match = email.match(/^[^@]+/);
    let netID = match[0];
    return netID; // Returns user information if the token is valid
  } catch (error) {
    console.error('Error verifying token:', error);
    throw new Error("Unauthorized ~401");
  }
}

//Testing stuff - ignore
function generateMockToken() {
    try {
      // Create a payload for the token
      const payload = {
        iss: 'accounts.google.com',
        aud: CLIENT_ID,
        sub: '1234567890',
        email: 'ach127@example.com',
        email_verified: true,
        //azp: CLIENT_ID,
        exp: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60), // Expiry time 1 hour from now
        //iat: Math.floor(Date.now() / 1000)
      };
  
      // Sign the token with a dummy secret (not necessary for mock token)
      const token = jwt.sign(payload, 'loMefachadim');
      
      console.log('Mock Token:', token);
    } catch (error) {
      console.error('Error generating mock token:', error);
    }
  }

  generateMockToken()

 function verifyMockToken(mockToken) {
    try {
      // Verify the token
      console.log(mockToken)
      const payload = jwt.verify(mockToken.substring(7), 'loMefachadim');
      console.log('Decoded Token Payload:', payload);
      // Check if the token is valid for Google client ID
      //if (payload.aud === CLIENT_ID && payload.iss === 'accounts.google.com') {
        let email = payload.email;
        let match = email.match(/^[^@]+/);
        let netID = match[0];
        console.log(netID)
        return netID;
      //} else {
        //console.log('Token is invalid');
       // throw new Error("Unauthorized ~401");
     // }
    } catch (error) {
      console.error('Error verifying token:', error.message);
      throw new Error('Unauthorized ~401');
    }
  }

  module.exports = {verifyTokenOfStudent, verifyMockToken};
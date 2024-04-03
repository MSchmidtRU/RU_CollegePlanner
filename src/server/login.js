
async function verify(req) {
    if (req.params.idToken === 'mock_id_token' && req.params.netID === 'mock_netid') {
        return [JSON.stringify({ verified: true }), 200];
    } else {
        throw new Error("invalid credientials ~400")
    }
}


// function onSignIn(googleUser) {
//     // Get the Google ID token
//     var id_token = googleUser.getAuthResponse().id_token;

//     // Send the ID token to your server with the user's NetID
//     var netid = document.getElementsByName('netid')[0].value;
//     var xhr = new XMLHttpRequest();
//     xhr.open('POST', 'http://localhost:3000/mock-google-auth'); // Point to the mock endpoint
//     xhr.setRequestHeader('Content-Type', 'application/json');
//     xhr.onload = function () {
//         if (xhr.responseText === 'success') {
//             // If authentication is successful, redirect to the 4-year plan page
//             window.location.href = '../4yrplan.html';
//         } else {
//             // Handle the error if authentication fails
//             alert('Authentication failed. Please check your NetID and try again.');
//         }
//     };
//     xhr.send(JSON.stringify({ idtoken: id_token, netid: netid }));
// }

module.exports = { verify }

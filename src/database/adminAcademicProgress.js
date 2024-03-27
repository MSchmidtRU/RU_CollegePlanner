// adminAcademicProgress.js

// Required imports and setup
const { firestore } = require('./firebase.js');
const { checkAcademicProgress } = require('./academicProgess.js'); // Assuming this is the same directory structure

// Function to verify if the netID belongs to an admin
async function isAdmin(netID) {
    const adminRef = firestore.collection('admins').doc(netID);
    const doc = await adminRef.get();
    return doc.exists; // Returns true if the admin document exists
}
async function adminAcademicProgressHandler(req) {
    const { adminNetID, studentNetID } = req.params; // Extracted from URL by the custom server

    try {
        // Fetch and format the student's academic progress for an admin
        const academicProgressSummary = await getAcademicProgressReport(adminNetID, studentNetID);
        
        // Format the summary into an object suitable for JSON response
        const formattedSummary = formatAcademicSummary(academicProgressSummary);
        
        // Return a tuple of the response body, HTTP status code, and content type
        return [JSON.stringify(formattedSummary), 200, 'application/json'];
    } catch (error) {
        // Log and return any errors encountered
        console.error(error);
        return [JSON.stringify({ error: error.message }), 403, 'application/json']; // Use 403 for access denied
    }
}

// Function to get the academic progress report for a student
async function getAcademicProgressReport(adminNetID, studentNetID) {
    // Verify admin credentials
    const adminExists = await isAdmin(adminNetID);
    if (!adminExists) {
        throw new Error(`Access denied: ${adminNetID} is not an administrator.`);
    }

    // Fetch and format the student's academic progress
    const academicProgressSummary = await checkAcademicProgress(studentNetID);
    return academicProgressSummary;
}

module.exports = { getAcademicProgressReport, adminAcademicProgressHandler };

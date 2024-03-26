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

module.exports = { getAcademicProgressReport };
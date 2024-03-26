// Required imports and setup
const { firestore } = require('./firebase.js');
const { FieldValue } = require('firebase-admin/firestore');
const Helper = require("./helperFunction.js");
const { Section } = require("./section.js");
const { getCourse } = require("./course.js");
const { Student, getStudent } = require('./student.js');

// Entry point for a student to check their academic progress
async function checkAcademicProgress(studentNetID) {
    try {
        // Create an instance of the controller
        const controller_AS1 = new Controller_AS1();

        // The student requests their academic progress
        const academicProgressSummary = await controller_AS1.handleRequest(studentNetID);

        // Format and return the academic progress summary
        return formatAcademicSummary(academicProgressSummary);
    } catch (error) {
        // Instead of console.log, throw the error to be caught by the Express error handler
        throw error;
    }
}


// Controller class definition
class Controller_AS1 {
    // Method to handle the incoming request for academic progress
    async handleRequest(studentNetID) {
        
        // Obtain academic information from Firestore
        const student = await getStudent(studentNetID);
        console.log('Completed Courses from getStudent:', student.completedCourses); // Log the courses
        // Assuming getStudent already checks if the student exists and throws if not
        const academicProgress = {
            'GPA': student.gpa,
            'completedCourses': student.completedCourses,
            'enrolledCourses': student.enrolledCourses, // Assuming these are already fetched by getStudent
            'futureCourses': student.futureCourses      // Assuming these are already fetched by getStudent
        };

        // Verify the warning status of the student based on their GPA
        const warningStatus = this.verifyWarningStatus(student.gpa);

        // Populate the academic progress summary with any warnings
        const academicProgressSummary = this.populateSummaryWithWarnings(academicProgress, warningStatus);

        return academicProgressSummary;
    }

    // Function to verify the warning status of the student
    verifyWarningStatus(GPA) {
        // Check if the GPA is below the warning threshold of 2.0
        const isUnderThreshold = GPA < 2.0;
        return {
            'isUnderThreshold': isUnderThreshold,
            'message': isUnderThreshold ? 'Warning: GPA is below the minimum required threshold.' : 'No warning.'
        };
    }

    // Function to populate the summary with any warnings
    populateSummaryWithWarnings(academicProgress, warningStatus) {
        // Add warning status to the academic progress summary
        return {
            'progressDetails': academicProgress,
            'warnings': warningStatus
        };
    }
}
function formatAcademicSummary(academicProgressSummary) {
    const { GPA, completedCourses, enrolledCourses, futureCourses } = academicProgressSummary.progressDetails;
    const { message } = academicProgressSummary.warnings;

    // Create the summary object
    const summary = {
        GPA: `Student GPA: ${GPA}`,
        WarningStatus: message,
        CompletedCourses: completedCourses.filter(courseId => courseId) || ['No completed courses available.'],
        EnrolledCourses: enrolledCourses.filter(courseId => courseId) || ['No enrolled courses available.'],
        FutureCourses: futureCourses.map(course => course.course) || ['No future courses planned.'] // Assuming futureCourses is an array of objects with a 'course' field
    };

    return summary;
}

module.exports = { checkAcademicProgress };

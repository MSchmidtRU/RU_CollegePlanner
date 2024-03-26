// Unfinished last worked on 3/22/2024 1:44am, Will finish later in the day 

// Entry point for a student to check their academic progress
function checkAcademicProgress(studentNetID, courseIDs) {
    // Create an instance of the controller
    let controller_AS1 = new Controller_AS1();

    // The student requests their academic progress
    let academicProgressSummary = controller_AS1.handleRequest(studentNetID, courseIDs);

    // Display the academic progress summary to the student
    display(academicProgressSummary);
}

// Controller class definition
class Controller_AS1 {
    // Method to handle the incoming request for academic progress
    handleRequest(studentNetID, courseIDs) {
        // Verify if the student has grades for the courses
        let hasGrades = verifyIfStudentHasGrades(studentNetID, courseIDs);

        let academicProgressSummary;
        if (hasGrades) {
            // Use the NetID and courseIDs to obtain academic information
            let academicProgress = obtainAcademicProgress(studentNetID, courseIDs);
            // Verify the warning status of the student
            let warningStatus = verifyWarningStatus(studentNetID);
            // Populate the academic progress summary with any warnings
            academicProgressSummary = populateSummaryWithWarnings(academicProgress, warningStatus);
        } else {
            // Notify that the student does not have any grades
            academicProgressSummary = notifyNoGrades(studentNetID);
        }

        return academicProgressSummary;
    }
}

// Function to verify if the student has grades for the given courses
function verifyIfStudentHasGrades(studentNetID, courseIDs) {
    // Check if there are grades available for the courses
    let hasGrades = NetIDCourseIDsHasGrades(studentNetID, courseIDs);
    return hasGrades;
}

// Function to obtain academic progress details
function obtainAcademicProgress(studentNetID, courseIDs) {
    // Fetch the prerequisites and class requirements based on the student's courses
    let prerequisites = NetIDPrerequisites(studentNetID, courseIDs);
    let classRequirements = NetIDClassRequirements(studentNetID, courseIDs);
    // Fetch the academic grade summary
    let academicGradeSummary = NetIDAcademicSummary(studentNetID);

    // Combine all academic details into one object
    let academicProgress = {
        'prerequisites': prerequisites,
        'classRequirements': classRequirements,
        'academicGradeSummary': academicGradeSummary
    };

    return academicProgress;
}

// Function to verify the warning status of the student
function verifyWarningStatus(studentNetID) {
    // Check if there are any warnings for the student's academic status
    let warningStatus = NetIDisWarningStatus(studentNetID);
    return warningStatus;
}

// Function to populate the summary with any warnings
function populateSummaryWithWarnings(academicProgress, warningStatus) {
    // Add warning status to the academic progress summary
    let academicProgressSummary = {
        'progressDetails': academicProgress,
        'warnings': warningStatus
    };

    return academicProgressSummary;
}

// Function to notify that the student has no grades
function notifyNoGrades(studentNetID) {
    // Return a message stating that the student does not have any grades
    return {
        'studentNetID': studentNetID,
        'message': 'The student has no grades for the courses listed.'
    };
}

// Function to display the academic progress summary
function display(summary) {
    // Code to display the summary to the student
    console.log(summary);
}

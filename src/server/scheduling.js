const { firestore } = require('./firebase.js');
const Helper = require("./helperFunction.js");

class Schedule {
    constructor(studentId, courses = [], scheduleOptions = []) {
        this.studentId = studentId;
        this.courses = courses; // Array of course IDs
        this.scheduleOptions = scheduleOptions; // Array of possible schedule options
    }

    async addCourse(courseId) {
        try {
            const course = await getCourse(courseId);
            if (course) {
                this.courses.push(courseId);
                console.log(`Course ${courseId} added successfully.`);
            } else {
                console.log(`Course ${courseId} not found.`);
            }
        } catch (error) {
            console.error('Error adding course:', error);
        }
    }

    async viewScheduleOptions() {
        try {
            // Assuming there's a function to fetch schedule options based on the courses array
            // This could involve complex logic including calling 3rd party optimizer APIs
            const options = await fetchScheduleOptions(this.courses);
            this.scheduleOptions = options;
            console.log('Schedule options updated successfully.');
        } catch (error) {
            console.error('Error fetching schedule options:', error);
        }
    }

    saveScheduleOption(optionId) {
        try {
            // Assuming each option in scheduleOptions has an ID
            const selectedOption = this.scheduleOptions.find(option => option.id === optionId);
            if (selectedOption) {
                // Save the selected schedule option to the database
                // Assuming there's a helper function to save the selected schedule option
                saveSelectedScheduleOption(this.studentId, selectedOption);
                console.log('Schedule option saved successfully.');
            } else {
                console.log('Selected schedule option not found.');
            }
        } catch (error) {
            console.error('Error saving schedule option:', error);
        }
    }
}

async function fetchScheduleOptions(courses) {
    // Placeholder for fetching schedule options logic
    // This might involve complex logic, including optimization algorithms or API calls
    console.log('Fetching schedule options...');
    // Simulate fetching data
    return Promise.resolve([
        { id: 1, description: 'Option 1', courses },
        { id: 2, description: 'Option 2', courses },
    ]);
}

async function saveSelectedScheduleOption(studentId, selectedOption) {
    // Placeholder for saving the selected schedule option to the database
    console.log(`Saving selected schedule option for student ${studentId}...`);
    // Simulate saving data
    return Promise.resolve(true);
}

// The getCourse function is assumed to be part of the existing codebase,
// fetching course details from the database.

module.exports = { Schedule, fetchScheduleOptions, saveSelectedScheduleOption };

// The following are helper functions and additional functionalities
// that complement your existing code.

/**
 * A utility function that helps in creating references for Firestore documents.
 * This function assumes a structure for your Firestore where collections are
 * named after the type of entities they store.
 */
Helper.createReference = function(collectionName, ids) {
    if (!Array.isArray(ids)) {
        throw new Error('IDs must be an array');
    }
    const db = firestore;
    return ids.map(id => db.doc(`${collectionName}/${id}`));
};

/**
 * A utility function to check if a given object is an instance of a specified class.
 * This is particularly useful to validate if the sections provided to the Course
 * constructor are indeed instances of the Section class.
 */
Helper.isInstance = function(object, className) {
    return object instanceof className;
};

/**
 * Fetches associated IDs for prerequisites, corequisites, and sections.
 * This simulates fetching related document IDs from Firestore references,
 * helping to reconstruct a course object with all necessary relations.
 */
Helper.getAssociatedIDs = async function(references) {
    // Assuming references are Firestore document references,
    // this would fetch the documents and return their IDs.
    // This is a placeholder for demonstration purposes.
    return references.map(ref => ref.id); // This line would actually involve fetching the documents and might look different based on your Firestore setup.
};

// Additional functionality to insert an array of courses into Firestore.
// This function takes a structured object where keys are courseIDs and values are course details.
async function insertArrayOfCourses(courses) {
    for (const courseID of Object.keys(courses)) {
        const courseDetails = courses[courseID];
        const courseObj = new Course(
            courseDetails.name,
            courseDetails.description,
            courseDetails.credits,
            courseDetails.prereqs,
            courseDetails.coreqs,
            courseDetails.sections
        );
        await insertCourse(courseID, courseObj);
    }
}

// Exporting necessary functionalities
module.exports = {
    Course,
    getCourse,
    insertCourse,
    deleteCourse,
    deleteAllCourses,
    getPrereqs,
    getCoreqs,
    getCourseCredit,
    addCourses,
    testing1
};

// This assumes that the implementation of the Course class,
// Firestore setup, and the Helper functions are correctly defined and implemented.
// Make sure to adjust the implementations based on your actual Firestore schema,
// especially for functions like `Helper.createReference` and `Helper.getAssociatedIDs`.



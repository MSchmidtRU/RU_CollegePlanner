const { firestore } = require('./firebase.js');
const Helper = require("./helperFunction.js")
const { Section } = require('./section.js');

class Course {
    constructor(name, description, credit, prereqs, coreqs, sections) {
        this.name = name;
        this.description = description;
        this.credit = credit;
        this.prereqs = prereqs
        this.coreqs = coreqs
        this.sections = Helper.isInstance(sections, Section) ? sections : [];
    }
}
async function getCourse(courseID) {
    try {
        // Reference to the document in the "student" collection
        const courseInfo = firestore.collection("courses").doc(courseID);
        
        // Retrieve the document data
        const doc = await courseInfo.get();
        if (!doc.exists) {
            throw new Error('Course document not found');
        };
            // Document exists, access its data
            const courseData = doc.data();

            // Fetch basic student info
            const credit = courseData.credit;
            const description = courseData.description;
            const name = courseData.name;

            const coreqsArray = courseData.coreqs || [];
            const coreqs = await Helper.getAssociatedIDs(coreqsArray);

            const prereqsArray = courseData.prereqs || [];
            const prereqs = await Helper.getAssociatedIDs(prereqsArray);

            const sectionsArray = courseData.sections || [];
            const sections = await Helper.getAssociatedIDs(sectionsArray);

            return new Course(name, description, credit, prereqs, coreqs, sections);

    } catch (error) {
        throw error;
    }
}

async function insertCourse(courseID, course) {
    try {
        if (!(course instanceof Course)) {
            throw "course is not an instance of Course";
        }

        const courseData = {
            name: course.name,
            description: course.description,
            credit: course.credit,
            prereqs: Helper.createReference("courses", course.prereqs),
            coreqs: Helper.createReference("courses", course.coreqs),
            sections: Helper.createReference("sections", course.sections)
        }

        const res = await firestore.collection('courses').doc(courseID).set(courseData);
    } catch (error) {
        console.error('Error saving to Course document:', e);
        throw e;
    }
}

async function validateCourse(netID) 
{
    //for each course in the list of reuired courses for the concentration, if gets all equivelent coruses,  checks if that course is in the student's completed, enrolled, or future courses. If not it checks if
}

async function testing() {
    //let course = new Course("Software Engineering", "Intro to the cocepts of software engeinering", 4, ["14:332:128"], ["14:332:221"], ["14:332:124:01"]);
    //await insertCourse("14:332:400", course);
    console.log(await getCourse('14:332:128'));
}
//testing();

module.exports = { Course, getCourse }
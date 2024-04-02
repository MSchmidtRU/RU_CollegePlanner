const { firestore } = require('./firebase.js');
const Helper = require("./helperFunction.js")
const { FieldValue } = require('firebase-admin/firestore');
const { FutureCourse } = require('./student.js');
const { Course, getCourse } = require('./course.js');

class Concentration {
    constructor(name, courses, residency, sample_schedule) {
        this.name = name;
        this.courses = Helper.isInstance(courses, ConcentrationCourse) ? courses : [];
        this.residency = residency;
        this.sampleSchedule = Helper.isInstance(sample_schedule, FutureCourse) ? sample_schedule : [];
    }
}

class ConcentrationCourse {
    constructor(course, equivelent_courses) {
        this.course = course;
        this.equivelent_courses = equivelent_courses;
    }
}

async function getConcentration(concentrationID) {
    try {
        const concentrationInfo = firestore.collection("concentration").doc(concentrationID);

        // Retrieve the document data
        const doc = await concentrationInfo.get();
        if (!doc.exists) {
            throw new Error('Concentration document not found ~404');
        };

        // Document exists, access its data
        const concentrationData = doc.data();

        // Fetch basic student info
        const name = concentrationData.name;
        const residency = concentrationData.residency;

        const coursesArray = concentrationData.courses || [];
        const courses = await Promise.all(coursesArray.map(async ({ course, equivalent_courses }) => {
            return new ConcentrationCourse(
                course,
                await Helper.getAssociatedIDs(equivalent_courses));
        }));

        const sampleScheudleArray = concentrationData.sample_schedule || [];
        const sample_schedule = await Promise.all(sampleScheudleArray.map(async courseObj => {
            const courseRef = courseObj.course;
            const courseDoc = await courseRef.get();
            if (courseDoc.exists) {
                return new FutureCourse(courseDoc.id, courseObj.semester);
            } else {
                console.log(`Course document ${courseRef.id} does not exist.`);
                return null;
            }
        }));
        return new Concentration(name, courses, residency, sample_schedule);

    }
    catch (error) {
        console.error('Error getting document:', error);
        throw error;
    }
}

async function insertConcentration(concentrationID, concentration) {
    try {
        if (!(concentration instanceof Concentration)) {
            throw "course is not an instance of Course";
        }

        const concentrationData = {
            name: concentration.name,
            courses: [],//Helper.createReference("courses", concentration.courses),
            residency: concentration.residency,
            sample_schedule: [] //I have it so it makes a place in the concentration and then inserts the courses. maybe we should generalize addFutureCourse in the studen file and use it for this too?
        }
        const res = await firestore.collection('concentration').doc(concentrationID).set(concentrationData);

        for (const object of concentration.sampleSchedule) {
            const sampleScheduleData = {
                course: Helper.createReference("courses", object.course),
                semester: object.semester,
            };
            await firestore.collection('concentration').doc(concentrationID).update({ sample_schedule: FieldValue.arrayUnion(sampleScheduleData) });
        }

        for (const object of concentration.courses) {
            const courseData = {
                course: object.course,
                equivelent_courses: Helper.createReference("courses", object.equivelent_courses),
            };
            await firestore.collection('concentration').doc(concentrationID).update({ courses: FieldValue.arrayUnion(courseData) });
        }
        return;
    } catch (error) {
        console.error('Error saving to Course document:', e);
        throw e;
    }
}

async function getCourses(concentrationID) {
    const concentration = await getConcentration(concentrationID);
    return concentration.courses;
}

async function getSample(concentrationID) {
    try {
        const concentrationInfo = await getConcentration(concentrationID);
        return concentrationInfo.sampleSchedule;
    } catch (e) {
        throw (e);
    }
}

//concentration should be Concentraion class
async function getEquivalentCourses(concentrationCourses, courseID) {

    const course = concentrationCourses.find(obj => obj.course === courseID);
    if (!course) {
        throw new Error('No such course requirement for given concentration.');
    }
    return course.equivelent_courses;


}

async function getConcentrationResidency(concentrationID) {
    const concentrationInfo = firestore.collection("concentration").doc(concentrationID);

    const doc = await concentrationInfo.get();
    if (!doc.exists) {
        throw new Error('Concentration document not found ~404');
    };

    return doc.data().residency;

}

async function testing() {
    let test = await getConcentrationResidency('12:189');
    console.log(test);
}

// testing();

module.exports = { Concentration, getSample, getConcentration, getCourses, getEquivalentCourses, getConcentrationResidency };
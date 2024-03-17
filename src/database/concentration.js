const { firestore } = require('./firebase.js');
const Helper = require("./helperFunction.js")
const { FieldValue } = require('firebase-admin/firestore');
const { FutureCourse } = require('./student.js');

class Concentration {
    constructor(name, courses, residency, sample_schedule) {
        this.name = name;
        this.courses = courses;
        this.residency = residency;
        this.sampleSchedule = Helper.isInstance(sample_schedule, FutureCourse) ? sample_schedule : [];
    }
}

async function getConcentration(concentrationID) {
    try {
        const concentrationInfo = firestore.collection("concentration").doc(concentrationID);

        // Retrieve the document data
        const doc = await concentrationInfo.get();

        if (doc.exists) {
            // Document exists, access its data
            const concentrationData = doc.data();

            // Fetch basic student info
            const name = concentrationData.name;
            const residency = concentrationData.residency;

            const coursesArray = concentrationData.courses || [];
            // const courses = await Helper.getAssociatedIDs(coursesArray);

            const courses = {};
            await Promise.all(Object.entries(coursesArray).map(async ([course, references]) => {
                const modifiedReferences = await Helper.getAssociatedIDs(references);
                courses[course] = modifiedReferences;
            }));

            const sampleScheudleArray = concentrationData.sample_schedule || [];
            const sample_schedule = await Promise.all(sampleScheudleArray.map(async courseObj => {
                const courseRef = courseObj.course;
                const courseDoc = await courseRef.get();
                if (courseDoc.exists) {
                    return new FutureCourse(courseDoc.id, courseObj.semester, courseObj.year);
                } else {
                    console.log(`Course document ${courseRef.id} does not exist.`);
                    return null;
                }
            }));
            return new Concentration(name, courses, residency, sample_schedule);
        }

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
            courses: Helper.createReference("courses", concentration.courses),
            residency: concentration.residency,
            sample_schedule: [] //I have it so it makes a place in the concentration and then inserts the courses. maybe we should generalize addFutureCourse in the studen file and use it for this too?
        }
        const res = await firestore.collection('concentration').doc(concentrationID).set(concentrationData);
        concentration.sampleSchedule.forEach(async (object) => {
            const sampleScheduleData = {
                course: Helper.createReference("courses", object.course),
                semester: object.semester,
                year: object.year
            }
            await firestore.collection('concentration').doc(concentrationID).update({ sample_schedule: FieldValue.arrayUnion(sampleScheduleData) });
        });

    } catch (error) {
        console.error('Error saving to Course document:', e);
        throw e;
    }
}

async function getSample(concentrationID) {
    try {
        const concentrationInfo = await getConcentration(concentrationID);

        return concentrationInfo.sampleSchedule;
    } catch (e) {
        throw new Error(e);
    }
}


async function testing() {
    let concentration = new Concentration("Underwater Basket Weaving", ["14:332:128", "14:332:221"], 51, [new FutureCourse("14:332:128", "Winter", 2025)]);
    await insertConcentration("33:555", concentration);
    console.log(await getConcentration('33:555'));
}

// testing();

module.exports = { getSample };
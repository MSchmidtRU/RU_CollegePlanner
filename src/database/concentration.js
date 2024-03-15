const { firestore } = require('../index.js');
const { FutureCourse } = require('./futureCourse.js');
const Helper = require("./helperFunction.js")

class Concentration {
    constructor(name, courses, residency, sample_schedule) {
        this.name = name;
        this.courses = courses;
        this.residency = residency;
        this.sample_schedule = Helper.isInstance(sample_schedule, FutureCourse) ? sample_schedule : [];
    }
}

async function getConcentration(concentrationID)
{
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
            const courses = await Helper.getAssociatedIDs(coursesArray);

            const sampleScheudleArray = concentrationData.sample_schedule || [];
            const sample_schedule = await Promise.all(sampleScheudleArray.map(async courseObj => {
                const courseRef = courseObj.course;
                const courseDoc = await courseRef.get();
                if (courseDoc.exists) {
                    return {
                        id: courseDoc.id,
                        semester: courseObj.semester,
                        year: courseObj.year
                    };
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
            sample_schedule: Helper.createReference("courses", concentration.sample_schedule)
        }

        const res = await firestore.collection('concentration').doc(concentrationID).set(concentrationData);
    } catch (error) {
        console.error('Error saving to Course document:', e);
        throw e;
    }
}



async function testing() {
    let concentraion = new Concentration("Software Engineering Finally", ["14:332:128", "14:332:221"], 51, ["14:332:128", "14:332:221"], [new FutureCourse("14:332:128", "Winter", 2025)]);
    await insertConcentration("111:222", concentraion);
   // console.log(await getCourse('14:332:128'));
}

testing();
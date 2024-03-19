const { firestore } = require('./firebase.js');
const Helper = require("./helperFunction.js")
const { FieldValue } = require('firebase-admin/firestore');
const { FutureCourse } = require('./student.js');
const  {Course, getCourse}  = require('./course.js');

class Concentration {
    constructor(name, courses, residency, sample_schedule) {
        this.name = name;
        this.courses = Helper.isInstance(courses, ConcentrationCourse) ? courses : [];
        this.residency = residency;
        this.sampleSchedule = Helper.isInstance(sample_schedule, FutureCourse) ? sample_schedule : [];
    }
}

class ConcentrationCourse{
    constructor(course, equivelent_courses) {
        this.course = course;
        this.equivelent_courses = equivelent_courses;//Helper.isInstance(equivelent_courses, Course) ? equivelent_courses : []; //TODO ideally should check that the course is not also in the equivelent_courses
    }
}

async function getConcentration(concentrationID) {
    try {
        const concentrationInfo = firestore.collection("concentration").doc(concentrationID);

        // Retrieve the document data
        const doc = await concentrationInfo.get();
        if (!doc.exists) {
            throw new Error('Concentration document not found');
        };

            // Document exists, access its data
            const concentrationData = doc.data();

            // Fetch basic student info
            const name = concentrationData.name;
            const residency = concentrationData.residency;

            const coursesArray = concentrationData.courses || [];
            const courses = await Promise.all(coursesArray.map(async courseObj => {
                        return new ConcentrationCourse(
                            courseObj.course,
                            await Helper.getAssociatedIDs(courseObj.equivelent_courses));
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
    catch (error) {
        //console.error('Error getting document:', error);
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
                year: object.year
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

async function getSample(concentrationID) {
    try {
        const concentrationInfo = await getConcentration(concentrationID);

        return concentrationInfo.sampleSchedule;
    } catch (e) {
        throw new Error(e);
    }
}

async function getEquivelentCourses(concentrationID, courseID)
{
    try{
        const concentration = await getConcentration(concentrationID);
        const courses = concentration.courses;
        const course = courses.find(obj => obj.course === courseID);
        if(!course)
        {
            throw new Error('No such course requirement for given concentration.');
        }
        return course.equivelent_courses;
    }catch(e){
        throw e;
    }
   
}


async function testing() {//FIXME there's a bit of a timing issue when I insert a course and then get it right after
    //let concentration = new Concentration("Testing", [new ConcentrationCourse('14:332:128', ['14:332:400', '14:332:221']), new ConcentrationCourse('14:332:400', ['14:332:128', '14:332:221'])], 51, [new FutureCourse("14:332:128", "Winter", 'junior')]);
    //let test = await insertConcentration("12:189", concentration);
    //let concentrationGotten = await getConcentration('12:189');
    //console.log(concentrationGotten);
    // console.log(await getEquivelentCourses('12:189', "14:332:128"));
}

//testing();

module.exports = { getSample };
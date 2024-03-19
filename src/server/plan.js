
const Student = require('../database/student.js');
const Concentration = require("../database/concentration.js");
const Course = require("../database/course.js");
const { firestore } = require("../database/firebase.js");


const semesterMap = {
    'fall': 0,
    'winter': 1,
    'spring': 2,
    'summer': 3
};

const yearMap = {
    'freshman': 0,
    'sophomore': 1,
    'junior': 2,
    'senior': 3
};


async function viewPlan(req) {
    try {
        let netID = req.params.netID;
        let jsonFutureCourses;
        if (netID != undefined) {
            let future_courses = await Student.getFutureCourses(netID);
            jsonFutureCourses = future_courses.map(course => {
                return {
                    course: course.course,
                    semester: course.semester,
                    year: course.year
                };
            });
            return [JSON.stringify(jsonFutureCourses), 200];
        } else {
            throw new Error("net id is not defined");
        }

    } catch (e) {
        throw new Error(e);
    }
}

function viewStatus(req) {
    return [`view status endpoint - param: ${req.params.netID}`, 200]
}

async function addCourse(req) {
    try {
        const body = parseJson(req.body);
        const futureCourse = new Student.FutureCourse(body.courseID, body.semester, body.year);
        let updatedPlan = await Student.addFutureCourse(req.params.netID, futureCourse);
        return [JSON.stringify(updatedPlan), 200, "plain/text"];
    } catch (e) {
        throw new Error(e);
    }
}

async function removeCourse(req) {
    try {
        const body = parseJson(req.body);
        let updatedPlan = await Student.removeFutureCourse(req.params.netID, body.courseID);
        return [JSON.stringify(updatedPlan), 200, "plain/text"];
    } catch (e) {
        throw new Error(e);
    }
}


async function viewSample(req) {
    const sampleScheudule = await Concentration.getSample(req.params.concentrationID);
    return [JSON.stringify(sampleScheudule), 200];
}

async function validatePlan(req) {
    try {
        let netID = req.params.netID;
        let concentrationID = req.params.concentrationID;
        if (netID != undefined && concentrationID != undefined) {
            let futureCourses = await Student.getFutureCourses(req.params.netID);
            let courses = await Promise.all(futureCourses.map(async futureCourse => {
                return {
                    course: futureCourse,
                    prereqs: await Course.getPrereqs(futureCourse.course),
                    coreqs: await Course.getCoreqs(futureCourse.course),
                }
            }))
            let valid = validatePreCoReqs(courses);
            // let concentrationCourses = await Concentration.getCourses(concentrationID);

            //validate concentration reqs with equi classes

            return [`validate plan endpoint - param: ${req.params}`, 200]
        } else {
            throw new Error("netID or concentration ID is not defined");
        }
    } catch (e) {
        throw new Error(e);
    }
}
function validatePreCoReqs(courseObjs) {
    courseObjs.forEach(courseObj => {
        const { course, prereqs, coreqs } = courseObj;

        // Convert semester and year strings to numerical values
        const { semester, year } = course;
        const semesterNumber = semesterMap[semester];
        const yearNumber = yearMap[year];

        prereqs.forEach(prereqID => {
            const prereqCourse = courseObjs.find(obj => obj.course.course === prereqID);
            if (!prereqCourse) {
                console.log(`Error: Course ${course.course} has invalid prereq ${prereqID}`);
                return;
            }

            const { semester: prereqSemester, year: prereqYear } = prereqCourse.course;
            const prereqSemesterNumber = semesterMap[prereqSemester];
            const prereqYearNumber = yearMap[prereqYear];

            if (!(yearNumber > prereqYearNumber || (yearNumber === prereqYearNumber && semesterNumber >= prereqSemesterNumber))) {
                console.log(`Error: Course ${course.course} has invalid prereq ${prereqID}`);
            }
        });

        coreqs.forEach(coreqID => {
            const coreqCourse = courseObjs.find(obj => obj.course.course === coreqID);
            if (!coreqCourse) {
                console.log(`Error: Course ${course.course} has invalid coreq ${coreqID}`);
                return;
            }

            const { semester: coreqSemester, year: coreqYear } = coreqCourse.course;
            const coreqYearNumber = yearMap[coreqYear];
            const coreqSemseterNumber = semesterMap[coreqSemester]

            if (!(yearNumber > coreqYearNumber || (yearNumber === coreqYearNumber && semesterNumber >= coreqSemseterNumber))) {
                console.log(`Error: Course ${course.course} has invalid coreq ${coreqID}`);
            }
        });

    });

}
function optimizePlan(req) {
    return [`optimize plan endpoint - param: ${req.params}`, 200]
}


async function savePlan(req) {
    try {
        let netID = req.params.netID;
        let coursesToSave = req.body;
        const res = await firestore.collection('student').doc(netID).update({ future_courses: [] });

        for (const course of coursesToSave) {

            let courseSaving = new Student.FutureCourse(course.courseID, course.semester, course.year);
            await Student.addFutureCourse(netID, courseSaving);
        }
        return ['Success saving new plan!', 200, "plain/text"];
    } catch (e) {
        throw new Error(e);
    }
}

async function testing() {
    courseObjs = [{ course: { course: 'CSC101', semester: 'spring', year: 'freshman' }, prereqs: ['CSC100'], coreqs: [] },
    { course: { course: 'CSC100', semester: 'fall', year: 'freshman' }, prereqs: [], coreqs: [] },
    { course: { course: "CSC200", semester: "spring", year: "sophomore" }, prereqs: ["CSC100"], coreqs: ["MAT150"] },
    { course: { course: "MAT150", semester: "fall", year: "sophomore" }, prereqs: ["MAT100"], coreqs: [] },
    { course: { course: "MAT100", semester: "spring", year: "freshman" }, prereqs: [], coreqs: [] },
    { course: { course: "PHY200", semester: "fall", year: "junior" }, prereqs: ["PHY100", "MAT150"], coreqs: [] },
    { course: { course: "ENG200", semester: "spring", year: "sophomore" }, prereqs: ["ENG100"], coreqs: [] },
    { course: { course: "ENG100", semester: "fall", year: "sophomore" }, prereqs: ["ENG100"], coreqs: [] },
    { course: { course: "PHY100", semester: "spring", year: "sophomore" }, prereqs: [], coreqs: [] }
    ];
    validatePreCoReqs(courseObjs);
}
testing();

module.exports = { viewPlan, viewStatus, addCourse, removeCourse, viewSample, validatePlan, optimizePlan, savePlan }
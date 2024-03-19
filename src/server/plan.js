
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
            let future_courses = (await Student.getStudent(netID)).futureCourses;//getFutureCourses(netID);
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
        let validPreCoReq = validatePreCoReqs(courses);
        let validConcentrationCourses = validateConcentrationCourses(concentrationID, futureCourses);
        // let concentrationCourses = await Concentration.getCourses(concentrationID);

        //validate concentration reqs with equi classes

        return [`validate plan endpoint - param: ${req.params}`, 200]
    } else {
        throw new Error("netID or concentration ID is not defined");
    }

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




function validatePreCoReqs(courseObjs) {
    courseObjs.forEach(courseObj => {
        const { course, prereqs, coreqs } = courseObj;

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

async function validateConcentrationCourses(concentrationID, studentCourses) {
    const concentration = await Concentration.getConcentration(concentrationID);
    const concentrationCourses = concentration.courses;

    let fulfilledCourses = {}

    concentrationCourses.forEach(async concentrationCourse => {
        let equivelentCourses = Concentration.getEquivelentCourses(concentration, concentrationCourse.course);
        let courses = [concentrationCourse.course, ...equivelentCourses];

        fulfilledCourses[concentrationCourse.course] = studentCourses.filter(course => courses.includes(course));

    });

    const assingedCourses = assignCourses(fulfilledCourses);

    return assingedCourses;

}

function assignCourses(courseObject) {
    const refinedMap = {};
    const unusedIds = new Set(Object.values(courseObject).flat());
    const usedIds = new Set();

    // Assign IDs to courses based on uniqueness and shared usage
    for (const course of Object.keys(courseObject)) {
        const ids = courseObject[course];
        let selectedId = null;
        let minShared = Infinity;

        for (const id of ids) {
            if (!usedIds.has(id)) {
                const sharedCount = Object.values(courseObject).filter(courses => courses.includes(id)).length;
                if (sharedCount < minShared) {
                    selectedId = id;
                    minShared = sharedCount;
                }
            }
        }

        if (selectedId !== null) {
            refinedMap[course] = selectedId;
            usedIds.add(selectedId);
            unusedIds.delete(selectedId);
        } else {
            refinedMap[course] = undefined;
        }
    }

    const unassignedCourses = Object.keys(courseObject).filter(course => refinedMap[course] === undefined);

    return { fulfilled: unassignedCourses.length == 0, refinedMap, unassignedCourses, unusedIds: Array.from(unusedIds) };
}

async function validateResidency(resReq, netID, concentration) //(51, 'ach127','14:332')
{// FIXME this fucntion is slow
    try {
        const concentrationInfo = firestore.collection("concentration").doc(concentration);

        const doc = await concentrationInfo.get();
        if (!doc.exists) {
            throw new Error('Concentration document not found');
        };
        let student = await Student.getStudent(netID);
        let currently_enrolled = student.enrolledCourses;
        let completed_courses = student.completedCourses;
        let futurecoursesObject = student.futureCourses;
        let future_courses = [];
        futurecoursesObject.forEach(course => {
            future_courses.push(course.course);
        });
        let totalCourses = currently_enrolled.concat(completed_courses, future_courses);

        let residencyCredits = 0;
        if (totalCourses) {
            for (const course of totalCourses) {
                let school = course.substring(0, course.lastIndexOf(':'));
                if (school == concentration) {
                    let courseObj = await Course.getCourse(course);
                    residencyCredits += courseObj.credit;
                    console.log(residencyCredits);
                }
            }

            if (residencyCredits < resReq) {
                return false;
            }
            return true;
        }

        return false;

    } catch (e) {
        throw e;
    }
}



async function testing() {
    // courseObjs = [{ course: { course: 'CSC101', semester: 'spring', year: 'freshman' }, prereqs: ['CSC100'], coreqs: [] },
    // { course: { course: 'CSC100', semester: 'fall', year: 'freshman' }, prereqs: [], coreqs: [] },
    // { course: { course: "CSC200", semester: "spring", year: "sophomore" }, prereqs: ["CSC100"], coreqs: ["MAT150"] },
    // { course: { course: "MAT150", semester: "fall", year: "sophomore" }, prereqs: ["MAT100"], coreqs: [] },
    // { course: { course: "MAT100", semester: "spring", year: "freshman" }, prereqs: [], coreqs: [] },
    // { course: { course: "PHY200", semester: "fall", year: "junior" }, prereqs: ["PHY100", "MAT150"], coreqs: [] },
    // { course: { course: "ENG200", semester: "spring", year: "sophomore" }, prereqs: ["ENG100"], coreqs: [] },
    // { course: { course: "ENG100", semester: "fall", year: "sophomore" }, prereqs: ["ENG100"], coreqs: [] },
    // { course: { course: "PHY100", semester: "spring", year: "sophomore" }, prereqs: [], coreqs: [] }
    // ];
    // validatePreCoReqs(courseObjs);
    // // let student = await Student.getStudent('ach127');
    // //console.log(await validateResidency(31, 'nss170', '14:332'));
    // console.log(await viewPlan('nss170'));

    const courseObject = {
        'course1': ['ID4', 'ID3', 'ID9'],
        'course2': ['ID5', 'ID4', 'ID7'],
        'course3': ['ID5', 'ID7'],
        'course4': ['ID5']
    };

    const result = assignCourses(courseObject);
    console.log(result);
}
testing();

module.exports = { viewPlan, viewStatus, addCourse, removeCourse, viewSample, validatePlan, optimizePlan, savePlan }
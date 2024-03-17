
const Student = require('../database/student.js');

async function viewPlan(req) {
    let netID = req.params.netID;
    let student = await Student.getStudent(netID)
    let future_courses = student.futureCourses;
    let jsonFutureCourses = future_courses.map(course => {
        return {
            course: course.course,
            semester: course.semester,
            year: course.year
        };
    });
    console.log(jsonFutureCourses);
    return [JSON.stringify(jsonFutureCourses), 200];
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


function viewSample(req) {
    return [`view sample endpoint - param: ${req.params}`, 200]
}

function validatePlan(req) {
    return [`validate plan endpoint - param: ${req.params}`, 200]
}

function optimizePlan(req) {
    return [`optimize plan endpoint - param: ${req.params}`, 200]
}

function savePlan(req) {
    //return [`save plan endpoint - param: ${req.params}`, 200]
    //let netID = req.params.netID;
    //let coursesToSave = req.params.body;
}

async function testing() {
    console.log(await viewPlan('nss170'));
}
//testing();

module.exports = { viewPlan, viewStatus, addCourse, removeCourse, viewSample, validatePlan, optimizePlan, savePlan }
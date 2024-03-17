const { firestore } = require('../index.js');
const { FutureCourse } = require("../database/futureCourse.js");
const  StudentFunction  = require('../database/student.js');

async function viewPlan(req) {
    let netID = req.params.netID;
    let student = await StudentFunction.getStudent(netID)
    let future_courses = student.futureCourses;
    let jsonFutureCourses = future_courses.map(course => {
        return {
          course: course.course,
          semester: course.semester,
          year: course.year
        };
      });
      return jsonFutureCourses;
    //return [`view plan endpoint - param: ${req.params.netID}`, 200]
}

function viewStatus(req) {
    return [`view status endpoint - param: ${req.params.netID}`, 200]
}

async function addCourse(req) {
    try {
        const body = req.body;
        const futureCourse = new FutureCourse(body.courseID, body.semester, body.year);
        let updatedPlan = await addFutureCourse(req.params.netID, futureCourse);
        return [updatedPlan, 200, "plain/text"];
    } catch (e) {

    }
    // return [`add course endpoint - param: ${req.params.course}`, 200]
}

function removeCourse(req) {
    return [`remove course endpoint - param: ${req.params.course}`, 200]
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

async function testing()
{
    console.log(await viewPlan('nss170'));
}
testing();

module.exports = { viewPlan, viewStatus, addCourse, removeCourse, viewSample, validatePlan, optimizePlan, savePlan }
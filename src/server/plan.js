
const Student = require("../database/student");


function viewPlan(req) {
    return [`view plan endpoint - param: ${req.params.netID}`, 200]
}

function viewStatus(req) {
    return [`view status endpoint - param: ${req.params.netID}`, 200]
}

async function addCourse(req) {
    try {
        const body = req.body;
        const futureCourse = new Student.FutureCourse(body.courseID, body.semester, body.year);
        let updatedPlan = await Student.addFutureCourse(req.params.netID, futureCourse);
        return [JSON.stringify(updatedPlan), 200, "plain/text"];
    } catch (e) {
        throw new Error(e);
    }
}

async function removeCourse(req) {
    try {
        const body = req.body;
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
    return [`save plan endpoint - param: ${req.params}`, 200]
}


module.exports = { viewPlan, viewStatus, addCourse, removeCourse, viewSample, validatePlan, optimizePlan, savePlan }
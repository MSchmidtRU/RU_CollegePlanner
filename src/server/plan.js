
function viewPlan(req) {
    return [`view plan endpoint - param: ${req.params}`, 200]
}

function viewStatus(req) {
    return [`view status endpoint - param: ${req.params.netID}`, 200]
}

function addCourse(req) {
    return [`add course endpoint - param: ${req.params}`, 200]
}

function removeCourse(req) {
    return [`remove course endpoint - param: ${req.params}`, 200]
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
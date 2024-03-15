
const plan = require("./plan");
//4 year plan endpoints\
const endpoints = {
    "/4yrplan/:netID": plan.viewPlan,
    "/4yrplan/:netID/status": plan.viewStatus,
    "/4yrplan/:course": plan.addCourse,
    "/4yrplan/:course/sample": plan.viewSample,
    "/4yrplan/:netID/validate": plan.validatePlan,
    "/4yrplan/:netID/optimize": plan.optimizePlan,
    "/4yrplan/:netID/save": plan.savePlan
}


module.exports = { endpoints };
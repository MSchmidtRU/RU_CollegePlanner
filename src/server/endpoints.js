
const plan = require("./plan");
const schedule=require("src/database/scheduling.js");


const getEndpoints = {
   "/4yrplan/~netID": plan.viewPlan,
   "/4yrplan/~netID/status": plan.viewStatus,
   "/4yrplan/~concentrationID/sample": plan.viewSample,
   "/4yrplan/~netID/validate": plan.validatePlan,
   "/4yrplan/~netID/optimize": plan.optimizePlan,
   "/UpcomingSchedule/~netID/viewschedule":schedule.viewSchedule,
}


const postEndpoints = {
   "/4yrplan/~netID/course": plan.addCourse,
   "/UpcomingSchedule/~netID/addcoursetoschedule":schedule.addCourseToSchedule,
}


const deleteEndpoints = {
   "/4yrplan/~netID/course": plan.removeCourse,
}


const putEndpoints = {
   "/4yrplan/~netID/save": plan.savePlan,
   "/UpcomingSchedule/~netID/saveschedule": schedule.saveSchedule,
}


const methods = {
   "GET": getEndpoints,
   "POST": postEndpoints,
   "DELETE": deleteEndpoints,
   "PUT": putEndpoints
}


module.exports = { methods, getEndpoints, postEndpoints, deleteEndpoints, putEndpoints };

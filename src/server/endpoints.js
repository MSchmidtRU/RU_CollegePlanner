
const plan = require("./plan");
//const schedule=require("src/database/scheduling.js");
const csearch = require("./concentration_search/concentration_search.js")
const academicProgess = require('../database/academicProgess');
const adminAcademicProgress = require('../database/adminAcademicProgress.js');


const getEndpoints = {
   "/4yrplan/~netID": plan.viewPlan,
   "/4yrplan/~netID/status": plan.viewStatus,
   "/4yrplan/~concentrationID/sample": plan.viewSample,
   "/4yrplan/~netID/validate": plan.validatePlan,
   "/4yrplan/~netID/optimize": plan.optimizePlan,
   "/csearch/~netID/concentrationSearch": csearch.concentrationSearch,
   "/csearch/~netID/concentrationSearch-Filtered": csearch.filteredSearch,
   "/csearch/~netID/viewConcentration": csearch.viewConcentration,
   "/csearch/~netID/filteredSearch": csearch.filteredSearch,
   //"/UpcomingSchedule/~netID/viewschedule":schedule.viewSchedule,
}


const postEndpoints = {
   "/4yrplan/~netID/course": plan.addCourse,
  // "/UpcomingSchedule/~netID/addcoursetoschedule":schedule.addCourseToSchedule,
   "/academicProgress/~netID": academicProgess.academicProgressHandler,
   "/academic-progress/~adminNetID/~studentNetID": adminAcademicProgress.adminAcademicProgressHandler

}


const deleteEndpoints = {
   "/4yrplan/~netID/course": plan.removeCourse,
}


const putEndpoints = {
   "/4yrplan/~netID/save": plan.savePlan,
   //"/UpcomingSchedule/~netID/saveschedule": schedule.saveSchedule,
}


const methods = {
   "GET": getEndpoints,
   "POST": postEndpoints,
   "DELETE": deleteEndpoints,
   "PUT": putEndpoints
}


module.exports = { methods, getEndpoints, postEndpoints, deleteEndpoints, putEndpoints };

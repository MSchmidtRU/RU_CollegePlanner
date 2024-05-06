
const plan = require("./plan");
const schedule=require("../database/scheduling.js");
const academicProgess = require('../database/academicProgess');
const adminAcademicProgress = require('../database/adminAcademicProgress.js');
const csearch = require("./concentration_search/concentration_search.js");
const courses = require("./catalog.js");


const getEndpoints = {
   // "/4yrplan": plan.viewPlan,
   "/4yrplan": plan.viewPlan,
   "/4yrplan/status": plan.viewStatus,
   "/4yrplan/~concentrationID/sample": plan.viewSample,
   "/4yrplan/validate": plan.validatePlan,
   "/academicProgress/~netID": academicProgess.academicProgressHandler,
   "/academic-progress/admin/~adminNetID/~studentNetID": adminAcademicProgress.adminAcademicProgressHandler,
      //"/UpcomingSchedule/~netID/viewschedule":schedule.viewSchedule,
   "/csearch/~netID/concentrationSearch": csearch.concentrationSearch,
   "/csearch/~netID/viewConcentration": csearch.viewConcentration,
   "/courseCatalog/all" : courses.allCourses, 
   "/courseCatalog/search/~query" : courses.searchCourses,
   "/courseCatalog/~courseID" : courses.getCourse,
}


const postEndpoints = {
   "/4yrplan/course": plan.addCourse,
   "/4yrplan/optimize": plan.optimizePlan,
   // "/UpcomingSchedule/~netID/addcoursetoschedule":schedule.addCourseToSchedule,


}


const deleteEndpoints = {
   "/4yrplan/course": plan.removeCourse,
}


const putEndpoints = {
   "/4yrplan/save": plan.savePlan,
   "/UpcomingSchedule/~netID/saveschedule": schedule.saveSchedule,
}


const methods = {
   "GET": getEndpoints,
   "POST": postEndpoints,
   "DELETE": deleteEndpoints,
   "PUT": putEndpoints
}


module.exports = { methods, getEndpoints, postEndpoints, deleteEndpoints, putEndpoints };

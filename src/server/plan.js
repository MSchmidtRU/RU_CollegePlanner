const { firestore } = require('../index.js');
const  {addFutureCourse, FutureCourse, getStudent }  = require('../database/student.js');

async function viewPlan(req) {
    let netID = req.params.netID;
    let student = await getStudent(netID)
    let future_courses = student.futureCourses;
    if(!future_courses)
    {
        return ['No plan', 'text.plain'];
    }
    let jsonFutureCourses = future_courses.map(course => {
        return {
            course: course.course,
            semester: course.semester,
            year: course.year
        };
      });
      console.log(jsonFutureCourses);
      return jsonFutureCourses;
    //return [`view plan endpoint - param: ${req.params.netID}`, 200]
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

function validatePlan(req) {
    return [`validate plan endpoint - param: ${req.params}`, 200]
}

function optimizePlan(req) {
    return [`optimize plan endpoint - param: ${req.params}`, 200]
}

async function savePlan(req) {
    //return [`save plan endpoint - param: ${req.params}`, 200]
    let netID = req.params.netID;
    let coursesToSave = req.body;
    const res = await firestore.collection('student').doc(netID).update({ future_courses: [] });
    coursesToSave.forEach(async (course) => {
        const futureCourse = new FutureCourse(course.courseID, course.semester, course.year);
        addFutureCourse(netID, futureCourse);
    });
    return ['Success!', 200, "plain/text"];
}

async function testing()
{
    console.log(await viewPlan('nss170'));
}
//testing();

module.exports = { viewPlan, viewStatus, addCourse, removeCourse, viewSample, validatePlan, optimizePlan, savePlan }
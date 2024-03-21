
const Student = require('../database/student.js');
const Concentration = require("../database/concentration.js");
const Course = require("../database/course.js");
const { firestore } = require("../database/firebase.js");


const semesterMap = {
    'fall': 0,
    'spring': 1,
    'unknown': -1
};

const yearMap = {
    'freshman': 0,
    'sophomore': 1,
    'junior': 2,
    'senior': 3,
    'unknown': -1
};


async function viewPlan(req) {
    try {
        let netID = req.params.netID;
        let jsonFutureCourses;
        if (netID != undefined) {
            let future_courses = await Student.getFutureCourses(netID);
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

        let { isValidOrder, invalidPrereq, invalidCoreqs } = await validatePreCoReqs(futureCourses);

        let {
            isFulfilledConcentationCourses,
            assignedCourses,
            unassignedCourses,
            unusedIds,
        } = await validateConcentrationCourses(concentrationID, futureCourses);

        let { isValidResReq, numMissing } = await validateResidency(concentrationID, futureCourses)

        let data = {
            validatePreCoReqs: {
                isValidOrder,
                invalidPrereq,
                invalidCoreqs
            },
            validateConcentrationCourses: {
                isFulfilledConcentationCourses,
                assignedCourses,
                unassignedCourses,
                unusedIds,
            },
            validateResidency: {
                isValidResReq,
                numMissing
            }
        }

        return [JSON.stringify(data), 200];
    } else {
        throw new Error("netID or concentration ID is not defined");
    }

}

async function isValidPlan(netID, concentrationID) {
    const req = {
        params: {
            netID: netID,
            concentrationID: concentrationID
        }
    }
    let [data, code] = await isValidPlan(req);

    return data.validatePreCoReqs.isValidOrder && data.validateConcentrationCourses.isFulfilledConcentationCourses && data.validateResidency.isValidResReq;
}

async function optimizePlan(req) {
    try {
        let netID = req.params.netID;
        let concentrationID = req.params.concentrationID;
        let method = req.params.method;
        let futureCourses = req.body.futureCourses;

        if ((netID == undefined) || (concentrationID == undefined) || (content == undefined) || (method == undefined)) {
            throw new Error("Undefined parameter");
        }

        if (method == 'quickest') {
            let result = await fillInSemesterQuickestOptimize(futureCourses);
        }
        if (method == 'balanced') {
            let result = await fillInSemesterBalancedOptimize(futureCourses);
        }
        else {
            throw new Error("Invalid method of optimization.");
        }

    } catch (e) {
        throw e;
    }


    //return [`optimize plan endpoint - param: ${req.params}`, 200]
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

async function fillInSemesterQuickestOptimize(futureCourses) {
    try {

        let futureCoursesData = []; //array of objects: {courseID, prereq, coreq}
        for (const course of futureCourses) {
            const prereqs = await Course.getPrereqs(course.courseID);
            const coreqs = await Course.getCoreqs(course.courseID);
            const credit = course.credit;
            futureCoursesData.push({ courseID: course.courseID, prereqs: prereqs, coreqs: coreqs, credit: credit });
        }

        let futureCoursesIDs = futureCoursesData.forEach(course => {
            course.courseID;
        })

        //checking that all pre and coreqs exist in the future courses
        let errorsInExistanceOfCourses = '';
        for (const course of futureCoursesData) {
            const requiredInList = course.prereqs.concat(course.coreqs);
            for (const courseReqID of requiredInList) {
                if (!(futureCoursesIDs.includes(courseReqID))) {
                    errorsInExistanceOfCourses += `${course.courseID} has ${courseReqID} listed as a pre or coreq, but it is not listed in your plan.`;
                }
            }
        }
        if (errorsInExistanceOfCourses != '') {
            throw new Error(errorsInExistanceOfCourses);
          }
          //check whether there are any conflicts in the set courses- courses that are coreqs set for different semesters, pre-coreq switched

          //time to create a map of the courses and their pre/co situation
          let combinedCourses = new Map();
          for (let course of futureCoursesData) {
            let combinedCourseID = [course.courseID, ...course.coreqs].sort().join("-");
            if (!combinedCourses.has(combinedCourseID)) {
                combinedCourses.set(combinedCourseID, {
                    courseID: combinedCourseID,
                    credit: course.credit,
                    prereqs: course.prereqs, //assuming all coreqs have the same prereqs
                  });
            }
            else {
                // If this combination of courses is already in the map, update the creditCount
                combinedCourses.get(combinedCourseID).credit += course.credit;
              }
          }

          //time to put the courses into a heiarchal tree
          let courseTree = new Map();

          for (let [courseID, course] of combinedCourses) {
            // Add the course to the course tree
            if (!courseTree.has(courseID)) {
              courseTree.set(courseID, {
                courseID: courseID,
                credit: course.credit,
                prereqs: course.prereqs,
                coreqs: course.coreqs,
                children: []
              });
            }
          
            // Add the course as a child of its prerequisites
            for (let prereq of course.prereqs) {
              let foundPrerequisite = [...courseTree.keys()].find(key => key.includes(prereq));
              if (foundPrerequisite) {
                // If a course with a matching prerequisite is found, add the current course as its child
                courseTree.get(foundPrerequisite).children.push(courseID); //it pushes the courseID as a child of the prereq
              }
            }
          }

          
          let semesterCourses = new Array(8).fill(0).map(() => []); //gonna store the plan
          let semesterCreditCounts = [0,0,0,0,0,0,0,0]
        
          //put all courses with pre-assigned semesters into the plan
          for (let course of futureCourses) {
            if (course.semester !== undefined) {

                let finalDepth = findLengthOfPrereqChain(courseTree, course.courseID); //TODO may need an await //figures out how many courses in a chain of pre-req after pre-req depend on this course
                
                if(finalDepth > (8-course.semester)) //if the number of semesters left after you take this course is greater than the number of courses in a pre-req after pre-req chain depend on this course
                {
                    throw new Error(`The course(s) ${course.courseID} is/are placed late in your plan for you to complete all the courses listed.`)
                }
                else
                {
                    let finalHeight = findDistanceToNoPrereq(courseTree, course.courseID); //TODO may need await
                    if(finalHeight > course.semester) //if it's got more prereqs than you've allowed semesters before you plan to take it
                    {
                        throw new Error(`The course(s) ${course.courseID} is placed too early in the semester such that there is not enough time for you to complete the pre-reqs required to take this course`)
                    }
                    else
                    {
                        semesterCourses[course.semester].push(course);
                        semesterCreditCounts[course.semester] += course.credit;
                        if(finalDepth == (8-course.semester))
                        {
                            //for loop that inserts all the courses that come after this one, one per semester, assuming the semesters have space. if they don't have space then send error bc this schedule is impossible
                        }
                        
                    }
                }
                //semesterCourses[course.semester].push(course);
                //semesterCreditCounts[course.semester] += course.credit;
            }
          }
/*
          //assign semesters for unfixed courses. most of the time if the student was reasonable, courses will be placed before their prereqs
          for (let course of sortedCourses) {//FIXME
            if (course.semester === undefined) {
                let creditToFit = course.credit;
                const earlierstSemester = semesterCreditCounts.findIndex(number => (19-number-creditToFit) >= 0);
              if (earlierstSemester !== -1) {
                semesterCourses[earlierstSemester].push(course);
              }
              else{
                throw new Error('There is no way to fit all your courses into the schedule, given the courses you labeled as fixed.')
              }
            }
          }
*/   
    

    }catch(e){
        throw e;
    }
    
    

}

function findLengthOfPrereqChain(courseTree, courseID)
    {
        let finalDepth = 0;
        let visited = new Set();
        
        dfs(courseID, 0);

        function dfs(courseID, depth) {
            visited.add(courseID);
            finalDepth = Math.max(finalDepth, depth);
            let course = courseTree.get(courseID);
            for (let child of course.children) {
              if (!visited.has(child)) {
                dfs(child, depth + 1);
              }
            }
          }

          return finalDepth;
    }

    function findDistanceToNoPrereq(courseTree, givenCourseID) {
        let queue = [{ courseID: givenCourseID, level: 0 }];
        let visited = new Set();
    
        while (queue.length > 0) {
            let { courseID, level } = queue.shift();
            visited.add(courseID);
    
            let course = courseTree.find(course => course.courseID === courseID);
            if (!course.prereq || course.prereq.length === 0) {
                return level; // Distance found
            }
    
            for (let prereq of course.prereq) {
                if (!visited.has(prereq)) {
                    queue.push({ courseID: prereq, level: level + 1 });
                }
            }
        }
    
        return -1; // No course without prerequisites found
    }


async function fillInSemesterBalancedOptimize(futureCourses) {
    let unassignedCourses = [];
    let assignedCourses = [];

    //seperate assigned and unassigned courses
    for (const course of futureCourses) {
        if (course.semester && course.year) {
            assignedCourses.push(course);
        } else {
            unassignedCourses.push(course);
        }
    }

    let isValidPreCoReq = validatePreCoReqs(assignedCourses, false);


    if (!isValidPreCoReq) {
        throw new Error("Locked courses are not in a valid order"); //TODO fix that the validate function doesnt send error if not exist - only checks if there is direct conflict
    }

    const creditLoads = {
        winter: { freshman: 0, sophomore: 0, junior: 0, senior: 0 },
        spring: { freshman: 0, sophomore: 0, junior: 0, senior: 0 }
    };


    unassignedCourses.sort((a, b) => {
        const courseA = parseInt(a.course.split(':').pop());
        const courseB = parseInt(b.course.split(':').pop());
        return courseA - courseB;
    });

    for (const course of unassignedCourses) {
        const minSemester = Object.keys(creditLoads).reduce((a, b) => creditLoads[a][course.year] < creditLoads[b][course.year] ? a : b);
        const minYear = Object.keys(creditLoads[minSemester]).reduce((a, b) => creditLoads[minSemester][a] < creditLoads[minSemester][b] ? a : b);

        const preReqs = await Course.getPrereqs(course.course);
        const coReqs = await Course.getCoreqs(course.course);

        // Check prerequisites
        const prerequisitesSatisfied = course.prerequisites.every(prerequisite => assignedCourses.some(assignedCourse => assignedCourse.id === prerequisite));
        if (prerequisitesSatisfied && creditLoads[minSemester][minYear] + course.credits <= 19) {
            creditLoads[minSemester][minYear] += course.credits;
            assignedCourses.push({ ...course, semester: minSemester, year: minYear });
        } else {
            // If prerequisites are not satisfied or credits exceed the limit, move the course to the end of the unassigned list
            unassignedCourses.push(course);
        }
    }




}


async function validatePreCoReqs(futureCourses, fullPlan = true) {
    let invalidPrereqs = {}
    let invalidCoreqs = {}

    let courseObjs = await Promise.all(futureCourses.map(async futureCourse => {
        return {
            course: futureCourse,
            prereqs: await Course.getPrereqs(futureCourse.course),
            coreqs: await Course.getCoreqs(futureCourse.course),
        }
    }))

    courseObjs.forEach(courseObj => {
        const { course, prereqs, coreqs } = courseObj;

        const { semester, year } = course;
        const semesterNumber = semesterMap[semester];
        const yearNumber = yearMap[year];

        if (semesterNumber == -1 || yearNumber == -1) { return }

        prereqs.forEach(prereqID => {
            const prereqCourse = courseObjs.find(obj => obj.course.course === prereqID);

            if (!prereqCourse) {
                invalidPrereqs = addToInvalidReq(invalidPrereqs, course.course, prereqID);
                return;
            }

            const { semester: prereqSemester, year: prereqYear } = prereqCourse.course;
            const prereqSemesterNumber = semesterMap[prereqSemester];
            const prereqYearNumber = yearMap[prereqYear];

            if (prereqSemesterNumber == -1 || prereqYearNumber - 1) {
                if (fullPlan) { invalidPrereqs = addToInvalidReq(invalidPrereqs, course.course, prereqID) }
                return;
            }

            if (!(yearNumber > prereqYearNumber || (yearNumber === prereqYearNumber && semesterNumber >= prereqSemesterNumber))) {
                invalidPrereqs = addToInvalidReq(invalidPrereqs, course.course, prereqID);
            }
        });

        coreqs.forEach(coreqID => {
            const coreqCourse = courseObjs.find(obj => obj.course.course === coreqID);
            if (!coreqCourse) {
                invalidCoreqs = addToInvalidReq(invalidCoreqs, course.course, coreqID);
                return;
            }

            const { semester: coreqSemester, year: coreqYear } = coreqCourse.course;
            const coreqYearNumber = yearMap[coreqYear];
            const coreqSemseterNumber = semesterMap[coreqSemester];

            if (coreqSemseterNumber == -1 || coreqYearNumber - 1) {
                if (fullPlan) { invalidCoreqs = addToInvalidReq(invalidCoreqs, course.course, coreqID); }
                return;
            }


            if (!(yearNumber > coreqYearNumber || (yearNumber === coreqYearNumber && semesterNumber >= coreqSemseterNumber))) {
                invalidCoreqs = addToInvalidReq(invalidCoreqs, course.course, coreqID);
            }
        });

    });

    return { isValidOrder: (invalidCoreqs.length == 0 && invalidPrereqs.length == 0), invalidPrereqs: invalidPrereqs, invalidCoreqs: invalidCoreqs }
}

async function testing1() {
    courseObjs = [{ course: { course: 'CSC101', semester: 'spring', year: 'freshman' }, prereqs: ['CSC100'], coreqs: [] },
    { course: { course: 'CSC100', semester: 'fall', year: 'freshman' }, prereqs: [], coreqs: [] },
    { course: { course: "CSC200", semester: "spring", year: "sophomore" }, prereqs: ["CSC100"], coreqs: ["MAT150"] },
    { course: { course: "MAT150", semester: "fall", year: "sophomore" }, prereqs: ["MAT100"], coreqs: [] },
    { course: { course: "MAT100", semester: "spring", year: "freshman" }, prereqs: [], coreqs: [] },
    { course: { course: "PHY200", semester: "fall", year: "junior" }, prereqs: ["PHY100", "MAT150"], coreqs: [] },
    { course: { course: "ENG200", semester: "spring", year: "sophomore" }, prereqs: ["ENG100"], coreqs: [] },
    { course: { course: "ENG100", semester: "fall", year: "sophomore" }, prereqs: ["ENG100"], coreqs: [] },
    { course: { course: "PHY100", semester: "spring", year: "sophomore" }, prereqs: [], coreqs: [] }
    ];
    validatePreCoReqs(courseObjs);
    // let student = await Student.getStudent('ach127');
    //console.log(await validateResidency(31, 'nss170', '14:332'));
    console.log(await viewPlan('nss170'));
}

function addToInvalidReq(obj, course, invalidPrereq) {
    if (!obj[course]) {
        // If it doesn't exist, create a new array with the courseName
        obj[course] = [invalidPrereq];
    } else {
        // If it exists, push the courseName to the existing array
        obj[course].push(invalidPrereq);
    }

    return obj;

}
async function validateConcentrationCourses(concentrationID, studentCourses) {
    const concentrationCourses = await Concentration.getCourses(concentrationID);

    let fulfilledCourses = {}

    concentrationCourses.forEach(async concentrationCourse => {
        let equivelentCourses = await Concentration.getEquivelentCourses(concentrationID, concentrationCourse.course);
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

    const assignedCourses = Object.keys(courseObject).filter(course => refinedMap[course] === undefined);

    return { isFulfilledConcentationCourses: assignedCourses.length == 0, refinedMap, assignedCourses, unusedIds: Array.from(unusedIds) };
}

async function validateResidency(concentrationID, futureCourses) {
    const residencyReq = await Concentration.getConcentrationResidency(concentrationID);

    let residencyCredits = 0;
    for (const course of futureCourses) {
        let school = course.course.substring(0, course.course.lastIndexOf(':'));
        if (school == concentrationID) {
            let courseObj = await Course.getCourse(course.course);
            residencyCredits += courseObj.credit;
        }
    }

    return { isValidResReq: !(residencyCredits < residencyReq), numMissing: residencyReq - residencyCredits }
}

async function testing2() {
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

async function testing3() {
    const req = {
        params: {
            netID: 'ach127',
            concentrationID: '14:332',
            content: 'fillInSemester',
            method: 'quickest'
        }
    }
    let answer = await optimizePlan(req);
    console.log(answer);
}
testing3();


module.exports = { viewPlan, viewStatus, addCourse, removeCourse, viewSample, validatePlan, optimizePlan, savePlan }
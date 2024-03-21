
const Student = require('../database/student.js');
const Concentration = require("../database/concentration.js");
const Course = require("../database/course.js");
const { firestore } = require("../database/firebase.js");


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
        const futureCourse = new Student.FutureCourse(body.courseID, body.semester);
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

async function optimizePlan(req) {
    try {
        let netID = req.params.netID;
        let method = req.params.method;
        let futureCourses = req.body.futureCourses;

        if ((netID == undefined) || (method == undefined)) {
            throw new Error("Undefined parameter");
        }

        let readyToGo = await isOptimizable(futureCourses);
        return readyToGo;


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

            let courseSaving = new Student.FutureCourse(course.courseID, course.semester);
            await Student.addFutureCourse(netID, courseSaving);
        }
        return ['Success saving new plan!', 200, "plain/text"];
    } catch (e) {
        throw new Error(e);
    }
}

//THUS ENDS COURSES CALLED BY THE SERVER

//isOptamizable and its minions
async function isOptimizable(futureCourses) {
    try {
        let isValidPreCoReq = await validatePreCoReqs(futureCourses, false);

        if (!isValidPreCoReq) {
            throw new Error("Locked courses are not in a valid order");
        }

        //time to build the tree:

        for (let futureCourse of futureCourses) {
            let courseDetails = await Course.getCourse(futureCourse.course);
            futureCourse.prereqs = courseDetails.prereqs;
            futureCourse.coreqs = courseDetails.coreqs;
            futureCourse.credit = courseDetails.credit;
            futureCourse.load = courseDetails.credit + parseInt(futureCourse.course[7]);
        }

        let combinedCourses = [];
        for (let course of futureCourses) {
            let combinedCourseID = [course.course, ...course.coreqs].sort().join("-");

            if (!combinedCourses.some(test => test.courseID == combinedCourseID)) {
                combinedCourses.push({
                    courseID: combinedCourseID,
                    credit: course.credit,
                    load: course.load, // add together the loads of all coreqs
                    prereqs: course.prereqs, //assuming all coreqs have the same prereqs
                    semester: course.semester,
                });
            }
            else {
                // If this combination of courses is already in the map, update the creditCount

                combinedCourses.map(combinedCourse => {
                    if (combinedCourse.courseID === combinedCourseID) {
                        return { ...combinedCourse, ...{ credit: combinedCourse.credit + course.credit, load: combinedCourse.load + course.load } };
                    }
                    return combinedCourse;
                });
                // combinedCourses.get(combinedCourseID).credit += course.credit;
                // combinedCourses.get(combinedCourseID).load += course.load;
            }
        }

        for (const course of combinedCourses) {
            if (combinedCourses.includes(course)) {
                course.prereqsFor = getPrereqsFor(course, combinedCourses);
                let allPrereqsFor = getNestedPrereqs(course.prereqsFor);

                combinedCourses = combinedCourses.filter(combinedCourse => !allPrereqsFor.includes(combinedCourse.courseID))
            }
        }
        return combinedCourses;
        let creditLoads = [{ load: 0, credits: 0, full: false }, { load: 0, credits: 0, full: false }, { load: 0, credits: 0, full: false }, { load: 0, credits: 0, full: false }, { load: 0, credits: 0, full: false }, { load: 0, credits: 0, full: false }, { load: 0, credits: 0, full: false }, { load: 0, credits: 0, full: false }]


    } catch (e) {
        throw e;
    }

}

/*
function TAANITESTHER(combinedCourses) {
    for (const course of combinedCourses) {
        if (combinedCourses.includes(course)) {
            course.prereqsFor = getChildren(course, combinedCourses);
            let allPrereqsFor = getNestedChildren(course.prereqsFor);

            combinedCourses = combinedCourses.filter(combinedCourse => !allPrereqsFor.includes(combinedCourse.course))
        }
    }
    return combinedCourses;
}*/

function getPrereqsFor(course, combinedCourses) {
    let courses = course.courseID.split('-');
    let prereqsFor = [];
    for (obj of courses) {
        prereqsFor.push(...combinedCourses.filter(combinedCourse => combinedCourse.prereqs.includes(obj)));
    }


    for (const prereqCourse of prereqsFor) {
        const nestedPrereqs = getPrereqsFor(prereqCourse, combinedCourses);
        prereqCourse.prereqsFor = nestedPrereqs;
    }

    return prereqsFor;
}

function getNestedPrereqs(courseObjects) {
    let courses = [];

    courseObjects.forEach(courseObj => {
        courses.push(courseObj.courseID);
        if (courseObj.prereqsFor && courseObj.prereqsFor.length > 0) {
            courses.push(...getNestedPrereqs(courseObj.prereqsFor));
        }
    });

    return courses;
}

function findLengthOfPrereqChain(courseTree, courseID) {
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

//Quickest and its minions
async function fillInSemesterQuickestOptimize(futureCourses, creditloads) {
    try {
        //Given: {tree:futureCourses, creditloads: :[{}]}, where creditloads contains: [{ load: 0, credits: 0, full: false }, { load: 0, credits: 0, full: false }]
        
            let queue = [...courseTree];
            let level = 0;
            let nextLevelStartIndex = queue.length;
            let longestRoot = {level: 0, course: '', length: 0};
          
            while (queue.length > 0) {
              let node = queue.shift();
              let currentLevel = level;
          
              // Check if we've moved to the next level
              if (queue.length < nextLevelStartIndex) {
                level++;
                nextLevelStartIndex = queue.length;
                console.log(`Longest root at level ${longestRoot.level}: ${longestRoot.course} with length ${longestRoot.length}`);
                for(let semester of creditloads)
                {
                    if((!semester.full) && (semester.credits + longestRoot.course.credit) <= 19)
                    {
                        longestRoot.course.semester = indexOf(semester);
                        semester.credits += longestRoot.course.credit;
                    }
                }
                longestRoot = {level: level, course: '', length: 0}; // Reset for the new level
              }
          
              // Process the node
              if((node.course.length > longestRoot.length) && (node.course.semester === undefined)) {
                longestRoot.course = node.course;
                longestRoot.length = node.course.length;
              }
          
              // Add children to the queue
              if (node.prereqsFor) {
                queue.push(...node.prereqsFor);
              }
            }
          
          






























        
          //put all courses with pre-assigned semesters into the plan
          for (let course of futureCourses) {
            if (course.semester !== undefined) {

                let finalDepth = findLengthOfPrereqChain(courseTree, course.courseID); //TODO may need an await //figures out how many courses in a chain of pre-req after pre-req depend on this course

                if (finalDepth > (8 - course.semester)) //if the number of semesters left after you take this course is greater than the number of courses in a pre-req after pre-req chain depend on this course
                {
                    throw new Error(`The course(s) ${course.courseID} is/are placed late in your plan for you to complete all the courses listed.`)
                }
                else {
                    let finalHeight = findDistanceToNoPrereq(courseTree, course.courseID); //TODO may need await
                    if (finalHeight > course.semester) //if it's got more prereqs than you've allowed semesters before you plan to take it
                    {
                        throw new Error(`The course(s) ${course.courseID} is placed too early in the semester such that there is not enough time for you to complete the pre-reqs required to take this course`)
                    }
                    else {
                        semesterCourses[course.semester].push(course);
                        semesterCreditCounts[course.semester] += course.credit;
                        if (finalDepth == (8 - course.semester)) {
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


    } catch (e) {
        throw e;
    }



}


async function fillInSemesterBalancedOptimize(futureCourses) {


    let unassignedCourses = [];
    let assignedCourses = [];
    let totalLoad;

    //seperate assigned and unassigned courses
    for (const course of futureCourses) {
        if (course.semester >= 0) {
            assignedCourses.push(course);
        } else {
            unassignedCourses.push(course);
        }

        totalLoad += course.load;
    }

    unassignedCourses = sortUnassignedCourses(unassignedCourses);

    for (const unassignedCourse of unassignedCourses) {
        let numChildren = getNestedChildren(assignedCourses.prereqsFor);
        let averageLoad = getAverageLoad(totalLoad, creditLoads);
        let numAvailableSemesters = creditLoads.filter(semester => !semester.full);

        let numOptions = numAvailableSemesters - numChildren;

        if (numOptions < 1) {
            throw new Error("not possible") //TODO if recursion then maybe not throw
        } else {
            creditLoads = assignCourse(unassignedCourse, averageLoad, creditLoads);

        }





    }


}

function getChildren(course, combinedCourses) {
    let prereqsFor = combinedCourses.filter(combinedCourse => combinedCourse.prereqs.includes(course.course));

    for (const prereqCourse of prereqsFor) {
        const nestedPrereqs = getChildren(prereqCourse, combinedCourses);
        prereqCourse.prereqsFor = nestedPrereqs;
    }

    return prereqsFor;
}


function getNestedChildren(courseObjects) {
    let courses = [];

    courseObjects.forEach(courseObj => {
        courses.push(courseObj.course);
        if (courseObj.prereqsFor && courseObj.prereqsFor.length > 0) {
            courses.push(...getNestedChildren(courseObj.prereqsFor));
        }
    });

    return courses;
}


function sortUnassignedCourses(unassignedCourses) {
    unassignedCourses.sort((a, b) => {

        const dependentCoursesA = getNestedChildren(a.prereqsFor).length;
        const dependentCoursesB = getNestedChildren(b.prereqsFor).length;
        if (dependentCoursesB !== dependentCoursesA) {
            return dependentCoursesB - dependentCoursesA;
        }
        // If dependent courses are equal, compare by the suffix of their IDs (higher suffix later)
        const suffixA = a.course.split(":").pop();
        const suffixB = b.course.split(":").pop();
        return suffixA - suffixB;
    });

    return unassignedCourses;

}

function getAverageLoad(totalLoad, semesterLoads) {

    let numAvailableSemesters;

    for (let semester of semesterLoads) {
        if (semester.full) {
            numAvailableSemesters++;
        } else {
            totalLoad -= semester.load;
        }

    }
    return totalLoad / numAvailableSemesters;
}

function assignCourse(unassignedCourse, averageLoad, creditLoads) {
    let children = unassignedCourse.prereqsFor;

    for (let child of children) {
        let nextAvailableSemester = findNextAvailableSemester(creditLoads);
        let creditLoad = creditLoads[nextAvailableSemester];
        // if (creditLoad.credit + )
        unassignedCourse.semester = nextAvailableSemester;

        creditLoads = updateCreditLoads(unassignedCourse, nextAvailableSemester, creditLoads);

    }

}

function findNextAvailableSemester(creditLoads) {
    for (let i = 0; i < creditLoads.length; i++) {
        if (creditLoads[i].full) {
            return;
        }
        return i;
    }
}

// function updateCreditLoads(unassignedCourse, semester, creditLoads) {
//     if()
// }

//TODO calculate averageload - once a semester closes then it is recalculated

function isSemesterAvailable(semester, creditLoads, averageLoad) {

    if (semester.full) {
        return;
    }

    if (semester.credits >= 19 || semester.load > averageLoad || semester.load + unassignedCourse.load > averageLoad || semester.credits + unassignedCourse.courseDetails.credits > 19) {
        semester.full = true;
        return;
    }

}


//validate minions
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

        const { semester } = course;
        const semesterNumber = semester;

        if (semesterNumber == -1) { return }

        prereqs.forEach(prereqID => {
            const prereqCourse = courseObjs.find(obj => obj.course.course === prereqID);

            if (!prereqCourse) {
                invalidPrereqs = addToInvalidReq(invalidPrereqs, course.course, prereqID);
                return;
            }

            const { semester: prereqSemester } = prereqCourse.course;
            const prereqSemesterNumber = prereqSemester;


            if (prereqSemesterNumber == -1) {
                if (fullPlan) { invalidPrereqs = addToInvalidReq(invalidPrereqs, course.course, prereqID) }
                return;
            }

            if (!(semesterNumber >= prereqSemesterNumber)) {//TODO @noa check that I edited this correctly
                invalidPrereqs = addToInvalidReq(invalidPrereqs, course.course, prereqID);
            }
        });

        coreqs.forEach(coreqID => {
            const coreqCourse = courseObjs.find(obj => obj.course.course === coreqID);
            if (!coreqCourse) {
                invalidCoreqs = addToInvalidReq(invalidCoreqs, course.course, coreqID);
                return;
            }

            const { semester: coreqSemester } = coreqCourse.course;
            const coreqSemseterNumber = coreqSemester;

            if (coreqSemseterNumber == -1) {//TODO @noa check that I edited this correctly
                if (fullPlan) { invalidCoreqs = addToInvalidReq(invalidCoreqs, course.course, coreqID); }
                return;
            }


            if (!(semesterNumber >= coreqSemseterNumber)) {
                invalidCoreqs = addToInvalidReq(invalidCoreqs, course.course, coreqID);
            }
        });

    });

    return { isValidOrder: (invalidCoreqs.length == 0 && invalidPrereqs.length == 0), invalidPrereqs: invalidPrereqs, invalidCoreqs: invalidCoreqs }
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





//extras
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
            method: 'quickest',
        },
        body: {
            futureCourses: [new Student.FutureCourse('01:198:111', 1),
            new Student.FutureCourse('01:198:201', 2),
            new Student.FutureCourse('01:198:112', 2),
            new Student.FutureCourse('01:198:113', 3),
            new Student.FutureCourse('01:198:114', 4),
            new Student.FutureCourse('01:198:115', 5),
            new Student.FutureCourse('01:198:116', 6),
            new Student.FutureCourse('01:198:202', 6),
            ]

        }
    }
    let answer = await optimizePlan(req);
    console.log(answer);
}
testing3();

async function testing4() {
    let combinedCourses = [
        { course: 'xx:xxx:111', prereqs: [] },
        { course: 'xx:xxx:112', prereqs: ['xx:xxx:111'] },
        { course: 'xxx:xxx:115', prereqs: ['xx:xxx:111'] },
        { course: 'xxx:xxx:120', prereqs: ['xx:xxx:112'] },
        { course: 'xxx:xxx:250', prereqs: ['xx:xxx:112'] },
        { course: 'xxx:xxx:255', prereqs: ['xxx:xxx:250'] },
        { course: 'xxx:xxx:309', prereqs: [] },
        { course: 'xxx:xxx:288', prereqs: [] }
    ];

    for (const course of combinedCourses) {
        if (combinedCourses.includes(course)) {
            course.prereqsFor = getChildren(course, combinedCourses);
            let allPrereqsFor = getNestedChildren(course.prereqsFor);
            combinedCourses = combinedCourses.filter(combinedCourse => !allPrereqsFor.includes(combinedCourse.course))
        }
    }
    let test = fillInSemesterBalancedOptimize(combinedCourses, []);

}
//testing4();

module.exports = { viewPlan, viewStatus, addCourse, removeCourse, viewSample, validatePlan, optimizePlan, savePlan }
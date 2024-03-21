
const Student = require('../database/student.js');
const Concentration = require("../database/concentration.js");
const Course = require("../database/course.js");
const { firestore } = require("../database/firebase.js");

/*
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
};*/



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
        let method = req.params.method;
        let futureCourses = req.body.futureCourses;

        if ((netID == undefined) || (method == undefined)) {
            throw new Error("Undefined parameter");
        }

        let isValidPreCoReq = validatePreCoReqs(futureCourses, false);

        if (!isValidPreCoReq) {
            throw new Error("Locked courses are not in a valid order");
        }
        let creditsPerSemester = [0, 0, 0, 0, 0, 0, 0, 0];

        for (const course of futureCourses) {
            creditsPerSemester[course.semester]++;
        }

        const hasAbove19 = creditsPerSemester.findIndex(number => number > 19);
        if (hasAbove19 != -1) {
            throw new Error("There exists a semester with locked credits more than 19. This is invalid.");
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

            let courseSaving = new Student.FutureCourse(course.courseID, course.semester);
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
        let semesterCreditCounts = [0, 0, 0, 0, 0, 0, 0, 0]

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


async function fillInSemesterBalancedOptimize(futureCourses) {

    for (let futureCourse of futureCourses) {
        let courseDetails = await Course.getCourse(futureCourse.course);
        futureCourse.prereqs = courseDetails.prereqs;
        futureCourse.coreqs = courseDetails.coreqs;
        futureCourse.credit = courseDetails.credit;
        futureCourse.load = courseDetails.credit + parseInt(futureCourse.course[7]);
    }

    let combinedCourses = new Map();
    for (let course of futureCourses) {
        let combinedCourseID = [course.course, ...course.coreqs].sort().join("-");
        if (!combinedCourses.has(combinedCourseID)) {
            combinedCourses.set(combinedCourseID, {
                courseID: combinedCourseID,
                credit: course.credit,
                load: course.load, // add together the loads of all coreqs
                prereqs: course.courseDetails.prereqs, //assuming all coreqs have the same prereqs
                semester: course.semester,
            });
        }
        else {
            // If this combination of courses is already in the map, update the creditCount
            combinedCourses.get(combinedCourseID).credit += course.credit;
            combinedCourses.get(combinedCourseID).load += course.load;
        }
    }

    for (const course of combinedCourses) {
        course.prereqsFor = getPrereqsFor(course, combinedCourses);
        let allPrereqsFor = getNestedPrereqs(course.prereqsFor);

        combinedCourses = combinedCourses.filter(combinedCourse => !allPrereqsFor.includes(combinedCourse.course))
    }

    let unassignedCourses = [];
    let assignedCourses = [];
    let totalLoad;

    let creditLoads = [{ load: 0, credits: 0, full: false }, { load: 0, credits: 0, full: false }, { load: 0, credits: 0, full: false }, { load: 0, credits: 0, full: false }, { load: 0, credits: 0, full: false }, { load: 0, credits: 0, full: false }, { load: 0, credits: 0, full: false }, { load: 0, credits: 0, full: false }]


    //seperate assigned and unassigned courses
    for (const course of combinedCourses) {
        if (course.semester >= 0) {
            assignedCourses.push(course);
            creditLoads[course.semester].load += course.load;
            creditLoads[course.semester].credits += course.credit;
        } else {
            unassignedCourses.push(course);
        }

        totalLoad += course.load;
    }



    let { isValidOrder } = await validatePreCoReqs(assignedCourses, false);

    if (!isValidOrder) {
        throw new Error("Locked courses are not in a valid order"); //TODO fix that the validate function doesnt send error if not exist - only checks if there is direct conflict
    }

    // //assign prereqs an coreqs to 
    // [assignedCourses, creditLoads] = await assignPreCoreqs(assignedCourses, assignedCourses, creditLoads);

    // sortUnassignedCourses(unassignedCourses);

    // for (const unassignedCourse of unassignedCourses) {
    //     for (const semester of creditLoads) {
    //         let averageLoad = totalLoad / (creditLoads.filter(creditLoad => !creditLoad.full)).length;
    //         if (semester.full) {
    //             return;
    //         }

    //         if (semester.credits >= 19 || semester.load > averageLoad || semester.load + unassignedCourse.load > averageLoad || semester.credits + unassignedCourse.courseDetails.credits > 19) {
    //             semester.full = true;
    //             return;
    //         }

    //         semester.load += unassignedCourse.load;

    //         semester.credits += unassignedCourse.courseDetails.credit;
    //         assignCourses.push(unassignedCourse);
    //         [assignedCourses, creditLoads] = await assignPreCoreqs([unassignedCourse], assignCourses, creditLoads);

    //     }
    // }




}

function countDependentCourses(course, futureCourses) {
    let numDependent = 0;
    for (let futureCourse of futureCourses) {
        if (futureCourse.courseDetails.prereqs.includes(course)) {
            numDependent++; ``
        }
    }
}


function getPrereqsFor(course, combinedCourses) {
    let prereqsFor = combinedCourses.filter(combinedCourse => combinedCourse.prereqs.includes(course.course));

    for (const prereqCourse of prereqsFor) {
        const nestedPrereqs = getPrereqsFor(prereqCourse, combinedCourses);
        prereqCourse.prereqsFor = nestedPrereqs;
    }

    return prereqsFor;
}



function getNestedPrereqs(courseObjects) {
    let courses = [];

    courseObjects.forEach(courseObj => {
        courses.push(courseObj.course);
        if (courseObj.prereqsFor && courseObj.prereqsFor.length > 0) {
            courses.push(...getNestedPrereqs(courseObj.prereqsFor));
        }
    });

    return courses;
}


async function assignPreCoreqs(coursesToAssign, assignedCourses, creditLoads) {
    for (const courseToAssign of coursesToAssign) {
        let prereqs = courseToAssign.courseDetails.prereqs.filter(course => !assignedCourses.includes(course));
        let coreqs = courseToAssign.courseDetails.coreqs.filter(course => !assignedCourses.includes(course));
        let semester = courseToAssign.courseDetails.semester;

        for (const coreq of coreqs) {
            let course = await Course.getCourse(coreq);

            let coreqInfo = {
                course: coreq,
                courseDetails: course,
                load: course.credit + parseInt(coreq[7]),
            };

            if (creditLoads[semester].credits + coreqInfo.courseDetails.credit > 19) {
                throw new Error("impossible to optimize");
            }

            assignCourses.push(coreqInfo);
            creditLoads[semester].load += coreqInfo.load;
            creditLoads[semester].credit += coreqInfo.courseDetails.credit;

        }


        for (const prereq of prereqs) {
            let course = await Course.getCourse(prereqs);

            let prereqInfo = {
                course: prereq,
                courseDetails: course,
                load: course.credit + parseInt(prereq[7]),
            };
            if (semester - 1 < 0) {
                throw new Error("impossible to optimize");
            }
            if (creditLoads[semester - 1].credits + prereqInfo.courseDetails.credit > 19) {
                throw new Error("impossible to optimize");
            }

            assignCourses.push(prereqInfo);
            creditLoads[semester].load += prereqInfo.load;
            creditLoads[semester].credit += prereqInfo.courseDetails.credit;

        }
    }

    return [coursesToAssign, creditLoads];

}

function sortUnassignedCourses(unassignedCourses) {
    unassignedCourses.sort((a, b) => {
        // First, compare by the number of dependent courses (higher first)
        const dependentCoursesA = countDependentCourses(a, assignedCourses);
        const dependentCoursesB = countDependentCourses(b, assignedCourses);
        if (dependentCoursesB !== dependentCoursesA) {
            return dependentCoursesB - dependentCoursesA;
        }
        // If dependent courses are equal, compare by the suffix of their IDs (higher suffix later)
        const suffixA = Course.getSuffix(a.id);
        const suffixB = Course.getSuffix(b.id);
        return suffixA - suffixB;
    });

    return unassignedCourses;

}

//not locked
async function assignCourse(course, assignedCourses, unassignedCourses, semester, creditLoad) {

    let prereqs = courseToAssign.courseDetails.prereqs.filter(course => !assignedCourses.includes(course));
    let coreqs = courseToAssign.courseDetails.coreqs.filter(course => !assignedCourses.includes(course));

    let tentativePlan = creditLoad;
    let approved = false;

    while (!approved) {
        for (const prereq of prereqs) {
            let prevSemester = semester - 1;

        }

    }
}

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

function TAANITESTHER(combinedCourses) {
    for (const course of combinedCourses) {
        course.prereqsFor = getPrereqsFor(course, combinedCourses);
        let allPrereqsFor = getNestedPrereqs(course.prereqsFor);

        combinedCourses = combinedCourses.filter(combinedCourse => !allPrereqsFor.includes(combinedCourse.course))
    }

    return combinedCourses;
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
            method: 'balanced',
        }
    }
    let answer = await optimizePlan(req);
    console.log(answer);
}
// testing3();

async function testing4() {
    let combinedCourses = [
        { course: 'A', prereqs: [] },
        { course: 'B', prereqs: ['A'] },
        { course: 'C', prereqs: ['A'] },
        { course: 'D', prereqs: ['B'] },
        { course: 'E', prereqs: ['B'] },
        { course: 'F', prereqs: ['E'] },
        { course: "G", prereqs: [] }
    ];

    for (const course of combinedCourses) {
        course.prereqsFor = getPrereqsFor(course, combinedCourses);
        let allPrereqsFor = getNestedPrereqs(course.prereqsFor);

        combinedCourses = combinedCourses.filter(combinedCourse => !allPrereqsFor.includes(combinedCourse.course))
    }
    console.log(combinedCourses);
}
testing4();

module.exports = { viewPlan, viewStatus, addCourse, removeCourse, viewSample, validatePlan, optimizePlan, savePlan }
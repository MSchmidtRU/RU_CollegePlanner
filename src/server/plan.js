
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
        let result;

        if ((netID == undefined) || (method == undefined)) {
            throw new Error("Undefined parameter");
        }

        let readyTogo = await isOptimizable(futureCourses);

        if (method == 'quickest') {
            result = await fillInSemesterQuickestOptimize(readyTogo.tree, readyTogo.creditLoads);
        }
        if (method == 'balanced') {
            result = await fillInSemesterBalancedOptimize(readyTogo.tree, readyTogo.creditLoads);
        }
        else {
            throw new Error("Invalid method of optimization.");
        }

        jsonResult = result.map(course => {
            return {
                course: course.course,
                semester: course.semester,
            };
        });
        return [JSON.stringify(jsonResult), 200];
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
            }
        }

        for (const course of combinedCourses) {
            if (combinedCourses.includes(course)) {
                let allPrereqsFor = getNestedPrereqs(course.prereqsFor);

                combinedCourses = combinedCourses.filter(combinedCourse => !allPrereqsFor.includes(combinedCourse.courseID))
            }
        }

        //return combinedCourses;
        let creditLoads = [{ load: 0, credits: 0, full: false }, { load: 0, credits: 0, full: false }, { load: 0, credits: 0, full: false }, { load: 0, credits: 0, full: false }, { load: 0, credits: 0, full: false }, { load: 0, credits: 0, full: false }, { load: 0, credits: 0, full: false }, { load: 0, credits: 0, full: false }]

        //traversing the courses and inserting them:
        let queue = [...combinedCourses]; // Initialize queue with the root node
        let rootLengths = {};

        while (queue.length > 0) {
            // Dequeue a node from the front of the queue
            let node = queue.shift();

            // Process the node (e.g., print its value)
            //console.log(node.courseID);
            if (node.semester !== -1) {
                if ((node.credit + creditLoads[node.semester].credits) > 19) {
                    throw new Error('You fixed more than 19 credits for a semester.')
                }
                creditLoads[node.semester].credits += node.credit;
                rootLengths[node.courseID] = { semester: node.semester, distanceToEnd: findLengthOfPrereqChain(node), distancesToNexts: findClosestSetprereqFor(node) }; //distanceToNexts: [{ courseID: currentNode.courseID, semester: currentNode.semester, distance: distanceToTrue }]
                console.log(findLengthOfPrereqChain(node));
                console.log(findChildrenDepth(node));
            }

            // Enqueue all the children of the node into the queue
            if (node.prereqsFor) {
                queue.push(...node.prereqsFor);
            }
        }
        //TO BE CLEAR: DistanceToEnd (no more children) includes the last node, while distanceToNext DOES NOT include that next
        function insertFixedSemester(node, semester)//FIXME semester coming in as undefined
        {
            try {
                if (node.credit + creditLoads[semester].credits <= 19) {
                    node.semester = semester;
                    creditLoads[semester].credits += node.credit;
                }
                else {
                    throw new Error('Impossible to schedule bc filled semester based on constricted ability due to fixed courses');//reword
                }
            } catch (e) {
                throw e;
            }
        }
        for (const rootLength in rootLengths) {
            let rootLengthObj = rootLengths[rootLength];
            let source = getCourseFromCombinedCourses(combinedCourses, rootLength);
            if ((7 - rootLengthObj.semester) < (rootLengthObj.distanceToEnd)) {
                throw new Error('You fixed more a course such that there are not enough semesters for you to reach the ability to take a course that is dependant on it');
            }
            if (7 - rootLengthObj.semester == rootLengthObj.distanceToEnd) {
                //there's no options for where the intermediary courses can go, so they're inserted at this level
                let depth = rootLengthObj.distanceToEnd;
                setCoursesBetweenCourseAndEnd(source, depth, insertFixedSemester)
            }
            //BH THINGS ARE WORKING AS PLANNED UNTIL HERE

            for (const node in rootLengthObj.distancesToNexts) {
                let nodeObj = rootLengthObj.distancesToNexts[node];
                if ((nodeObj.semester - rootLengthObj.semester) < nodeObj.distance + 1) {
                    throw new Error('You fixed more a course and its prereq without enough semesters in between to fulfill intermediary prereqs');
                }
                if ((nodeObj.semester - rootLengthObj.semester) == nodeObj.distance + 1) {
                    //there's no options for where the intermediary courses can go, so they're inserted at this level
                    let target = getCourseFromCombinedCourses(combinedCourses, nodeObj.courseID);

                    setCoursesBetweenPreandCourse(source, target, insertFixedSemester, rootLengthObj.distance);
                }
            }
            setPrereqSemesters(source);
        }
        return { tree: combinedCourses, creditLoads: creditLoads };

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

function getCourseFromCombinedCourses(combinedCourses, courseID) {
    for (const obj of combinedCourses) {
        if (obj.courseID === courseID) {
            // If found, return the current object
            return obj;
        }
        // If the current object has a nested array, recursively search through it
        if (obj.prereqsFor instanceof Array) {
            const foundObject = getCourseFromCombinedCourses(obj.prereqsFor, courseID);
            // If the object is found in the nested array, return it
            if (foundObject) {
                return foundObject;
            }
        }
    }
    // Return null if the object with the specified courseID is not found
    return null;
}

function getPrereqsFor(course, combinedCourses) {
    let courses = course.courseID.split('-');
    let prereqsFor = [];
    prereqsFor.push(...combinedCourses.filter(combinedCourse => combinedCourse.prereqs.includes(courses[0])));


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

function findLengthOfPrereqChain(courseID) {
    let maxDepth = 0;

    dfs(courseID, 0);

    function dfs(currentNode, depth) {
        // Update maxDepth if the current depth is greater
        maxDepth = Math.max(maxDepth, depth);

        // Recursively traverse all children of the current node
        if (currentNode.prereqsFor) {
            for (let child of currentNode.prereqsFor) {
                dfs(child, depth + 1); // Increment depth for child node
            }
        }
    }
    return maxDepth;
}

function findClosestSetprereqFor(node) {
    let result = []; // Initialize an array to store the distances to true descendants

    // DFS function to traverse the tree and update result
    function dfs(currentNode, distanceToTrue) {
        // Recursively traverse all children of the current node
        if (currentNode.prereqsFor) {
            for (let child of currentNode.prereqsFor) {
                // Calculate the distance to the true node for the child node
                let distanceToTrueChild = currentNode.semester !== -1 ? 0 : distanceToTrue + 1;
                // Perform DFS on the child node
                dfs(child, distanceToTrueChild);
            }
        }

        // If the current node has a set semester and it's not the starting node,
        // add it to the result array
        if (currentNode.semester !== -1 && currentNode !== node) {
            //console.log({ courseID: currentNode.courseID, semester: currentNode.semester, distance: distanceToTrue });
            result.push({ courseID: currentNode.courseID, semester: currentNode.semester, distance: distanceToTrue });
        }
    }

    // Start the DFS traversal from the given node with initial distance 0
    dfs(node, 0);

    return result;
}

/*
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
*/

function setCoursesBetweenPreandCourse(source, target, operation) {
    try {
        // Array to store the current path
        let currentPath = [];

        // Array to store all found paths
        let allPaths = [];

        // DFS function to traverse the graph and find paths between source and target
        function dfs(node) {
            // Add the current node to the current path
            currentPath.push(node);

            // If the current node is the target, add the current path to allPaths
            if (node === target) {
                allPaths.push(currentPath.slice()); // Use slice to create a shallow copy of the currentPath
            }

            // Continue DFS traversal to explore adjacent nodes
            for (let neighbor of node.prereqsFor) {
                if (!currentPath.includes(neighbor)) { // Avoid cycles
                    dfs(neighbor);
                }
            }

            // Backtrack: Remove the current node from the current path
            currentPath.pop();
        }

        // Start DFS traversal from the source node
        dfs(source);

        // Execute the operation for each found path
        for (let path of allPaths) {
            let semester = source.semester;
            for (let node of path) {
                if (node.semester == -1) {
                    semester++;
                    operation(node, semester);
                }
            }
        }
    } catch (e) {
        throw e;
    }
}

/*
function setCoursesBetweenPreandCourse(source, target, operation, pathLength) {
    try {
        // Array to store the current path
        let currentPath = [];

        // Array to store all found paths of length pathLength
        let allPaths = [];

        // DFS function to traverse the graph and find paths between source and target
        function dfs(node, depth) {
            // Add the current node to the current path
            currentPath.push(node);

            // If the current node is the target and the path length matches the desired length, add the current path to allPaths
            if (node === target && currentPath.length === pathLength+1) {//+1 bc at the target it's 1 more than the dist btwn them
                allPaths.push(currentPath.slice()); // Use slice to create a shallow copy of the currentPath
            }

            // Continue DFS traversal to explore adjacent nodes
            for (let neighbor of node.prereqsFor) {
                if (!currentPath.includes(neighbor)) { // Avoid cycles
                    dfs(neighbor, depth + 1);
                }
            }

            // Backtrack: Remove the current node from the current path
            currentPath.pop();
        }

        // Start DFS traversal from the source node
        dfs(source, 0);

        // Execute the operation for each found path
        for (let path of allPaths) {
            let semester = source.semester;
            for (let node of path) {
                if (node.semester == -1) {
                    semester++;
                    operation(node, semester);
                }
            }
        }
    } catch (e) {
        throw e;
    }
}*/

function setCoursesBetweenCourseAndEnd(source, depth, operation) {
    try {
        // Array to store the current path
        let path = [];
        let semester = source.semester;

        // DFS function to traverse the graph and find paths at the specified depth
        function dfs(node, currentDepth) {
            // Add the current node to the path
            path.push(node);

            // If the current depth equals the desired depth and it's not the source node,
            // execute the operation on each node in the path
            if (currentDepth === depth) {
                for (let pathNode of path) {
                    if ((pathNode !== source) && (pathNode.semester == -1)) //TODO not sure that this works totally correctly
                    {
                        semester = semester + 1;
                        operation(pathNode, semester);
                    }
                }
            }

            // Continue DFS traversal to explore adjacent nodes
            for (let neighbor of node.prereqsFor) {
                dfs(neighbor, currentDepth + 1);
            }

            // Backtrack: Remove the current node from the path
            path.pop();
        }

        // Start DFS traversal from the source node with an initial depth of 0
        dfs(source, 0);
    } catch (e) {
        throw e;
    }
}

//Quickest and its minions
async function fillInSemesterQuickestOptimize(futureCourses, creditLoads) {
    let unassignedCourses = [];
    let assignedCourses = [];

    //seperate assigned and unassigned courses
    for (const course of futureCourses) {
        if (course.semester >= 0) {
            assignedCourses.push(course);
        } else {
            unassignedCourses.push(course);
        }
    }
    unassignedCourses = sortUnassignedCourses(unassignedCourses);
    assignedCourses.push(...assignQuickestCourse(unassignedCourses, creditLoads, -1));
    return assignedCourses;
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

    const assingedCourses = fulfillReqs(fulfilledCourses);

    return assingedCourses;
}

function fulfillReqs(courseObject) {
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

//balanced minions
async function fillInSemesterBalancedOptimize(futureCourses, creditLoads) {
    let unassignedCourses = [];
    let assignedCourses = [];
    let totalLoad = getTotalLoad(futureCourses);

    //seperate assigned and unassigned courses
    for (const course of futureCourses) {
        if (course.semester >= 0) {
            assignedCourses.push(course);
        } else {
            unassignedCourses.push(course);
        }
    }
    unassignedCourses = sortUnassignedCourses(unassignedCourses);
    assignedCourses.push(...assignCourse(unassignedCourses, totalLoad, creditLoads, -1));
    // console.log(assignedCourses);


    return assignedCourses

}

function sortUnassignedCourses(unassignedCourses) {
    unassignedCourses.sort((a, b) => {

        const dependentCoursesA = findChildrenDepth(a.prereqsFor);
        const dependentCoursesB = findChildrenDepth(b.prereqsFor);
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
function getTotalLoad(courses) {
    let totalLoad = 0;

    for (let course of courses) {
        totalLoad += course.load;

        if (course.prereqsFor && course.prereqsFor.length) {
            totalLoad += getTotalLoad(course.prereqsFor);
        }
    }

    return totalLoad;
}

function getAverageLoad(totalLoad, semesterLoads) {

    let numAvailableSemesters = 0;

    for (let semester of semesterLoads) {
        if (!semester.full) {
            numAvailableSemesters++;
        } else {
            totalLoad -= semester.load;
        }

    }
    return totalLoad / numAvailableSemesters;
}

function assignQuickestCourse(unassignedCourses, creditLoads, parentSemester) {
    let assignedCourse = [];

    for (let unassignedCourse of unassignedCourses) {
        let nextSemester = parentSemester + 1; // Increment the parent's semester for the child
        let numChildren = findChildrenDepth(unassignedCourse.prereqsFor);
        //let averageLoad = getAverageLoad(totalLoad, creditLoads);
        let numAvailableSemesters = creditLoads.filter(semester => !semester.full).length;

        let numOptions = numAvailableSemesters - numChildren;

        if (numOptions < 1) {
            throw new Error("not possible") //TODO if recursion then maybe not throw
        } else {
            for (let i = nextSemester; i < creditLoads.length; i++) { // Start from next semester
                if (creditLoads[i].full) {
                    continue;
                }
                if (creditLoads[i].credit + unassignedCourse.credit > 19) {
                    continue;
                }

                unassignedCourse.semester = i;
                //creditLoads[i].load += unassignedCourse.load;
                creditLoads[i].credit += unassignedCourse.credit;
                if (/*creditLoads[i].load > averageLoad ||*/ creditLoads[i].credit === 19) {
                    creditLoads[i].full = true;
                }

                // Recursively assign children courses
                if (unassignedCourse.prereqsFor && unassignedCourse.prereqsFor.length > 0) {
                    assignedCourse.push(...assignQuickestCourse(unassignedCourse.prereqsFor, creditLoads, unassignedCourse.semester));
                }

                // Push the parent course after all children are assigned
                assignedCourse.push(unassignedCourse);

                break; // Break the loop after assigning the course
            }
        }
    }

    return assignedCourse;
}

function assignCourse(unassignedCourses, totalLoad, creditLoads, parentSemester) {
    let assignedCourse = [];

    for (let unassignedCourse of unassignedCourses) {
        let nextSemester = parentSemester + 1; // Increment the parent's semester for the child
        let numChildren = findChildrenDepth(unassignedCourse.prereqsFor);
        let averageLoad = getAverageLoad(totalLoad, creditLoads);
        let numAvailableSemesters = creditLoads.filter(semester => !semester.full).length;

        let numOptions = numAvailableSemesters - numChildren;

        if (numOptions < 1) {
            throw new Error("not possible") //TODO if recursion then maybe not throw
        } else {
            for (let i = nextSemester; i < creditLoads.length; i++) { // Start from next semester
                if (creditLoads[i].full) {
                    continue;
                }
                if (creditLoads[i].credit + unassignedCourse.credit > 19) {
                    continue;
                }

                unassignedCourse.semester = i;
                creditLoads[i].load += unassignedCourse.load;
                creditLoads[i].credit += unassignedCourse.credit;
                if (creditLoads[i].load > averageLoad || creditLoads[i].credit === 19) {
                    creditLoads[i].full = true;
                }

                // Recursively assign children courses
                if (unassignedCourse.prereqsFor && unassignedCourse.prereqsFor.length > 0) {
                    assignedCourse.push(...assignCourse(unassignedCourse.prereqsFor, totalLoad, creditLoads, unassignedCourse.semester));
                }

                // Push the parent course after all children are assigned
                assignedCourse.push(unassignedCourse);

                break; // Break the loop after assigning the course
            }
        }
    }

    return assignedCourse;
}


function findChildrenDepth(courseArray) {
    if (!Array.isArray(courseArray) || courseArray.length === 0) {
        return 0; // If courseArray is not an array or is an empty array, return 0
    }

    let maxDepth = 0;

    for (let course of courseArray) {
        if (course.prereqsFor && course.prereqsFor.length) {
            for (let prereqFor of course.prereqsFor) {
                const depth = findChildrenDepth([prereqFor]); // Call recursively with an array
                if (depth > maxDepth) {
                    maxDepth = depth;
                }
            }
        }
    }

    return 1 + maxDepth;
}



//    331    111-112-----------
//     |       / \      \      \
//     -----121-125    123    233
//                     / \    /
//               --- 133  132
//              /    / \
//            135   122-134  
//            /
//          136
//      

async function testing() {
    const req = {
        params: {
            netID: 'ach127',
            method: 'quickest',
        },
        body: {
            futureCourses: [
                new Student.FutureCourse("03:267:331", -1),
                new Student.FutureCourse("03:267:111", 2),
                new Student.FutureCourse("03:267:112", 2),
                new Student.FutureCourse("03:267:121", -1),
                new Student.FutureCourse("03:267:125", -1),
                new Student.FutureCourse("03:267:123", -1),
                new Student.FutureCourse("03:267:233", -1),
                new Student.FutureCourse("03:267:132", 4),
                new Student.FutureCourse("03:267:133", -1),
                new Student.FutureCourse("03:267:122", -1),
                new Student.FutureCourse("03:267:134", -1),
                new Student.FutureCourse("03:267:135", -1),
                new Student.FutureCourse("03:267:136", -1)
            ]
        }
    }

    //let creditLoads = [{ full: false, credit: 0, load: 0 }, { full: false, credit: 0, load: 0 }, { full: false, credit: 0, load: 0 }, { full: false, credit: 0, load: 0 }, { full: false, credit: 0, load: 0 }, { full: false, credit: 0, load: 0 }, { full: false, credit: 0, load: 0 }, { full: false, credit: 0, load: 0 }];
    let futureCourses = await optimizePlan(req);
    //let test = fillInSemesterBalancedOptimize(futureCourses, creditLoads);
    /*
    for(course in futureCourses)
    {
        let theObj = futureCourses[course];
        console.log('semester', theObj.semester);
        console.log('distanceToEnd', theObj.distanceToEnd);
        if( theObj.distanceToNexts)
        {
            console.log('exists');
        }
    }
    console.log(futureCourses);
    */
    console.log(futureCourses);
}
testing();

//[{ courseID: currentNode.courseID, semester: currentNode.semester, distance: distanceToTrue }]

function checkDependencies(data) {
    let missingCourses = [];

    // Iterate through each course
    for (let courseID in data) {
        let course = data[courseID];

        // Check prerequisites
        if (course.prereqs && course.prereqs.length > 0) {
            for (let prereqID of course.prereqs) {
                if (!data[prereqID]) {
                    missingCourses.push({ courseID: courseID, dependencyID: prereqID, type: 'prereq' });
                }
            }
        }

        // Check corequisites
        if (course.coreqs && course.coreqs.length > 0) {
            for (let coreqID of course.coreqs) {
                if (!data[coreqID]) {
                    missingCourses.push({ courseID: courseID, dependencyID: coreqID, type: 'coreq' });
                }
            }
        }
    }

    // Log missing dependencies
    if (missingCourses.length > 0) {
        console.log("The following courses have missing dependencies:");
        for (let missingCourse of missingCourses) {
            console.log(`Course ${missingCourse.courseID} has a missing ${missingCourse.type}: ${missingCourse.dependencyID}`);
        }
    } else {
        console.log("All courses have their dependencies listed.");
    }
}





module.exports = { viewPlan, viewStatus, addCourse, removeCourse, viewSample, validatePlan, optimizePlan, savePlan }
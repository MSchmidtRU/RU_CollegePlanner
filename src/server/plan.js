
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
            throw new Error("netID is not defined");
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
        const body = req.body;
        const futureCourse = new Student.FutureCourse(body.courseID, body.semester);
        let updatedPlan = await Student.addFutureCourse(req.params.netID, futureCourse);
        return [JSON.stringify(updatedPlan), 200, "plain/text"];
    } catch (e) {
        throw new Error(e);
    }
}

async function removeCourse(req) {
    try {
        const body = req.body;
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

        let { isValidOrder, prereqErrors, coreqErrors } = await validatePreCoReqs(futureCourses);

        let {
            isFulfilledConcentationCourses,
            refinedMap,
            unassignedCourses,
            unusedIds,
        } = await validateConcentrationCourses(concentrationID, futureCourses);

        let { isValidResReq, numMissing } = await validateResidency(concentrationID, futureCourses)

        let data = {
            validatePreCoReqs: {
                isValidOrder,
                prereqErrors,
                coreqErrors
            },
            validateConcentrationCourses: {
                isFulfilledConcentationCourses,
                refinedMap,
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
        else if (method == 'balanced') {
            result = await fillInSemesterBalancedOptimize(readyTogo.tree, readyTogo.creditLoads);
        }
        else {
            throw new Error("Invalid method of optimization.");
        }

        
        let flattenedResult = flattenTree(result);
        let jsonArray = flattenedResult.map(courseID => {
            return {
                courseID: courseID.courseID,
                semester: courseID.semester,
            };
        });
        const splitCoreqs = jsonArray.flatMap(item => {
            // Check if the item's course needs splitting
            if (item.courseID.includes("-")) {
                // Split the course into separate courses
                const splitCourses = item.courseID.split("-");
                // Return an array of objects with each split course and the same semester value
                return splitCourses.map(courseID => ({ courseID: courseID, semester: item.semester }));
            } else {
                // If the course does not need splitting, return it as is
                return [{ courseID: item.courseID, semester: item.semester }];
            }
        });
        const seen = new Set(); // Set to keep track of unique property values
        let nonRepetitiveResult = splitCoreqs.filter(item => {
            if (seen.has(item.courseID)) {
                return false; // Skip the item if its courseID is already in the set
            } else {
                seen.add(item.courseID); // Add the courseID to the set
                return true; // Include the item in the filtered array
            }
        });

        return [JSON.stringify(nonRepetitiveResult), 200];
    } catch (e) {
        throw e;
    }
}

function flattenTree(nodes) {
    const flattenedNodes = [];

    for (const node of nodes) {
        // Add the current node to the flattened array
        flattenedNodes.push(node);

        // If the current node has children, recursively flatten them
        if (node.prereqsFor && node.prereqsFor.length > 0) {
            const children = flattenTree(node.prereqsFor);
            flattenedNodes.push(...children);
        }
    }

    return flattenedNodes;
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

        if (!(isValidPreCoReq.isValidOrder)) {
            throw new Error("Locked courses are not in a valid order.");
        }

        for (let futureCourse of futureCourses) {
            let courseDetails = await Course.getCourse(futureCourse.course);
            futureCourse.prereqs = courseDetails.prereqs;
            futureCourse.coreqs = courseDetails.coreqs;
            futureCourse.credit = courseDetails.credits;//changed
            futureCourse.load = courseDetails.credits + parseInt(futureCourse.course[7]);
        }

        let combinedCourses = [];
        for (let course of futureCourses) {
            let combinedCourseID = [course.course, ...course.coreqs].sort().join("-");

            if (!(combinedCourses.some(test => test.courseID == combinedCourseID))) {
                combinedCourses.push({
                    courseID: combinedCourseID,
                    credit: course.credit,
                    load: course.load, // add together the loads of all coreqs
                    prereqs: course.prereqs, //assuming all coreqs have the same prereqs
                    semester: course.semester,
                });
            }
            else {
                combinedCourses = combinedCourses.map(combinedCourse => {
                    if (combinedCourse.courseID === combinedCourseID) {
                        let newCourseCredit = combinedCourse.credit + course.credit;
                        let newLoad = combinedCourse.load + course.load;
                        if (combinedCourse.semester !== course.semester) {
                            if (combinedCourse.semester == -1) {
                                combinedCourse.semester = course.semester; //if one of the semesters is defined, they are both set to that semester
                            }
                        }
                        return { ...combinedCourse, credit: newCourseCredit, load: newLoad };
                    }
                    return combinedCourse;
                });
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
        let noRepeatsList = [];
        let rootLengths = {};

        while (queue.length > 0) {
            let node = queue.shift();
            if (!noRepeatsList.some(obj => obj.node.courseID === node.courseID)) {
                noRepeatsList.push({ node, assigned: false });
            }

            if (node.semester !== -1) {
                if ((node.credit + creditLoads[node.semester].credits) > 19) {
                    throw new Error('You fixed more than 19 credits for a semester.')
                }
                let uniqueNode = noRepeatsList.find(item => item.node.courseID === node.courseID);
                if (uniqueNode.assigned == false) {
                    creditLoads[node.semester].credits += node.credit;
                    rootLengths[node.courseID] = { semester: node.semester, distanceToEnd: findLengthOfPrereqChain(node), distancesToNexts: findClosestSetprereqFor(node) };
                    uniqueNode.assigned = true;
                }
            }
            if (node.prereqs.length == 0) {
                rootLengths[node.courseID] = { semester: node.semester, distanceToEnd: findLengthOfPrereqChain(node), distancesToNexts: findClosestSetprereqFor(node) };
            }

            if (node.prereqsFor) {
                queue.push(...node.prereqsFor);
            }
        }
        //TO BE CLEAR: DistanceToEnd (no more children) includes the last node, while distanceToNext DOES NOT include that next
        function insertFixedSemester(node, semester) {
            try {
                if (node.credit + creditLoads[semester].credits <= 19) {
                    node.semester = semester;
                    creditLoads[semester].credits += node.credit;
                    creditLoads[semester].load += node.load;
                }
                else {
                    throw new Error('Impossible to schedule a course in its required location due to filled semester.');//reword
                }
            } catch (e) {
                throw e;
            }
        }
        for (const rootLength in rootLengths) {
            let rootLengthObj = rootLengths[rootLength];
            let source = getCourseFromCombinedCourses(combinedCourses, rootLength);
            if (rootLengthObj.semester == -1) {
                if (rootLengthObj.distanceToEnd > 7) {
                    throw new Error('There is a prereq chain that is longer than 8 semesters.');
                }
            }
            else if ((7 - rootLengthObj.semester) < (rootLengthObj.distanceToEnd)) {
                throw new Error('You locked in a course too close to the end of your plan for dependent courses to be taken after.');
            }
            if (rootLengthObj.semester == -1) {
                if (rootLengthObj.distanceToEnd == 7) {
                    setCoursesBetweenCourseAndEnd(source, depth, insertFixedSemester)
                }
            }
            else if (7 - rootLengthObj.semester == rootLengthObj.distanceToEnd) {
                //there's no options for where the intermediary courses can go, so they're inserted at this level
                let depth = rootLengthObj.distanceToEnd;
                setCoursesBetweenCourseAndEnd(source, depth, insertFixedSemester)
            }

            for (const node in rootLengthObj.distancesToNexts) {
                let nodeObj = rootLengthObj.distancesToNexts[node];

                let target = getCourseFromCombinedCourses(combinedCourses, nodeObj.courseID);
                setCoursesBetweenPreandCourse(source, target, insertFixedSemester, nodeObj.distance);
            }
        }
        return { tree: combinedCourses, creditLoads: creditLoads, futureCourses: futureCourses };

    } catch (e) {
        throw e;
    }
}


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

function setCoursesBetweenPreandCourse(source, target, operation, distance) {
    try {
        // Array to store the current path
        let currentPath = [];

        // Array to store all found paths
        let allPaths = [];

        if (source.semester != -1) {
            if (target.semester - source.semester < distance) {
                throw new Error('You locked in a course and its prereq without enough semesters in between to fulfill intermediary prereqs.');
            }
        }
        else {
            operation(source, target.semester - distance)
            if (source.semester < 0) {
                throw new Error('You locked in a course too early in your plan such that there is not enough time to fulfill its prereqs.');
            }
        }
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
    let assignedCourses = [];
    futureCourses = sortUnassignedCourses(futureCourses);
    assignedCourses.push(...assignCourses(futureCourses, 0, creditLoads, -1, false));
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
                if (fullPlan) {
                    invalidPrereqs = addToInvalidReq(invalidPrereqs, course.course, prereqID)
                }
                return;
            }

            if (!(semesterNumber > prereqSemesterNumber)) {//TODO @noa check that I edited this correctly
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


            if (!(semesterNumber == coreqSemseterNumber)) {
                invalidCoreqs = addToInvalidReq(invalidCoreqs, course.course, coreqID);
            }
        });

    });

    return { isValidOrder: (Object.keys(invalidCoreqs).length == 0 && Object.keys(invalidPrereqs).length == 0), prereqErrors: invalidPrereqs, coreqErrors: invalidCoreqs }
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

    for (const concentrationCourse of concentrationCourses) {
        let courses = [concentrationCourse.course, ...await Concentration.getEquivalentCourses(concentrationCourses, concentrationCourse.course)];

        fulfilledCourses[concentrationCourse.course] = studentCourses.filter(course => courses.includes(course.course));
    }


    const assignedCourses = fulfillReqs(fulfilledCourses);

    return assignedCourses;
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

    return { isFulfilledConcentationCourses: assignedCourses.length == 0, refinedMap, unassignedCourses: assignedCourses, unusedIds: Array.from(unusedIds) };
}

async function validateResidency(concentrationID, futureCourses) {
    const residencyReq = await Concentration.getConcentrationResidency(concentrationID);

    let residencyCredits = 0;
    for (const course of futureCourses) {
        let school = course.course.substring(0, course.course.lastIndexOf(':'));
        if (school == concentrationID) {
            let courseObj = await Course.getCourse(course.course);
            residencyCredits += courseObj.credits;
        }
    }

    return { isValidResReq: !(residencyCredits < residencyReq), numMissing: residencyReq - residencyCredits }
}

//balanced minions
async function fillInSemesterBalancedOptimize(futureCourses, creditLoads) {
    let assignedCourses = [];
    let totalLoad = getTotalLoad(futureCourses);

    futureCourses = sortUnassignedCourses(futureCourses);
    assignedCourses.push(...assignCourses(futureCourses, totalLoad, creditLoads, -1, true));

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


function assignCourses(courses, totalLoad, creditLoads, parentSemester, isBalanced) {
    let assignedCourses = [];

    for (let course of courses) {
        let nextSemester = parentSemester + 1; // Increment the parent's semester for the child
        let numChildren = findChildrenDepth(course.prereqsFor);
        let averageLoad = isBalanced ? getAverageLoad(totalLoad, creditLoads) : 0;
        let numAvailableSemesters = creditLoads.filter(semester => !semester.full).length;

        let numOptions = numAvailableSemesters - numChildren;

        if (numOptions < 1) {
            throw new Error("not possible") //TODO if recursion then maybe not throw
        } else {
            for (let i = nextSemester; i < creditLoads.length; i++) { // Start from next semester
                if (course.semester == -1) {

                    if (creditLoads[i].full) {
                        continue;
                    }
                    if (creditLoads[i].credits + course.credit > 19 || (creditLoads[i].load + course.load > averageLoad && isBalanced)) {
                        continue;
                    }

                    course.semester = i;
                    creditLoads[i].load += isBalanced ? course.load : 0;
                    creditLoads[i].credits += course.credit;
                    if ((creditLoads[i].load > averageLoad && isBalanced) || creditLoads[i].credits === 19) {
                        creditLoads[i].full = true;
                    }
                }

                // Recursively assign children courses
                if (course.prereqsFor && course.prereqsFor.length > 0) {
                    assignedCourses.push(...assignCourses(course.prereqsFor, totalLoad, creditLoads, course.semester, isBalanced));
                }

                // Push the parent course after all children are assigned
                if(course.semester == -1) {
                    throw new Error("Not possible to schedule with current parameters");
                }
                assignedCourses.push(course);

                break;
            }
        }
    }

    return assignedCourses;
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
                new Student.FutureCourse("03:267:111", -1),
                new Student.FutureCourse("03:267:112", -1),
                new Student.FutureCourse("03:267:121", -1),
                new Student.FutureCourse("03:267:125", -1),
                new Student.FutureCourse("03:267:123", -1),
                new Student.FutureCourse("03:267:233", -1),
                new Student.FutureCourse("03:267:132", -1),
                new Student.FutureCourse("03:267:133", -1),
                new Student.FutureCourse("03:267:122", 4),
                new Student.FutureCourse("03:267:134", -1),
                new Student.FutureCourse("03:267:135", -1),
                new Student.FutureCourse("03:267:136", -1)
            ]
        }
    }

    let futureCourses = await optimizePlan(req);

    console.log(futureCourses);
}
// testing();





module.exports = { viewPlan, viewStatus, addCourse, removeCourse, viewSample, validatePlan, optimizePlan, savePlan }
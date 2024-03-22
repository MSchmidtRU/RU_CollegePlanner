const { firestore } = require('./firebase.js');
const Helper = require("./helperFunction.js")
const { Section } = require('./section.js');

class Course {
    constructor(name, description, credit, prereqs, coreqs, sections) {
        this.name = name;
        this.description = description;
        this.credit = credit;
        this.prereqs = prereqs
        this.coreqs = coreqs
        this.sections = Helper.isInstance(sections, Section) ? sections : [];
    }
}
async function getCourse(courseID) {
    try {
        // Reference to the document in the "student" collection
        const courseInfo = firestore.collection("courses").doc(courseID);

        // Retrieve the document data
        const doc = await courseInfo.get();
        if (!doc.exists) {
            throw new Error('Course document not found');
        };
        // Document exists, access its data
        const courseData = doc.data();

        // Fetch basic student info
        const credit = courseData.credit;
        const description = courseData.description;
        const name = courseData.name;

        const coreqsArray = courseData.coreqs || [];
        const coreqs = await Helper.getAssociatedIDs(coreqsArray);

        const prereqsArray = courseData.prereqs || [];
        const prereqs = await Helper.getAssociatedIDs(prereqsArray);

        const sectionsArray = courseData.sections || [];
        const sections = await Helper.getAssociatedIDs(sectionsArray);

        return new Course(name, description, credit, prereqs, coreqs, sections);

    } catch (error) {
        throw error;
    }
}

async function insertCourse(courseID, course) {
    try {
        if (!(course instanceof Course)) {
            throw "course is not an instance of Course";
        }

        const courseData = {
            name: course.name,
            description: course.description,
            credit: course.credit,
            prereqs: Helper.createReference("courses", course.prereqs),
            coreqs: Helper.createReference("courses", course.coreqs),
            sections: Helper.createReference("sections", course.sections)
        }

        const res = await firestore.collection('courses').doc(courseID).set(courseData);
    } catch (e) {
        console.error('Error saving to Course document:', e);
        throw e;
    }
}

async function deleteCourse(courseID) {
    try {
        //const res = await firestore.collection('courses').doc(courseID).set(courseData);
        const res = await firestore.collection('courses').doc(courseID).delete();
    } catch (e) {
        console.error('Error deleting the course:', e);
        throw e;
    }
}


//IMPORTANT: ONLY USE TO CLEAR ALL COURSES FROM DATABASE!!
async function deleteAllCourses(db) {
    const collectionRef = db.collection('courses');
    const query = collectionRef.orderBy('__name__');
  
    return new Promise((resolve, reject) => {
      deleteQueryBatch(db, query, resolve).catch(reject);
    });
  }
  
async function deleteQueryBatch(db, query, resolve) {
    const snapshot = await query.get();
  
    const batchSize = snapshot.size;
    if (batchSize === 0) {
      // When there are no documents left, we are done
      resolve();
      return;
    }
  
    // Delete documents in a batch
    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();
  
    // Recurse on the next process tick, to avoid
    // exploding the stack.
    process.nextTick(() => {
      deleteQueryBatch(db, query, resolve);
    });
}



async function insertArrayofCourses(courses) {
    for (const course in courses) {
        if (Object.hasOwnProperty.call(courses, course)) {
            const courseObj = courses[course];
            courseInfo = new Course(courseObj.name, courseObj.description, courseObj.credits, courseObj.prereqs, courseObj.correqs);
            await insertCourse(course, courseInfo)
        }
    }
}

async function getPrereqs(courseID) {
    try {
        let course = await getCourse(courseID);
        let preReqs = course.prereqs;
        return preReqs;
    } catch (e) {
        throw e;
    }

}



async function getCoreqs(courseID) {
    try {
        let course = await getCourse(courseID);
        let coReqs = course.coreqs;
        return coReqs;
    } catch (e) {
        throw e;
    }
}

async function getCourseCredit(courseID) {
    try {
        let course = await getCourse(courseID);
        let credit = course.credit;
        return credit;
    } catch (e) {
        throw e;
    }

}

async function validateCourse(netID) {
    //for each course in the list of reuired courses for the concentration, if gets all equivelent coruses,  checks if that course is in the student's completed, enrolled, or future courses. If not it checks if
}

async function testing() {
    let courses =
    {
        "03:267:101": {
            "name": "Introduction to Psychology",
            "description": "Introduction to the scientific study of behavior and mental processes, including research methods, biological bases of behavior, perception, learning, memory, and cognition.",
            "credits": 3,
            "prereqs": [],
            "correqs": []
        },
        "03:267:102": {
            "name": "Research Methods in Psychology",
            "description": "Introduction to research methods used in psychology, including experimental design, statistical analysis, and ethical considerations.",
            "credits": 4,
            "prereqs": ["03:267:101"],
            "correqs": []
        },
    }

    await insertArrayofCourses(courses);
}
testing();

module.exports = { Course, getCourse, getPrereqs, getCoreqs, getCourseCredit, insertArrayofCourses, deleteCourse}
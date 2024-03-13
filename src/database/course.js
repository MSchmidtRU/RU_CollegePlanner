const { firestore } = require('../index.js');
const Helper = require("./helperFunction.js")

class Course {
    constructor(name, description, credit, prereqs, coreqs, sections) {
        this.name = name;
        this.description = description;
        this.credit = credit;
        this.prereqs = Helper.createReference("courses", prereqs);
        this.coreqs = Helper.createReference("courses", coreqs);
        this.sections = Helper.createReference("sections", sections)
    }
}

async function insertCourse(courseID, course) {
    try {
        if (!(course instanceof Course)) {
            throw "course is not an instance of Course"
        }

        const courseData = {
            name: course.name,
            description: course.description,
            credit: course.credit,
            prereqs: course.prereqs,
            coreqs: course.coreqs,
            sections: course.sections
        }

        const res = await firestore.collection('courses').doc(courseID).set(courseData);
    } catch (error) {
        console.error('Error saving to Course document:', e);
        throw e;
    }
}

async function testing() {
    let course = new Course("Software Engineering", "Intro to the cocepts of software engeinering", 4, ["14:332:128"], ["14:332:221"], ["14:332:124:01"]);
    await insertCourse("14:332:400", course);
    // console.log(await getStudent('hrb123'));
}
testing();
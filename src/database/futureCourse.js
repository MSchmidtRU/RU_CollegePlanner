const { firestore } = require('../index.js');
const Helper = require("./helperFunction.js");
const { getCourse } = require("./course.js");
class FutureCourse {
    constructor(course, semester, year) {
        this.course = this.setCourse(course)
        this.semester = this.setSemester(semester);
        this.year = year
    }

    setCourse(course) {

        if (typeof course !== 'string') {
            throw new Error("course  must be a string.");
        }
        if (course.match(/^\d{2}\:\d{3}\:\d{3}$/)) {
            return course;
        } else {
            throw new Error("Invlaid course format - shoudl be xx.xxx.xxx format")
        }


        return course
    }

    setSemester(semester) {
        if (typeof semester !== 'string') {
            throw new Error("Semester must be a string.");
        }

        if (semester.match(/(winter|spring|summer|fall|unknown)/i)) {
            return semester;
        } else {
            throw new Error("Invalid semester value - must be winter, spring, fall, summer, or unknown");
        }
    }


}


module.exports = { FutureCourse };
const { firestore } = require('../index.js');
const Helper = require("./helperFunction.js");

class FutureCourse {
    constructor(course, semester, year) {
        this.course = Helper.createReference("courses", [course]);
        this.semester = semester;
        this.year = year
    }

    
}

module.exports = { FutureCourse };
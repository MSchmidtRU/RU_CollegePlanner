const { firestore } = require('../index.js');
const { FutureCourse } = require('./futureCourse.js');
const Helper = require("./helperFunction.js")

class Concentration {
    constructor(name, courses, residency, sample_schedule) {
        this.name = name;
        this.courses = courses;
        this.residency = residency;
        this.sample_schedule = Helper.isInstance(sample_schedule, FutureCourse) ? sample_schedule : [];
    }
}

async function testing() {
    let concentraion = new Concentration("Software Engineering Finally", ["14:332:128", "14:332:221"], 51, ["14:332:128", "14:332:221"], [new FutureCourse("14:332:128", "Winter", 2025)]);
    await insertConcentration("111:222", concentraion);
   // console.log(await getCourse('14:332:128'));
}

testing();
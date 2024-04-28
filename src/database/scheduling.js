const { firestore } = require('./firebase.js');
const Helper = require("./helperFunction.js");
const { Course, getCourse } = require('./course.js');

class ScheduleManager {
    constructor() {
        this.database = {
            schedules: {},
        };
    }

    async getFutureCourseInfo(courseId, netId) {
        if (!this.isValidNetId(netId) || !this.isValidCourseId(courseId)) {
            throw new Error("Invalid netId or courseId");
        }
        const course = await getCourse(courseId);
        return {
            courseId: course.id,
            courseName: course.name,
            credits: course.credits,
            semester: course.semester,
        };
    }

    async addCourseToSchedule(netId, courseId, semester) {
        try {
            const courseInfo = await this.getFutureCourseInfo(courseId, netId);

            if (!this.database.schedules[netId]) {
                this.database.schedules[netId] = {};
            }

            if (!this.database.schedules[netId][semester]) {
                this.database.schedules[netId][semester] = [];
            }

            this.database.schedules[netId][semester].push(courseInfo);

            console.log("Course added to schedule successfully.");
            return this.database.schedules[netId][semester];
        } catch (error) {
            console.error("Error adding course to schedule:", error);
            throw error;
        }
    }

    viewSchedule(netId, semester) {
        if (this.database.schedules[netId] && this.database.schedules[netId][semester]) {
            return this.database.schedules[netId][semester];
        } else {
            console.log("Schedule not found.");
            return null;
        }
    }

    saveSchedule(netId, semester, schedule) {
        try {
            if (!this.database.schedules[netId]) {
                this.database.schedules[netId] = {};
            }

            this.database.schedules[netId][semester] = schedule;

            console.log("Schedule saved successfully.");
            return true;
        } catch (error) {
            console.error("Error saving schedule:", error);
            throw error;
        }
    }

    filterScheduleByConcentration(schedule, concentration) {
        return schedule.filter(course => course.concentration === concentration);
    }

    handleError(error) {
        console.error("Error:", error.message);
        throw new Error(error.message);  // Modified to throw an error to be caught by caller
    }

    isValidNetId(netId) {
        return typeof netId === 'string' && netId.trim() !== '';
    }
    
    isValidCourseId(courseId) {
        return typeof courseId === 'string' && courseId.trim() !== '';
    }
}

// Example usage with additional functionalities
const scheduleManager = new ScheduleManager();
const netId = "ach127";
const courseId = "03:267:331";
const semester = "Fall 2024";
const concentration = "Computer Science"; // Example concentration

try {
    // Add course to schedule
    scheduleManager.addCourseToSchedule(netId, courseId, semester)
        .then(updatedSchedule => {
            console.log("Updated Schedule:", updatedSchedule);

            // View schedule
            const schedule = scheduleManager.viewSchedule(netId, semester);
            console.log("View Schedule:", schedule);

            // Filter schedule by concentration
            const filteredSchedule = scheduleManager.filterScheduleByConcentration(schedule, concentration);
            console.log("Filtered Schedule:", filteredSchedule);

            // Save schedule
            const isSaved = scheduleManager.saveSchedule(netId, semester, schedule);
            console.log("Is Saved:", isSaved);
        })
        .catch(error => {
            console.error("Caught an error in promises:", error.message);
        });
} catch (error) {
    console.error("Caught an error:", error.message);
}

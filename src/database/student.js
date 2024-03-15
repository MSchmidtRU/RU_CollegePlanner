const { firestore } = require('../index.js');
const { FieldValue } = require('firebase-admin/firestore');

const Helper = require("./helperFunction.js")
const { Section } = require("./section.js");
const { FutureCourse } = require("./futureCourse.js");
const { getCourse } = require("./course.js");

class Student {
    constructor(firstName, lastName, email, phone, gradYear, gpa, concentrations, completedCourses, enrolledCourses, futureCourses, semesterCourses) {
        this.firstName = firstName;
        this.lastName = lastName;
        this.email = email;
        this.phone = phone;
        this.gradYear = gradYear;
        this.gpa = gpa;
        this.concentrations = concentrations;
        this.completedCourses = completedCourses;
        this.enrolledCourses = enrolledCourses;
        this.futureCourses = Helper.isInstance(futureCourses, FutureCourse) ? futureCourses : [];
        this.semesterCourses = Helper.isInstance(semesterCourses, Section) ? studentInfo.semesterCourses : [];
    }

}

// Function to get student data
async function getStudent(netID) {//should i add a parameter to return only depending on what is wanted - like if they ask for GPA give them that, etc?
    try {
        // Reference to the document in the "student" collection
        const studentInfo = firestore.collection("student").doc(netID);

        // Retrieve the document data
        const doc = await studentInfo.get();

        if (doc.exists) {
            // Document exists, access its data
            const studentData = doc.data();

            // Fetch basic student info
            const GPA = studentData.GPA;
            const email = studentData.email;
            const first_name = studentData.first_name;
            const last_name = studentData.last_name;
            const grad_year = studentData.grad_year;
            const phone = studentData.phone;

            const concentrationsArray = studentData.concentrations || [];
            const concentrations = await Helper.getAssociatedIDs(concentrationsArray); //for all these type I got a list of course IDs and I figure that if there's something we need to know about a particular course we can access it directly through the collection, given the ID

            const completedCoursesArray = studentData.completed_courses || [];
            const completed_courses = await Helper.getAssociatedIDs(completedCoursesArray);

            const enrolledCoursesArray = studentData.enrolled_courses || [];
            const enrolled_courses = await Helper.getAssociatedIDs(enrolledCoursesArray);

            const semesterCoursesArray = studentData.semester_courses || [];
            const semester_courses = await Helper.getAssociatedIDs(semesterCoursesArray);

            const futureCoursesArray = studentData.future_courses || [];
            //I had to do this one differently since there's no array of references the same way as the others
            const future_courses = await Promise.all(futureCoursesArray.map(async courseObj => {
                const courseRef = courseObj.course;
                const courseDoc = await courseRef.get();
                if (courseDoc.exists) {
                    return new FutureCourse(
                        courseDoc.id,
                        courseObj.semester,
                        courseObj.year);

                } else {
                    console.log(`Course document ${courseRef.id} does not exist.`);
                    return null;
                }
            }));

            return new Student(first_name, last_name, email, phone, grad_year, GPA, concentrations, completed_courses, enrolled_courses, future_courses, semester_courses);
        } else {
            // Document does not exist
            console.log('No such document!');
            return null;
        }
    } catch (error) {
        console.error('Error getting document:', error);
        throw error;
    }
}


//studentInfo needs to be a Student object
async function insertStudent(netID, studentInfo) {
    try {
        if (!(studentInfo instanceof Student)) {
            throw "studentInfo is not a instance of the Student class";
        }
        const studentData = {
            first_name: studentInfo.firstName,
            last_name: studentInfo.lastName,
            email: studentInfo.email,
            phone: studentInfo.phone,
            grad_year: studentInfo.gradYear,
            GPA: studentInfo.gpa,
            concentrations: Helper.createReference("concentrations", studentInfo.concentrations),
            completed_courses: Helper.createReference("courses", studentInfo.completedCourses),
            enrolled_courses: Helper.createReference("courses", studentInfo.enrolledCourses),
            future_courses: Helper.createReference("courses", studentInfo.futureCourses),
            semester_courses: Helper.createReference("section", studentInfo.semesterCourses),

        };
        const res = await firestore.collection('student').doc(netID).set(studentData);

    } catch (e) {
        console.error('Error saving to Student document:', e);
        throw e;
    }
}


async function addFutureCourse(netID, futureCourse) {
    try {
        if (!(futureCourse instanceof FutureCourse)) {
            throw new Error("future is not an instance of FutureCourse");
        }

        var studentInfo = getStudent(netID);
        var course = getCourse(futureCourse.course);

        if (studentInfo && course) {

            if (futureCourse.year < new Date().getFullYear) {
                throw new Error("invalid year for future semeseter - year is in the past")
            }

            const data = {
                course: Helper.createReference("courses", futureCourse.course),
                semseter: futureCourse.semester,
                year: futureCourse.year
            }
            const res = await firestore.collection('student').doc(netID).update({ future_courses: FieldValue.arrayUnion(data) });

        } else {
            throw new Error("netID or course is not defined ");
        }
    } catch (e) {
        console.error('Error updating Student document:', e);
        throw e;
    }

}

async function testing() {
    // let student = new Student("hannah", "bialik", "test@gmail.com", "9087457645", 2024, 3.9, ["14:332"], ["14:332:128"], ["14:332:128"], [new FutureCourse("14:332:128", "Winter", 2025)], []);
    // await insertStudent("hrb123", student);
    // console.log(await getStudent('hrb123'));

    let course = new FutureCourse("14:332:128", "Summer", 2025);
    await addFutureCourse("nss170", course);
    console.log(await getStudent("nss170"));
}
testing();

module.exports = { Student, getStudent, addFutureCourse };
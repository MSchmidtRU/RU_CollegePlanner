const { firestore } = require('./firebase.js');
const { FieldValue } = require('firebase-admin/firestore');
const Helper = require("./helperFunction.js");
const { Section } = require("./section.js");
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
        this.semesterCourses = Helper.isInstance(semesterCourses, Section) ? semesterCourses : [];
    }
}

class FutureCourse {
    constructor(course, semester) {
        this.course = this.setCourse(course)
        this.semester = this.setSemester(semester);
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
        if (typeof semester !== 'number') {
            throw new Error("Semester must be a int.");
        }

        if ((semester > 0) && (semester < 8) || semester == -1) {
            return semester;
        } else {
            throw new Error("Invalid semester int from 0 to 7 or -1");
        }
    }

}

async function checkStudentExists(netID) {
    try {
        const studentRef = firestore.collection('student').doc(netID);

        const studentDoc = await studentRef.get();

        if (!studentDoc.exists) {
            throw new Error('Student document not found');
        };
    } catch (e) {
        throw new Error(e);
    }

}

// Function to get student data
async function getStudent(netID) {
    try {
        // Reference to the document in the "student" collection
        const studentInfo = firestore.collection("student").doc(netID);

        // Retrieve the document data
        const doc = await studentInfo.get();
        if (!doc.exists) {
            throw new Error('Student document not found');
        };
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
                    courseObj.semester);

            } else {
                //console.log(`Course document ${courseRef.id} does not exist.`);
                //return null;
                throw new Error('Student document not found');
            }
        }));

        return new Student(first_name, last_name, email, phone, grad_year, GPA, concentrations, completed_courses, enrolled_courses, future_courses, semester_courses);
    } catch (error) {
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
            future_courses: [],
            //future_courses: Helper.createReference("courses", studentInfo.futureCourses), //FIXME please
            semester_courses: Helper.createReference("section", studentInfo.semesterCourses),
        };
        const res = await firestore.collection('student').doc(netID).set(studentData);

        for (const futureCourse of studentInfo.futureCourses) {
            await addFutureCourse(netID, futureCourse);
        }


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

        var studentInfo = await getStudent(netID);
        var course = await getCourse(futureCourse.course);

        if (studentInfo && course) {

            studentInfo.futureCourses.forEach(course => {
                if (course.course == futureCourse.course) {
                    throw new Error("can not add course that is already in plan");
                }
            })

            const data = {
                course: Helper.createReference("courses", futureCourse.course),
                semester: futureCourse.semester
            }

            const res = await firestore.collection('student').doc(netID).update({ future_courses: FieldValue.arrayUnion(data) });
            const updatedStudentInfo = await getStudent(netID);
            return { "data": updatedStudentInfo.futureCourses }; //TODO change to 4 year plan
        } else {
            throw new Error("netID or course is not defined");//TODO good?
        }
    } catch (e) {
        throw new Error(e);

    }

}

async function removeFutureCourse(netID, courseID) {
    try {
        const studentInfo = await getStudent(netID);
        const course = await getCourse(courseID);

        if (studentInfo && course) {

            const indexToRemove = studentInfo.futureCourses.findIndex(course => course.course === courseID);

            if (indexToRemove == -1) {
                throw new Error([`course with ID: ${courseID} is not listed in future course of studentwith netID: ${netID}`, 400, "plain/text"]); //TODO include error code
            } else {
                studentInfo.futureCourses.splice(indexToRemove, 1);

                // await firestore.collection('student').doc(netID).update({ future_courses: Helper.createReference("course", studentInfo.futureCourses) });

                for (const futureCourse of studentInfo.futureCourses) {
                    addFutureCourse(netID, futureCourse);
                }


                // Update the student document with the modified future_courses array
                return { "data": studentInfo.futureCourses };
            }

        } else {
            throw new Error(["netID or course is not defined", 404, "plain/text"]); //TODO correct error code
        }

    } catch (e) {
        throw new Error(e);
    }
}

async function getFutureCourses(netID) {
    try {
        let student = await getStudent(netID);
        if (student) {
            let future_courses = student.futureCourses;
            return future_courses;
        } else {
            throw new Error("not valid student");
        }
    } catch (e) {
        throw new Error(e);
    }
}



async function testing() {
    //let student = new Student("melech", "achashveirosh", "king@gmail.com", "9087457645", 2024, 3.9, ["14:332"], ["14:332:128"], ["14:332:128"], [new FutureCourse("14:332:128", "Winter", 2025)], ["14:332:128"]);
    //await insertStudent("ach127", student);
    //console.log(await getStudent('ach127'));
    //console.log(await getFutureCourses('ach127'));
    //let course = new FutureCourse("14:332:128", "Summer", 2025);
    //await addFutureCourse("ri456", course);
    // let student = await getStudent("ri456");
    // console.log(student);
}
//testing();

module.exports = { Student, getStudent, getFutureCourses, addFutureCourse, removeFutureCourse, FutureCourse };

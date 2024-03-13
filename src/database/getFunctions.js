const { firestore } = require('../index.js');

  //This function gets the IDs of objects refereced in an array
  // async function getAssociatedIDs(courseArray)
  // {
  //   const retrievedIDs = await Promise.all(courseArray.map(async courseObj => {
  //     const courseDoc = await courseObj.get();
  //     if (courseDoc.exists) {
  //         return courseDoc.id;
  //     } else {
  //         return null;
  //     }
  // }));
  // return retrievedIDs;
  // }

// // Function to get student data
// async function getStudent(netID) {//should i add a parameter to return only depending on what is wanted - like if they ask for GPA give them that, etc?
//     try {
//         // Reference to the document in the "student" collection
//         const studentInfo = firestore.collection("student").doc(netID);

//         // Retrieve the document data
//         const doc = await studentInfo.get();

//         if (doc.exists) {
//             // Document exists, access its data
//             const studentData = doc.data();

//             // Fetch basic student info
//             const GPA = studentData.GPA;
//             const email = studentData.email;
//             const first_name = studentData.first_name;
//             const last_name = studentData.last_name;
//             const grad_year = studentData.grad_year;
//             const phone = studentData.phone;

//             const concentrationsArray = studentData.concentrations || [];
//             const concentrations = await getAssociatedIDs(concentrationsArray); //for all these type I got a list of course IDs and I figure that if there's something we need to know about a particular course we can access it directly through the collection, given the ID

//             const completedCoursesArray = studentData.completed_courses || [];
//             const completed_courses = await getAssociatedIDs(completedCoursesArray);

//             const enrolledCoursesArray = studentData.enrolled_courses || [];
//             const enrolled_courses = await getAssociatedIDs(enrolledCoursesArray);

//             const semesterCoursesArray = studentData.semester_courses || [];
//             const semester_courses = await getAssociatedIDs(semesterCoursesArray);

//             const futureCoursesArray = studentData.future_courses || [];
//            //I had to do this one differently since there's no array of references the same way as the others
//             const future_courses = await Promise.all(futureCoursesArray.map(async courseObj => {
//               const courseRef = courseObj.course;
//               const courseDoc = await courseRef.get();
//               if (courseDoc.exists) {
//                 return {
//                   id: courseDoc.id,
//                   semester: courseObj.semester,
//                   year: courseObj.year
//               };
//               } else {
//                   console.log(`Course document ${courseRef.id} does not exist.`);
//                   return null;
//               }
//           }));
           
//           return [GPA, email, first_name, last_name, grad_year, phone, concentrations, completed_courses, enrolled_courses, future_courses,  semester_courses];
//         } else {
//             // Document does not exist
//             console.log('No such document!');
//             return null;
//         }
//     } catch (error) {
//         console.error('Error getting document:', error);
//         throw error;
//     }
// }

// async function testing()
// {
//   console.log(await getStudent('nss170'));
// }
// testing();


/*
function getStudentConcentrations(netID) //not sure about this, but maybe this type of format can be used to access the contents of student ID
{
    return getStudent(netID)[1];
}

function getAdmin(netID) //gets the data in the admin object
{

}

function getConcentrationRequirements(concentrationID) //gets the concentration requirements of a student
{

}

function getCourses(netID) //gets the courses that a student took
{

}

function getSections(courseID) //gets the sections of a course
{
    
}

function getConcentrationRequests() //gets list of concentration requests
{

}

function getSampleSchedule(concentration) //gets sample schedule for given concentration
{

}

function getFutureCourses(netID) //gets lsit of future courses that a student has planned
{

}

*/
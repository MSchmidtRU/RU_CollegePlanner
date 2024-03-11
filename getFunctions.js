const app = require('./src/index.js');

getStudent('nss170');
// Function to get student data
async function getStudent(netID) {
    try {
      // Access a reference to the Firestore database using the existing Firebase app
      const firestore = app.firestore();
  
      // Reference to the document in the "students" collection
      const studentInfo = firestore.collection('students').doc(netID);
  
      // Retrieve the document data
      const doc = await studentInfo.get();
  
      if (doc.exists) {
        // Document exists, access its data
        const studentData = doc.data();
        console.log('Document data:', studentData);
  
        // Access nested fields within the document
        const GPA = studentData.GPA;
        const concentrations = studentData.concentrations;
        const completed_courses = studentData.completed_courses;
        const email = studentData.email;
        const enrolled_courses = studentData.enrolled_courses;
        const first_name = studentData.first_name;
        const last_name = studentData.last_name;
        const future_courses = studentData.future_courses;
        const grad_year = studentData.grad_year;
        const phone = studentData.phone;
        const semester_courses = studentData.semester_courses;
  
        return [GPA, concentrations, completed_courses, email, enrolled_courses, first_name, last_name, future_courses, grad_year, phone, semester_courses];
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
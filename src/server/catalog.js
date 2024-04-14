const courseHandler = require('../database/course');
const {firestore} = require('../database/firebase.js');


async function loadDB() {
    try {
      // Get a reference to the Firestore service
      const db = firestore;
  
      // Reference to the collection
      const collectionRef = db.collection('courses');
  
      // Fetch all documents in the collection and return a promise
      return new Promise((resolve, reject) => {
        let allDocuments = [];
  
        collectionRef.get().then((querySnapshot) => {
          querySnapshot.forEach((doc) => {
            allDocuments.push({courseID: doc.id, name: doc.data().name, credits: doc.data().credits, description: doc.data().description});
          });
          // Resolve the promise with the array of documents
          resolve(allDocuments);
        }).catch((error) => {
          // Reject the promise with an error if fetching fails
          reject(error);
        });
      });
    } catch (error) {
      console.error('Error loading database: ', error);
      throw error;
    }
}

//Create snapshot of full course list within db on server start to make CRUD operations faster
const snapshot = loadDB();

async function allCourses(){
    const courses = await snapshot;
    console.log(courses);
    return [JSON.stringify(courses), 200];
}

async function searchCourses(req){
    try{
        let query = req.params.query;
        const allCourses = await snapshot;
        const matchingCourses = allCourses.filter(course => course.name.toLowerCase().includes(query));
        console.log(matchingCourses);
        return [JSON.stringify(matchingCourses), 200];
    }
    catch (error) {
        console.error('Error searching courses: ', error);
        throw error;
    }

}

async function getCourse(req){
    let courseID = req.params.courseID;
    console.log(courseID);
    try{    
        const course = await courseHandler.getCourse(courseID);
        //const reqCourse = new courseHandler.Course(course);
        console.log(course);
        return [JSON.stringify(course), 200];
    }
    catch(error){
        throw new Error("Requested Course Does Not Exist ~404")
    }
}

module.exports = {allCourses, searchCourses, getCourse};
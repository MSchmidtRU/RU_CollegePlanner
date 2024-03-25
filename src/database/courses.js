const courseHandler = require('./course');

// async function addCourses(filepath){
//     const fs = require('fs');

//     // Read the JSON file
//     fs.readFile(filepath, 'utf8', async (err, data) => {

//     if (err) {
//         console.error('Error reading file:', err);
//         return;
//     }

//     try {
//         // Parse JSON data
//         const courses = JSON.parse(data);

//         // Create an empty object to store formatted courses
//         const formattedCourses = [];

//         // Loop through each course object
//         courses.forEach(course => {
//         // Extract courseID and remove sections array
//         const { courseID, sections, ...courseData } = course;

//         // Store course data in the desired format
//         formattedCourses[courseID] = courseData;
//         });

//         // Log the formatted courses object
//         console.log(formattedCourses);

//         //Attempt to add all courses in
//         await courseHandler.insertArrayofCourses(formattedCourses);

//     } catch (error) {
//         console.error('Error parsing JSON:', error);
//     }
//     });

    

// }

// await addCourses('school77.json');
// await console.log(await courseHandler.getCourse('77:705:101'));


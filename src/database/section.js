const { firestore } = require('../index.js');

class Section {
    constructor(available, timing) {
        this.available = available;
        
        this.timing = timing;

    }
}

async function getSection(sectionID)
{
    try {
        const sectionInfo = firestore.collection("sections").doc(sectionID);
    
        // Retrieve the document data
            const doc = await sectionInfo.get();
    
        if (doc.exists) {
                // Document exists, access its data
                const sectionData = doc.data();

                const available = sectionData.available;
                let timing = sectionData.timing;

            return new Section(available, timing); //when the section is returned the location is not printed in the console. I think that's more about how it's printed than something wrong with how it's stored though
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
async function testing() {
    //let course = new Course("Software Engineering", "Intro to the cocepts of software engeinering", 4, ["14:332:128"], ["14:332:221"], ["14:332:124:01"]);
    //await insertCourse("14:332:400", course);
    console.log(await getSection('14:332:124:01'));
}
testing();

module.exports = { Section };
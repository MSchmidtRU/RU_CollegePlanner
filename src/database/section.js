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

async function insertSection(secionID, section) {
    try {
        if (!(section instanceof Section)) {
            throw "course is not an instance of Course";
        }

        const sectionData = {
            available: section.available,
            timing: section.timing,
        }
        const res = await firestore.collection('sections').doc(secionID).set(sectionData);

    } catch (error) {
        console.error('Error saving to Course document:', e);
        throw e;
    }
}

async function testing() {
    let section = new Section(true, {friday: {start: "8:30", end: "9:50", location: {campus:"busch", room: "ARC-164"}}, tuesday: {start: "8:30", end: "9:50", location: {campus:"busch", room: "ARC-164"}}});
    console.log(await insertSection('14:332:124:02',section));
        //console.log(await getSection('14:332:124:01'));
}
testing();

module.exports = { Section };
const { firestore } = require('./firebase.js');
const Helper = require("./helperFunction")

class Section {
    constructor(available, timing) {
        this.available = available;

        this.timing = timing;

    }
}

async function getSection(sectionID) {
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

    } catch (e) {
        console.error('Error saving to Course document:', e);
        throw e;
    }
}

async function testing() {
    let sectionsDatabase = [//please DO NOT erase this. This is data coppied from CSP fall 2023
    ['14:332:221:01', new Section(true, {tuesday: {start: "2:00", end: "3:20", location: {campus:"busch", room: "SEC-111"}}, thursday: {start: "2:00", end: "3:20", location: {campus:"busch", room: "SEC-111"}}, monday: {start: "19:30", end: "20:50", location: {campus:"busch", room: "SEC-117"}}})],
    ['14:332:221:02', new Section(false, {tuesday: {start: "2:00", end: "3:20", location: {campus:"busch", room: "SEC-111"}}, thursday: {start: "2:00", end: "3:20", location: {campus:"busch", room: "SEC-111"}}, monday: {start: "10:20", end: "11:40", location: {campus:"busch", room: "ARC-105"}}})],
    ['14:332:221:03', new Section(false, {tuesday: {start: "2:00", end: "3:20", location: {campus:"busch", room: "SEC-111"}}, thursday: {start: "2:00", end: "3:20", location: {campus:"busch", room: "SEC-111"}}, monday: {start: "13:10", end: "14:30", location: {campus:"busch", room: "PHY-LH"}}})],
    ['14:332:221:04', new Section(true, {tuesday: {start: "2:00", end: "3:20", location: {campus:"busch", room: "SEC-111"}}, thursday: {start: "2:00", end: "3:20", location: {campus:"busch", room: "SEC-111"}}, monday: {start: "19:30", end: "20:50", location: {campus:"busch", room: "SEC-202"}}})],
    ['14:332:221:05', new Section(false, {tuesday: {start: "2:00", end: "3:20", location: {campus:"busch", room: "SEC-111"}}, thursday: {start: "2:00", end: "3:20", location: {campus:"busch", room: "SEC-111"}}, monday: {start: "10:20", end: "11:40", location: {campus:"busch", room: "EE-203"}}})],
    ['14:332:222:01', new Section(true, {tuesday: {start: "2:00", end: "3:20", location: {campus:"busch", room: "SEC-207"}}, thursday: {start: "2:00", end: "3:20", location: {campus:"busch", room: "SEC-207"}}})],
    ['14:332:345:01', new Section(false, {monday: {start: "15:50", end: "16:10", location: {campus:"busch", room: "HLL-114"}}, wednesday: {start: "15:50", end: "16:10", location: {campus:"busch", room: "HLL-114"}}, friday: {start: "14:00", end: "15:20", location: {campus:"busch", room: "SEC-204"}}})],
    ['14:332:345:02', new Section(true, {monday: {start: "15:50", end: "16:10", location: {campus:"busch", room: "HLL-114"}}, wednesday: {start: "15:50", end: "16:10", location: {campus:"busch", room: "HLL-114"}}, friday: {start: "10:20", end: "11:40", location: {campus:"busch", room: "ARC-204"}}})],
    ['14:332:345:03', new Section(true, {monday: {start: "15:50", end: "16:10", location: {campus:"busch", room: "HLL-114"}}, wednesday: {start: "15:50", end: "16:10", location: {campus:"busch", room: "HLL-114"}}, friday: {start: "19:30", end: "20:50", location: {campus:"busch", room: "ARC-206"}}})]
]

    //let section = new Section(true, {friday: {start: "8:30", end: "9:50", location: {campus:"busch", room: "ARC-164"}}, tuesday: {start: "8:30", end: "9:50", location: {campus:"busch", room: "ARC-164"}}});
    //console.log(await insertSection('14:332:124:02',section));
    //console.log(await getSection('14:332:124:01'));
    for(let i = 0;i<sectionsDatabase.length;i++)
    {
        await insertSection(sectionsDatabase[i][0], sectionsDatabase[i][1]);
    }
}
// testing();



module.exports = { Section };
const { firestore } = require('../index.js');

async function getAssociatedIDs(courseArray) {
    const retrievedIDs = await Promise.all(courseArray.map(async courseObj => {
        const courseDoc = await courseObj.get();
        if (courseDoc.exists) {
            return courseDoc.id;
        } else {
            return null;
        }
    }));
    return retrievedIDs;
}

function createReference(doc, arr) {
    let references = [];
    arr.forEach(element => {
        references.push(firestore.doc(`/${doc}/${element}`));
    });

    return references;
}

function isInstance(arr, instance) {
    arr.forEach(element => {
        if (!(element instanceof instance)) {
            return false;
        }
    });
}


module.exports = { getAssociatedIDs, createReference, isInstance }
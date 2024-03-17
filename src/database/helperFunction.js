const { firestore } =require('./firebase.js');

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
    if (!Array.isArray(arr)) {
        return firestore.doc(`/${doc}/${arr}`);
    } else {
        arr.forEach(element => {
            references.push(firestore.doc(`/${doc}/${element}`));
        });
    }


    return references;
}

function isInstance(arr, instance) {
    if (!Array.isArray(arr)) {
        if (!(arr instanceof instance)) {
            return false;
        }
    } else {
        arr.forEach(element => {
            if (!(element instanceof instance)) {
                return false;
            }
        });
    }
    return true;

}


module.exports = { getAssociatedIDs, createReference, isInstance }
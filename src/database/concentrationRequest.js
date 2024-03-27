const { firestore } = require('./firebase');

const createConcentrationRequest = async (requestData) => {
    const { name, netID, graduationYear, concentration } = requestData;

    const docRef = await firestore.collection('concentrationRequests').add({
        name,
        netID,
        graduationYear,
        concentration,
        status: 'pending'
    });

    return docRef.id;
};

const fetchConcentrationRequests = async () => {
    const snapshot = await firestore.collection('concentrationRequests').get();
    const requests = [];
    snapshot.forEach(doc => {
        requests.push({ id: doc.id, ...doc.data() });
    });
    return requests;
};

const updateConcentrationRequestStatus = async (requestId, status) => {
    await firestore.collection('concentrationRequests').doc(requestId).update({ status });
};

module.exports = {
    createConcentrationRequest,
    fetchConcentrationRequests,
    updateConcentrationRequestStatus
};

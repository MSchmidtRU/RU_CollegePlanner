const { firestore } = require('../../database/firebase.js');
const { FieldValue } = require('firebase-admin/firestore');



async function concentrationSearch(request) {
    //console.log(request.params);
    if (!(request.params.data.trim().length === 0)) {
        try {
            let matchingDocIds = [];
            //console.log("Processed input data:", inputdata);
            let inputdata = decodeURIComponent(request.params.data).toLowerCase();

            const concentrationNames = await firestore.collection("concentration").select('Title').get();

            concentrationNames.forEach(doc => {
                //console.log(doc.data().Title)
                let docName = doc.data().Title; 
                if (docName && docName.toLowerCase().includes(inputdata)) {
                    //console.log("Matching document ID:", doc.id);
                    matchingDocIds.push(doc.id);
                }
            });

            console.log("Matching Document IDs:", matchingDocIds);

            const concentrationMatches = {}; 
            for (const docId of matchingDocIds) {
                const docRef = firestore.collection('concentration').doc(docId);
                const doc = await docRef.get();
                if (doc.exists) {
                    concentrationMatches[doc.id] = doc.data();  
                }
            }

            //console.log("Number of matches:", Object.keys(concentrationMatches).length);
            console.log("Matched Data:", concentrationMatches);

            if (Object.keys(concentrationMatches).length > 0) {
                return [JSON.stringify(concentrationMatches), 200]; 
            } else {
                return ["No concentrations were found with that title.", 204];
            }
        } catch (error) {
            console.error("Failed to retrieve data from Firestore:", error);
            return [JSON.stringify({ error: error.toString() }), 500]; 
        }
    } else {
        return ["Concentration Search requires input.", 400];
    }
}

async function viewConcentration(request) {
    if(!(request.params.data.trim().length === 0)) {
        try {
            let inputdata = decodeURIComponent(request.params.data).toLowerCase();
            console.log("INPUT: " +inputdata)
            const concentrationList = await firestore.collection("concentration").get();
            let concentration = null
            concentrationList.forEach(doc => {
                const conData = doc.data();
                const conName = doc.id;
                //console.log(conName)
                if(conName.toLowerCase()===(inputdata.toLowerCase())) {
                    //console.log("HERE!")
                    concentration = doc;
                }

            })
            if(concentration != null)
            {
                //console.log("THERE")
                concentrationInfo = `${concentration.id}\n\n
                This concentration belongs to the ${concentration.data()["School"]} School ID:(${concentration.data()["School ID"]})
                offered by Department Number ${concentration.data()["Department"]}
                The Concentration possesses the following degree forms: ${concentration.data()["Degree Type"].join(', ')} \n
                The Credit counts for each respectively are: ${concentration.data()["Credits"].join(', ')}\n
                The Concentration Coursework: \n\n ${concentration.data()["Courses"].join(' \n ')}
                `
                return [concentrationInfo, 200]
            }
            else
            {
                throw new Error("Unfortunately, no concentration under the ID " + request.params.data + " could be located. Please try again.")
            }
        } catch(error) {
            throw new Error("The data for the requested concentration has failed to load due to " + error);
        }
    }
}

module.exports = {concentrationSearch, viewConcentration}


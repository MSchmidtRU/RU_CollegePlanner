//const { Concentration, ConcentrationCourse, getSample, getConcentration, getCourses, getEquivelentCourses, getConcentrationResidency } = require('../../database/concentration.js')
const { firestore } = require('../../database/firebase.js');
const { FieldValue } = require('firebase-admin/firestore');

const filters = {
    "School": ["Rutgers Business School", "Rutgers Schools of Arts & Sciences", "Rutgers Engineering School", "Rutgers School of Communication & Information"],
    "Credits": 120,
    "Degree Type": ["B.A", "B.S", "Minor"]

}

async function concentrationSearch(request) {
    
    console.log(request.params)
    if(!(request.params.data.trim().length === 0)) {
        try {
            let inputdata = request.params.data
            const concentrationList = await firestore.collection("concentration").get();
            const concentrationMatches = []

            concentrationList.forEach(doc => {
                const conData = doc.data();
                const conName = doc.id;
                console.log(conName)
                if(conName.toLowerCase().includes(inputdata.toLowerCase())) {
                    concentrationMatches.push(conName)
                }

            })

            if(concentrationMatches.length > 0) {
                const concentrationString = "The following concentrations fit your search criteria: \n" + concentrationMatches.join(', ');

                return [concentrationString, 200];
            }
            else
            {
                throw new Error("No concentrations were found with that query.");
                //return ["No concentrations were found with that query.", 204]
            }

        } catch (error) {
            throw new Error(error);
        }
    }
}

async function viewConcentration(request) {
    if(!(request.params.data.trim().length === 0)) {
        try {
            let inputdata = request.params.data
            inputdata = inputdata.replace(/_/g, " ");
            inputdata = inputdata.replace(/%20/g, " ");
            inputdata = inputdata.replace(/\+/g, " ");
            console.log(inputdata)
            const concentrationList = await firestore.collection("concentration").get();
            let concentration = null
            concentrationList.forEach(doc => {
                const conData = doc.data();
                const conName = doc.id;
                console.log(conName)
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





async function filteredSearch(request) {
    let filterOption = request.params.data;
    filterOption = filterOption.toLowerCase().trim();
    switch(filterOption) {
        case 'credits':
            const concentrationList = await firestore.collection("concentration").get();
            const concentrationMatches = []

            concentrationList.forEach(doc => {
                const conData = doc.data();
                const conName = doc.id;
                console.log(conName)
                if(conName.toLowerCase().includes(inputdata.toLowerCase())) {
                    concentrationMatches.push(conName)
                }

            })

            if(concentrationMatches.length > 0) {
                const concentrationString = "The following concentrations fit your search criteria: \n" + concentrationMatches.join(', ');

                return [concentrationString, 200];
            }
            else
            {
                throw new Error("No concentrations were found with that query.");
                //return ["No concentrations were found with that query.", 204]
            }
        default: 
            
    }
}

module.exports = {concentrationSearch, viewConcentration, filteredSearch}


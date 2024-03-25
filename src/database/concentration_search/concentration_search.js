const { Concentration, ConcentrationCourse, getSample, getConcentration, getCourses, getEquivelentCourses, getConcentrationResidency } = require('../concentration')
const { firestore } = require('./firebase.js');
const { FieldValue } = require('firebase-admin/firestore');


class cSearch {
    static filters = {
        "School": ["Rutgers Business School", "Rutgers Schools of Arts & Sciences", "Rutgers Engineering School", "Rutgers School of Communication & Information"],
        "Credits": 120,
        "Degree Type": ["B.A", "B.S", "Minor"]

    }

    constructor(query) {
        this.query = query;

    }
    async processSearch(query) {
        if(!(query.trim().length === 0)) {
            try {
                const concentrationList = await firestore.collection("concentration").get();
                const concentrationMatches = []
    
                concentrationList.forEach(doc => {
                    const conData = doc.data();
                    const conName = conData.name;
                    if(conData.name.toLowerCase().includes(query.toLowerCase())) {
                        concentrationMatches.push()
                    }
    
                })
    
            } catch (error) {
                
            }
        }
        
        
    }

    
}


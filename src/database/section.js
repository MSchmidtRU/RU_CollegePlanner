const { firestore } = require('../index.js');

class Section {
    constructor(available, timing) {
        this.available = available;
        this.timing = timing;
    }
}

module.exports = { Section };
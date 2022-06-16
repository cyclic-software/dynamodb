
const CyclicCollection = require('./cy_db_collection')
const CyclicIndex = require('./cy_db_index')
const CyclicItem = require('./cy_db_item')

class CyclicDb {
    constructor(){
        console.log('constructor call')
        return this
    }
 
    item(collection,key){
        return new CyclicItem(collection, key)
    }
 
    collection(collection){
        return new CyclicCollection(collection)
    }

   index(name){
        return new CyclicIndex(name)
    }
}


let init = function(table_name){
    process.env.CYCLIC_DB = table_name
    return new CyclicDb(table_name)

    
}

// Function.prototype.valueOf = function() {
//     this.call(this);
//     // Optional improvement: avoid `NaN` issues when used in expressions.
//     return 0; 
// };

module.exports = new CyclicDb
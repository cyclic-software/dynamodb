
const CyclicCollection = require('./cy_db_collection')
const CyclicIndex = require('./cy_db_index')
const CyclicItem = require('./cy_db_item')

class CyclicDb {
 
    static item(collection,key){
        return new CyclicItem(collection, key)
    }

    static collection(collection){
        return new CyclicCollection(collection)
    }

    static index(name){
        return new CyclicIndex(name)
    }
}


module.exports = CyclicDb
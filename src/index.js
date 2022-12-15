
const CyclicCollection = require('./cy_db_collection')
const CyclicIndex = require('./cy_db_index')
const CyclicItem = require('./cy_db_item')

class CyclicDb extends Function{
    constructor() {
        super('...args', 'return this._bound._call(...args)')
        this._bound = this.bind(this)
        return this._bound
      }

    _call(table_name) {
        process.env.CYCLIC_DB = table_name
        return new CyclicDb
    }

    /**
     * @type {CyclicItem}
     */
    item(collection,key){
        return new CyclicItem(collection, key)
    }

    /**
     * @type {CyclicCollection}
     */
    collection(collection){
        return new CyclicCollection(collection)
    }

    /**
     * @type {CyclicIndex}
     */
    index(name){
        return new CyclicIndex(name)
    }
}

module.exports = new CyclicDb

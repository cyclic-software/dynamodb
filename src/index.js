
import { CyclicCollection } from "./cy_db_collection";
import { CyclicIndex } from "./cy_db_index";
import { CyclicItem } from "./cy_db_item";

export class CyclicDb extends Function {
  constructor() {
    super("...args", "return this._bound._call(...args)");
    this._bound = this.bind(this);
    return this._bound;
  }

  _call(table_name) {
    process.env.CYCLIC_DB = table_name;
    return new CyclicDb();
  }

  /**
   * @type {CyclicItem}
   */
  item(collection, key) {
    return new CyclicItem(collection, key);
  }

  /**
   * @type {CyclicCollection}
   */
  collection(collection) {
    return new CyclicCollection(collection);
  }

  /**
   * @type {CyclicIndex}
   */
  index(name) {
    return new CyclicIndex(name);
  }
}

export default new CyclicDb();

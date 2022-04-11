
const {  QueryCommand, ScanCommand} = require("@aws-sdk/lib-dynamodb")
const {docClient} = require('./ddb_client')

const CyclicIndex = require('./cy_db_index')
const CyclicItem = require('./cy_db_item')
const { validate_strings} = require('./cy_db_utils')


function paths(item) {
  function iter(r, p) {
    var keys = Object.keys(r);
    if (typeof r == 'object' && keys.length) {
      return keys.forEach(x => iter(r[x], p.concat(x)));
    }

    result.push(p);
  }
  var result = [];
  iter(item, []);
  return result;
}

function path_get(o,p){
  let prop = p.shift()
  if(prop){
      return path_get(o[prop],p)
  }else{
      return o
  }
}

const gen_expression = function(q_obj){
  let p = paths(q_obj)
  let expression = []
  let attr_vals = {}
  
  let attr_names = {}
  let names = [...new Set(p.flat())].reduce((a,n,i)=>{
      let nn = `#k${i}${n}`
      attr_names[nn]= n
      return {...a, [n]: nn}
  },{})

  if(p.flat().length){
     p.forEach((path,prop_idx)=>{
        let exp = path.map((path_el,depth)=>{return names[path_el]})
        let v = path_get(q_obj,path)
        let vn = `:v${prop_idx}`
        attr_vals[vn] = v
        expression.push(`${exp.join('.')} = ${vn}`)
    })
  }
  // // do not get index item as result
  expression.push(`(cy_meta.rt = :vvitem OR cy_meta.rt = :vvfragment)`)
  attr_vals[`:vvitem`] = 'item'
  attr_vals[`:vvfragment`] = 'fragment'
      
  expression = expression.join(' AND ')
  return{
    attr_names,
    attr_vals,
    expression,
  }

  
}



class CyclicCollection{
    constructor(collection, props={}){
      validate_strings(collection, 'Collection Name')

        this.collection = collection
    }
    item(key){
      return new CyclicItem(this.collection,key)
    } 
    async get(key){
      let item = new CyclicItem(this.collection,key)
      return item.get()
    }
    async set(key, props, opts){
      let item = new CyclicItem(this.collection,key)
      return item.set(props,opts)
    }
    
    async delete(key, props, opts){
      let item = new CyclicItem(this.collection,key)
      return item.delete()
    }


    async filter(q={}, segments=3, next = null){
      if(segments>5){
        segments = 5
      }
      
      let scans = Array.from({length: segments}, (_, index) => index + 1);
      
      let filter = gen_expression(q)
      filter.expression = `${filter.expression} AND cy_meta.#kc = :vcol`
      filter.attr_names[`#kc`] = 'c'
      filter.attr_vals[`:vcol`] = this.collection
      
      let r = {
        results: []
      }

      let segment_results = await Promise.all(scans.map(s=>{
        return  this.parallel_scan(filter, s-1, segments)
          
      }))

      segment_results.forEach(s=>{
        s.results.forEach(sr=>{r.results.push(sr)})
      })
      
      return r
    }

    

    async parallel_scan(filter, segment, total_segments, limit=50000 ,  next = null){
        let results = []
        do{
          var params = {
            TableName: process.env.CYCLIC_DB,
            Limit: limit, 
            ScanIndexForward:false,
            Segment: segment,
            TotalSegments:total_segments,
            ExclusiveStartKey: next,
            FilterExpression: filter.expression,
            ExpressionAttributeNames: filter.attr_names,
            ExpressionAttributeValues: filter.attr_vals,
          };
          let res = await docClient.send(new ScanCommand(params))
          next = res.LastEvaluatedKey
          results = results.concat(res.Items)

        }while(next && results.length<limit)

        results = results.map(r=>{
          return CyclicItem.from_dynamo(r)
        })
        let result = {
          results,
          length: results.length

        }
        if(next){
          result.next = next
        }
        return result;
    }



    async list(limit=10000, next = null){
          let results = []
          do{
            var params = {
              TableName: process.env.CYCLIC_DB,
              Limit: limit,
              IndexName: 'keys_gsi',
              // KeyConditions:{
              //   keys_gsi:{
              //     ComparisonOperator:'EQ',
              //     AttributeValueList: [this.collection]
              //   }
              // },
              KeyConditionExpression: 'keys_gsi = :keys_gsi',
              ExpressionAttributeValues:{
                ':keys_gsi':this.collection,
              },
              ScanIndexForward:false,
              ExclusiveStartKey: next
            };
            let res = await docClient.send(new QueryCommand(params))
            // var res = await docClient.query(params).promise();

            next = res.LastEvaluatedKey
            results = results.concat(res.Items)
          }while(next && results.length<limit)

          results = results.map(r=>{
            return CyclicItem.from_dynamo(r)
          })
          let result = {
            results
          }
          if(next){
            result.next = next
          }
          return result;
    }

    async latest(){
        let params = {
            TableName : process.env.CYCLIC_DB,
            Limit: 1,
            IndexName: 'keys_gsi',
            KeyConditionExpression: 'keys_gsi = :keys_gsi',
            ExpressionAttributeValues:{
              ':keys_gsi':this.collection,
            },
            // KeyConditions:{
            //   keys_gsi:{
            //     ComparisonOperator:'EQ',
            //     AttributeValueList: [this.collection]
            //   }
            // },
            ScanIndexForward:false
          };
          let res = await docClient.send(new QueryCommand(params))
          if(!res.Items.length){
            return null
          }
          return CyclicItem.from_dynamo(res.Items[0])
    }

    index(name){
      return new CyclicIndex(name, this.collection)
    }

    find(name, value){
      let idx = new CyclicIndex(name, this.collection)
      return idx.find(value)
    }

}


module.exports = CyclicCollection
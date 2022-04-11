const {ValidationError} = require('./cy_db_utils')



const paths = function (item) {
    function iter(r, p) {
      var keys = Object.keys(r);
      // console.log(Array.isArray(r), r)
      if(Array.isArray(r)){
        throw new ValidationError(`Array values are not supported in queries. Received: ${JSON.stringify(r)}`)
      }
      if (typeof r == 'object' && keys.length) {
        return keys.forEach(x => iter(r[x], p.concat(x)));
      }
  
      result.push(p);
    }
    var result = [];
    iter(item, []);
    return result;
  }
  
const path_get = function(o,p){
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
  

  module.exports = {
    paths,
    path_get,
    gen_expression
  }
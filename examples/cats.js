
process.env.CYCLIC_DB = 'CyclicDB'
const CyclicDb = require('../src/')

const run = async function(){
    let stack_id = 'calm-tan-onesies'
    let domains =await CyclicDb.collection('alt_domains').index('stack_id').find(stack_id)
    console.log(domains)
    // domains = _.sortBy(domains.results, d=>{return d.props.created})
    domains = domains.results.map(d=>{
      return {
        domain: d.key,
        subdomain: d.key.split(".")[0],
        created: d.props.created,
        updated: d.props.updated,
        status: d.props.status
      }
    }).reverse();
    let active_domains = domains.filter(d=>{return d.status !=='deleting'})
    let active_domain = {}
    if(active_domains.length ){
      active_domain = active_domains[0]
      if((moment() - moment(active_domain.updated) < 10000) && active_domain.status == 'created'){
        active_domain.status = 'cooldown'
      }
      if((moment() - moment(active_domain.updated) > (5*60*1000)) && active_domain.status != 'created'){
        active_domain.status = 'failed'
      }
    }
    console.log(active_domain)

}

run()


process.env.CYCLIC_DB = 'CyclicDB'
const CyclicDb = require('../src/')


const run = async function(){
    // let res = await CyclicDb.item('apps','a').get()
    let res = await CyclicDb.item('apps','a').set({
        // name:'mike',
        type:'b'
    },{
        // indexBy:['name']
        $unset:['name']
    })
    console.log(res)
}

run()

process.env.CYCLIC_DB = 'CyclicDB'
const CyclicDb = require('../src/')


const run = async function(){
    let res = await CyclicDb.item('apps','a').set({
        name: 'mike',
        zip:19027
    },{
        indexBy:['name']
    })
    res = await CyclicDb.item('apps','a').get()
    res = await CyclicDb.item('apps','a').fragment('bbb').set({
        abc:10
    })
    res = await CyclicDb.item('apps','a').fragment('bbb').get()
    res = await CyclicDb.item('apps','a').fragment('bbb').list()
    res = await CyclicDb.item('apps','a').indexes()


    res = await CyclicDb.index('name').find('mike')
    // let res = await CyclicDb.item('apps','a').set({
    //     // name:'mike',
    //     type:'b'
    // },{
    //     // indexBy:['name']
    //     $unset:['name']
    // })
    console.log(res)
}

run()
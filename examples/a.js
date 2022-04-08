
process.env.CYCLIC_DB = 'glamorous-battledress-tickCyclicDB'
const db = require('../src/')
CyclicDb.collection('app_stacks').item(req.params.app).fragment('environment').get()

const run = async function(){
    // instantiate a collection
    let animals = db.collection('animals')
    
    // create an item in collection with key "leo"
    let leo = await animals.set('leo', {
        type:'cat',
        color:'orange'
    })

    // get an item at key "leo" from collection animals
    let item = await animals.get('leo')
    console.log(item)

    // delete 'leo'
    await animals.delete('leo')

    // create an animal item indexed by its color
    let luna = await animals.set('luna', {
        type:'cat',
        color:'orange'
    },{
        $index: ['color']
    })    
    console.log(luna)

    item = await animals.get('luna')
    console.log(JSON.stringify(item,null,2))

    // find orange animals
    let orange_animals = await animals.index('color').find('orange')
    console.log('orange_animals', orange_animals)


    // get newest item in collection 
    let new_animal = await animals.latest()
    console.log('new_animal',new_animal)

    // list all animals - will auto-paginate, limit and next token can be provided
    let all_animals =  await animals.list()
    console.log('all_animals',all_animals)

}
run()

// const run = async function(){
//     let res
//     let users = db.collection('users')
//     res = await users
//    .item('asdf')
//    .fragment('pending_hooks',`build_asdf`).set({
//      app: 'asdfasdf',
//      repo: {}
//    })
   


//     let animals = db.collection('animals')
//     res = await animals.set('leo', {
//         type:'cat',
//         color:'orange'
//     },{
//         // $index: ['color']
//     })

//     // res = await animals.list()
//     // res = await animals.latest()
//     // res = await animals.index('color').find('orange')

//     // res = await animals.item('cat').fragment('c').set({
//     //     p:1,
//     //     color:'orange'
//     // },{
//     //     $index : ['color']
//     // })
//     // res = await animals.index('color').find('orange')



//     // res = await animals.delete('leo')
    
//     // res = await CyclicDb.item('apps','a').set({
//     //     name: 'mike',
//     //     zip:19027,
//     //     val: '',
//     //     val2: ''
//     // },{
//     //     $index:['name']
//     // })
    
//     // res = await CyclicDb.item('apps','a').set({
//     //     name: 'mike',
//     //     zip:19027
//     // },{
//     //     $index:['name'],
//     //     $unset:['val']
//     // })

//     // res = await CyclicDb.item('apps','a').get()
//     // res = await CyclicDb.item('apps','a').fragment('bbb').set({
//     //     abc:10
//     // })
//     // res = await CyclicDb.item('apps','a').fragment('bbb').get()
//     // res = await CyclicDb.item('apps','a').fragment('bbb').list()
//     // res = await CyclicDb.item('apps','a').indexes()


//     // res = await CyclicDb.index('name').find('mike')

//     // res = await CyclicDb.collection('apps').list()
//     // res = await CyclicDb.collection('apps').latest()
//     // res = await CyclicDb.collection('apps').item('a').get()
//     // res = await CyclicDb.collection('apps').find('name','mike')

//     console.log(res)
// }

// run()
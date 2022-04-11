
process.env.CYCLIC_DB = 'glamorous-battledress-tickCyclicDB'
const db = require('../src/')

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
    // await animals.delete('leo')

    // create an animal item indexed by its color
    let luna = await animals.set('luna', {
        type:'cat',
        color:'black'
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

    // filter animals by color
    let black_animals = await animals.filter({color:"black"})
    console.log(black_animals)
    
    // filter animals by color
    let orange_cats = await animals.filter({color:"orange", type:"cat"})
    console.log(orange_cats)
}

run()

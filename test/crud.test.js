const db = require('cyclic-dynamodb')

process.env.CYCLIC_DB = process.env.CYCLIC_DB || 'db-sdkCyclicDB'
process.env.AWS_REGION = process.env.AWS_REGION || 'us-east-2'

describe("CRUD Suite from example in README", () => {
  test("CRUD", async () => {

    let animals = db.collection('animals')

    // create an item in collection with key "leo"
    let leo = await animals.set('leo', {
        type:'cat',
        color:'orange'
    })

    console.log(leo)

    // get an item at key "leo" from collection animals
    let item = await animals.get('leo')

    console.log(item)

    // expect(item.props).toContain(leo.props)

    expect(item.props).toEqual(expect.objectContaining(leo.props));

  });

  test("find index item", async () => {
    let animals = db.collection('animals')
    let leo = await animals.set('leo', {
        type:'cat',
        color:'orange'
    },{
      $index: ['type']
    })

    let r = await animals.index('type').find('cat')
    await leo.delete()
    expect(r.results.length).toEqual(1)
    expect(r.results[0].key).toEqual('leo');

  })
  
  test("delete fragment", async () => {
    let animals = db.collection('animals')
    let leo_fragment = await animals.item('leo').fragment('fr','frname').set({
      data:'fragment'
    },{
      $index: ['data']
    })

    console.log(leo_fragment)
    let r = await animals.index('data').find('fragment')
    console.log(r.results[0])
    expect(r.results.length).toEqual(1)
    expect(r.results[0].key).toEqual('frname');
    
    await leo_fragment.delete()
    r = await animals.index('data').find('fragment')
    console.log(r)
    expect(r.results.length).toEqual(0)
    // console.log(leo_fragment)


  })
  
});

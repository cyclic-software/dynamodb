const db = require('cyclic-dynamodb')

process.env.CYCLIC_DB = process.env.CYCLIC_DB || 'CyclicDB'
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
});

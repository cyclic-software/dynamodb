process.env.AWS_REGION = process.env.AWS_REGION || 'us-east-2'

describe("Db client", () => {
  test("can be instantiated statically ", async () => {

  const db = require('cyclic-dynamodb')

  process.env.CYCLIC_DB = process.env.CYCLIC_DB || 'CyclicDB'
  process.env.AWS_REGION = process.env.AWS_REGION || 'us-east-2'

  let animals = db.collection('animals')

  // create an item in collection with key "leo"
  let leo = await animals.set('leo', {
      type:'cat',
      color:'orange'
  })

  // get an item at key "leo" from collection animals
  let item = await animals.get('leo')

  expect(item.props).toEqual(expect.objectContaining(leo.props));

  await animals.delete('leo')

  });

  test("can be instantiated dynamically ", async () => {
  delete process.env.CYCLIC_DB 

  const CyclicDb = require('cyclic-dynamodb')
  const db = CyclicDb('CyclicDB')

  let animals = db.collection('animals')

  // create an item in collection with key "leo"
  let leo = await animals.set('leo', {
      type:'cat',
      color:'orange'
  })

  // get an item at key "leo" from collection animals
  let item = await animals.get('leo')

  expect(item.props).toEqual(expect.objectContaining(leo.props));

  await animals.delete('leo')

  });

});

process.env.AWS_REGION = process.env.AWS_REGION || 'us-east-2'

describe("require('CyclicDb')", () => {
  test("can be used as an object relying on env vars ", async () => {

  const db = require('cyclic-dynamodb')

  process.env.CYCLIC_DB = process.env.CYCLIC_DB || 'db-sdkCyclicDB'
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

  test("can be called like a function with a table name argument ", async () => {
  delete process.env.CYCLIC_DB 

  const CyclicDb = require('cyclic-dynamodb')
  const db = CyclicDb('db-sdkCyclicDB')

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

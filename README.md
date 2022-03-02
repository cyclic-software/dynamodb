# db-sdk

###to fix:
`undefined` keys should not be allowed, validate key types
add delete method on collection for an item
delete method returns a bunch of garbage
delete didnt delete index records created from blank index


```js

process.env.CYCLIC_DB = 'CyclicDB'
const CyclicDb = require('cyclic-dynamodb')

let res
      res = await CyclicDb.item('apps','a').set({
        name: 'mike',
        zip:19027,
        val: 'val'
    },{
        $index:['name']
    })
    
    res = await CyclicDb.item('apps','a').set({
        name: 'mike',
        zip:19027
    },{
        $index:['name'],
        $unset:['val']
    })

    res = await CyclicDb.item('apps','a').get()
    res = await CyclicDb.item('apps','a').fragment('bbb').set({
        abc:10
    })
    res = await CyclicDb.item('apps','a').fragment('bbb').get()
    res = await CyclicDb.item('apps','a').fragment('bbb').list()
    res = await CyclicDb.item('apps','a').indexes()


    res = await CyclicDb.index('name').find('mike')

    res = await CyclicDb.collection('apps').list()
    res = await CyclicDb.collection('apps').latest()
    res = await CyclicDb.collection('apps').item('a').get()
    res = await CyclicDb.collection('apps').find('name','mike')
```
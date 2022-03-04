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




## Items

simple create/update
```js
CyclicDb.item('users','korostelevm').set({
        email:'korostelevm@gmail.com',
        zip_code: '19027',
        company: 'cyclic',
        github_login: 'korostelevm',
    })
```

get 
```js
CyclicDb.item('users','korostelevm').get()
```

with indexing opts
delete - will delete everything under users#korostelevm including indexs and fragments
```js
CyclicDb.item('users','korostelevm').delete()
```

with indexing opts
```js
CyclicDb.item('users','korostelevm').set({
        email:'korostelevm@gmail.com',
        zip_code: '19027',
        company: 'cyclic',
        github_login: 'korostelevm',
    },{
        indexBy:[
            'zip_code',
            'company'
            ]

    })
```

list indexes
```js
CyclicDb.item('users','korostelevm').indexes()
```

list fragments
```js
CyclicDb.item('users','korostelevm').fragments()
```

unset field (mongo style), indexby must be there for unset to happen in index rows
```js
CyclicDb.item('users','korostelevm').set({
        email:'korostelevm@gmail.com',
        zip_code: '19027',
        company: 'cyclic',
        github_login: 'korostelevm',
    },{
        indexBy:[
            'zip_code',
            'company'
            ],
        $unset:{
            company: ''   
        }

    })
```

## Fragments

like a child of an item, stored at the same pk as the item with different sks
can be treated like items 

set
```js
CyclicDb.item('users','korostelevm')
    .fragment('github')
    .set({
        login:'asdf',
        id:'asdfasfd'
    },{
        indexBy:[...],
        $unset:{...}
    })

    
CyclicDb.item('users','korostelevm')
    .fragment('identity','github')
    .set({
        login:'asdf',
        id:'asdfasfd'
    },{
        indexBy:[...],
        $unset:{...}
    })


```


get
```js
CyclicDb.item('users','korostelevm')
    .fragment('github').get()
```

list
```js
CyclicDb.item('users','korostelevm')
    .fragment('identity').list()
```

list indexes - what idnexes are there for this fragment
```js
CyclicDb.item('users','korostelevm')
    .fragment('identity').indexes()
```


## indexes
find items with index key-value
```js
 CyclicDb.index('name').find('ice cream')
```

## Collections

get latest
```js
CyclicDb.collection('users').latest()
```

list all with limit
```js
CyclicDb.collection('users').list(10)
```

set item
```js
CyclicDb.collection('users').set('key',{properties},{options})
```
get item
```js
CyclicDb.collection('users').get('key')
```
# cyclic-dynamodb

NodeJS SDK for interacting with [Cyclic.sh](https://cyclic.sh) app AWS DynamoDB databases.

[![CI](https://github.com/cyclic-software/db-sdk/actions/workflows/merge_main.yaml/badge.svg)](https://github.com/cyclic-software/db-sdk/actions/workflows/merge_main.yaml)

Together with the Cyclic.sh DynamoDB indexing strategy and data model, the sdk simplifies the DynamoDB interface and enables collection organization of records, queries and data scheme discovery among other features.

> The sdk and database feature are in preview - use it with the assumption that the interface and data structures will change

## Prerequisites

- A cyclic app with database enabled
  - Databases are in preview - request access on Discord >> https://discord.gg/huhcqxXCbE
- For use on local:
  - AWS credentials set in environment (available on an app's database tab)

## Getting started

1. Install
    ```
    npm install cyclic-dynamodb
    ```
2. Copy the temporary credentials from the cyclic console and set them in the shell environment where your code will be running.
<p align="center">
    <img src="https://github.com/cyclic-software/db-sdk/blob/main/examples/console.png?raw=true" width="500"/>
</p>

> Credentials are required only for connecting to the database from local and expire after one hour, don't add them to an environment configuration.

3. Set the database name as an environment variable before requiring the sdk - this can be added to environment configurations. 
    ```js
    process.env.CYCLIC_DB = 'your-url-subdomainCyclicDB'
    const db = require('cyclic-dynamodb')
    ```
----------

# Example

```js
// example.js
const CyclicDB = require('cyclic-dynamodb')
const db = CyclicDB('your-table-name')

const run = async function(){
    let animals = db.collection('animals')

    // create an item in collection with key "leo"
    let leo = await animals.set('leo', {
        type:'cat',
        color:'orange'
    })

    // get an item at key "leo" from collection animals
    let item = await animals.get('leo')
    console.log(item)
}
run()
```

## Collection Items
```JSON
{
  "collection": "animals",
  "key": "luna",
  "props": {
    "updated": "2022-03-23T13:02:12.702Z",
    "created": "2022-03-23T12:32:02.526Z",
    "color": "orange",
    "type": "cat"
  },
  "$index": [
    "color"
  ]
}
```

# Fragments
With the cyclic.sh data model, items can have `fragments`. These can be thought of as **children or attachments** to items. 

Another way to think of fragments is by thinking of an item itself as its own collection of other items that are stored closely together. 

An example use case for a user record would be something like:
- item user: name, last name, id
  - fragment home: address, city
  - fragment work: company name, position, work address

Fragments objects look just like items but give you a way to better organize your data with higher query performance. 

## Example:

```js
let users = db.collection('users')

await users.item('mike')
        .fragment('work').set({
            company: 'cyclic'
        })

let mikes_work = await users.item('mike').fragment('work').get()

```

# TTL - time to live

You optionally may set a TTL for any item. The `ttl` is the UNIX seconds timestamp when the item should expire.

The ttl setting passes through to the [DynamoDB ttl](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/TTL.html) setting. The expiration is only approximate within a few minutes.

## Example

```js
// example.js
const CyclicDB = require('cyclic-dynamodb')
const db = CyclicDB('your-table-name')

const run = async function(){
    let animals = db.collection('animals')

    // create an item in collection with key "leo"
    let leo = await animals.set('leo', {
        type:'cat',
        color:'orange',
        ttl: Math.floor(Date.now() / 1000) + 3
    })

    // get an item at key "leo" from collection animals
    let item = await animals.get('leo')
    console.log(item)

    await new Promise(resolve => setTimeout(resolve, 5000));
    
    item = await animals.get('leo')
    console.log(item)
}
run()
```

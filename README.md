# @cyclic.sh/dynamodb

NodeJS SDK for interacting with [Cyclic.sh](https://cyclic.sh) app AWS DynamoDB databases.

[![Discord](https://img.shields.io/discord/895292239633338380)](https://discord.cyclic.sh/support) [![CI](https://github.com/cyclic-software/db-sdk/actions/workflows/run_tests.yaml/badge.svg)](https://github.com/cyclic-software/db-sdk/actions/workflows/run_tests.yaml) [![semantic-release: angular](https://img.shields.io/badge/semantic--release-angular-e10079?logo=semantic-release)](https://github.com/semantic-release/semantic-release)

[![npm (scoped)](https://img.shields.io/npm/v/@cyclic.sh/dynamodb)](https://www.npmjs.com/package/@cyclic.sh/dynamodb) ![node-current (scoped)](https://img.shields.io/node/v/@cyclic.sh/dynamodb) ![npm bundle size (scoped)](https://img.shields.io/bundlephobia/minzip/@cyclic.sh/dynamodb) [![@cyclic.sh/dynamodb](https://snyk.io/advisor/npm-package/@cyclic.sh/dynamodb/badge.svg)](https://snyk.io/advisor/npm-package/@cyclic.sh/dynamodb)



Together with the Cyclic.sh DynamoDB indexing strategy and data model, the SDK simplifies the DynamoDB interface and enables collection organization of records, queries, and data scheme discovery, among other features.

> We use semantic release for versioning so take note of version numbers.

## Prerequisites

- A Cyclic.sh app with database enabled
- For use on local:
  - AWS credentials set in environment (available on an app's database tab)

## Getting started

1. Install
    ```
    npm install @cyclic.sh/dynamodb
    ```
2. Copy the temporary credentials from the Cyclic.sh console and set them in the shell environment where your code is running.
<p align="center">
    <img src="https://github.com/cyclic-software/db-sdk/blob/main/examples/console.png?raw=true" width="500"/>
</p>

> Credentials are required only for connecting to the database from local and expire after one hour, don't add them to an environment configuration.

3. Set the database name as an environment variable before requiring the SDK - this can be added to environment configurations. 
    ```js
    process.env.CYCLIC_DB = 'your-url-subdomainCyclicDB'
    const db = require('@cyclic.sh/dynamodb')
    ```
----------

# Example

```js
// example.js
const CyclicDB = require('@cyclic.sh/dynamodb')
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
With the Cyclic.sh data model, items can have `fragments`. These can be thought of as **children or attachments** to items. 

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

# TTL - Time To Live

You optionally may set a TTL for any item. The `TTL` is the UNIX seconds timestamp when the item should expire.

The TTL setting passes through to the [DynamoDB TTL](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/TTL.html) setting. The expiration is only approximate within a few minutes.

## Example

```js
// example.js
const CyclicDB = require('@cyclic.sh/dynamodb')
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

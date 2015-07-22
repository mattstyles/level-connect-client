
# level-connect-client

> Connects to a level-connect instance

Level-connect-client is a small utility client for connecting to a level-connect server. It seamlessly handles the minimal handshake and exposes the http api used to manipulate the underlying database instance.

## Installation

```sh
npm i -S level-connect-client
```

## Usage

```js
import Client from 'level-connect-client'

const client = new Client({
  connectURL: 'localhost:5000'
})

client.on( 'ready', () => {
  client.get( 'users', 'bob' )
    .then( res => {
      // Do stuff with user
    })
    .catch( err => {
      // Handle error
    })
})
```

The public API all returns promises so feel free to use generators if that’s more your thing

```js
import co from 'co'

client.on( 'ready', () => {
  co( *() => {
    try {
      let user = yield client.get( 'users', 'bob' )
      // Do stuff with user
    } catch( err ) {
      // Handle error
    }
  })
})
```

Using instantiation parameters is only one way to set up the client, a more useful method is to use environment variables

```
CONNECT_URL='example.com'
CONNECT_PROTOCOL='http://'
```

## API

### GET `group` `key`

Returns a single key from a group as an object

```js
client.get( 'users', 'bob' )
```

### DELETE `group` `key`

Removes a single key from a group

```js
client.delete( 'users', 'carl' )
```

### PUT `group` `key` `value`

Pass an object and stick it into the key within the group

```js
client.put( 'users', 'dave', {
  name: 'Dangerous Dave',
  email: 'dangerous@dave.com',
  scopes: [ 'admin' ]
})
```

### BATCH `group` `ops`

Stick in an array of values to group

```js
client.batch( 'users', [
  {
    type: 'put',
    key: 'arg',
    value: { name: 'Arg', scopes: 'user' }
  },
  {
    type: 'del',
    key: 'bob'
  }
])
```

### READ `group`

Returns a stream of objects from the group

```js
client.read( 'users' )
  .on( 'data', console.log )

// -> { key: 'bob', { scopes: 'user' } }
// -> { key: 'carl', { scopes: 'viewer' } }
// -> { key: 'dave', { scopes: 'user' } }
```

The returned object stream emits `data`, `error` and `end` events.

Read won’t automatically handle authentication with the server but will return an error.


## Hacking

It’s a small module made primarily to handle the basic handshake level-connect requires so hacking on it is fairly simple. There’s even a handy watch task, check out the `package` info for usage.

Please try to keep consistent with coding style and use common sense. Open up specific issues for anything else.

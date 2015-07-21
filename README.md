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

client.on( 'ready', co( *() => {
  try {
    let user = yield client.get( 'users', 'bob' )
    // Do stuff with user
  } catch( err ) {
    // Handle error
  }
}))
```

Using instantiation parameters is only one way to set up the client, a more useful method is to use environment variables

```
CONNECT_URL='example.com'
CONNECT_PROTOCOL='http://'
```

## API

### GET `group` `key`

```js
client.get( 'users', 'bob' )
```

### DELETE `group` `key`

```js
client.delete( 'users', 'carl' )
```

### PUT `group` `key` `value`

```js
client.put( 'users', 'dave', {
  name: 'Dangerous Dave',
  email: 'dangerous@dave.com',
  scopes: [ 'admin' ]
})
```


## Hacking

It’s a small module made primarily to handle the basic handshake level-connect requires so hacking on it is fairly simple. There’s even a handy watch task, check out the `package` info for usage.

Please try to keep consistent with coding style and use common sense. Open up specific issues for anything else.

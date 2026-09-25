# Tutorial: your first Brontie query

This tutorial takes you from an empty folder to a script that
reads Brontie Partner data through
Seneca entities. It should take about fifteen minutes.

You will build one script and add to it as you go. Everything runs in
memory: the SDK ships an offline mode backed by a small in-memory
store, and you supply that store's contents yourself. No request leaves
your machine, so nothing here can affect anything outside it.

You need [Node.js](https://nodejs.org) 24 or later. You do not need a
server, a network connection, or credentials.

## Step 1: Create the project

```sh
$ mkdir brontie-demo
$ cd brontie-demo
$ npm init -y
$ npm install seneca seneca-entity seneca-promisify @seneca/provider @seneca/brontie-provider
```

The first four are the Seneca host: the framework itself, the entity
API, the promise wrapper that makes calls awaitable, and the shared
machinery every Seneca provider is built on. The last is this plugin,
which brings the Brontie Partner SDK with it.

## Step 2: Connect

Create `demo.js`:

```js
const Seneca = require('seneca')

// The offline store. Each key under an entity name is that record's
// id, and each record is what the API would have answered with.
const SEED = {
  entity: {
    balance: {
      balance0: {"alertAt":100,"alertPercent":100,"balance":100,"currency":"currency0","id":"balance0"},
      balance1: {"alertAt":200,"alertPercent":200,"balance":200,"currency":"currency1","id":"balance1"},
    },
  },
}

async function main() {
  const seneca = await Seneca({ legacy: false })
    .use('promisify')
    .use('entity')
    .use('provider', {
      provider: {
        brontie: {
          keys: {
            apikey: { value: '' },
          },
        },
      },
    })
    .use('@seneca/brontie-provider', {
      test: true,
      testopts: SEED,
    })
    .ready()

  const info = await seneca.post('sys:provider,provider:brontie,get:info')
  console.log(info)
}

main()
```

Run it:

```sh
$ node demo.js
```

You should see:

```js
{
  ok: true,
  name: 'brontie',
  version: '0.0.1',
  sdk: { name: '@voxgig-sdk/brontie-sdk', version: '0.0.1' },
}
```

Two details of that configuration are worth a moment. The `apikey` is
declared even though nothing here asks for credentials — an empty
value simply means no credential is sent. Every Seneca
provider is configured the same way, so an application that later moves
to an authenticated service changes one value rather than its shape.
And `get:info` is answered by the plugin itself, without calling the
API, so a reply tells you the plugin loaded and initialised before any
request goes anywhere.

## Step 3: Load one balance

Add:

```js
  const one = await seneca
    .entity('provider/brontie/balance')
    .load$('balance0')

  console.log('loaded', one.id, one.alertAt)
```

`load$` gives you one record by its id. Now ask for something
that is not there:

```js
  const missing = await seneca
    .entity('provider/brontie/balance')
    .load$('nosuchbalance')

  console.log('missing =', missing)   // null
```

You get `null`, not an exception. "There is no such
balance" is an ordinary answer to a lookup, so it does not
interrupt your code.

## Talking to a real server

The script you have just written never touched the network. To point it
at a running Brontie Partner server instead, replace the `test` and
`testopts` options with that server's base URL:

```js
    .use('@seneca/brontie-provider', {
      sdk: { base: 'https://api.example.com' },
    })
```

Nothing else in the script changes — the entity calls are the same
calls. Your seeded ids will not exist there, so read the ids you need
from a `list$` first.

## What you have learned

You built a script that reads
Brontie Partner data through Seneca entities,
with no server involved. Along
the way you saw:

- Provider configuration has the same shape even when no credentials
  are needed.
- API resources are Seneca entities under `provider/brontie/`,
  reached with the entity API you already know.
- `load$` answers `null` for something that is not there, rather
  than throwing.
- The offline store makes all of this runnable with nothing installed
  but npm packages, which is also how you test your own code.

## Where to go next

- To do a specific job — point at a real server, reach the raw SDK,
  test your own code — see the [how-to guides](how-to.md).
- To look up an exact pattern, field or option, see the
  [reference](reference.md).
- To understand why the plugin is built this way — why entities rather
  than one message per route, and what it does with the SDK's answers
  — see the [explanation](explanation.md).
- For what each of these documents is for, see the
  [documentation index](README.md).

# How-to guides

Each guide here solves one problem, and assumes you already have a
working Seneca instance with this plugin loaded. If you do not, work
through the [tutorial](tutorial.md) first.

These guides show what to do and leave out the reasoning — that is in the
[explanation](explanation.md), and the exact patterns, fields and options
are listed in the [reference](reference.md).

- [Read one record by id](#read-one-record-by-id)
- [Create a record](#create-a-record)
- [Run offline, without a server](#run-offline-without-a-server)
- [Point at a different server](#point-at-a-different-server)
- [Send an API key](#send-an-api-key)
- [Check which plugin and SDK are running](#check-which-plugin-and-sdk-are-running)
- [Reach the SDK directly](#reach-the-sdk-directly)
- [Develop against a local SDK checkout](#develop-against-a-local-sdk-checkout)
- [Run the test suite](#run-the-test-suite)
- [Build and release](#build-and-release)

## Read one record by id

`load$` answers a single record:

```js
const balance = await seneca
  .entity('provider/brontie/balance')
  .load$('balance0')
```

A record that is not there comes back as `null`. It is not an error and
it does not throw, so test the value rather than wrapping the call:

```js
const missing = await seneca
  .entity('provider/brontie/balance')
  .load$('nosuch')

if (null == missing) {
  // no such balance
}
```

Everything else that can go wrong — a network failure, a 5xx, a rejected
key — does throw, so an unhandled rejection still means something is
genuinely wrong.

## Create a record

`make$` builds an entity and `save$` writes it. The API has no update
for a `voucher`, so `save$` always creates one, even from an entity
that carries an id:

```js
const voucher = await seneca
  .entity('provider/brontie/voucher')
  .make$({ idempotencyKey: 'idempotencyKey0', product: 'product0' })
  .save$()

console.log(voucher.id)
```

`save$` resolves to the record as the API returned it, which is the only
reliable source of the id. Read it from there rather than predicting it:
what an API does with an id you supply on create is its own business, and
several ignore it entirely.

## Run offline, without a server

The SDK ships an in-memory mock transport. Turn it on with `test` and
seed it with `testopts`:

```js
.use('@seneca/brontie-provider', {
  test: true,
  testopts: {
    entity: {
      balance: {
        balance0: { alertAt: 100, alertPercent: 100, balance: 100, currency: 'currency0', id: 'balance0' },
        balance1: { alertAt: 200, alertPercent: 200, balance: 200, currency: 'currency1', id: 'balance1' },
      },
    },
  },
})
```

Records are keyed by id under their entity name, and the id inside the
record has to match the key it is filed under. Every command then works
offline, not-found included: an id you did not seed answers `null`,
exactly as it would against a real server.

This is how this plugin's own suite runs, and it is the recommended way
to test application code that uses the provider: no server, no network,
and the same code path as production. See `test/seed.js`, which seeds
every entity this way.

## Point at a different server

The `sdk` option is passed straight to the `BrontieSDK`
constructor, so `base` chooses the host:

```js
.use('@seneca/brontie-provider', {
  sdk: { base: 'https://brontie.example.com' },
})
```

The SDK's own default is `https://www.brontie.ie`, the server the API definition
declares, so `base` is needed only to reach another one.

## Send an API key

Credentials are not a plugin option: they come through the provider
convention, so that every provider in an application is configured the
same way. Declare the variable with `env` and set the key under this
provider's name:

```js
  .use('env', {
    var: { $BRONTIE_APIKEY: String },
  })
  .use('provider', {
    provider: {
      brontie: {
        keys: {
          apikey: { value: '$BRONTIE_APIKEY' },
        },
      },
    },
  })
```

Every request then carries `authorization: Bearer <apikey>`. An absent
or empty key sends no credential at all, so an API that needs none
is configured in exactly the same shape with an empty value — which is
why it is worth writing even when there is nothing to send. An
application that later moves to an authenticated service then changes one
value rather than its structure.

For a different scheme, set the header yourself. Headers supplied through
`sdk` win over the one the key would have set:

```js
.use('@seneca/brontie-provider', {
  sdk: { headers: { 'x-api-key': process.env.BRONTIE_APIKEY } },
})
```

## Check which plugin and SDK are running

One message, and the thing to reach for when a deployment is behaving
unexpectedly:

```js
const info = await seneca.post(
  'sys:provider,provider:brontie,get:info')
```

```js
{
  ok: true,
  name: 'brontie',
  version: '0.0.2',
  sdk: { name: '@voxgig-sdk/brontie-sdk', version: '0.0.2' },
}
```

`version` is this plugin's; `sdk.version` is the SDK it is running
against. That pair is what to quote in a bug report, because the two are
released separately and most surprises live in the gap between them.

## Reach the SDK directly

The entity API covers the operations the API model declares. For
anything else — an endpoint with no entity behind it, a response header
you need to read — take the configured SDK client out of the plugin's
exports:

```js
const sdk = seneca.export('BrontieProvider/sdk')()
```

The export is a function, so call it, and it only answers after
`seneca.ready()` — that is when the plugin builds the client with the
resolved key.

SDK operations resolve to SDK ENTITY instances rather than plain data, so
read the record out with `.data()`. The provider does this for you; here
you do it yourself:

```js
const one = (await sdk.Balance().load({ id: 'balance0' })).data()
```

For a route the entity model does not cover at all, `direct` sends a
request and hands back the raw response:

```js
const res = await sdk.direct({
  path: '/api/v1/balance',
  method: 'GET',
})

if (res instanceof Error) throw res
if (!res.ok) throw (res.err || new Error('status ' + res.status))

console.log(res.data)
```

`prepare()` builds the same request without sending it, which is the
quickest way to see what the SDK would actually do — url, method, headers
and body, before anything leaves the process.

Raw data becomes a Seneca entity again through `data$`:

```js
const ent = seneca.entity('provider/brontie/balance').data$(res.data)
```

## Develop against a local SDK checkout

The SDK is an ordinary published dependency, so normal use needs nothing
special:

```sh
$ npm install
```

If you are changing the SDK and this plugin together, point npm at a
local checkout instead. `make sdk-src` fetches the SDK this repository is
generated from — the repository and tag in `sdk-pin.json` — into
`.sdksrc/brontie-sdk`, then build it, because it does not commit its build
output:

```sh
$ make sdk-src
$ cd .sdksrc/brontie-sdk/ts
$ npm install && npm run build
```

Already have that checkout elsewhere? Point the same target at it:

```sh
$ make sdk-src SDK_SRC_FROM=../path/to/your/checkout
```

Then link it in, without committing the change to `package.json`:

```sh
$ npm install --no-save .sdksrc/brontie-sdk/ts
```

npm creates a symlink, so a rebuild of the SDK is picked up here with no
reinstall:

```sh
$ ls -l node_modules/@voxgig-sdk/brontie-sdk
```

To go back to the published SDK:

```sh
$ rm -rf node_modules/@voxgig-sdk/brontie-sdk package-lock.json && npm install
```

Removing the lockfile matters. npm will happily keep resolving to the
link if the lockfile still records it and the local version satisfies the
range.

## Run the test suite

```sh
$ npm run build
$ npm test
```

The build comes first: the suite runs against `dist`, so an unbuilt
change is not the change you are testing.

The offline tests use the SDK mock and always run.

Coverage, and a single test by name:

```sh
$ npm run test-coverage
$ TEST_PATTERN=balance-load npm run test-some
```

## Build and release

```sh
$ npm run build      # tsc --build src test
$ npm run watch      # the same, in watch mode
$ npm run reset      # clean, install, build, test
```

Releasing follows the Seneca convention, in one command — clean, install,
build, test, tag from `package.json`, publish:

```sh
$ npm run repo-publish
```

Only `dist`, the TypeScript sources and the licence file are published;
the test suite and its build output stay in the repository.

Before publishing, check that `package.json` still depends on the
published SDK by version range and not on a local path: a `file:`
dependency left behind from local development installs perfectly on your
own machine and cannot be resolved by anybody else.

One last thing: this repository is GENERATED from the Brontie Partner API
model by [@voxgig/sdkgen](https://github.com/voxgig/sdkgen). An edit made
here survives exactly as long as the next generation run. Change the
model, or the components that build this target, and regenerate.

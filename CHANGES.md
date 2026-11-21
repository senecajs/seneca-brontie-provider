# Changes

## 0.1.0 2026-11-21

First entry of this change log. Earlier versions are on npm and in the git history.

* Seneca 4: the peer dependency is `seneca` `^4.0.0`. Seneca 3 users stay on `@seneca/brontie-provider@0.0.2`.
* The entity peer is `@seneca/entity` `^29.0.0`, replacing `seneca-entity`. The `seneca-promisify` peer is removed, because Seneca 4 has it built in.
* Peers `@seneca/provider` `^5.0.0` and `@seneca/env` `^0.6.0`, the Seneca 4 releases.
* Depends on `@voxgig-sdk/brontie-sdk` `^0.0.3`, which carries the SDK's struct fix.
* Node.js 24 or later (`engines.node` `>=24`).
* Generated from the updated builder model in `.sdk/`: the tests and examples load `@seneca/entity`, `@seneca/env` and `@seneca/provider` by full name and no longer load `promisify`.
* Tested offline only, against the SDK's in-memory test mode; live calls to the Brontie API were not tested on Seneca 4.

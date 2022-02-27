# Change Logs

## v3.0.0

 - API redesign:
   - status change event
   - cancel, status API. proper status definition
   - return Promise in disconnect, cancel, conenct
 - better backend error handling


## v2.0.0

 - (breaking) separate `ot-json` from client bundle. still provide it as a separated file `ot-json.min.js`.
 - (breaking) use dummy `async` to minimize bundle size
 - (breaking) error is now described based on lderror.
 - (breaking) access is now ignored during handshaking.
 - upgrade dependencies


## v1.0.0

 - upgrade pg from v7 to v8 by upgrading following dependencies:
   - upgrade `sharedb-postgres` to `@plotdb/sharedbpostgres@4.0.1`.
   - upgrade `sharedb-pg-mdb` from `github:zbryikt/sharedb-pg-mdb` to `sharedb-pg-mdb@0.0.2`.
 - upgrade sharedb from `1.0.0` to `1.6.0`


## v0.2.0

 - remove `collection` option, and move it into get / getSnapshot as an optional parameter.


## v0.1.0

 - phase out `opt.url.path`
 - exclude `ot-json0`, `json0-ot-diff` and `diff-match-patch` from bundle. Use them through `@plotdb/json0` if needed.
 - improve bundle approach

## v0.0.2

 - update dependencies to fix vulnerabilities
 - release needed files only
 - bug fix: connection failed if session is not available in express
 - add auto-reconnect option
 - add sharedb-adapter for partial document

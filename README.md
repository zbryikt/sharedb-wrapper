# Sharedb Wrapper

A simple sharedb wrapper for both client and server side.

client include:
 - abstract most init logic into `get` function
 - reconnect mechanism
 - unified event interface

server: for used along with `express` and `postgresql`. includes:
 - access control
 - metadata injection (for ops)
 - adopt postgresql 
 - milestone db
 - inject session data

   - doc.on("error") -> sharedb-wrapper.on("error")
   - connection.on("close") -> sharedb-wrapper.on("close")

## Client Side

You can use `sharedb-wrapper` for only your frontend, but keep your original infrastructure without using `express` or `postgresql`.

To use `sharedb-wrapper` in frontend, include `client.bundle.min.js` and create a `sharedb-wrapper` object:

    <script src="client.bundle.min.js"></script>

    <script>
    sdb = new sharedbWrapper({url: {scheme: \http, domain: <your-domain>}})
    sdb.get({id: "your-doc-id", watch: function(ops, source) { ... }})
      .then(function (doc) {
        /* access data via `doc.data` */
        doSomethingWith(doc.data);
        /* submit changes with doc.submitOp */
        doc.submitOp( ... );
      })
    

You can use `@plotdb/json0` to work with operational transformation. For example:

    doc.submitOp(ops = json0.diff(oldData, newData))


`client.bundle.min.js` includes both `sharedb` and `sharedb-wrapper` client side code. To include them separately, use `client.min.js` and `sharedb.min.js` instead. 


# client API

Sharedb-wrapper constructor options:

 - url
   - scheme - either `https` or `http`. default calculated from window.location if omitted.
   - domain - server domain. default to window.location.host if omitted
   - path - path for websocket to connect. default `/ws` if omitted.

A sharedb-wrapper provides following methods:

 - `get({id,watch,create,collection})`: get a document based on id and collection.
   - id - document id. user defined.
   - collection - document collection, default `doc`
   - create() - if doc.data is undefined, return value of `create` will be used as the initial content.
   - watch(ops, source) - listener to document change. called when we get a new set of ot (ops) .
    - ops - Array of operational transformation.
    - source - true if this update is sent from us.
 - `getSnapshot({id,version,collection})`: fetch snapshot of specific version, id and collection.
   - id - document id. user defined.
   - version - document version ( number ), default `null`
   - collection - document collection, default `doc`
 - `ensure()`: ensure connection. return Promise, resolves when connected
 - `on(event,cb))`: listen to specific events, which are described below.
 - `disconnect()`: disconnect websocket from server.
   - return Promise when disconnected.
 - `connect(opt)`: reconnect websocket if disconnected. return a Promise which is resolved when connected.
   - options:
     - `retry`: automatically retry if set to true. default true.
     - `delay`: delay ( in millisecond) before first connection attmpt. default 0
 - `cancel()`: cancel connection. return Promise, resolves when connection canceled.
   - reject lderror 1026 if no connection to cancel.
 - `status()`: get connection status. return a integer with following possible values:
   - `0`: not connected
   - `1`: connecting
   - `2`: connected


# client Events

 - `close`: websocket is closed - we lose connection.
 - `error`: error occurred for certain document.
 - `status`: fired when status changes, along with the status value as the first parameter.


### Reconnect

monitor `sdb` close event and use `sdb.reconnect` to connect again:

    sdb.on \close, ->
      alert "disconnected. reconnect again ... "
      setTimeout (-> sdb.reconnect! ), 5000


## Server Side

### Database

You will need to setup database schema at first. check sharedb-postgres's structure.sql file:

    psql <your-db-name> < structure.sql

or copy from here:

    CREATE TABLE ops (
      collection character varying(255) not null,
      doc_id character varying(255) not null,
      version integer not null,
      operation jsonb not null, -- {v:0, create:{...}} or {v:n, op:[...]}
      PRIMARY KEY (collection, doc_id, version)
    );
    CREATE TABLE snapshots (
      collection character varying(255) not null,
      doc_id character varying(255) not null,
      doc_type character varying(255) not null,
      version integer not null,
      data jsonb not null,
      PRIMARY KEY (collection, doc_id)
    );


### Backend Code

 - for any server, pass http / express server to the exposed function.
 - startup the server by listening to desired port on the returned web server object.
 - sample code: ( for a complete example. check `web/backend/servevr.ls` )

    require! <[sharedb-wrapper]>

    # your express server
    app = express!

    # your postgresql configuration
    config = {
      uri: "postgres://username:password@localhost/dbname",
      database: "dbname",
      user: "username",
      password: "password",
      host: "localhost"
    }

    # metadata
    metadata = ->  ...

    # access control
    access = ->  ...

    # session control
    session = -> ...

    # initialization
    { server,  # wrapped http server
      sdb,     # sharedb object
      connect, # sharedb `Connection` object
      wss      # websocket server
    } = sharedb-wrapper {app, config, session, access, metadata, milestoneDb}

    # server startup
    server.listen <your-port>, -> ...

MilestoneDB config:

 - enabled: set to true to enable milestonDb. default false.
 - interval: interval between versions to take a milestone. default 250


### Session Control

By default, your express session won't available in sharedb request object. By passing `session` middleware to the sharedb-wrapper, websocket request object will be passed to session function and thus initialize with your session middleware, and the session information will be available later in your access control function.

    sharedb-wrapper do
      session: (req, res, next) -> req.session = {user: 1}; next!


### Metadata

If `metadata` is provided, it will be called when `commit` hook is triggered:

    metadata = ({m, user, session, collection, id, snaptshos}) ->

edit the `m` field directly to inject necessary metadata. For example, add user id:

    metadata = ({m, user, session, collection, id, snaptshos}) -> m.user = (if user? => user.key else 0)


### Access Control

Sharedb-wrapper check for permission in 3 places:

 * readSnapshot middleware
 * reply middleware
 * receive middleware

by calling your `access` function with following profile:

    access = ({user, session, collection, id, snapshots}) ->


where snapshots will only available with `readSnapshot` middleware.

Access should return a Promise which only resolve when access is granted. By default the returned promise reject a lderror id 1012 error when access is denied.


#### prohibit creating new document

  access = ({snapshots}) ->
    if snapshots and !(snapshots.0.id) => return Promise.reject(new Error(""));
    return Promise.resolve!


## Operational Transformation Diff Help Function

To use sharedb, you need to calculate the OT(operational transformation) operations. `sharedb-wrapper` doesn't provide necessary tools but you can use [@plotdb/json0](https://github.com/plotdb/json0) which wraps [ot-json0](https://github.com/ottypes/json0), [json0-ot-diff](https://github.com/kbadk/json0-ot-diff) and [diff-match-patch](https://github.com/google/diff-match-patch) modules to manipulate json and operational transformation.


## Web Server / Reverse Proxy Configuration

Sharedb works over websocket, which connects to `/ws` URL with `ws://` or `wss://` schema. You will need to setup corresponding rules in your web server, such as, Nginx:

    upstream <upstream-name> {
      server <server-ip:server-port>;
    }
    server {
      ....
      location ~ ^/ws$ {
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Host $host;
        proxy_pass http://<upstream-name>;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_connect_timeout 30m;
        proxy_send_timeout 30m;
        proxy_read_timeout 30m;
      }
    }


# Note about Sharedb

 * Sharedb works over websocket. so initialization steps will be like this:
   * server:
     - simplified steps:
       - create http server
       - create websocket server over http server
       - create sharedb obj over db backend
       - listen to json stream when websocket server got connection
       - handle doc use event if necessary.
     - detail
       - create an express / http server
         - if an express server is created, use it to create a http server:
           ```
           app = express();
           server = http.create-server(app);
           ...
           server.listen( ... ); /* be sure to use the created server to listen */
           ```
       - create a WebSocket server over http server created above.
         ```
         wss = new ws.Server {server: server}
         ```
       - create sharedb instance, with database backend.
         - here we use postgresql as the database backend. you will need a corresponding config.
           ```
           sdb = new sharedb({db: sharedb-postgres pg-config
           ```
         - sample pg-config:
           ```
           ioPg: do
             uri: "postgres://user:passwd@host/dbname",
             database: "dbname",
             user: "user",
             password: "passwd",
             host: "host"
           }
           ```
       - handle WebSocket connection - listen to json stream with sharedb when connecting.
         ```
         wss.on \connection, (ws, req) ->
           sdb.listen wjs = websocket-json-stream(ws)
           <- ws.on 'close', _
           /* clean up if necessary */
         ```
       - handle if necessary on using doc
         ```
         sdb.use \doc, (req, cb) ->
           doc = connect.get \doc, req.id
           doc.fetch -> doc.subscribe -> console.log req.id
           cb!
         ```
   * client
     - simplified step:
       - open websocket
       - make sharedb connection through web socket
       - get doc
       - fetch, subscribe, handle op and create doc if necessary
     - details
       - open websocket connect
         ```
         url = scheme: \scheme, domain: \host
         socket = new WebSocket "#{if url.scheme == \http => \ws else \wss}://#{url.domain}/ws"
         ```
       - create sharedb connection through web socket
         ```
         connection = new sharedb.Connection socket
         ```
       - get desired document
         ```
         doc = connection.get \doc, 'doc-id'
         ```
       - fetch doc, subscribe, and handle op / create doc if necessary
         ```
         doc.fetch (e) ->
           doc.subscribe (ops, source) ->
           doc.on \op, (ops, source) ->
           if !doc.type => doc.create {}
         ```
       - onload is fired when doc is loaded ( might be empty if not created ) when fetching / subscribing
         ```
         doc.on \load, ->
         ```
       - for any change, fire through doc.submit
         ```
         doc.submitOp op
         ```

## Bundling issue

Client side bunlde of ShareDB is kinda big perhaps due to the inclusion of `async` module. Client side ShareDB ( 1.6.0 ) uses `async` only in `lib/client/presence/presence.js` while async.min.js takes about 24KB, half of the size of client side ShareDB itself.

Additionally, `ot-json0` is a commonly used module when we are working with operational transformation so we may want to separate it from ShareDB bundle.

Thus we make a dummy tiny async ( `src/async.ls` ) to be used by ShareDB and separate `ot-json0` from it. Current approach for the dummy asycn may break things if any other module so we may want to further integrate the async module directly into the ShareDB bundle.


# TODO

we need a specific Error for deny of access in `access` to recgonize forbidden from real error.

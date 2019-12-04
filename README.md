# Sharedb Wrapper

Wrapper for quickly integrating sharedb in your express server. Use along with Postgresql. A browserified version of json0-ot-diff and diff-match-patch is also provided as ot-diff.js.


# Usage

You need to setup for both server and client side.

## Database

You will need to setup database schema at first. check sharedb-postgres's structure.sql file:

    psql <your-db-name> < structure.sql

or copy from here:

```
    CREATE TABLE ops (
      collection character varying(255) not null,
      doc_id character varying(255) not null,
      version integer not null,
      operation json not null, -- {v:0, create:{...}} or {v:n, op:[...]}
      PRIMARY KEY (collection, doc_id, version)
    );
    CREATE TABLE snapshots (
      collection character varying(255) not null,
      doc_id character varying(255) not null,
      doc_type character varying(255) not null,
      version integer not null,
      data json not null,
      PRIMARY KEY (collection, doc_id)
    );
```

## Server Side

 - for any server, pass http / express server to the exposed function.
 - startup the server by listening to desired port on the returned web server object.
 - sample code: ( also refer to web/servevr.ls )
   ```
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
   { server,  # wrapped http server
     sdb,     # sharedb object
     connect, # sharedb `Connection` object
     wss      # websocket server
   } = sharedb-wrapper {app, config}
   server.listen <your-port>, -> ...
   ```


## Client Side

 - include dist/wrapper.js
 - connect to sharedb server with sharedb-wrapper
 - get desired doc
 - use `doc.data` to read data
 - use `wrapper.json.diff(json1,json2)` to compare change and generate operation object `ops`.
 - use `doc.submitOp` to write data via `ops`
 - sample code: ( also refer to web/src/ls/index.ls )
   ```
   sdb = new sharedb-wrapper url: {scheme: \http, domain: <your-domain>}
   sdb.get {id: <doc-id>, watch: (-> ... )}
     .then (doc) -> doc.data ... 
   update = -> doc.submitOp(sddb.json.diff(<old-data>, <new-data>))
   ```


## Operational Transformation Diff Help Function

To use sharedb, you need to calculate the OT(operational transformation) operations. sharedb-wrapper wraps a helper function `json0-ot-diff` from [kbadk/json0-ot-diff](https://github.com/kbadk/json0-ot-diff) for calculating json difference easily.

It's already included in sharedb-wrapper in the created wrapper object, which could be accessed by `wrapperObj.json.diff`. By default it generate string insertion and deletion so you don't have to supply the thrid argument.

You can also find a standalone file that provides `json0-ot-diff` and `diff-match-patch` functions. for more information, check out the [repo](https://github.com/kbadk/json0-ot-diff) directly.

Usage:
 - diff two object with related ops returned
   ```
   ret = json0-ot-diff obj1, obj2
   ```

 - also generate string insertion and deletion
   ```
   ret = json0-ot-diff obj1, obj2, diff-match-patch
   ```

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


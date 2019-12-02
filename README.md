# Sharedb Wrapper

Wrapper for quickly integrating sharedb in your express server. Use along with Postgresql. A browserified version of json0-ot-diff and diff-match-patch is also provided as ot-diff.js.


# Usage

 * server side
   - for any server, pass http / express server to the exposed function.
   - startup the server by listening to desired port on the returned web server object.
   - sample code: ( also refer to web/servevr.ls )
     ```
     require! <[sharedb-wrapper]>
     # your express server
     app = express!
     # your postgresql configuration
     cfg = {
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
     } = sharedb-wrapper {app, cfg}
     server.listen <your-port>, -> ...
     ```
 * client side
   - include dist/client.js
   - connect to sharedb server with sharedb-wrapper
   - get desired doc
   - use `doc.data` to read data
   - use `json0-ot-diff(json1,json2)` to compare change and generate operation object `ops`.
   - use `doc.submitOp` to write data via `ops`
   - sample code: ( also refer to web/src/ls/index.ls )
     ```
     sdb = new sharedb-wrapper url: {scheme: \http, domain: <your-domain>}
     sdb.get {id: <doc-id>, watch: (-> ... )}
       .then (doc) -> doc.data ... 
     update = -> doc.submitOp(json0-ot-diff(<old-data>, <new-data>))
     ```
     
 * ot diff
   - diff two object with related ops returned
     ```
     ret = json0-ot-diff obj1, obj2
     ```
   - also generate string insertion and deletion
     ```
     ret = json0-ot-diff obj1, obj2, diff-match-patch
     ```


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


require! <[sharedb sharedb-postgres ws http websocket-json-stream]>
sharedb-wrapper = ({app, config}) ->
  # if we create server here, we should server.listen instead of app.listen
  server = http.create-server app
  sdb = new sharedb {db: sharedb-postgres config}
  connect = sdb.connect!
  wss = new ws.Server do
    server: server
    # key data: info.req.session / info.req.session.passport.user
    # verifyClient: (info, done) -> session(info.req, {}, -> done({result: true}))
  wss.on \connection, (ws, req) ->
    sdb.listen wjs = websocket-json-stream(ws)
    <- ws.on 'close', _
  sdb.use \doc, (req, cb) ->
    doc = connect.get \doc, req.id
    doc.fetch -> doc.subscribe ->
    cb!
  ret = { server, sharedb: sdb, connect, wss }

module.exports = sharedb-wrapper

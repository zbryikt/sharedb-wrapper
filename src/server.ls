require! <[sharedb sharedb-postgres sharedb-pg-mdb ws http websocket-json-stream]>
sharedb-wrapper = (opt) ->
  {app, io, session, access, milestone} = opt
  # HTTP Server - if we create server here, we should server.listen instead of app.listen
  server = http.create-server app

  mdb = if (milestone and milestone.enabled) =>
    new sharedb-pg-mdb {io-pg: io, interval: milestone.interval or 250}
  else null

  # ShareDB Backend
  backend = new sharedb { db: sharedb-postgres(io), milestoneDb: mdb }

  # Connection object for ShareDB Server
  connect = backend.connect!

  # HTTP -> server -> on('upgrade') -> ( processing ... ) if not authorized: socket.destroy!
  # -> emit wss.on('connection') -> ...
  # WebSocket Server
  wss = new ws.Server do
    server: server
    #noServer: true
    # key data: info.req.session / info.req.session.passport.user
    # we used verifyClient to populate session data into request,
    # but this is discouraged by lpinca ( https://github.com/websockets/ws/issues/377#issuecomment-462152231 )
    # so we don't do it now. instead, use http server upgrade event.
    # verifyClient: (info, done) -> session(info.req, {}, -> done({result: true}))

  # 1. HTTP upgrade to WebSocket
  # when http server get a header "Upgrade: Websocket" this will be triggered
  # lpinca suggests to use this to prepare additional data for each connection.
  # session data kept in req object.
  #server.on \upgrade, (req, socket, head) ->
  #  p = if session? => new Promise((res, rej) -> session(req, {}, (-> res!))) else Promise.resolve!
  #  p.then -> wss.handleUpgrade req, socket, head, (ws) -> wss.emit \connection, ws, req

  # 2. If not rejected, WebSocket Server got connection
  # manually init session data to request object and inject into wjs.
  # wjs will then be used in sharedb as agent.stream.
  wss.on \connection, (ws, req) ->
    p = if session? => new Promise((res, rej) -> session(req, {}, (-> res!))) else Promise.resolve!
    p.then ->
      session = req.session
      user = req.session.passport and req.session.passport.user
      backend.listen (wjs = websocket-json-stream(ws)), req
    .catch (e) ->
      console.log "[sharedb-wrapper] wss on connection error: ", (e.message or e)
    ws.on \close, ->

  # 3. Backend handle sharedb connect.
  #    Can decide whether to allow connection at all here.
  #    Here we inject custom data into agent from session.
  backend.use \connect, ({agent, req, stream}, cb) ->
    if !req or !stream.ws => return cb!
    session = req.session
    user = session and session.passport and session.passport.user
    agent.custom <<< {req, session, user}
    cb!

  # 4. Backend handle readSnapshot request
  #    Decide if an user can get access to certain doc.
  backend.use \readSnapshots, ({collection, snapshots, agent}, cb) ->
    # no websocket - it's server stream
    if !agent.stream.ws => return cb!
    {req, session, user} = agent.custom
    id = (snapshots.0 or {}).id
    (if access? => access({user, session, collection, id, snapshots, type: \readSnapshots}) else Promise.resolve!)
      .then -> cb!
      .catch -> cb 'forbidden'

  # access control in both reply and receive middleware
  backend.use \reply, ({collection, agent, reply}, cb) ->
    if !agent.stream.ws => return cb!
    {req, session, user} = agent.custom
    id = reply.d
    (if access? => access({user, session, collection, id, type: \reply}) else Promise.resolve!)
      .then -> cb!
      .catch -> cb 'forbidden'
  backend.use \receive, ({collection, agent, data}, cb) ->
    if !agent.stream.ws => return cb!
    {req, session, user} = agent.custom
    id = data.d
    (if access? => access({user, session, collection, id, data, type: \receive}) else Promise.resolve!)
      .then -> cb!
      .catch -> cb 'forbidden'

  ret = { server, sdb: backend, connect, wss }

module.exports = sharedb-wrapper

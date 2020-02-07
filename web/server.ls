require! <[fs express path colors template]>
sharedb-wrapper = require "../src/server"

server = do
  init: (opt) ->
    @app = app = express!

    access = ({user, session, collection, id, snapshots}) -> new Promise (res, rej) ->
      # if !!(snapshots) and !(snapshots.0.data) -> it's a create access
      if snapshots => if !snapshots.0.data => return rej(new Error!)
      return res!

    session = (req, res, next) ->
      server.user = (server.user or 0) + 1
      req.session = {name: "user-#{server.user}"}
      console.log "session user set: ", req.session
      next!
    # sharedb init
    {server, sdb, connect, wss} = sharedb-wrapper {app, io: opt.io-pg, session, access}
    app.set 'view engine', \pug
    app.use \/, express.static \static
    app.get \/create/, (req, res) ->
      id = \sample5
      doc = connect.get \doc, id
      doc.create {}, (e) -> if e => res.status 500 .send! else res.redirect \/

    if opt.api => opt.api @
    console.log "[Server] Express Initialized in #{app.get \env} Mode".green

    # server from sharedb http server or express
    (if server? => server else app).listen opt.port, ->
      delta = if opt.start-time => "( takes #{Date.now! - opt.start-time}ms )" else ''
      console.log "[SERVER] listening on port #{server.address!port} #delta".cyan

config = JSON.parse(fs.read-file-sync 'config.json' .toString!)

server.init config
template.watch.init config

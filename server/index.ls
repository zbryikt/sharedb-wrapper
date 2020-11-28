require! <[fs express path colors template]>
sharedb-wrapper = require "../src/server"

root = path.join(path.dirname(fs.realpathSync __filename.replace(/\(js\)$/,'')), '..')

config = do
  port: process.env.PORT or 3005
  pg: do
    uri: "postgres://pg:pg@#{process.env.DB_HOST or \localhost}/pg"
    database: "pg"
    user: "pg"
    password: "pg"
    host: "#{process.env.DB_HOST or \localhost}"
    port: "#{process.env.DB_PORT or 15432}"

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
    {server, sdb, connect, wss} = sharedb-wrapper {app, io: opt.pg, session, access}
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

process.chdir path.join(root, 'web')

server.init config
template.watch.init config

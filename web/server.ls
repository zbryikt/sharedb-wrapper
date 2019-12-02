require! <[fs express path colors template]>
sharedb-wrapper = require "../src/server"

server = do
  init: (opt) ->
    @app = app = express!

    # sharedb init
    {server, sdb, connect, wss} = sharedb-wrapper {app, config: opt.io-pg}
    app.set 'view engine', \pug
    app.use \/, express.static \static
    if opt.api => opt.api @
    console.log "[Server] Express Initialized in #{app.get \env} Mode".green

    # server from sharedb http server or express
    (if server? => server else app).listen opt.port, ->
      delta = if opt.start-time => "( takes #{Date.now! - opt.start-time}ms )" else ''
      console.log "[SERVER] listening on port #{server.address!port} #delta".cyan

config = JSON.parse(fs.read-file-sync 'config.json' .toString!)

server.init config
template.watch.init config

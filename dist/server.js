var sharedb, sharedbPostgres, sharedbPgMdb, ws, http, websocketJsonStream, sharedbWrapper;
sharedb = require('sharedb');
sharedbPostgres = require('@plotdb/sharedb-postgres');
sharedbPgMdb = require('sharedb-pg-mdb');
ws = require('ws');
http = require('http');
websocketJsonStream = require('websocket-json-stream');
sharedbWrapper = function(opt){
  var app, io, session, access, milestoneDb, server, mdb, backend, connect, wss, ret;
  app = opt.app, io = opt.io, session = opt.session, access = opt.access, milestoneDb = opt.milestoneDb;
  server = http.createServer(app);
  mdb = milestoneDb && milestoneDb.enabled ? new sharedbPgMdb({
    ioPg: io,
    interval: milestoneDb.interval || 250
  }) : null;
  backend = new sharedb({
    db: sharedbPostgres(io),
    milestoneDb: mdb
  });
  connect = backend.connect();
  wss = new ws.Server({
    server: server
  });
  wss.on('connection', function(ws, req){
    var p;
    p = session != null
      ? new Promise(function(res, rej){
        return session(req, {}, function(){
          return res();
        });
      })
      : Promise.resolve();
    p.then(function(){
      var wjs;
      return backend.listen(wjs = websocketJsonStream(ws), req);
    })['catch'](function(e){
      return console.log("[sharedb-wrapper] wss on connection error: ", e.message || e);
    });
    return ws.on('close', function(){});
  });
  backend.use('connect', function(arg$, cb){
    var agent, req, stream, session, user, ref$;
    agent = arg$.agent, req = arg$.req, stream = arg$.stream;
    if (!req || !stream.ws) {
      return cb();
    }
    session = req.session;
    user = session && session.passport && session.passport.user;
    ref$ = agent.custom;
    ref$.req = req;
    ref$.session = session;
    ref$.user = user;
    return cb();
  });
  backend.use('readSnapshots', function(arg$, cb){
    var collection, snapshots, agent, ref$, req, session, user, id;
    collection = arg$.collection, snapshots = arg$.snapshots, agent = arg$.agent;
    if (!agent.stream.ws) {
      return cb();
    }
    ref$ = agent.custom, req = ref$.req, session = ref$.session, user = ref$.user;
    id = (snapshots[0] || {}).id;
    return (access != null
      ? access({
        user: user,
        session: session,
        collection: collection,
        id: id,
        snapshots: snapshots,
        type: 'readSnapshots'
      })
      : Promise.resolve()).then(function(){
      return cb();
    })['catch'](function(e){
      var ref$;
      return cb(e || (ref$ = new Error(), ref$.name = 'lderror', ref$.id = 1012, ref$));
    });
  });
  backend.use('reply', function(arg$, cb){
    var collection, agent, reply, ref$, req, session, user, act, id;
    collection = arg$.collection, agent = arg$.agent, reply = arg$.reply;
    if (!agent.stream.ws) {
      return cb();
    }
    ref$ = agent.custom, req = ref$.req, session = ref$.session, user = ref$.user;
    act = reply.a;
    id = reply.d;
    return (act !== 'hs' && access != null
      ? access({
        user: user,
        session: session,
        collection: collection,
        id: id,
        type: 'reply'
      })
      : Promise.resolve()).then(function(){
      return cb();
    })['catch'](function(e){
      var ref$;
      return cb(e || (ref$ = new Error(), ref$.name = 'lderror', ref$.id = 1012, ref$));
    });
  });
  backend.use('receive', function(arg$, cb){
    var collection, agent, data, ref$, req, session, user, act, id;
    collection = arg$.collection, agent = arg$.agent, data = arg$.data;
    if (!agent.stream.ws) {
      return cb();
    }
    ref$ = agent.custom, req = ref$.req, session = ref$.session, user = ref$.user;
    act = data.a;
    id = data.d;
    return (act !== 'hs' && access != null
      ? access({
        user: user,
        session: session,
        collection: collection,
        id: id,
        data: data,
        type: 'receive'
      })
      : Promise.resolve()).then(function(){
      return cb();
    })['catch'](function(){
      var ref$;
      return cb(e || (ref$ = new Error(), ref$.name = 'lderror', ref$.id = 1012, ref$));
    });
  });
  return ret = {
    server: server,
    sdb: backend,
    connect: connect,
    wss: wss
  };
};
module.exports = sharedbWrapper;

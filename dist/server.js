var sharedb, sharedbPostgres, sharedbPgMdb, ws, http, websocketJsonStream, sharedbWrapper;
sharedb = require('sharedb');
sharedbPostgres = require('@plotdb/sharedb-postgres');
sharedbPgMdb = require('sharedb-pg-mdb');
ws = require('ws');
http = require('http');
websocketJsonStream = require('websocket-json-stream');
sharedbWrapper = function(opt){
  var app, io, session, access, milestoneDb, metadata, server, mdb, backend, connect, wss, ret;
  app = opt.app, io = opt.io, session = opt.session, access = opt.access, milestoneDb = opt.milestoneDb, metadata = opt.metadata;
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
  if (metadata != null) {
    backend.use('commit', function(arg$, cb){
      var collection, agent, snapshot, op, id, ref$, req, session, user;
      collection = arg$.collection, agent = arg$.agent, snapshot = arg$.snapshot, op = arg$.op, id = arg$.id;
      if (!agent.stream.ws) {
        return cb();
      }
      ref$ = agent.custom, req = ref$.req, session = ref$.session, user = ref$.user;
      metadata(import$({
        m: op.m
      }, agent.custom));
      return cb();
    });
  }
  if (access != null) {
    backend.use('readSnapshots', function(arg$, cb){
      var collection, snapshots, agent, ref$, req, session, user, id;
      collection = arg$.collection, snapshots = arg$.snapshots, agent = arg$.agent;
      if (!agent.stream.ws) {
        return cb();
      }
      ref$ = agent.custom, req = ref$.req, session = ref$.session, user = ref$.user;
      id = (snapshots[0] || {}).id;
      return access(import$({
        collection: collection,
        id: id,
        snapshots: snapshots,
        type: 'readSnapshots'
      }, agent.custom)).then(function(){
        return cb();
      })['catch'](function(e){
        var ref$;
        return cb(e || (ref$ = new Error(), ref$.name = 'lderror', ref$.id = 1012, ref$));
      });
    });
    backend.use('reply', function(arg$, cb){
      var collection, agent, reply;
      collection = arg$.collection, agent = arg$.agent, reply = arg$.reply;
      if (!agent.stream.ws || reply.a === 'hs') {
        return cb();
      }
      return access(import$({
        id: reply.d,
        type: 'reply'
      }, agent.custom)).then(function(){
        return cb();
      })['catch'](function(e){
        var ref$;
        return cb(e || (ref$ = new Error(), ref$.name = 'lderror', ref$.id = 1012, ref$));
      });
    });
    backend.use('receive', function(arg$, cb){
      var collection, agent, data;
      collection = arg$.collection, agent = arg$.agent, data = arg$.data;
      if (!agent.stream.ws || data.a === 'hs') {
        return cb();
      }
      return access(import$({
        id: data.d,
        type: 'receive'
      }, agent.custom)).then(function(){
        return cb();
      })['catch'](function(e){
        var ref$;
        return cb(e || (ref$ = new Error(), ref$.name = 'lderror', ref$.id = 1012, ref$));
      });
    });
    /* should we still need this if we have already check access in reply and receive?
    backend.use \submit, ({collection, agent, snapshot, op, id}, cb) ->
      if !agent.stream.ws => return cb!
      access({collection, id, type: \submit} <<< agent.custom)
        .then -> cb!
        .catch (e) -> cb(e or (new Error! <<< {name: \lderror, id: 1012}))
    */
  }
  return ret = {
    server: server,
    sdb: backend,
    connect: connect,
    wss: wss
  };
};
module.exports = sharedbWrapper;
function import$(obj, src){
  var own = {}.hasOwnProperty;
  for (var key in src) if (own.call(src, key)) obj[key] = src[key];
  return obj;
}

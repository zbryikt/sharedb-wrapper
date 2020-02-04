// Generated by LiveScript 1.3.1
var sharedb, sharedbPostgres, ws, http, websocketJsonStream, sharedbWrapper;
sharedb = require('sharedb');
sharedbPostgres = require('sharedb-postgres');
ws = require('ws');
http = require('http');
websocketJsonStream = require('websocket-json-stream');
sharedbWrapper = function(arg$){
  var app, io, session, access, server, backend, connect, wss, ret;
  app = arg$.app, io = arg$.io, session = arg$.session, access = arg$.access;
  server = http.createServer(app);
  backend = new sharedb({
    db: sharedbPostgres(io)
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
      var session, user, wjs;
      session = req.session;
      user = req.session.passport && req.session.passport.user;
      return backend.listen(wjs = websocketJsonStream(ws), req);
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
    return cb();
    return (access != null
      ? access({
        user: user,
        session: session,
        collection: collection,
        id: id,
        snapshots: snapshots
      })
      : Promise.resolve()).then(function(){
      return cb();
    })['catch'](function(){
      return cb('access denied');
    });
  });
  backend.use('reply', function(arg$, cb){
    var collection, agent, reply, ref$, req, session, user, id;
    collection = arg$.collection, agent = arg$.agent, reply = arg$.reply;
    ref$ = agent.custom, req = ref$.req, session = ref$.session, user = ref$.user;
    id = reply.d;
    return (access != null
      ? access({
        user: user,
        session: session,
        collection: collection,
        id: id
      })
      : Promise.resolve()).then(function(){
      return cb();
    })['catch'](function(){
      return cb('access denied - reply');
    });
  });
  backend.use('receive', function(arg$, cb){
    var collection, agent, data, ref$, req, session, user, id;
    collection = arg$.collection, agent = arg$.agent, data = arg$.data;
    ref$ = agent.custom, req = ref$.req, session = ref$.session, user = ref$.user;
    id = data.d;
    return (access != null
      ? access({
        user: user,
        session: session,
        collection: collection,
        id: id
      })
      : Promise.resolve()).then(function(){
      return cb();
    })['catch'](function(){
      return cb('access denied - receive');
    });
  });
  return ret = {
    server: server,
    sharedb: backend,
    connect: connect,
    wss: wss
  };
};
module.exports = sharedbWrapper;

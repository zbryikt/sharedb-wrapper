(function(){
  var sharedb, main;
  sharedb = require('sharedb');
  main = function(opt){
    var p;
    opt == null && (opt = {});
    import$(this, {
      scheme: (opt.url || (opt.url = {})).scheme || window.location.protocol.replace(':', ''),
      domain: opt.url.domain || window.location.host,
      path: p = opt.url.path || '/ws'
    });
    this.path = p[0] === '/'
      ? p
      : "/" + p;
    this.scheme = this.scheme === 'http' ? 'ws' : 'wss';
    this.evtHandler = {};
    this.reconnectInfo = {
      retry: 0,
      pending: []
    };
    this.reconnect();
    return this;
  };
  main.prototype = import$(Object.create(Object.prototype), {
    getSnapshot: function(arg$){
      var id, version, collection, this$ = this;
      id = arg$.id, version = arg$.version, collection = arg$.collection;
      return new Promise(function(res, rej){
        return this$.connection.fetchSnapshot(collection != null ? collection : 'doc', id, version != null ? version : null, function(e, s){
          if (e) {
            return rej(e);
          } else {
            return res(s);
          }
        });
      });
    },
    ready: function(){
      var this$ = this;
      return new Promise(function(res, rej){
        if (this$.connected) {
          return res();
        }
        if (!this$.reconnectInfo.handler) {
          return this$.reconnect();
        }
        return this$.reconnectInfo.pending.push({
          res: res,
          rej: rej
        });
      });
    },
    get: function(arg$){
      var id, watch, create, collection, this$ = this;
      id = arg$.id, watch = arg$.watch, create = arg$.create, collection = arg$.collection;
      return (!this.connection
        ? this.reconnect()
        : Promise.resolve()).then(function(){
        return new Promise(function(res, rej){
          var doc;
          doc = this$.connection.get(collection != null ? collection : 'doc', id);
          return doc.fetch(function(e){
            if (e) {
              return rej(e);
            }
            doc.subscribe(function(ops, source){
              return res(doc);
            });
            doc.on('error', function(err){
              return this$.fire('error', {
                doc: doc,
                err: err
              });
            });
            if (watch != null) {
              doc.on('op', function(ops, source){
                return watch(ops, source);
              });
            }
            if (!doc.type) {
              return doc.create((create ? create() : null) || {});
            }
          });
        });
      });
    },
    on: function(n, cb){
      var ref$;
      return ((ref$ = this.evtHandler)[n] || (ref$[n] = [])).push(cb);
    },
    fire: function(n){
      var v, res$, i$, to$, ref$, len$, cb, results$ = [];
      res$ = [];
      for (i$ = 1, to$ = arguments.length; i$ < to$; ++i$) {
        res$.push(arguments[i$]);
      }
      v = res$;
      for (i$ = 0, len$ = (ref$ = this.evtHandler[n] || []).length; i$ < len$; ++i$) {
        cb = ref$[i$];
        results$.push(cb.apply(this, v));
      }
      return results$;
    },
    disconnect: function(){
      if (!this.socket) {
        return;
      }
      this.socket.close();
      this.socket = null;
      this.connected = false;
      return this.socket = null;
    },
    reconnect: function(){
      var this$ = this;
      return new Promise(function(res, rej){
        var delay;
        if (this$.socket) {
          return res();
        }
        delay = this$.reconnectInfo.retry++;
        delay = Math.round(Math.pow(delay, 1.4) * 500);
        clearTimeout(this$.reconnectInfo.handler);
        console.log("try reconnecting (" + this$.reconnectInfo.retry + ") after " + delay + "ms ...");
        return this$.reconnectInfo.handler = setTimeout(function(){
          this$.reconnectInfo.handler = null;
          this$.socket = new WebSocket(this$.scheme + "://" + this$.domain + this$.path);
          this$.connection = new sharedb.Connection(this$.socket);
          this$.socket.addEventListener('close', function(){
            this$.socket = null;
            this$.connected = false;
            return this$.fire('close');
          });
          return this$.socket.addEventListener('open', function(){
            var ref$;
            this$.reconnectInfo.retry = 0;
            ((ref$ = this$.reconnectInfo).pending || (ref$.pending = [])).splice(0).map(function(it){
              return it.res();
            });
            this$.connected = true;
            return res();
          });
        }, delay);
      });
    }
  });
  if (typeof module != 'undefined' && module !== null) {
    module.exports = main;
  }
  if (typeof window != 'undefined' && window !== null) {
    window.sharedbWrapper = main;
  }
  function import$(obj, src){
    var own = {}.hasOwnProperty;
    for (var key in src) if (own.call(src, key)) obj[key] = src[key];
    return obj;
  }
}).call(this);

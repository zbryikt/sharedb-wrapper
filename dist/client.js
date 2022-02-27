(function(){
  var sharedb, err, sharedbWrapper;
  sharedb = require('sharedb');
  err = function(e){
    var ref$;
    return ref$ = new Error(), ref$.name = 'lderror', ref$.id = e, ref$;
  };
  sharedbWrapper = function(opt){
    var p;
    opt == null && (opt = {});
    import$(this, {
      domain: opt.url.domain || window.location.host,
      scheme: (opt.url || (opt.url = {})).scheme || window.location.protocol.replace(':', '') || 'https',
      path: p = opt.url.path || '/ws',
      evthdr: {},
      socket: null,
      connection: null,
      _ctrl: {
        count: 0,
        pending: [],
        hdr: null,
        canceller: null,
        disconnector: null
      },
      _s: 0
    });
    this.path = p[0] === '/'
      ? p
      : "/" + p;
    this.scheme = this.scheme === 'http' ? 'ws' : 'wss';
    this.connect();
    return this;
  };
  sharedbWrapper.prototype = import$(Object.create(Object.prototype), {
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
    get: function(arg$){
      var id, watch, create, collection, this$ = this;
      id = arg$.id, watch = arg$.watch, create = arg$.create, collection = arg$.collection;
      return (!this.connection
        ? this.connect()
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
      return ((ref$ = this.evthdr)[n] || (ref$[n] = [])).push(cb);
    },
    fire: function(n){
      var v, res$, i$, to$, ref$, len$, cb, results$ = [];
      res$ = [];
      for (i$ = 1, to$ = arguments.length; i$ < to$; ++i$) {
        res$.push(arguments[i$]);
      }
      v = res$;
      for (i$ = 0, len$ = (ref$ = this.evthdr[n] || []).length; i$ < len$; ++i$) {
        cb = ref$[i$];
        results$.push(cb.apply(this, v));
      }
      return results$;
    },
    _connect: function(opt){
      var this$ = this;
      opt == null && (opt = {});
      return new Promise(function(res, rej){
        if (this$.socket) {
          return rej(err(1011));
        }
        this$.socket = new WebSocket(this$.scheme + "://" + this$.domain + this$.path);
        this$.connection = new sharedb.Connection(this$.socket);
        this$.socket.addEventListener('close', function(){
          this$.socket = null;
          if (this$._s !== 2) {
            return rej(err(0));
          }
          this$._status(0);
          this$.fire('close');
          if (this$._ctrl.disconnector) {
            return this$._ctrl.disconnector.res();
          }
        });
        return this$.socket.addEventListener('open', function(){
          if (!this$._ctrl.canceller) {
            return res();
          }
          this$._ctrl.canceller.res();
          return rej(err(0));
        });
      });
    },
    connect: function(opt){
      var cc, this$ = this;
      opt == null && (opt = {});
      cc = this._ctrl;
      if (this._s === 2) {
        return Promise.reject(err(1011));
      }
      return new Promise(function(res, rej){
        var retry, _;
        cc.pending.push({
          res: res,
          rej: rej
        });
        if (this$._s === 1) {
          return;
        }
        this$._status(1);
        retry = !(opt.retry != null) || !opt.retry;
        cc.count = 0;
        _ = function(){
          var delay;
          delay = Math.round(Math.pow(cc.count++, 1.4) * 500) + (opt.delay || 0);
          return cc.hdr = setTimeout(function(){
            cc.hdr = null;
            return this$._connect().then(function(){
              this$._status(2);
              return (cc.pending || (cc.pending = [])).splice(0).map(function(it){
                return it.res();
              });
            })['catch'](function(){
              if (retry && !cc.canceller) {
                return _();
              }
              cc.canceller = null;
              return (cc.pending || (cc.pending = [])).splice(0).map(function(it){
                return it.rej();
              });
            });
          }, delay);
        };
        return _();
      });
    },
    disconnect: function(){
      var ret, this$ = this;
      if (this._s === 0) {
        return Promise.resolve();
      }
      if (this._s === 1) {
        return this.cancel();
      }
      ret = new Promise(function(res, rej){
        return this$._ctrl.disconnector = {
          res: res,
          rej: rej
        };
      });
      this.socket.close();
      return ret;
    },
    cancel: function(){
      var cc;
      cc = this._ctrl;
      if (this._s !== 1) {
        return Promise.reject(err(1026));
      }
      if (cc.hdr) {
        clearTimeout(cc.hdr);
        cc.hdr = null;
        this._status(0);
        return Promise.resolve();
      }
      return new Promise(function(res, rej){
        return cc.canceller = {
          res: res,
          rej: rej
        };
      });
    },
    _status: function(s){
      var os;
      os = this._s;
      this._s = s;
      if (s !== os) {
        return this.fire('status', s);
      }
    },
    status: function(){
      return this._s;
    },
    ensure: function(){
      if (this._s === 2) {
        return Promise.resolve();
      } else {
        return this.connect();
      }
    }
  });
  if (typeof module != 'undefined' && module !== null) {
    module.exports = sharedbWrapper;
  } else if (typeof window != 'undefined' && window !== null) {
    window.sharedbWrapper = sharedbWrapper;
  }
  function import$(obj, src){
    var own = {}.hasOwnProperty;
    for (var key in src) if (own.call(src, key)) obj[key] = src[key];
    return obj;
  }
}).call(this);

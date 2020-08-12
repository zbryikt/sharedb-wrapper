// Generated by LiveScript 1.3.1
var Host, Adapter, slice$ = [].slice;
Host = function(opt){
  opt == null && (opt = {});
  this.opt = opt;
  this.evtHandler = {};
  this.adapters = [];
  return this;
};
Host.prototype = import$(Object.create(Object.prototype), {
  on: function(n, cb){
    var ref$;
    return ((ref$ = this.evtHandler)[n] || (ref$[n] = [])).push(cb);
  },
  fire: function(n){
    var v, i$, ref$, len$, cb, results$ = [];
    v = slice$.call(arguments, 1);
    for (i$ = 0, len$ = (ref$ = this.evtHandler[n] || []).length; i$ < len$; ++i$) {
      cb = ref$[i$];
      results$.push(cb.apply(this, v));
    }
    return results$;
  },
  getdoc: function(){
    var ref$, ref1$, this$ = this;
    return this.sdb.get((ref1$ = {
      watch: function(o, s){
        return this$.watch(o, s);
      }
    }, ref1$.id = (ref$ = this.opt).id, ref1$.create = ref$.create, ref1$)).then(function(doc){
      return this$.doc = doc;
    });
  },
  watch: function(ops, source){
    if (this.opt.watch) {
      this.opt.watch(ops, source);
    }
    return this.adapters.map(function(it){
      return it.opsIn({
        ops: ops,
        source: source
      });
    });
  },
  reconnect: function(it){
    var this$ = this;
    this.fire('reconnecting', it);
    return this.sdb.reconnect().then(function(){
      return this$.getdoc();
    }).then(function(){
      return this$.adapters.map(function(a){
        return a.setHost(this$);
      });
    }).then(function(){
      if (this$.opt.reconnect) {
        return this$.opt.reconnect();
      }
    }).then(function(it){
      return this$.fire('reconnected', it);
    });
  },
  initSdb: function(){
    var sdb, this$ = this;
    this.fire('init-sdb');
    this.sdb = sdb = new sharedbWrapper({
      url: this.opt.url
    });
    sdb.on('error', function(it){
      return this$.fire('error', it);
    });
    sdb.on('close', function(){
      return this$.reconnect();
    });
    return this.reconnect().then(function(){
      return sdb.ready();
    });
  },
  adapt: function(opt){
    var a, ref$;
    opt == null && (opt = {});
    this.adapters.push(a = new Adapter((ref$ = import$({}, opt), ref$.host = this, ref$)));
    return a;
  }
});
Adapter = function(opt){
  opt == null && (opt = {});
  this.opt = opt;
  this.data = {};
  this.evtHandler = {};
  this.path = opt.path;
  this.setHost(opt.host);
  this.setPath(opt.path);
  return this;
};
Adapter.prototype = import$(Object.create(Object.prototype), {
  on: function(n, cb){
    var ref$;
    return ((ref$ = this.evtHandler)[n] || (ref$[n] = [])).push(cb);
  },
  off: function(n){
    return this.evtHandler[n] = [];
  },
  fire: function(n){
    var v, i$, ref$, len$, cb, results$ = [];
    v = slice$.call(arguments, 1);
    for (i$ = 0, len$ = (ref$ = this.evtHandler[n] || []).length; i$ < len$; ++i$) {
      cb = ref$[i$];
      results$.push(cb.apply(this, v));
    }
    return results$;
  },
  setHost: function(host){
    (this.sdb = host.sdb, this.doc = host.doc, this).host = host;
    return this.updateData();
  },
  setPath: function(p){
    this.path = p;
    return this.updateData();
  },
  updateData: function(){
    var o, i$, ref$, len$, n;
    if (!this.doc) {
      return;
    }
    o = this.doc.data;
    for (i$ = 0, len$ = (ref$ = this.path || []).length; i$ < len$; ++i$) {
      n = ref$[i$];
      o = o[n] || {};
    }
    return this.opsIn({
      data: o
    });
  },
  opsIn: function(arg$){
    var ops, data, source, o, i$, ref$, len$, n, this$ = this;
    ops = arg$.ops, data = arg$.data, source = arg$.source;
    if (data) {
      this.data = data;
    } else {
      o = this.doc.data;
      for (i$ = 0, len$ = (ref$ = this.path).length; i$ < len$; ++i$) {
        n = ref$[i$];
        o = o[n] || {};
      }
      this.data = o;
    }
    if (ops) {
      ops = JSON.parse(JSON.stringify(ops));
      ops = ops.map(function(op){
        var i$, to$, i;
        for (i$ = 0, to$ = this$.path.length; i$ < to$; ++i$) {
          i = i$;
          if (op.p[0] === this$.path[i]) {
            op.p.splice(0, 1);
          } else {
            break;
          }
        }
        return op;
      });
    }
    return this.fire('ops-in', {
      ops: ops,
      data: this.data,
      source: source
    });
  },
  opsOut: function(ops){
    var cur, o, p, opsAddon, i$, ref$, len$, n, ref1$, this$ = this;
    if (!this.sdb || !this.doc.submitOp) {
      return;
    }
    if (typeof ops === 'function') {
      cur = ops(JSON.parse(JSON.stringify(this.data || {})));
      ops = this.sdb.json.diff(this.data || {}, cur);
      return this.opsOut(ops);
    } else if (Array.isArray(ops) && ops.length) {
      ops.map(function(it){
        return it.p = this$.path.concat(it.p);
      });
      o = this.doc.data;
      p = [];
      opsAddon = [];
      for (i$ = 0, len$ = (ref$ = this.path).length; i$ < len$; ++i$) {
        n = ref$[i$];
        p.push(n);
        if (!o[n]) {
          opsAddon.push({
            p: JSON.parse(JSON.stringify(p)),
            oi: n === (ref1$ = this.path)[ref1$.length - 1] && Array.isArray(this.data)
              ? []
              : {}
          });
        }
        o = o[n] || {};
      }
      ops = opsAddon.concat(ops);
      return this.doc.submitOp(ops);
    }
  }
});
Adapter['interface'] = {
  opsIn: null,
  opsOut: function(f){
    return this.adapter.opsOut(f);
  },
  adapt: function(arg$){
    var host, path, a, this$ = this;
    host = arg$.host, path = arg$.path;
    if (a = this.adapter) {
      a.setHost(host);
      a.setPath(path);
    } else {
      this.adapter = a = host.adapt({
        path: path
      });
    }
    this.adapter.off('ops-in');
    this.adapter.on('ops-in', function(opt){
      return this$.opsIn(opt);
    });
    return this.opsIn({
      data: this.adapter.data
    });
  },
  setPath: function(it){
    return this.adapter.setPath(it);
  },
  adapted: function(){
    return !!this.adapter;
  }
};
function import$(obj, src){
  var own = {}.hasOwnProperty;
  for (var key in src) if (own.call(src, key)) obj[key] = src[key];
  return obj;
}

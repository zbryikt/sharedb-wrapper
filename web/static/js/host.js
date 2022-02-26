(function(it){
  return it();
})(function(){
  var lc, view, Ctrl, host;
  lc = {};
  view = new ldview({
    root: document.body,
    action: {
      click: {
        reconnect: function(arg$){
          var node;
          node = arg$.node;
          node.classList.add('running');
          return debounce(1000).then(function(){
            return host.reconnect();
          }).then(function(){
            lc.ldcv.set();
            return node.classList.remove('running');
          });
        }
      }
    },
    init: {
      ldcv: function(arg$){
        var node;
        node = arg$.node;
        return lc.ldcv = new ldcover({
          root: node
        });
      }
    }
  });
  Ctrl = function(opt){
    var root, this$ = this;
    opt == null && (opt = {});
    root = opt.root;
    this.host = opt.host;
    this.path = opt.path;
    this.root = root = typeof root === 'string'
      ? document.querySelector(root)
      : root ? root : null;
    this.view = new ldview({
      root: root,
      action: {
        click: {
          add: function(){
            this$.data.c++;
            return this$.opsOut(function(){
              return this$.data;
            });
          },
          disconnect: function(){
            this$.host.sdb.disconnect();
            return lc.ldcv.get();
          }
        }
      },
      handler: {
        textarea: function(arg$){
          var node;
          node = arg$.node;
          return node.value = JSON.stringify(this$.data || '');
        }
      }
    });
    this.adapt({
      host: opt.host,
      path: opt.path
    });
    return this;
  };
  Ctrl.prototype = import$(import$(Object.create(Object.prototype), sdbAdapter['interface']), {
    update: function(){
      return this.view.render();
    }
  });
  host = new sdbHost({
    url: {
      scheme: 'http',
      domain: 'localhost:3005',
      path: '/ws'
    },
    id: 'sample',
    autoReconnect: false
  });
  return host.initSdb().then(function(){
    var ctrla, ctrlb;
    ctrla = new Ctrl({
      host: host,
      path: ['ctrla'],
      root: '[ld-scope=ctrla]'
    });
    return ctrlb = new Ctrl({
      host: host,
      path: ['ctrlb'],
      root: '[ld-scope=ctrlb]'
    });
  });
});
function import$(obj, src){
  var own = {}.hasOwnProperty;
  for (var key in src) if (own.call(src, key)) obj[key] = src[key];
  return obj;
}
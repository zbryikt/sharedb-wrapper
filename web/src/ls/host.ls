<- (->it!) _

lc = {}

view = new ldview do
  root: document.body
  action: click: do
    reconnect: ({node}) ->
      node.classList.add \running
      debounce 1000
        .then -> host.reconnect!
        .then ->
          lc.ldcv.set!
          node.classList.remove \running
  init: do
    ldcv: ({node}) -> lc.ldcv = new ldcover root: node

Ctrl = (opt = {}) ->
  root = opt.root
  @ <<< opt{host, path}
  @root = root = if typeof(root) == \string => document.querySelector(root) else if root => root else null
  @view = new ldview do
    root: root
    action: click: do
      add: ~>
        @data.c++
        @ops-out ~> @data
      disconnect: ~>
        @host.sdb.disconnect!
        lc.ldcv.get!
    handler: do
      textarea: ({node}) ~> node.value = JSON.stringify(@data or '')

  @adapt opt{host, path}
  @

Ctrl.prototype = Object.create(Object.prototype) <<< sdb-adapter.interface <<< do
  update: -> @view.render!

host = new sdb-host {url: {scheme: \http, domain: \localhost:3005, path: \/ws}, id: \sample, auto-reconnect: false}
host.init-sdb!
  .then ->
    ctrla = new Ctrl {host, path: <[ctrla]>, root: '[ld-scope=ctrla]'}
    ctrlb = new Ctrl {host, path: <[ctrlb]>, root: '[ld-scope=ctrlb]'}


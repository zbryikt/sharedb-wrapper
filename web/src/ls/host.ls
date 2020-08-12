<- (->it!) _

Ctrl = ->
  @view = new ldView do
    root: document.body
    action: click: do
      add: ~>
        @data.c++
        @ops-out ~> @data
      disconnect: -> console.log \disconnected
    handler: do
      textarea: ({node}) ~> node.value = JSON.stringify(@data or '')
  @

Ctrl.prototype = Object.create(Object.prototype) <<< sdb-adapter.interface <<< do
  update: -> @view.render!

host = new sdb-host {url: {scheme: \http, domain: \localhost:3005, path: \/ws}, id: \sample}
host.init-sdb!
  .then ->
    ctrl = new Ctrl!
    ctrl.adapt {host, path: <[ctrl]>}


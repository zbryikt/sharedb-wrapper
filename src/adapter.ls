# options
#  id - docid
#  collection - doc collection
#  watch (ops, source) - watcher for update event
#  create () - init object
#  url: {scheme, domain, path}
#
# events
#  init-sdb, reconnecting, reconnected

sdb-host = (opt = {}) ->
  @opt = opt
  @evt-handler = {}
  @adapters = []
  @

sdb-host.prototype = Object.create(Object.prototype) <<< do
  on: (n, cb) -> @evt-handler.[][n].push cb
  fire: (n, ...v) -> for cb in (@evt-handler[n] or []) => cb.apply @, v
  getdoc: -> @sdb.get({watch:((o,s)~>@watch o,s)} <<< @opt{id, create}) .then (doc) ~> @doc = doc
  watch: (ops, source) ->
    if @opt.watch => @opt.watch ops, source
    @adapters.map -> it.ops-in {ops, source}
  reconnect: ->
    @fire \reconnecting, it
    @sdb.reconnect!
      .then ~> @getdoc!
      .then ~> @adapters.map (a) ~> a.set-host(@)
      .then ~> if @opt.reconnect => @opt.reconnect!
      .then ~> @fire \reconnected, it
  init-sdb: ->
    @fire \init-sdb
    @sdb = sdb = new sharedb-wrapper {url: @opt.url}
    sdb.on \error, ~> @fire \error, it
    sdb.on \close, ~> @reconnect!
    @reconnect!then -> sdb.ready!
  adapt: (opt = {})->
    @adapters.push (a = new sdb-adapter({} <<< opt <<< {host: @}))
    return a


sdb-adapter = (opt = {}) ->
  @opt = opt
  @ <<< data: {}, evt-handler: {}
  @path = opt.path
  @set-host opt.host
  @set-path opt.path
  @

sdb-adapter.prototype = Object.create(Object.prototype) <<< do
  on: (n, cb) -> @evt-handler.[][n].push cb
  off: (n) -> @evt-handler[n] = []
  fire: (n, ...v) -> for cb in (@evt-handler[n] or []) => cb.apply @, v
  set-host: (host) -> 
    @ <<< host{sdb, doc} <<< {host}
    @update-data!
  set-path: (p) ->
    @path = p
    @update-data!
  update-data: ->
    if !@doc => return
    o = @doc.data
    for n in @path or [] => o = (o[n] or {})
    @ops-in {data: o}
  ops-in: ({ops, data, source}) ->
    if data => @data = data
    else
      o = @doc.data
      for n in @path => o = (o[n] or {})
      @data = o
    if ops =>
      ops = ops
        .map (op) ~>
          # if we touch the original ops, further update will fail. thus we clone it ( including op.p )
          op = {} <<< op
          for i from 0 til @path.length =>
            if op.p.0 == @path[i] => (op.p = [] ++ op.p).splice(0, 1)
            else i = -1 ; break
          return if i != -1 => op else null
        .filter -> it

    @fire \ops-in, {ops, data: @data, source}
  ops-out: (ops) ->
    if !@sdb or !@doc.submitOp => return
    if typeof(ops) == \function =>
      cur = ops(@data)
      ops = @sdb.json.diff((@data or {}), cur)
      @ops-out ops
    else if Array.isArray(ops) and ops.length =>
      ops.map ~> it.p = @path ++ it.p
      o = @doc.data
      p = []
      ops-addon = []
      for n in @path =>
        p.push n
        if !o[n] => ops-addon.push do
          p: JSON.parse(JSON.stringify(p))
          oi: (if n == @path[* - 1] and Array.isArray(@data) => [] else {})
        o = (o[n] or {})
      ops = ops-addon ++ ops
      @doc.submitOp ops

sdb-adapter.interface = do
  # only call by default ops-in. overwrite update to use default ops-in.
  update: ->
  ops-in: ({ops,data,source}) ->
    if ops => @data = @adapter.host.doc.type.apply @data, ops
    else @data = JSON.parse(JSON.stringify(data))
    @update!

  ops-out: (f) -> @adapter.ops-out f
  adapt: ({host, path}) ->
    if (a = @adapter) =>
      a.set-host host
      a.set-path path
    else @adapter = a = host.adapt {path}
    @adapter.off \ops-in
    @adapter.on \ops-in, (opt) ~> @ops-in opt
    @ops-in {data: @adapter.data}
  set-path: -> @adapter.set-path it
  adapted: -> !!@adapter

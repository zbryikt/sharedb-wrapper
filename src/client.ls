require! <[sharedb]>

err = (e) -> new Error! <<< {name: \lderror, id: e}

sharedb-wrapper = (opt = {}) ->
  @ <<< do
    domain: opt.url.domain or window.location.host
    scheme: (opt.{}url.scheme or window.location.protocol.replace(':','') or 'https')
    path: p = (opt.url.path or \/ws)
    evthdr: {}
    # web socket object
    socket: null
    # sharedb connection object
    connection: null
    # connect controller
    _ctrl:
      count: 0
      pending: []
      hdr: null
      canceller: null
      disconnector: null
    # status. 0: disconnected. 1: connecting. 2: connected.
    _s: 0

  @path = if p.0 == \/ => p else "/#{p}"
  @scheme = if @scheme == \http => \ws else \wss
  @connect!
  @

sharedb-wrapper.prototype = Object.create(Object.prototype) <<< do
  get-snapshot: ({id, version, collection}) -> new Promise (res, rej) ~>
    @connection.fetchSnapshot(
      (if collection? => collection else \doc),
      id,
      (if version? => version else null),
      (e, s) -> if e => rej(e) else res(s)
    )

  get: ({id, watch, create, collection}) ->
    <~ (if !@connection => @connect! else Promise.resolve!).then _
    (res, rej) <~ new Promise _
    doc = @connection.get (if collection? => collection else \doc), id
    (e) <~ doc.fetch _
    if e => return rej e
    doc.subscribe (ops, source) -> res doc
    doc.on \error, (err) ~> @fire \error, {doc, err}
    if watch? => doc.on \op, (ops, source) -> watch ops, source
    if !doc.type => doc.create ((if create => create! else null) or {})

  on: (n, cb) -> @evthdr.[][n].push cb
  fire: (n, ...v) -> for cb in (@evthdr[n] or []) => cb.apply @, v

  # resolves if connected. otherwise rejects.
  _connect: (opt = {}) -> new Promise (res, rej) ~>
    if @socket => return rej(err 1011)
    @socket = new WebSocket "#{@scheme}://#{@domain}#{@path}"
    @connection = new sharedb.Connection @socket
    @socket.addEventListener \close, ~>
      @ <<< socket: null
      # Promise is resolved if ever connected so we don't reject.
      # Besides, `close` is fired only if ever connected.
      # if not yet connected, we are still connecting so we shouldn't fire close event.
      # additionally _s should be 1 and controlled by caller,
      # so we shouldn't touch it here.
      if @_s != 2 => return rej(err 0)
      # otherwise, it's a normal close event. we reset status and fire close event.
      @_status 0
      @fire \close
      if @_ctrl.disconnector => @_ctrl.disconnector.res!
    @socket.addEventListener \open, ~>
      if !@_ctrl.canceller => return res!
      @_ctrl.canceller.res!
      return rej(err 0)

  connect: (opt = {}) ->
    cc = @_ctrl
    if @_s == 2 => return Promise.reject(err 1011)
    (res, rej) <~ new Promise _
    cc.pending.push {res, rej}
    if @_s == 1 => return
    @_status 1
    retry = !(opt.retry?) or !opt.retry
    cc.count = 0
    _ = ~>
      delay = Math.round(Math.pow(cc.count++, 1.4) * 500) + (opt.delay or 0)
      cc.hdr = setTimeout (~>
        cc.hdr = null
        @_connect!
          .then ~>
            @_status 2
            cc.[]pending.splice 0 .map -> it.res!
          .catch ->
            if retry and !cc.canceller => return _!
            cc.canceller = null
            cc.[]pending.splice 0 .map -> it.rej!
      ), delay
    _!

  disconnect: ->
    if @_s == 0 => return Promise.resolve!
    if @_s == 1 => return @cancel!
    ret = new Promise (res, rej) ~> @_ctrl.disconnector = {res, rej}
    # let _connect takes care of deinit tasks
    @socket.close!
    ret

  cancel: ->
    cc = @_ctrl
    if @_s != 1 => return Promise.reject(err 1026)
    if cc.hdr =>
      clearTimeout cc.hdr
      cc.hdr = null
      @_status 0
      return Promise.resolve!
    # it's only possible to reach here if timer is fired yet _connect is ongoing.
    new Promise (res, rej) -> cc.canceller = {res, rej}

  _status: (s) ->
    os = @_s
    @_s = s
    if s != os => @fire \status, s

  status: -> return @_s
  ensure: -> if @_s == 2 => Promise.resolve! else @connect!

if module? => module.exports = sharedb-wrapper
else if window? => window.sharedb-wrapper = sharedb-wrapper

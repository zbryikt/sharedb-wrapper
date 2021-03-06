require! <[sharedb]>
main = (opt = {}) ->
  @ <<< do
    scheme: opt.{}url.scheme or window.location.protocol.replace(':','')
    domain: opt.url.domain or window.location.host
    path: p = (opt.url.path or \/ws)
  @path = if p.0 == \/ => p else "/#{p}"
  @scheme = if @scheme == \http => \ws else \wss
  @evt-handler = {}
  @reconnect-info = {retry: 0, pending: []}
  @reconnect!
  @

main.prototype = Object.create(Object.prototype) <<< do
  get-snapshot: ({id, version, collection}) -> new Promise (res, rej) ~>
    @connection.fetchSnapshot(
      (if collection? => collection else \doc),
      id,
      (if version? => version else null),
      (e, s) -> if e => rej(e) else res(s)
    )
  ready: -> new Promise (res, rej) ~>
    if @connected => return res!
    if !@reconnect-info.handler => return @reconnect!
    @reconnect-info.pending.push {res, rej}

  get: ({id, watch, create, collection}) ->
    <~ (if !@connection => @reconnect! else Promise.resolve!).then _
    (res, rej) <~ new Promise _
    doc = @connection.get (if collection? => collection else \doc), id
    (e) <~ doc.fetch _
    if e => return rej e
    doc.subscribe (ops, source) -> res doc
    doc.on \error, (err) ~> @fire \error, {doc, err}
    if watch? => doc.on \op, (ops, source) -> watch ops, source
    if !doc.type => doc.create ((if create => create! else null) or {})

  on: (n, cb) -> @evt-handler.[][n].push cb
  fire: (n, ...v) -> for cb in (@evt-handler[n] or []) => cb.apply @, v
  disconnect: ->
    if !@socket => return
    @socket.close!
    @ <<< socket: null, connected: false
    @socket = null

  reconnect: -> new Promise (res, rej) ~>
    if @socket => return res!
    delay = (@reconnect-info.retry++)
    delay = Math.round(Math.pow(delay,1.4) * 500)
    clearTimeout @reconnect-info.handler
    console.log "try reconnecting (#{@reconnect-info.retry}) after #{delay}ms ..."
    @reconnect-info.handler = setTimeout (~>
      @reconnect-info.handler = null
      @socket = new WebSocket "#{@scheme}://#{@domain}#{@path}"
      @connection = new sharedb.Connection @socket
      @socket.addEventListener \close, ~>
        @ <<< {socket: null, connected: false}; @fire \close
      @socket.addEventListener \open, ~>
        @reconnect-info.retry = 0
        @reconnect-info.[]pending.splice(0).map -> it.res!
        @ <<< {connected: true}; res!
    ), delay


if module? => module.exports = main
if window? => window.sharedb-wrapper = main

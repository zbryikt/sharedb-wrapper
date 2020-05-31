(->
  #require! <[json0-ot-diff diff-match-patch]>
  diff = (o,n,dostr = true) -> json0-ot-diff o, n, (if dostr => diff-match-patch else null)
  sharedb-wrapper = ({url, path}) ->
    @url = url
    @path = path or '/ws'
    @path = if path.0 == \/ => @path else "/#{@path}"
    @evt-handler = {}
    @reconnect!
    @

  sharedb-wrapper.prototype = Object.create(Object.prototype) <<< do
    json: diff: (o,n,dostr=true) -> diff o,n,dostr
    get-snapshot: ({id, version}) -> new Promise (res, rej) ~>
      @connection.fetchSnapshot \doc, id, (if version? => version else null), (e, s) -> if e => rej(e) else res(s)

    get: ({id, watch, create}) -> new Promise (res, rej) ~>
      doc = @connection.get \doc, id
      doc.fetch (e) ->
        if e => return rej e
        doc.subscribe (ops, source) -> res doc
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
      @socket = new WebSocket "#{if @url.scheme == \http => \ws else \wss}://#{@url.domain}#{@path}"
      @connection = new sharedb.Connection @socket
      @socket.addEventListener \close, ~> @ <<< {socket: null, connected: false}; @fire \close
      @socket.addEventListener \open, ~> @connected = true; res!


  if module? => module.exports = sharedb-wrapper
  if window? => window.sharedb-wrapper = sharedb-wrapper
)!

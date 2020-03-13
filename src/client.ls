(->
  #require! <[json0-ot-diff diff-match-patch]>
  diff = (o,n,dostr = true) -> json0-ot-diff o, n, (if dostr => diff-match-patch else null)
  sharedb-wrapper = ({url}) ->
    @url = url
    @evt-handler = {}
    @reconnect!
    @

  sharedb-wrapper.prototype = Object.create(Object.prototype) <<< do
    json: diff: (o,n,dostr=true) -> diff o,n,dostr
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

    reconnect: ->
      if @socket => return
      @socket = new WebSocket "#{if @url.scheme == \http => \ws else \wss}://#{@url.domain}/ws"
      @connection = new sharedb.Connection @socket
      @socket.addEventListener \close, ~> @ <<< {socket: null, connected: false}; @fire \close
      @socket.addEventListener \open, ~> @connected = true


  if module? => module.exports = sharedb-wrapper
  if window? => window.sharedb-wrapper = sharedb-wrapper
)!

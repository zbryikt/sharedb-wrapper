(->
  sharedb-wrapper = ({url}) ->
    @socket = new WebSocket "#{if url.scheme == \http => \ws else \wss}://#{url.domain}/ws"
    @connection = new sharedb.Connection @socket
    @

  sharedb-wrapper.prototype = Object.create(Object.prototype) <<< do
    get: ({id, watch, create}) -> new Promise (res, rej) ~>
      doc = @connection.get \doc, id
      doc.fetch (e) ->
        doc.subscribe (ops, source) -> res doc
        if watch? => doc.on \op, (ops, source) -> watch ops, source
        if !doc.type => doc.create ((if create => create! else null) or {})

  if module? => module.exports = sharedb-wrapper
  if window? => window.sharedb-wrapper = sharedb-wrapper
)!

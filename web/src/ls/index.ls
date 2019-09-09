(->

  textarea = ld$.find document, \textarea, 0
  handle = (ops, source) -> textarea.value = JSON.stringify doc.data
  submit = (op, opt) -> doc.submitOp op

  url = scheme: \http, domain: \sharedb.local
  socket = new WebSocket "#{if url.scheme == \http => \ws else \wss}://#{url.domain}/ws"
  connection = new sharedb.Connection socket
  doc = connection.get \doc, \12r6
  console.log \doc:, doc
  doc.on \load, -> console.log \loaded, doc.data
  doc.fetch (e) ->
    console.log \fetched
    doc.subscribe (ops, source) ->
      handle ops, source
      console.log \subscribed.
    doc.on \op, (ops, source) ->
      handle ops, source
      console.log \onop!
    if !doc.type =>
      console.log "create doc"
      ret = doc.create {}
    else console.log \ok

  click = ->
    if !doc.data.x => submit {p: ["x"], oi: {a: 0}}
    submit {p: ["x", "a"], na: 1}

  btn = ld$.find document, \.btn .0
  btn.addEventListener \click, click
)!


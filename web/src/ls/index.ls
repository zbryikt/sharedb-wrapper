(->
  local = {}
  click = -> 
    data = local.doc.data
    old = JSON.parse JSON.stringify(data)
    data.{}x.a = (+"#{(data.{}x.a or 0)}") + 1
    ops = sdb.json.diff old, data
    local.doc.submitOp ops
  textarea = ld$.find document, \textarea, 0
  btn1 = ld$.find document, \.btn .0
  btn1.addEventListener \click, click
  btn2 = ld$.find document, \.btn .1
  btn2.addEventListener \click, ->
    if !sdb.connected => return
    sdb.disconnect!
  btn2 = ld$.find document, \.btn .2
  btn2.addEventListener \click, ->
    if !sdb.connected =>
      sdb.reconnect!
      init!
      ldcv.toggle false

  sdb = new sharedb-wrapper url: {scheme: \http, domain: \localhost:3005}
  watch = -> textarea.value = JSON.stringify local.doc.data
  init = ->
    sdb.get {id: \sample, watch: watch}
      .then (doc) -> local.doc = doc; watch!
  textarea.onchange = -> console.log textarea.value
  ldld = new ldLoader className: "ldld full"
  sdb.on \close, -> ldcv.toggle!
  ldcv = new ldCover root: \.ldcv
  init!
)!

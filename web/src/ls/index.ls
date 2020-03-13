(->
  local = {}
  click = -> 
    data = local.doc.data
    old = JSON.parse JSON.stringify(data)
    data.{}x.a = (+"#{(data.{}x.a or 0)}") + 1
    ops = sdb.json.diff old, data
    local.doc.submitOp ops
  textarea = ld$.find document, \textarea, 0
  btn = ld$.find document, \.btn .0
  btn.addEventListener \click, click
  btn = ld$.find document, \.btn .1
  btn.addEventListener \click, -> sdb.socket.close!

  sdb = new sharedb-wrapper url: {scheme: \http, domain: \localhost:3005}
  watch = -> textarea.value = JSON.stringify local.doc.data
  sdb.get {id: \sample, watch: watch}
    .then (doc) -> local.doc = doc; watch!
  textarea.onchange = -> console.log textarea.value
  ldld = new ldLoader className: "ldld full"
  sdb.on \close, -> ldld.on!
)!

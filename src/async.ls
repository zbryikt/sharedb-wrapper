module.expors =
  parallel: (t, cb) ->
    ps = t.map -> new Promise (res, rej) -> Promise.resolve(it!).then -> res!
    Promise.all ps .then -> cb!
  each: (c,i,cb) ->
    ps = c.map -> new Promise (res, rej) -> Promise.resolve(i c).then -> res!
    Promise.all ps .then -> cb!

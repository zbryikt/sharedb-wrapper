require! <[fs fs-extra livescript browserify disc uglify-js]>

b = browserify {fullPaths: true}
b.require("sharedb/lib/client")
b.bundle!
  .pipe disc!
  .pipe fs.createWriteStream "web/static/disc.html"
  .once \close, ->
    console.log "done."
    process.exit!

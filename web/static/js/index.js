(function(){
  var local, click, textarea, btn1, btn2, sdb, watch, init, ldld, ldcv;
  local = {};
  click = function(){
    var data, old, ops;
    data = local.doc.data;
    old = JSON.parse(JSON.stringify(data));
    (data.x || (data.x = {})).a = (+(((data.x || (data.x = {})).a || 0) + "")) + 1;
    ops = json0.diff(old, data);
    return local.doc.submitOp(ops);
  };
  textarea = ld$.find(document, 'textarea', 0);
  btn1 = ld$.find(document, '.btn')[0];
  btn1.addEventListener('click', click);
  btn2 = ld$.find(document, '.btn')[1];
  btn2.addEventListener('click', function(){
    if (!sdb.connected) {
      return;
    }
    return sdb.disconnect();
  });
  btn2 = ld$.find(document, '.btn')[2];
  btn2.addEventListener('click', function(){
    if (!sdb.connected) {
      sdb.reconnect();
      init();
      return ldcv.toggle(false);
    }
  });
  sdb = new sharedbWrapper({
    url: {
      scheme: 'http',
      domain: 'localhost:3005'
    }
  });
  watch = function(){
    return textarea.value = JSON.stringify(local.doc.data);
  };
  init = function(){
    return sdb.get({
      id: 'sample',
      watch: watch
    }).then(function(doc){
      local.doc = doc;
      return watch();
    });
  };
  textarea.onchange = function(){
    return console.log(textarea.value);
  };
  ldld = new ldLoader({
    className: "ldld full"
  });
  sdb.on('close', function(){
    return ldcv.toggle();
  });
  ldcv = new ldCover({
    root: '.ldcv'
  });
  return init();
})();
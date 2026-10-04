/* ============================================================
   registry.js —— 楼层玩法注册表
   每个楼层一个文件，自己 register 进来；到达楼层时调用 mount()
   ============================================================ */
(function (EG) {
  'use strict';

  var list = {};
  var active = null;

  EG.Floors = {
    register: function (def) {
      list[def.id] = def;
      return def;
    },

    get: function (id) { return list[id]; },

    /* 把某个楼层的道具画到 propsEl 里 */
    mount: function (id, propsEl) {
      this.unmount();
      var def = list[id];
      propsEl.innerHTML = '';
      if (def && def.mount) {
        def.mount(propsEl);
        active = { id: id, def: def };
      }
      return active;
    },

    unmount: function () {
      if (active && active.def.unmount) active.def.unmount();
      active = null;
    },

    activeId: function () { return active ? active.id : null; }
  };
})(window.EG);

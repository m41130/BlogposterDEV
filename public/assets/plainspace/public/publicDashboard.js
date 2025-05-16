//public/assets/plainSpace/public/publicDashboard.js
import emitter from './miniEmitter.js';
(async function() {
  const userJwt = localStorage.getItem('jwt') || '';
  async function meltdownEmit(e, p){ return (await fetch('/api/meltdown',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({eventName:e,payload:p})})).json(); }

  let resp;
  try {
    resp = await meltdownEmit('widget.registry.request.v1', {
      lane: 'public', jwt: userJwt, moduleName: 'plainspace'
    });
  } catch (e) {
    console.error('[publicDashboard] fetch error', e);
    return;
  }

  const list = resp.data?.widgets || [];
  const grid = document.getElementById('publicGrid');
  list.forEach(w => {
    const div = document.createElement('div');
    div.dataset.widgetId = w.id;
    div.textContent = w.metadata.label;
    grid.appendChild(div);
    import(w.codeUrl).then(mod => mod.render?.(div)).catch(e=>console.error(e));
  });

  if (userJwt) new Sortable(grid, {
    animation:150, onEnd: async () => {
      const layout = [...grid.children].map((el,i)=>({ widgetId:el.dataset.widgetId, order:i+1 }));
      console.log(await meltdownEmit('saveLayout.v1',{ jwt:userJwt,moduleName:'plainspace',lane:'public',layout }));
    }
  });
})();

// Tema do Hub: auto (segue o sistema), claro, escuro ou alto contraste.
// Carregado no <head> sem defer para aplicar o tema antes de pintar (sem piscar).
// A escolha fica no navegador de cada pessoa (localStorage); sem acesso a ele, vale o automático.
(function () {
  var CHAVE = 'hub-tema', VALIDOS = { auto: 1, light: 1, dark: 1, contraste: 1 };
  function ler() { try { var t = localStorage.getItem(CHAVE); return VALIDOS[t] ? t : 'auto'; } catch (e) { return 'auto'; } }
  function aplicar(t) {
    if (t === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', t);
  }
  aplicar(ler());
  document.addEventListener('DOMContentLoaded', function () {
    var sel = document.getElementById('tema');
    if (!sel) return;
    sel.value = ler();
    sel.addEventListener('change', function () {
      try { localStorage.setItem(CHAVE, sel.value); } catch (e) { /* sem armazenamento: vale só nesta visita */ }
      aplicar(sel.value);
    });
  });
})();

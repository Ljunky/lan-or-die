// Helper: walk the real menu flow (fighter select -> intro -> brief -> play) by clicking.
module.exports = async function realFlow(p, id) {
  await p.evaluate(id => { const L = window.__lod; if (!L.LOD.player) L.setName('Ljunky'); L.openMission(L.LOD.missions.find(m => m.id === id)); }, id);
  for (let i = 0; i < 40; i++) {
    await p.waitForTimeout(400);
    if (await p.evaluate(() => { const G = window.__lod.G; return G && (G.mode === 'play' || (G.mode === 'pause' && !document.getElementById('rotate-warning').hidden)); })) return true;
    // click the most "forward" visible button we can find
    const sel = await p.evaluate(() => {
      const cand = [...document.querySelectorAll('button')].filter(b => b.offsetParent && !b.disabled && getComputedStyle(b).visibility !== 'hidden');
      const pref = ['[data-a="select"]', '#brief-go', '.btn.go', '.cut button', '.btn.primary', '.btn'];
      for (const s of pref) { const b = cand.find(x => x.matches(s) && !/back|board|missions|quit/i.test(x.textContent)); if (b) { b.setAttribute('data-test-next', '1'); return s + ' :: ' + b.textContent.trim().slice(0, 30); } }
      return null;
    });
    if (sel) { await p.click('[data-test-next="1"]', { force: true, timeout: 2000 }).catch(() => {}); await p.evaluate(() => document.querySelectorAll('[data-test-next]').forEach(b => b.removeAttribute('data-test-next'))); }
    else await p.mouse.click(10, 10);
  }
  return false;
};

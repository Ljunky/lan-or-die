/* LAN OR DIE – starter claims for Mission 3 (first come, first served: player 1 picks from 5, player 2 from 4 …).
   Paste these into the existing Apps Script project, add the two marked lines to doGet / doPost, then deploy a NEW VERSION
   of the same web app (Deploy → Manage deployments → edit → Version: New) so the /exec URL stays the same.

   Until this is deployed the game never sends a claim: it asks GET ?claims=3 first and only uses claims when the answer has
   a "claims" object. Without it every player is offered all five starters. */

// 1) In doGet(e), first line:
//      if (e && e.parameter && e.parameter.claims) return claimsJson_({ claims: getClaims_(Number(e.parameter.claims)) });
// 2) In doPost(e), right after the body is parsed (const body = JSON.parse(e.postData.contents)):
//      if (body.action === 'claim') return claimsJson_(claimStarter_(body));

function claimsSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName('Claims') || ss.insertSheet('Claims').appendRow(['ts', 'mission', 'name', 'pick']) && ss.getSheetByName('Claims');
}
function getClaims_(mission) {
  const rows = claimsSheet_().getDataRange().getValues().slice(1), out = {};
  rows.forEach(r => { if (Number(r[1]) === mission && !out[r[2]]) out[r[2]] = r[3]; }); // first claim per player wins
  return out;
}
function claimStarter_(b) {
  const PLAYERS = ['Löken', 'Wizcudi', 'Jrohn', 'BigWman', 'Ljunky'];
  const STARTERS = ['badgerCub', 'lynxKitten', 'toadlet', 'hoglet', 'fawn'];
  if (!PLAYERS.includes(b.name) || !STARTERS.includes(b.pick)) return { ok: false, error: 'bad claim' };
  const lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    const mission = Number(b.mission), claims = getClaims_(mission);
    if (claims[b.name]) return { ok: claims[b.name] === b.pick, claims, taken: claims[b.name] !== b.pick };
    if (Object.keys(claims).some(n => claims[n] === b.pick)) return { ok: false, taken: true, claims };
    claimsSheet_().appendRow([new Date(), mission, b.name, b.pick]);
    claims[b.name] = b.pick;
    return { ok: true, claims };
  } finally { lock.releaseLock(); }
}
function claimsJson_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

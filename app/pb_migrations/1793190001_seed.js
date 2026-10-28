/// <reference path="../pb_data/types.d.ts" />
/* Erster Start: Einstellungen, App-Konfiguration und Jakobs Konto (Zugangsdaten aus der Server-Einrichtung) */
migrate((app) => {
  const owner = $os.getenv('SPIELESCHRANK_OWNER') || 'Jakob';

  const st = new Record(app.findCollectionByNameOrId('settings'));
  st.set('owner', owner);
  st.set('title', owner + 's Spieleschrank');
  st.set('newWeeks', 3);
  st.set('showcase', $security.randomStringWithAlphabet(10, 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'));
  app.save(st);

  const s = app.settings();
  s.meta.appName = owner + 's Spieleschrank';
  const url = $os.getenv('SPIELESCHRANK_URL') || ($os.getenv('DOMAIN') ? 'https://' + $os.getenv('DOMAIN') : '');
  if (url) s.meta.appURL = url;
  s.meta.hideControls = true;
  s.backups.cron = '30 3 * * *';
  s.backups.cronMaxKeep = 7;   // eine Woche; dazu kommen die Hetzner-Sicherungen außerhalb des Servers
  s.rateLimits.enabled = true;
  // Anmelden: 6 Versuche in 15 Sekunden je Internetanschluss. Reicht, wenn beim Familienfest alle im selben WLAN gleichzeitig einsteigen.
  for (let i = 0; i < s.rateLimits.rules.length; i++) {
    if (s.rateLimits.rules[i].label === '*:auth') { s.rateLimits.rules[i].maxRequests = 6; s.rateLimits.rules[i].duration = 15; }
  }
  s.logs.maxDays = 14;
  s.logs.logIP = false;
  app.save(s);

  const user = ($os.getenv('SPIELESCHRANK_ADMIN_USER') || '').trim().toLowerCase();
  const pass = $os.getenv('SPIELESCHRANK_ADMIN_PASSWORD') || '';
  if (user && pass) {
    const u = new Record(app.findCollectionByNameOrId('users'));
    u.set('username', user);
    u.set('name', owner);
    u.set('role', 'admin');
    u.set('color', 0);
    u.set('mustChange', false);
    u.setPassword(pass);
    app.save(u);
  }
}, (app) => {
  // Kein Zurückdrehen: Einstellungen und Konten bleiben erhalten
});

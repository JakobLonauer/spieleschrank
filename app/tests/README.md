# Tests

Lokal gegen einen PocketBase-Testserver (offizielles Release 0.40.6 unter `$DEV_DIR/pbbin/pocketbase`).

```bash
export DEV_DIR=/tmp/spieleschrank-dev TZ=Europe/Vienna
export SPIELESCHRANK_ADMIN_USER=jakob SPIELESCHRANK_ADMIN_PASSWORD='Sp1eleschrank!'
export BGG_BASE=http://127.0.0.1:8099/xmlapi2 BGG_TOKEN=test-token
python3 tests/bggmock.py 8099 &                      # BGG-Attrappe (verlangt "Bearer test-token")
tools/dev/pbctl.sh start /tmp/sp-data pb_hooks pb_migrations pb_public
python3 tests/api_test.py    # Regeln, Datenschutz, Abläufe über die API (67 Prüfungen)
python3 tests/e2e.py         # Browser: Jakob legt an, Lisa fragt an, Jakob nimmt an, Schaufenster
python3 tests/e2e2.py        # Browser: Puzzle, Import, BGG-Ergänzung, Barrierefreiheit (AXE_JS=…/axe.min.js)
```

Vor jedem Lauf von `api_test.py` bzw. `e2e*.py` die Testdaten löschen (`rm -rf /tmp/sp-data`) und den Server neu starten.

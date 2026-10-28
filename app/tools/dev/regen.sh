#!/bin/bash
# Datenmodell neu einspielen und Migration neu erzeugen
S=${DEV_DIR:-/tmp/spieleschrank-dev}   # enthält pbbin/pocketbase (offizielles Release)
APP=$(cd "$(dirname "$0")/../.." && pwd)
rm -rf $S/pbschema && mkdir -p $S/pbschema
$S/pbbin/pocketbase superuser upsert admin@test.local Test1234567! --dir $S/pbschema >/dev/null
env -u SPIELESCHRANK_ADMIN_USER $(dirname "$0")/pbctl.sh start $S/pbschema
TOKEN=$(curl -s -X POST http://127.0.0.1:8090/api/collections/_superusers/auth-with-password -H 'Content-Type: application/json' -d '{"identity":"admin@test.local","password":"Test1234567!"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")
curl -s http://127.0.0.1:8090/api/collections/users -H "Authorization: $TOKEN" > $S/users.json
python3 $APP/tools/schema.py $S/users.json > $S/import.json
curl -s -X PUT http://127.0.0.1:8090/api/collections/import -H "Authorization: $TOKEN" -H 'Content-Type: application/json' -d @$S/import.json -w "import HTTP %{http_code}\n"
$(dirname "$0")/pbctl.sh stop
rm -f $APP/pb_migrations/1793190000_schema.js
echo y | $S/pbbin/pocketbase migrate collections --dir $S/pbschema --migrationsDir $APP/pb_migrations >/dev/null 2>&1
mv $APP/pb_migrations/*_collections_snapshot.js $APP/pb_migrations/1793190000_schema.js && echo "migration ok"

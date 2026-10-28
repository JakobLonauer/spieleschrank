"""Datenmodell des Spieleschranks als PocketBase-Collections.
Wird lokal per Import angewendet; daraus erzeugt `pocketbase migrate collections` die Migration."""
import json, sys

ADMIN = "@request.auth.role = 'admin'"
AUTHED = "@request.auth.id != ''"
DATE = r"^$|^\d{4}-\d{2}-\d{2}$"

def text(name, required=False, max=0, pattern="", hidden=False):
    return {"type": "text", "name": name, "required": required, "max": max, "pattern": pattern, "hidden": hidden}
def num(name, onlyInt=True, min=None, max=None, required=False):
    return {"type": "number", "name": name, "onlyInt": onlyInt, "min": min, "max": max, "required": required}
def boolf(name): return {"type": "bool", "name": name}
def sel(name, values, required=False, maxSelect=1):
    return {"type": "select", "name": name, "values": values, "maxSelect": maxSelect, "required": required}
def jsonf(name, maxSize=20000): return {"type": "json", "name": name, "maxSize": maxSize}
def rel(name, coll, maxSelect=1, required=False, cascade=False):
    return {"type": "relation", "name": name, "collectionId": coll, "maxSelect": maxSelect, "required": required, "cascadeDelete": cascade}
def filef(name, mimes, maxSize, maxSelect=1, protected=False, thumbs=None):
    return {"type": "file", "name": name, "mimeTypes": mimes, "maxSize": maxSize, "maxSelect": maxSelect, "protected": protected, "thumbs": thumbs or []}
def autod(): return [{"type": "autodate", "name": "created", "onCreate": True, "onUpdate": False},
                     {"type": "autodate", "name": "updated", "onCreate": True, "onUpdate": True}]
IMG = ["image/jpeg", "image/png", "image/webp", "image/gif"]

def collections(users_fields):
    users = {
        "id": "_pb_users_auth_", "name": "users", "type": "auth",
        "fields": users_fields + [
            text("username", True, 40, r"^[a-z0-9][a-z0-9._-]*$"),
            sel("role", ["admin", "member"], True),
            text("ort", max=60), text("phone", max=30), num("color", min=0, max=20),
            boolf("mustChange"), text("lastVisit", max=10, pattern=DATE),
        ],
        "indexes": ["CREATE UNIQUE INDEX `idx_username_users` ON `users` (`username`)",
                    "CREATE UNIQUE INDEX `idx_tokenKey__pb_users_auth_` ON `users` (`tokenKey`)",
                    "CREATE UNIQUE INDEX `idx_email__pb_users_auth_` ON `users` (`email`) WHERE `email` != ''"],
        "listRule": f"{ADMIN} || id = @request.auth.id", "viewRule": f"{ADMIN} || id = @request.auth.id",
        "createRule": ADMIN, "updateRule": f"{ADMIN} || id = @request.auth.id", "deleteRule": ADMIN,
        "manageRule": ADMIN, "authRule": "",
        "passwordAuth": {"enabled": True, "identityFields": ["username"]},
        "authToken": {"duration": 7776000},
    }
    items = {
        "id": "pbc_items", "name": "items", "type": "base",
        "fields": [
            sel("kind", ["game", "exp", "puzzle"], True), text("title", True, 200), num("bggId"),
            rel("base", "pbc_items"), boolf("standalone"), num("withBaseMax"),
            num("pmin"), num("pmax"), num("bestMin"), num("bestMax"), num("tmin"), num("tmax"),
            num("age"), num("diff", min=1, max=3), jsonf("genres", 2000),
            sel("lang", ["de", "en", "other"]), boolf("textHeavy"),
            text("desc", max=3000), text("rec", max=600), text("adds", max=200),
            filef("rules", ["application/pdf"], 40 * 1024 * 1024, protected=True), text("rulesLang", max=30),
            filef("cover", IMG, 8 * 1024 * 1024, thumbs=["480x480f", "160x160f"]),
            num("pal", min=0, max=30), text("pat", max=20),
            num("pieces"), text("brand", max=60), num("w"), num("h"), text("motif", max=40),
            num("missing"), boolf("done"),
            sel("once", ["intakt", "verbraucht"]), boolf("solved"),
            boolf("lendable"), boolf("gift"), boolf("archived"),
            rel("giftedTo", "_pb_users_auth_"), text("giftedAt", max=10, pattern=DATE),
            text("added", max=10, pattern=DATE), text("note", max=1000), text("alt", max=2000),
        ] + autod(),
        "indexes": ["CREATE INDEX `idx_items_kind` ON `items` (`kind`)", "CREATE INDEX `idx_items_bgg` ON `items` (`bggId`)"],
        "listRule": AUTHED, "viewRule": AUTHED, "createRule": ADMIN, "updateRule": ADMIN, "deleteRule": ADMIN,
    }
    loans = {
        "id": "pbc_loans", "name": "loans", "type": "base",
        "fields": [
            rel("item", "pbc_items", required=True, cascade=True), rel("user", "_pb_users_auth_", required=True, cascade=True),
            sel("status", ["angefragt", "vorgemerkt", "reserviert", "verliehen", "zurück", "abgelehnt", "zurückgezogen"], True),
            rel("extras", "pbc_items", maxSelect=10),
            text("start", max=10, pattern=DATE), jsonf("ret", 200), boolf("open"),
            text("handed", max=10, pattern=DATE), text("returned", max=10, pattern=DATE),
            boolf("pub"), text("msg", max=500), text("reason", max=500), boolf("seen"), boolf("notified"),
            sel("ext", ["angefragt", "ok", "abgelehnt"]), boolf("extended"), sel("photoHint", ["shown", "done", "dismissed"]),
            text("returnNote", max=300), text("prevStatus", max=20),
        ] + autod(),
        "indexes": ["CREATE INDEX `idx_loans_item` ON `loans` (`item`)", "CREATE INDEX `idx_loans_user` ON `loans` (`user`)", "CREATE INDEX `idx_loans_status` ON `loans` (`status`)"],
        "listRule": f"{ADMIN} || user = @request.auth.id", "viewRule": f"{ADMIN} || user = @request.auth.id",
        "createRule": f"{ADMIN} || (@request.auth.id != '' && @request.body.user = @request.auth.id && (@request.body.status = 'angefragt' || @request.body.status = 'vorgemerkt'))",
        "updateRule": f"{ADMIN} || user = @request.auth.id", "deleteRule": ADMIN,
    }
    loan_public = {
        "id": "pbc_loanpub", "name": "loan_public", "type": "view",
        "viewQuery": ("SELECT l.id, l.item, l.extras, l.status, l.start, l.ret, l.open, l.handed, l.created, "
                      "(CASE WHEN l.status != 'vorgemerkt' AND l.pub = 1 THEN 1 ELSE 0 END) AS pub, "
                      "(CASE WHEN l.status != 'vorgemerkt' AND l.pub = 1 THEN u.name ELSE '' END) AS who "
                      "FROM loans l LEFT JOIN users u ON u.id = l.user "
                      "WHERE l.status IN ('reserviert', 'verliehen', 'vorgemerkt')"),
        "listRule": AUTHED, "viewRule": AUTHED,
    }
    item_stats = {
        "id": "pbc_itemstats", "name": "item_stats", "type": "view",
        "viewQuery": "SELECT l.item AS id, COUNT(*) AS n FROM loans l WHERE l.status IN ('verliehen', 'zurück') GROUP BY l.item",
        "listRule": AUTHED, "viewRule": AUTHED,
    }
    photos = {
        "id": "pbc_photos", "name": "photos", "type": "base",
        "fields": [rel("loan", "pbc_loans", cascade=True), rel("user", "_pb_users_auth_", required=True, cascade=True),
                   rel("item", "pbc_items", required=True, cascade=True),
                   filef("files", IMG, 10 * 1024 * 1024, maxSelect=12, protected=True, thumbs=["400x300"]),
                   text("caption", max=500), boolf("liked")] + autod(),
        "listRule": f"{ADMIN} || user = @request.auth.id", "viewRule": f"{ADMIN} || user = @request.auth.id",
        "createRule": "@request.auth.id != '' && @request.body.user = @request.auth.id", "updateRule": ADMIN, "deleteRule": ADMIN,
    }
    own = lambda: {"listRule": "user = @request.auth.id", "viewRule": "user = @request.auth.id",
                   "createRule": "@request.auth.id != '' && @request.body.user = @request.auth.id",
                   "updateRule": "user = @request.auth.id", "deleteRule": "user = @request.auth.id"}
    lists = {"id": "pbc_lists", "name": "lists", "type": "base",
             "fields": [rel("user", "_pb_users_auth_", required=True, cascade=True), text("name", True, 60),
                        rel("items", "pbc_items", maxSelect=500), boolf("isDefault"), num("sort")] + autod(), **own()}
    wishes = {"id": "pbc_wishes", "name": "wishes", "type": "base",
              "fields": [rel("item", "pbc_items", required=True, cascade=True), rel("user", "_pb_users_auth_", required=True, cascade=True)] + autod(),
              "indexes": ["CREATE UNIQUE INDEX `idx_wishes_uniq` ON `wishes` (`item`, `user`)"],
              **{**own(), "listRule": f"{ADMIN} || user = @request.auth.id", "viewRule": f"{ADMIN} || user = @request.auth.id",
                 "updateRule": ADMIN, "deleteRule": f"{ADMIN} || user = @request.auth.id"}}
    known = {"id": "pbc_known", "name": "known", "type": "base",
             "fields": [rel("item", "pbc_items", required=True, cascade=True), rel("user", "_pb_users_auth_", required=True, cascade=True)] + autod(),
             "indexes": ["CREATE UNIQUE INDEX `idx_known_uniq` ON `known` (`item`, `user`)"],
             **{**own(), "listRule": f"{ADMIN} || user = @request.auth.id", "viewRule": f"{ADMIN} || user = @request.auth.id", "updateRule": None}}
    access = {"id": "pbc_access", "name": "access_requests", "type": "base",
              "fields": [text("name", True, 80), text("contact", True, 120), text("msg", max=500), sel("status", ["neu", "erledigt", "abgelehnt"]), text("website", max=200)] + autod(),
              "listRule": ADMIN, "viewRule": ADMIN, "createRule": "", "updateRule": ADMIN, "deleteRule": ADMIN}
    settings = {"id": "pbc_settings", "name": "settings", "type": "base",
                "fields": [text("owner", max=40), text("title", max=80), num("newWeeks", min=1, max=8), text("showcase", max=40), text("bggToken", max=400)] + autod(),
                "listRule": AUTHED, "viewRule": AUTHED, "createRule": None, "updateRule": ADMIN, "deleteRule": None}
    bggjobs = {"id": "pbc_bggjobs", "name": "bgg_jobs", "type": "base",
               "fields": [num("bggId", required=True), text("title", max=200), sel("status", ["wartet", "fertig", "fehler"], True),
                          rel("item", "pbc_items"), text("error", max=500), jsonf("opts", 2000)] + autod(),
               "listRule": ADMIN, "viewRule": ADMIN, "createRule": ADMIN, "updateRule": ADMIN, "deleteRule": ADMIN}
    return [users, items, loans, photos, lists, wishes, known, access, settings, bggjobs, loan_public, item_stats]

if __name__ == "__main__":
    users_fields = json.load(open(sys.argv[1]))["fields"]
    # Systemfelder behalten, E-Mail ist optional (Familie hat oft keine E-Mail im Spieleschrank)
    keep = []
    for f in users_fields:
        if f["name"] in ("avatar",): continue
        if f["name"] == "email": f["required"] = False
        keep.append(f)
    print(json.dumps({"collections": collections(keep), "deleteMissing": False}))

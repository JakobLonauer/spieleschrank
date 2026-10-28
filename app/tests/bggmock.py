# Kleiner Ersatz für die BGG-XML-API (search, thing) für lokale Tests
import http.server, urllib.parse, sys
THINGS = {
 13: ('boardgame', 'CATAN', ['Die Siedler von Catan', 'Catan'], 3, 4, 60, 120, 10, 2.29, 'Best with 4 players', [('boardgamecategory','Negotiation'),('boardgamecategory','Economic')], [('boardgameexpansion',325,'Catan: Seafarers',False)], ['strategygames','familygames']),
 325: ('boardgameexpansion', 'Catan: Seafarers', ['Catan: Seefahrer'], 3, 4, 90, 90, 10, 2.4, 'Best with 4 players', [], [('boardgameexpansion',13,'CATAN',True)], []),
 266192: ('boardgame', 'Wingspan', ['Flügelschlag'], 1, 5, 40, 70, 10, 2.45, 'Best with 3 players', [('boardgamecategory','Animals'),('boardgamemechanic','Hand Management')], [], ['strategygames']),
 178900: ('boardgame', 'Codenames', [], 2, 8, 15, 15, 14, 1.3, 'Best with 6–8 players', [('boardgamecategory','Party Game'),('boardgamecategory','Deduction')], [], ['partygames']),
}
def thing_xml(i):
    t = THINGS[i]
    names = f'<name type="primary" sortindex="1" value="{t[1]}"/>' + ''.join(f'<name type="alternate" sortindex="1" value="{n}"/>' for n in t[2])
    links = ''.join(f'<link type="{a}" id="1" value="{b}"/>' for a,b in t[10]) + ''.join(f'<link type="{a}" id="{b}" value="{c}"' + (' inbound="true"' if d else '') + '/>' for a,b,c,d in t[11])
    ranks = ''.join(f'<rank type="family" id="1" name="{r}" friendlyname="x" value="10" bayesaverage="7"/>' for r in t[12])
    return (f'<item type="{t[0]}" id="{i}"><thumbnail>https://cf.geekdo-images.com/t{i}.jpg</thumbnail><image>https://cf.geekdo-images.com/i{i}.jpg</image>{names}'
            f'<description>Line one &amp; more&#10;&#10;Second line</description><yearpublished value="1995"/><minplayers value="{t[3]}"/><maxplayers value="{t[4]}"/>'
            f'<poll-summary name="suggested_numplayers" title="x"><result name="bestwith" value="{t[9]}"/></poll-summary>'
            f'<playingtime value="{t[6]}"/><minplaytime value="{t[5]}"/><maxplaytime value="{t[6]}"/><minage value="{t[7]}"/>{links}'
            f'<statistics page="1"><ratings><ranks>{ranks}</ranks><averageweight value="{t[8]}"/></ratings></statistics></item>')
class H(http.server.BaseHTTPRequestHandler):
    def log_message(self, *a): pass
    def do_GET(self):
        u = urllib.parse.urlparse(self.path); q = urllib.parse.parse_qs(u.query)
        if self.headers.get('Authorization') != 'Bearer test-token':
            self.send_response(401); self.end_headers(); return
        if u.path.endswith('/search'):
            term = q.get('query', [''])[0].lower()
            hits = [i for i,t in THINGS.items() if term in t[1].lower() or any(term in n.lower() for n in t[2])]
            body = '<items total="%d">' % len(hits) + ''.join(f'<item type="{THINGS[i][0]}" id="{i}"><name type="primary" value="{THINGS[i][1]}"/><yearpublished value="2000"/></item>' for i in hits) + '</items>'
        elif u.path.endswith('/thing'):
            ids = [int(x) for x in q.get('id', [''])[0].split(',') if x]
            body = '<items termsofuse="x">' + ''.join(thing_xml(i) for i in ids if i in THINGS) + '</items>'
        else:
            self.send_response(404); self.end_headers(); return
        b = body.encode(); self.send_response(200); self.send_header('Content-Type','text/xml'); self.send_header('Content-Length',str(len(b))); self.end_headers(); self.wfile.write(b)
http.server.ThreadingHTTPServer(('127.0.0.1', int(sys.argv[1]) if len(sys.argv)>1 else 8099), H).serve_forever()

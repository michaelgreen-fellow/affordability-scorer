#!/usr/bin/env python3
"""
Making Ends Meet Calculator — Local CSV Editor

A local web app for editing the two calculator CSVs without hand-editing.
Run: python3 csv-editor.py
Then open: http://localhost:8001

Edits save directly to making-ends-meet-programs.csv and
making-ends-meet-assumptions.csv in the project root. If dev.py is running,
changes trigger an automatic site rebuild.
"""

import csv
import json
import os
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
from pathlib import Path

PORT = 8001
ROOT = Path(__file__).parent
PROGRAMS_CSV = ROOT / 'making-ends-meet-programs.csv'
ASSUMPTIONS_CSV = ROOT / 'making-ends-meet-assumptions.csv'

# ─── CSV helpers ──────────────────────────────────────────────────────────

def read_csv(path):
    if not path.exists():
        return {'headers': [], 'rows': []}
    with open(path, 'r', newline='') as f:
        reader = csv.reader(f)
        rows = list(reader)
    if not rows:
        return {'headers': [], 'rows': []}
    return {'headers': rows[0], 'rows': [dict(zip(rows[0], r)) for r in rows[1:]]}

def write_csv(path, headers, rows):
    # Atomic write: write to temp, then rename
    tmp = path.with_suffix(path.suffix + '.tmp')
    with open(tmp, 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(headers)
        for row in rows:
            writer.writerow([row.get(h, '') for h in headers])
    tmp.replace(path)

# ─── HTML ─────────────────────────────────────────────────────────────────

HTML = r'''<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Making Ends Meet — CSV Editor</title>
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Outfit',sans-serif;background:#EAF4FC;color:#0B1C33;padding:2rem;min-height:100vh}
.wrap{max-width:1400px;margin:0 auto}
header{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:1.25rem;flex-wrap:wrap;gap:1rem}
h1{font-family:'DM Serif Display',serif;font-size:34px;color:#0B1C33;line-height:1.05}
h1 em{color:#D4870A;font-style:italic}
.sub{font-family:'DM Mono',monospace;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:#6A8AAA;margin-top:4px}
.status{font-family:'DM Mono',monospace;font-size:10px;letter-spacing:.1em;padding:5px 10px;border-radius:4px;background:rgba(4,120,87,.12);color:#047857;opacity:0;transition:opacity .25s}
.status.show{opacity:1}
.status.err{background:rgba(185,28,28,.1);color:#B91C1C}

.tabs{display:flex;gap:6px;margin-bottom:1.25rem;border-bottom:2px solid rgba(11,28,51,.08)}
.tab{background:none;border:none;padding:10px 18px;font-family:'Outfit',sans-serif;font-size:13px;font-weight:500;color:#6A8AAA;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-2px;transition:all .18s}
.tab:hover{color:#0B1C33}
.tab.on{color:#0B1C33;border-bottom-color:#D4870A;font-weight:600}

.panel{display:none;background:rgba(255,255,255,.75);border:1px solid rgba(11,28,51,.08);border-radius:10px;padding:1.25rem}
.panel.on{display:block}

.controls{display:flex;gap:10px;margin-bottom:1rem;align-items:center;flex-wrap:wrap}
.search{padding:8px 13px;border:1px solid rgba(11,28,51,.14);border-radius:5px;font-family:'Outfit',sans-serif;font-size:12px;flex:1;min-width:180px;background:#fff;outline:none}
.search:focus{border-color:#D4870A}
.count{font-family:'DM Mono',monospace;font-size:10px;color:#6A8AAA}
.btn{background:#0B1C33;color:#fff;border:none;padding:9px 16px;border-radius:5px;font-family:'DM Mono',monospace;font-size:10px;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;transition:opacity .2s}
.btn:hover{opacity:.88}
.btn.gold{background:#D4870A}
.btn.sm{padding:5px 10px;font-size:9px}
.btn.danger{background:#B91C1C}

table{width:100%;border-collapse:collapse;font-size:12px}
thead{background:rgba(11,28,51,.04);border-bottom:1px solid rgba(11,28,51,.1)}
th{text-align:left;padding:8px 10px;font-family:'DM Mono',monospace;font-size:8px;font-weight:500;color:#6A8AAA;text-transform:uppercase;letter-spacing:.1em;white-space:nowrap;cursor:pointer;user-select:none}
th:hover{color:#0B1C33}
td{padding:7px 10px;border-bottom:1px solid rgba(11,28,51,.05);vertical-align:middle}
tr:hover td{background:rgba(11,28,51,.02)}
td.name{font-weight:600;color:#0B1C33;max-width:220px}
td input{width:100%;border:1px solid rgba(11,28,51,.12);padding:5px 7px;border-radius:3px;font-family:'Outfit',sans-serif;font-size:11px;background:#fff;outline:none}
td input:focus{border-color:#D4870A}
td.actions{white-space:nowrap;text-align:right}
td .val{display:block;padding:5px 7px;min-height:26px;font-size:11px;color:#2C4A6A}
.dirty td{background:rgba(212,135,10,.06)}
.new-row td{background:rgba(4,120,87,.06)}

.modal{display:none;position:fixed;inset:0;background:rgba(11,28,51,.5);z-index:100;align-items:center;justify-content:center;padding:1rem}
.modal.show{display:flex}
.modal-body{background:#fff;border-radius:10px;padding:1.75rem;max-width:640px;width:100%;max-height:90vh;overflow-y:auto}
.modal h2{font-family:'DM Serif Display',serif;font-size:22px;color:#0B1C33;margin-bottom:.25rem}
.modal-sub{font-family:'DM Mono',monospace;font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:#6A8AAA;margin-bottom:1.25rem}
.field{margin-bottom:.875rem}
.field label{display:block;font-family:'DM Mono',monospace;font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:#D4870A;margin-bottom:4px;font-weight:500}
.field input,.field textarea,.field select{width:100%;padding:8px 11px;border:1px solid rgba(11,28,51,.14);border-radius:5px;font-family:'Outfit',sans-serif;font-size:12px;background:#fff;outline:none}
.field input:focus,.field textarea:focus,.field select:focus{border-color:#D4870A}
.field textarea{resize:vertical;min-height:50px;font-family:inherit}
.field small{display:block;font-size:10px;color:#6A8AAA;margin-top:3px;font-style:italic}
.modal-actions{display:flex;gap:8px;justify-content:flex-end;margin-top:1.25rem;padding-top:1rem;border-top:1px solid rgba(11,28,51,.08)}
.close-x{background:none;border:none;font-size:18px;color:#6A8AAA;cursor:pointer;position:absolute;top:1rem;right:1.25rem;padding:4px 8px}
.close-x:hover{color:#0B1C33}
.modal-body{position:relative}
</style>
</head>
<body>
<div class="wrap">
  <header>
    <div>
      <h1>Making Ends Meet <em>CSV Editor</em></h1>
      <div class="sub">Local tool · Edits save directly to CSV files in project root</div>
    </div>
    <div class="status" id="status"></div>
  </header>

  <div class="tabs">
    <button class="tab on" data-tab="programs" onclick="switchTab('programs')">Programs</button>
    <button class="tab" data-tab="assumptions" onclick="switchTab('assumptions')">Assumptions</button>
  </div>

  <div class="panel on" id="panel-programs">
    <div class="controls">
      <input class="search" id="search-programs" placeholder="Search programs..." oninput="filterTable('programs')">
      <div class="count" id="count-programs"></div>
      <button class="btn gold" onclick="openAddModal('programs')">+ Add Program</button>
    </div>
    <div style="overflow-x:auto">
      <table id="table-programs"></table>
    </div>
  </div>

  <div class="panel" id="panel-assumptions">
    <div class="controls">
      <input class="search" id="search-assumptions" placeholder="Search assumptions..." oninput="filterTable('assumptions')">
      <div class="count" id="count-assumptions"></div>
      <button class="btn gold" onclick="openAddModal('assumptions')">+ Add Assumption</button>
    </div>
    <div style="overflow-x:auto">
      <table id="table-assumptions"></table>
    </div>
  </div>
</div>

<div class="modal" id="modal">
  <div class="modal-body">
    <button class="close-x" onclick="closeModal()">×</button>
    <h2 id="modal-title">Add</h2>
    <div class="modal-sub" id="modal-sub"></div>
    <div id="modal-fields"></div>
    <div class="modal-actions">
      <button class="btn" style="background:#6A8AAA" onclick="closeModal()">Cancel</button>
      <button class="btn gold" onclick="saveRow()">Save</button>
    </div>
  </div>
</div>

<script>
var DATA={programs:{headers:[],rows:[]},assumptions:{headers:[],rows:[]}};
var currentTab='programs';
var editingIndex=null;

var FIELD_HINTS={
  benefit_type:'flat | percentage_income | percentage_rent | percentage_utility | percentage_childcare | cost_offset | rent_gap',
  fight:'Earn More | Build More | Save More | Care More | Protect More',
  benefit_period:'annual | monthly | one-time',
  income_max_bracket:'under30k | 30_50k | 50_80k | 80_120k | over120k (leave blank for no cap)',
  housing_required:'renter_apt | renter_house | homeowner | unhoused (pipe-separated for OR, blank for no requirement)',
  transportation_required:'drives | transit | both | no_commute (blank for no requirement)',
  age_required:'18_24 | 25_54 | 55_64 | 65plus (blank for no requirement)',
  status_required:'veteran | disability (pipe-separated for OR, blank for no requirement)',
  family_size_required:'family_with_children | single | couple | family_2 | family_3 | single_parent (blank for no requirement)',
  ongoing:'Yes | No',
  period:'annual | monthly'
};

function loadData(){
  fetch('/api/data').then(function(r){return r.json();}).then(function(d){
    DATA=d;
    renderTable('programs');
    renderTable('assumptions');
  });
}

function switchTab(t){
  currentTab=t;
  document.querySelectorAll('.tab').forEach(function(el){el.classList.toggle('on',el.getAttribute('data-tab')===t);});
  document.querySelectorAll('.panel').forEach(function(el){el.classList.toggle('on',el.id==='panel-'+t);});
}

function renderTable(which){
  var d=DATA[which];
  var table=document.getElementById('table-'+which);
  var q=document.getElementById('search-'+which).value.toLowerCase();
  var filtered=d.rows.map(function(r,i){return {row:r,idx:i};}).filter(function(item){
    if(!q)return true;
    return Object.values(item.row).some(function(v){return (v||'').toString().toLowerCase().indexOf(q)>=0;});
  });
  document.getElementById('count-'+which).textContent=filtered.length+' of '+d.rows.length;
  var html='<thead><tr>';
  d.headers.forEach(function(h){html+='<th>'+h+'</th>';});
  html+='<th style="text-align:right">Actions</th></tr></thead><tbody>';
  filtered.forEach(function(item){
    html+='<tr>';
    d.headers.forEach(function(h){
      var v=(item.row[h]||'').toString();
      var displayV=v.length>50?v.substring(0,47)+'...':v;
      var cls=h==='name'||h==='key'?'name':'';
      html+='<td class="'+cls+'" title="'+v.replace(/"/g,'&quot;')+'">'+escapeHtml(displayV)+'</td>';
    });
    html+='<td class="actions"><button class="btn sm" onclick="openEditModal(\''+which+'\','+item.idx+')">Edit</button> <button class="btn sm danger" onclick="deleteRow(\''+which+'\','+item.idx+')">Delete</button></td>';
    html+='</tr>';
  });
  html+='</tbody>';
  table.innerHTML=html;
}

function escapeHtml(s){return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

function filterTable(which){renderTable(which);}

function openAddModal(which){
  currentTab=which;
  editingIndex=null;
  var d=DATA[which];
  buildModalFields(d.headers,{});
  document.getElementById('modal-title').textContent='Add '+(which==='programs'?'Program':'Assumption');
  document.getElementById('modal-sub').textContent='New row in '+which+'.csv';
  document.getElementById('modal').classList.add('show');
}

function openEditModal(which,idx){
  currentTab=which;
  editingIndex=idx;
  var d=DATA[which];
  var row=d.rows[idx];
  buildModalFields(d.headers,row);
  document.getElementById('modal-title').textContent='Edit '+(which==='programs'?'Program':'Assumption');
  document.getElementById('modal-sub').textContent=row.name||row.key||'Row '+(idx+1);
  document.getElementById('modal').classList.add('show');
}

function buildModalFields(headers,row){
  var html='';
  headers.forEach(function(h){
    var val=(row[h]||'').toString();
    var hint=FIELD_HINTS[h]||'';
    var tag='input';
    if(h==='description'||h==='benefit_formula'||h==='source'){tag='textarea';}
    if(tag==='textarea'){
      html+='<div class="field"><label>'+h+'</label><textarea name="'+h+'">'+escapeHtml(val)+'</textarea>';
    } else {
      html+='<div class="field"><label>'+h+'</label><input name="'+h+'" value="'+escapeHtml(val).replace(/"/g,'&quot;')+'">';
    }
    if(hint)html+='<small>'+hint+'</small>';
    html+='</div>';
  });
  document.getElementById('modal-fields').innerHTML=html;
}

function closeModal(){
  document.getElementById('modal').classList.remove('show');
  editingIndex=null;
}

function saveRow(){
  var d=DATA[currentTab];
  var newRow={};
  d.headers.forEach(function(h){
    var el=document.querySelector('#modal-fields [name="'+h+'"]');
    newRow[h]=el?el.value:'';
  });
  if(editingIndex===null){
    d.rows.push(newRow);
  } else {
    d.rows[editingIndex]=newRow;
  }
  persist(currentTab);
  closeModal();
}

function deleteRow(which,idx){
  var d=DATA[which];
  var label=d.rows[idx].name||d.rows[idx].key||'this row';
  if(!confirm('Delete "'+label+'"? This writes immediately to the CSV file.'))return;
  d.rows.splice(idx,1);
  persist(which);
}

function persist(which){
  var d=DATA[which];
  fetch('/api/save',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({which:which,headers:d.headers,rows:d.rows})
  }).then(function(r){return r.json();}).then(function(resp){
    if(resp.ok){
      showStatus('Saved to '+which+'.csv','ok');
      renderTable(which);
    } else {
      showStatus('Error: '+(resp.error||'unknown'),'err');
    }
  }).catch(function(err){
    showStatus('Save failed: '+err.message,'err');
  });
}

function showStatus(msg,kind){
  var el=document.getElementById('status');
  el.textContent=msg;
  el.classList.remove('err');
  if(kind==='err')el.classList.add('err');
  el.classList.add('show');
  setTimeout(function(){el.classList.remove('show');},2600);
}

loadData();
</script>
</body>
</html>
'''

# ─── HTTP handler ─────────────────────────────────────────────────────────

class Handler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass  # Suppress access log

    def do_GET(self):
        path = urlparse(self.path).path
        if path == '/' or path == '/index.html':
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.end_headers()
            self.wfile.write(HTML.encode('utf-8'))
        elif path == '/api/data':
            data = {
                'programs': read_csv(PROGRAMS_CSV),
                'assumptions': read_csv(ASSUMPTIONS_CSV),
            }
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(data).encode('utf-8'))
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        path = urlparse(self.path).path
        if path == '/api/save':
            length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(length).decode('utf-8')
            try:
                payload = json.loads(body)
                which = payload['which']
                headers = payload['headers']
                rows = payload['rows']
                target = PROGRAMS_CSV if which == 'programs' else ASSUMPTIONS_CSV
                write_csv(target, headers, rows)
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'ok': True}).encode('utf-8'))
                print(f'  Saved {which}.csv ({len(rows)} rows)')
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'ok': False, 'error': str(e)}).encode('utf-8'))
        else:
            self.send_response(404)
            self.end_headers()


def main():
    if not PROGRAMS_CSV.exists():
        print(f'WARNING: {PROGRAMS_CSV} does not exist. Creating empty file.')
        write_csv(PROGRAMS_CSV, ['id','name','department','fight','ongoing','description','benefit_type','benefit_amount','benefit_formula','benefit_period','income_max_bracket','housing_required','transportation_required','age_required','status_required','family_size_required'], [])
    if not ASSUMPTIONS_CSV.exists():
        print(f'WARNING: {ASSUMPTIONS_CSV} does not exist. Creating empty file.')
        write_csv(ASSUMPTIONS_CSV, ['key','value','period','source','last_updated'], [])

    server = HTTPServer(('', PORT), Handler)
    print('=' * 56)
    print('  Making Ends Meet Calculator — CSV Editor')
    print('=' * 56)
    print(f'  Serving at http://localhost:{PORT}')
    print(f'  Editing: {PROGRAMS_CSV.name}')
    print(f'           {ASSUMPTIONS_CSV.name}')
    print(f'  Press Ctrl+C to stop.\n')
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\n  Stopped.')
        server.server_close()


if __name__ == '__main__':
    main()

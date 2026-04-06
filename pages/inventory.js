var FC={'Earn More':'#6D28D9','Build More':'#047857','Save More':'#BE185D','Care More':'#C2410C','Protect More Rights':'#B45309'};
var PROGRAMS=[];
var filt=[],sk='tier',sd=1,pg=0,exp=new Set();
var PER=50;

// Parse CSV (handles quoted fields with commas inside)
function parseCSV(text){
  var lines=[];var row=[];var field='';var inQuote=false;
  for(var i=0;i<text.length;i++){
    var ch=text[i];
    if(inQuote){
      if(ch==='"'&&text[i+1]==='"'){field+='"';i++;}
      else if(ch==='"'){inQuote=false;}
      else{field+=ch;}
    } else {
      if(ch==='"'){inQuote=true;}
      else if(ch===','){row.push(field);field='';}
      else if(ch==='\n'||ch==='\r'){
        if(ch==='\r'&&text[i+1]==='\n') i++;
        row.push(field);field='';
        if(row.length>1||row[0]!=='') lines.push(row);
        row=[];
      } else {field+=ch;}
    }
  }
  if(field||row.length) {row.push(field);lines.push(row);}
  return lines;
}

fetch('inventory.csv?v='+Date.now()).then(function(r){return r.text();}).then(function(csv){
  var rows=parseCSV(csv);
  var headers=rows[0];
  for(var i=1;i<rows.length;i++){
    var obj={};
    for(var j=0;j<headers.length;j++){
      obj[headers[j]]=rows[i][j]||'';
    }
    PROGRAMS.push(obj);
  }
  filt=[].concat(PROGRAMS);
  document.getElementById('cnt').textContent=PROGRAMS.length+' programs';
  srt();rnd();
}).catch(function(err){
  console.error('Failed to load inventory.csv:',err);
  document.getElementById('tb').innerHTML='<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--text3)">Failed to load inventory data</td></tr>';
});

function tc(t){if(t==='A-List')return 'tal';if(t==='Tier 1')return 't1';if(t==='Tier 2')return 't2';return 't3';}

function fr(){
  pg=0;
  var q=document.getElementById('sq').value.toLowerCase();
  var ft=document.getElementById('st').value;
  var ff=document.getElementById('sf').value;
  filt=PROGRAMS.filter(function(p){
    return(!q||p.name.toLowerCase().indexOf(q)>=0||p.topic.toLowerCase().indexOf(q)>=0)&&(!ft||p.tier===ft)&&(!ff||p.fight===ff);
  });
  srt();rnd();
}

function sb(k){if(sk===k)sd*=-1;else{sk=k;sd=1;}srt();rnd();}

function srt(){
  var to={'A-List':0,'Tier 1':1,'Tier 2':2,'Tier 3':3};
  filt.sort(function(a,b){
    if(sk==='tier') return((to[a.tier]||9)-(to[b.tier]||9))*sd;
    return((a[sk]||'').localeCompare(b[sk]||''))*sd;
  });
}

function rnd(){
  var st=pg*PER;
  var sl=filt.slice(st,st+PER);
  document.getElementById('tb').innerHTML=sl.map(function(p,i){
    var fc=FC[p.fight]||'#6A8AAA';
    var ie=exp.has(p.name);
    return '<tr class="'+(ie?'exp':'')+'"><td><div class="pn">'+p.name+'</div><div class="pt">'+p.topic+'</div>'+(ie?'<div class="pd">'+p.desc+'</div>':'')+'</td><td><span class="tb '+tc(p.tier)+'">'+p.tier+'</span></td><td><div class="ft"><span class="fd" style="background:'+fc+'"></span>'+p.fight+'</div></td><td style="font-size:10px;color:var(--text3)">'+p.topic+'</td><td><span class="od '+(p.ongoing==='Yes'?'dy':'dn')+'"></span></td><td><button class="xb" onclick="tx(\''+p.name.replace(/'/g,"\\'")+'\')">'+(ie?'\u2212':'+')+'</button></td></tr>';
  }).join('');
  document.getElementById('cnt').textContent=filt.length+' programs';
  document.getElementById('pi').textContent='Showing '+(st+1)+'\u2013'+Math.min(st+PER,filt.length)+' of '+filt.length;
  var tp=Math.ceil(filt.length/PER);
  var pbEl=document.getElementById('pb');pbEl.innerHTML='';
  var pv=document.createElement('button');pv.className='pb';pv.textContent='\u2190';pv.disabled=pg===0;pv.onclick=function(){pg--;rnd();};pbEl.appendChild(pv);
  for(var p2=Math.max(0,pg-2);p2<=Math.min(tp-1,pg+2);p2++){
    var b=document.createElement('button');b.className='pb'+(p2===pg?' on':'');b.textContent=p2+1;
    b.onclick=(function(pp){return function(){pg=pp;rnd();};})(p2);
    pbEl.appendChild(b);
  }
  var nx=document.createElement('button');nx.className='pb';nx.textContent='\u2192';nx.disabled=pg>=tp-1;nx.onclick=function(){pg++;rnd();};pbEl.appendChild(nx);
}

function tx(n){if(exp.has(n))exp.delete(n);else exp.add(n);rnd();}
function toggleRubric(){var b=document.getElementById('rb'),l=document.getElementById('rtl');b.classList.toggle('open');l.textContent=b.classList.contains('open')?'HIDE \u2191':'SHOW \u2193';}
{{NAV_JS}}

var FC={'Earn More':'#6D28D9','Build More':'#047857','Save More':'#BE185D','Care More':'#C2410C','Protect More Rights':'#B45309'};
var FIGHTS=['Earn More','Build More','Care More','Protect More Rights','Save More'];
var N='#0B1C33';

// CSV parser (same as inventory page)
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
  if(field||row.length){row.push(field);lines.push(row);}
  return lines;
}

// Parse TPC dollar string to number
function parseTPC(s){
  if(!s) return 0;
  var n=s.replace(/[$,]/g,'');
  var v=parseFloat(n);
  return isNaN(v)?0:v;
}

// Format large numbers
function fmtB(n){
  if(n>=1e9) return '$'+(n/1e9).toFixed(2)+'B';
  if(n>=1e6) return '$'+(n/1e6).toFixed(1)+'M';
  return '$'+n.toLocaleString();
}

// Count helper
function countBy(arr,key){
  var m={};
  arr.forEach(function(p){var v=p[key]||'Unknown';m[v]=(m[v]||0)+1;});
  return m;
}

Promise.all([
  fetch('inventory.csv?v='+Date.now()).then(function(r){return r.text();}),
  fetch('content.json?v='+Date.now()).then(function(r){return r.json();})
]).then(function(results){
  var csv=results[0];
  var content=results[1];
  var db=content.dashboard;

  // Parse CSV
  var rows=parseCSV(csv);
  var headers=rows[0];
  var programs=[];
  for(var i=1;i<rows.length;i++){
    var obj={};
    for(var j=0;j<headers.length;j++){obj[headers[j]]=rows[i][j]||'';}
    programs.push(obj);
  }

  // Compute stats
  var totalPrograms=programs.length;
  var totalTPC=0;
  programs.forEach(function(p){totalTPC+=parseTPC(p.tpc);});

  var fightCounts=countBy(programs,'fight');

  // Spending by fight
  var spendByFight={};
  FIGHTS.forEach(function(f){spendByFight[f]=0;});
  programs.forEach(function(p){
    if(spendByFight.hasOwnProperty(p.fight)){
      spendByFight[p.fight]+=parseTPC(p.tpc);
    }
  });

  // Data note from content.json
  var noteEl=document.getElementById('dataNote');
  if(noteEl && db && db.dataNote) noteEl.innerHTML='<strong>Data note:</strong> '+db.dataNote;

  // Big stats (first two are dynamic, last two from content.json)
  var bigStatsEl=document.getElementById('bigStats');
  var tpcFormatted=fmtB(totalTPC);
  var tpcParts=tpcFormatted.match(/\$([\d.]+)([BM])/);
  var tpcNum=tpcParts?tpcParts[1]:'0';
  var tpcUnit=tpcParts?tpcParts[2]:'';

  var statsHtml='';
  statsHtml+='<div class="bs"><div class="bsn">$<em>'+tpcNum+'</em>'+tpcUnit+'</div><div class="bsl">Total documented program expenditure</div><div class="bsc">Sum of programs with reported TPC data</div></div>';
  statsHtml+='<div class="bs"><div class="bsn"><em>'+totalPrograms+'</em></div><div class="bsl">Active affordability programs (deduplicated)</div><div class="bsc">Across 20+ city departments</div></div>';

  // Remaining big stats from content.json
  if(db && db.bigStats){
    for(var si=2;si<db.bigStats.length;si++){
      var s=db.bigStats[si];
      statsHtml+='<div class="bs"><div class="bsn">'+s.value+'</div><div class="bsl">'+s.label+'</div><div class="bsc">'+s.caption+'</div></div>';
    }
  }
  bigStatsEl.innerHTML=statsHtml;

  // Fight strip (fully dynamic)
  var stripEl=document.getElementById('fightStrip');
  var maxFight=Math.max.apply(null,FIGHTS.map(function(f){return fightCounts[f]||0;}));
  stripEl.innerHTML=FIGHTS.map(function(f){
    var ct=fightCounts[f]||0;
    var pct=maxFight>0?Math.round((ct/maxFight)*100):0;
    return '<div class="fc"><div class="ff" style="color:'+FC[f]+'">'+f+'</div><div class="fn">'+ct+'</div><div class="fl">programs</div><div class="fb" style="background:'+FC[f]+';width:'+pct+'%"></div></div>';
  }).join('');


  // ── CHART: Total Investment by Fight ──
  Chart.defaults.color='#6A8AAA';
  Chart.defaults.borderColor='rgba(11,28,51,0.07)';
  Chart.defaults.font.family="'Outfit',sans-serif";

  new Chart(document.getElementById('investmentChart'),{
    type:'bar',
    data:{
      labels:FIGHTS,
      datasets:[{
        label:'Total Investment',
        data:FIGHTS.map(function(f){return spendByFight[f]||0;}),
        backgroundColor:FIGHTS.map(function(f){return FC[f];}),
        borderRadius:6,
        borderColor:'transparent'
      }]
    },
    options:{
      responsive:true,
      maintainAspectRatio:true,
      indexAxis:'y',
      plugins:{
        legend:{display:false},
        tooltip:{
          callbacks:{
            label:function(c){return ' '+fmtB(c.parsed.x);}
          }
        }
      },
      scales:{
        x:{
          grid:{color:'rgba(11,28,51,0.05)'},
          ticks:{color:'#6A8AAA',callback:function(v){return fmtB(v);}},
          beginAtZero:true
        },
        y:{
          grid:{display:false},
          ticks:{color:N,font:{size:12,weight:500}}
        }
      }
    }
  });

}).catch(function(err){console.error('Dashboard load error:',err);});

{{NAV_JS}}

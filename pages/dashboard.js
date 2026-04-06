var FC={'Earn More':'#6D28D9','Build More':'#047857','Save More':'#BE185D','Care More':'#C2410C','Protect More Rights':'#B45309'};
var FIGHTS=['Earn More','Build More','Care More','Protect More Rights','Save More'];
var TIERS=['A-List','Tier 1','Tier 2','Tier 3'];
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

  var tierCounts=countBy(programs,'tier');
  var fightCounts=countBy(programs,'fight');
  var topicCounts=countBy(programs,'topic');
  var ongoingCount=programs.filter(function(p){return p.ongoing==='Yes';}).length;
  var oneTimeCount=totalPrograms-ongoingCount;

  // A-List + Tier 1 by fight
  var aListByFight={};var t1ByFight={};
  FIGHTS.forEach(function(f){aListByFight[f]=0;t1ByFight[f]=0;});
  programs.forEach(function(p){
    if(p.tier==='A-List'&&aListByFight.hasOwnProperty(p.fight)) aListByFight[p.fight]++;
    if(p.tier==='Tier 1'&&t1ByFight.hasOwnProperty(p.fight)) t1ByFight[p.fight]++;
  });

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

  // Chart titles/subtitles from content.json
  if(db && db.charts){
    db.charts.forEach(function(ch,ci){
      var tEl=document.getElementById('c'+(ci+1)+'t');
      var sEl=document.getElementById('c'+(ci+1)+'s');
      if(tEl) tEl.textContent=ch.title;
      if(sEl) sEl.textContent=ch.subtitle;
    });
  }

  // C1: Program Expenditure by Fight (doughnut)
  // No tier subtitle needed anymore, spending subtitle is in template

  // Topic subtitle
  var topicKeys=Object.keys(topicCounts);
  var c3s=document.getElementById('c3s');
  if(c3s) c3s.textContent='All '+topicKeys.length+' topic categories';

  // Ongoing subtitle
  var c4s=document.getElementById('c4s');
  if(c4s) c4s.textContent=ongoingCount+' ongoing, '+oneTimeCount+' one-time or pilot';

  // ── CHARTS ──
  Chart.defaults.color='#6A8AAA';
  Chart.defaults.borderColor='rgba(11,28,51,0.07)';
  Chart.defaults.font.family="'Outfit',sans-serif";

  // C1: Program Expenditure by Fight (doughnut)
  new Chart(document.getElementById('c1'),{
    type:'doughnut',
    data:{labels:FIGHTS,datasets:[{
      data:FIGHTS.map(function(f){return spendByFight[f]||0;}),
      backgroundColor:FIGHTS.map(function(f){return FC[f]+'CC';}),
      borderColor:'rgba(255,255,255,0.9)',borderWidth:3,hoverOffset:5
    }]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:function(c){return ' '+c.label+': '+fmtB(c.parsed);}}}},cutout:'68%'}
  });

  // C2: Programs by Fight (horizontal bar)
  new Chart(document.getElementById('c2'),{
    type:'bar',
    data:{labels:FIGHTS,datasets:[{
      data:FIGHTS.map(function(f){return fightCounts[f]||0;}),
      backgroundColor:FIGHTS.map(function(f){return FC[f]+'CC';}),
      borderColor:'transparent',borderRadius:4
    }]},
    options:{responsive:true,maintainAspectRatio:false,indexAxis:'y',plugins:{legend:{display:false}},scales:{x:{grid:{color:'rgba(11,28,51,0.05)'},ticks:{color:'#6A8AAA'}},y:{grid:{display:false},ticks:{color:N,font:{size:12}}}}}
  });

  // C3: Programs by Topic Area (horizontal bar, sorted descending)
  var topicSorted=topicKeys.sort(function(a,b){return topicCounts[b]-topicCounts[a];});
  new Chart(document.getElementById('c3'),{
    type:'bar',
    data:{labels:topicSorted,datasets:[{
      data:topicSorted.map(function(t){return topicCounts[t];}),
      backgroundColor:'rgba(11,28,51,0.18)',borderColor:'rgba(11,28,51,0.45)',borderWidth:1,borderRadius:3
    }]},
    options:{responsive:true,maintainAspectRatio:false,indexAxis:'y',plugins:{legend:{display:false}},scales:{x:{grid:{color:'rgba(11,28,51,0.05)'},ticks:{color:'#6A8AAA'}},y:{grid:{display:false},ticks:{color:N,font:{size:11}}}}}
  });

  // C4: Ongoing vs One-Time (doughnut)
  new Chart(document.getElementById('c4'),{
    type:'doughnut',
    data:{labels:['Ongoing','One-time / Pilot'],datasets:[{
      data:[ongoingCount,oneTimeCount],
      backgroundColor:['#047857CC','rgba(11,28,51,0.18)'],
      borderColor:'rgba(255,255,255,0.9)',borderWidth:3,hoverOffset:5
    }]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{padding:14,color:'#6A8AAA',font:{size:11}}},tooltip:{callbacks:{label:function(c){return ' '+c.label+': '+c.parsed;}}}},cutout:'65%'}
  });

  // C5: A-List + Tier 1 by Fight (grouped bar)
  new Chart(document.getElementById('c5'),{
    type:'bar',
    data:{labels:FIGHTS,datasets:[
      {label:'A-List',data:FIGHTS.map(function(f){return aListByFight[f];}),backgroundColor:'#D4870ACC',borderRadius:3},
      {label:'Tier 1',data:FIGHTS.map(function(f){return t1ByFight[f];}),backgroundColor:'rgba(11,28,51,0.32)',borderRadius:3}
    ]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{padding:13,color:'#6A8AAA',font:{size:11}}}},scales:{x:{grid:{display:false},ticks:{color:N,font:{size:11}}},y:{grid:{color:'rgba(11,28,51,0.05)'},ticks:{color:'#6A8AAA'}}}}
  });

}).catch(function(err){console.error('Dashboard load error:',err);});

{{NAV_JS}}

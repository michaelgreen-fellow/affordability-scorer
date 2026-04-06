{{NAV_JS}}
fetch('content.json?v='+Date.now()).then(function(r){return r.json();}).then(function(d){
  var a=d.about;
  var html='';
  html+='<div class="pb"><h2>What This Is</h2><p>'+a.projectDescription+'</p><p>'+a.frameworkDescription+'</p></div>';
  html+='<div class="pb"><h2>The Scoring Rubric</h2><p>'+a.rubricDescription+'</p><ul>';
  a.tierDescriptions.forEach(function(t){html+='<li>'+t.tier+': '+t.range+' points. '+t.description+'</li>';});
  html+='</ul></div>';
  html+='<div class="pb"><h2>Primary Sources</h2><ul>';
  a.primarySources.forEach(function(s){html+='<li>'+s+'</li>';});
  html+='</ul></div>';
  html+='<div class="pb"><h2>Acknowledgments</h2><div class="acks">';
  a.acknowledgments.forEach(function(ak){html+='<div class="ack"><div class="ack-n">'+ak.name+'</div><div class="ack-r">'+ak.role+'<br>'+ak.description+'</div></div>';});
  html+='</div></div>';
  document.getElementById('aboutContent').innerHTML=html;
});

var F=[];
var sel=null;
var pillarsEl=document.getElementById('pillars');

fetch('content.json?v='+Date.now()).then(function(r){return r.json();}).then(function(data){
  data.fights.forEach(function(f){
    F.push({
      n:f.name,c:f.color,
      d:f.wheelDescription,
      s:f.stats.map(function(s){return {v:s.value,l:s.label};}),
      p:f.wheelPrograms
    });
  });

  // Populate site-level copy
  var s=data.site;
  document.getElementById('hdrByline').textContent=s.byline;
  var ht=document.getElementById('hdrTitle');
  ht.innerHTML=s.headerTitle.replace('Affordability for All','<b>Affordability for All</b>');
  document.getElementById('cpEye').textContent=s.subtitle+' \u00B7 2026';
  var ch=document.getElementById('cpH');
  ch.innerHTML=s.title.replace('Affordability for All','Affordability <em>for All</em>');
  document.getElementById('cpBody').textContent=s.overviewBody;

  // Populate fight grid in overview
  var grid=document.getElementById('cpGrid');
  data.fights.forEach(function(f,i){
    var div=document.createElement('div');
    div.className='cp-f'+(i===data.fights.length-1?' full':'');
    div.style.background=f.color;
    div.innerHTML=f.name+'<span>'+f.subtitle+'</span>';
    grid.appendChild(div);
  });

  // Build pillars
  F.forEach(function(f,i){
    var pil=document.createElement('div');
    pil.className='pillar';
    pil.setAttribute('data-i',i);
    pil.innerHTML=
      '<div class="pil-fill" style="background:linear-gradient(180deg,'+f.c+' 0%,'+f.c+'BB 100%);"></div>'+
      '<div class="pil-inner">'+
        '<div class="pil-num">0'+(i+1)+'</div>'+
        '<div class="pil-name">'+f.n+'</div>'+
        '<div class="pil-sub">'+f.n.split(' ')[0]+'</div>'+
        '<div class="pil-accent"></div>'+
      '</div>';
    pillarsEl.appendChild(pil);
  });

  // Add center label overlay
  var center=document.createElement('div');
  center.className='pillars-center';
  center.innerHTML=
    '<div class="pc-eye">'+s.subtitle+'</div>'+
    '<div class="pc-title" onclick="document.getElementById(\'cp\').classList.add(\'show\')">'+
      s.title.replace('Affordability for All','Affordability <em>for All</em>')+
    '</div>'+
    '<div class="pc-hint">hover pillars to explore</div>';
  document.querySelector('.pillars-wrap').appendChild(center);

  // Pillar click handlers
  document.querySelectorAll('.pillar').forEach(function(p){
    p.addEventListener('click',function(){
      var idx=parseInt(this.getAttribute('data-i'));
      if(sel===idx){closeAll();return;}
      sel=idx;
      pillarsEl.classList.add('has-sel');
      document.querySelectorAll('.pillar').forEach(function(pp,j){
        pp.classList.toggle('selected',j===idx);
        pp.classList.toggle('dimmed',j!==idx);
      });
      document.getElementById('cp').classList.remove('show');
      showFP(F[idx]);
    });
  });

}).catch(function(err){console.error('Failed to load content.json:',err);});

function showFP(f){
  document.getElementById('fpBar').style.background=f.c;
  document.getElementById('fpName').textContent=f.n;
  document.getElementById('fpName').style.color=f.c;
  document.getElementById('fpDesc').textContent=f.d;
  document.getElementById('fpStats').innerHTML=f.s.map(function(s){
    return '<div class="fp-stat"><div class="fp-sn" style="color:'+f.c+'">'+s.v+'</div><div class="fp-sl">'+s.l+'</div></div>';
  }).join('');
  document.getElementById('fpProgs').innerHTML=f.p.map(function(p){
    return '<div class="fp-p"><span class="fp-dot" style="background:'+f.c+'"></span>'+p+'</div>';
  }).join('');
  document.getElementById('fpMore').style.color=f.c;
  document.getElementById('fp').classList.add('show');
}

function closeFP(){
  sel=null;
  document.getElementById('fp').classList.remove('show');
  pillarsEl.classList.remove('has-sel');
  document.querySelectorAll('.pillar').forEach(function(p){
    p.classList.remove('selected','dimmed');
  });
}
function closeCP(){document.getElementById('cp').classList.remove('show');}
function closeAll(){closeFP();closeCP();}

function toggleNav(){
  var o=document.getElementById('nDr').classList.toggle('open');
  document.getElementById('ham').classList.toggle('open',o);
  document.getElementById('nOv').classList.toggle('open',o);
}
function closeNav(){
  document.getElementById('nDr').classList.remove('open');
  document.getElementById('ham').classList.remove('open');
  document.getElementById('nOv').classList.remove('open');
}

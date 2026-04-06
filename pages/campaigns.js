fetch('content.json?v='+Date.now()).then(function(r){return r.json();}).then(function(data){
  var fightIds=['earn','build','save','care','protect'];
  var FIGHTS=data.fights.map(function(f,i){
    var id=f.id;
    var progs=data.campaigns[id]||[];
    return {
      name:f.name,num:f.num,sub:f.subtitle,color:f.color,
      desc:f.campaignDescription,
      programs:progs.map(function(p){return {l:p.num,n:p.name,p:p.preview,s:p.stat,src:p.source,url:p.url};})
    };
  });

  var pEl=document.getElementById('panels');
  FIGHTS.forEach(function(f,i){
    var d=document.createElement('div');
    d.className='panel';d.setAttribute('data-i',i);
    d.innerHTML='<div class="p-fill" style="background:linear-gradient(170deg,'+f.color+' 0%,'+f.color+'CC 100%);"></div>'+
      '<div class="p-inner"><div class="p-num">'+f.num+'</div><div class="p-name">'+f.name+'</div><div class="p-sub">'+f.sub+'</div><div class="p-line"></div></div>';
    pEl.appendChild(d);
  });

  document.querySelectorAll('.panel').forEach(function(p){
    p.addEventListener('click',function(){openPopup(parseInt(this.getAttribute('data-i')));});
  });

  function openPopup(i){
    var f=FIGHTS[i];
    var pop=document.getElementById('popup');
    pop.style.background='linear-gradient(140deg,'+f.color+'F0,'+f.color+'CC)';
    document.getElementById('pLbl').textContent=f.num;
    document.getElementById('pTtl').textContent=f.name;
    document.getElementById('pDesc').textContent=f.desc;
    var gc=document.getElementById('cards');gc.innerHTML='';
    f.programs.forEach(function(pr){
      var c2=document.createElement('div');c2.className='flip';
      var df=f.color+'44',db=f.color+'55',bf=f.color+'66',bb=f.color+'77';
      c2.innerHTML='<div class="flip-c"><div class="ff" style="background:'+df+';border-color:'+bf+'">'+
        '<div><div class="c-lbl">'+pr.l+'</div><div class="c-name">'+pr.n+'</div><div class="c-prev">'+pr.p+'</div></div>'+
        '<div class="c-hint">Tap to reveal</div></div>'+
        '<div class="fb" style="background:'+db+';border-color:'+bb+'">'+
        '<div><div class="c-stat">'+pr.s+'</div><div class="c-src">'+pr.src+'<br><a href="'+pr.url+'" target="_blank" rel="noopener">View source</a></div></div>'+
        '<div class="c-hint">Tap to flip back</div></div></div>';
      gc.appendChild(c2);
    });
    gc.querySelectorAll('.flip').forEach(function(fc){
      fc.addEventListener('click',function(e){e.stopPropagation();this.querySelector('.flip-c').classList.toggle('on');});
    });
    document.getElementById('ov').classList.add('open');
  }
  window.closePopup=function(){document.getElementById('ov').classList.remove('open');};
  document.getElementById('ov').addEventListener('click',function(e){if(e.target===this)closePopup();});
  document.addEventListener('keydown',function(e){if(e.key==='Escape')closePopup();});
}).catch(function(err){console.error('Failed to load content.json:',err);});

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
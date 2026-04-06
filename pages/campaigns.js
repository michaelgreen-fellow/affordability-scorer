fetch('content.json?v='+Date.now()).then(function(r){return r.json();}).then(function(data){
  var fightIds=['earn','build','save','care','protect'];
  var FIGHTS=data.fights.map(function(f){
    var campaign=data.campaigns[f.id]||{};
    return {
      name:f.name,num:f.num,sub:f.subtitle,color:f.color,
      campaignName:campaign.name||'',
      tagline:campaign.tagline||'',
      bullets:campaign.bullets||[]
    };
  });

  var pEl=document.getElementById('panels');
  FIGHTS.forEach(function(f,i){
    var d=document.createElement('div');
    d.className='panel';d.setAttribute('data-i',i);
    d.innerHTML='<div class="p-fill" style="background:linear-gradient(170deg,'+f.color+' 0%,'+f.color+'CC 100%);"></div>'+
      '<div class="p-inner">'+
        '<div class="p-fight">'+f.name+'</div>'+
        '<div class="p-name">'+f.campaignName+'</div>'+
        '<div class="p-tagline">'+truncate(f.tagline,60)+'</div>'+
        '<div class="p-line"></div>'+
      '</div>';
    pEl.appendChild(d);
  });

  document.querySelectorAll('.panel').forEach(function(p){
    p.addEventListener('click',function(){openPopup(parseInt(this.getAttribute('data-i')));});
  });

  function openPopup(i){
    var f=FIGHTS[i];
    var pop=document.getElementById('popup');
    pop.style.background='linear-gradient(140deg,'+f.color+'F0,'+f.color+'CC)';
    document.getElementById('pFight').textContent=f.name;
    document.getElementById('pCampaign').textContent=f.campaignName;
    document.getElementById('pTagline').textContent=f.tagline;

    var bodyEl=document.getElementById('pBody');
    bodyEl.innerHTML='';
    f.bullets.forEach(function(b,idx){
      var div=document.createElement('div');
      div.className='pop-bullet';
      div.innerHTML='<span class="pop-bullet-num">'+(idx+1)+'</span>'+b;
      bodyEl.appendChild(div);
    });

    document.getElementById('ov').classList.add('open');
  }

  window.closePopup=function(){document.getElementById('ov').classList.remove('open');};
  document.getElementById('ov').addEventListener('click',function(e){if(e.target===this) closePopup();});
  document.addEventListener('keydown',function(e){if(e.key==='Escape') closePopup();});

}).catch(function(err){console.error('Failed to load content.json:',err);});

function truncate(s,n){
  if(!s||s.length<=n) return s||'';
  return s.substring(0,n).replace(/\s+\S*$/,'')+'...';
}

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

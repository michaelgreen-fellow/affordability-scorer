fetch('content.json?v='+Date.now()).then(function(r){return r.json();}).then(function(data){
  var RECS=data.recommendations.map(function(rec){
    return {
      fight:rec.fight,color:rec.color,num:rec.num,
      title:rec.title,subtitle:rec.subtitle,
      bgItems:rec.background,
      bgStat:rec.backgroundStat,
      recItems:rec.asks,
      recStat:rec.asksStat
    };
  });

  window._RECS=RECS;
  window._renderPopup=renderPopup;

  function renderPopup(){
    var r2=RECS[currentIdx];
    var pop=document.getElementById('popup');
    pop.style.background='linear-gradient(140deg,'+r2.color+'EE,'+r2.color+'CC)';
    document.getElementById('popHdr').innerHTML=
      '<div class="pop-label">'+r2.num+' / 05 &middot; '+r2.fight+'</div>'+
      '<div class="pop-title">'+r2.title+'</div>'+
      '<div class="pop-subtitle">'+r2.subtitle+'</div>';
    var bgHtml='<ul class="pop-bullets">'+r2.bgItems.map(function(item){return '<li>'+item+'</li>';}).join('')+'</ul>';
    var recHtml='<ol class="pop-numbers">'+r2.recItems.map(function(item){return '<li>'+item+'</li>';}).join('')+'</ol>';
    document.getElementById('popBody').innerHTML=
      '<div class="pop-section">'+
        '<div class="pop-sec-label">Background</div>'+
        bgHtml+
        '<div class="pop-stat">'+r2.bgStat+'</div>'+
      '</div>'+
      '<div class="pop-divider"></div>'+
      '<div class="pop-section">'+
        '<div class="pop-sec-label">The Recommendation</div>'+
        recHtml+
        '<div class="pop-stat">'+r2.recStat+'</div>'+
      '</div>';
  }

  window.openPopup=function(idx){
    currentIdx=idx;
    renderPopup();
    document.getElementById('ov').classList.add('open');
    setActive(idx);
  };
}).catch(function(err){console.error('Failed to load content.json:',err);});

var currentIdx=null;

function closePopup(e){e&&e.stopPropagation();document.getElementById('ov').classList.remove('open');currentIdx=null;
  document.querySelectorAll('.fight-item').forEach(function(fi){fi.classList.remove('faded');});
}
function handleOvClick(e){if(e.target===document.getElementById('ov'))closePopup();}
document.addEventListener('keydown',function(e){if(e.key==='Escape')closePopup();});

function setActive(idx){
  document.querySelectorAll('.fight-item').forEach(function(fi,i){fi.classList.toggle('faded',i!==idx);});
}
document.querySelectorAll('.rec-card').forEach(function(card){
  card.addEventListener('mouseenter',function(){setActive(parseInt(this.getAttribute('data-idx')));});
  card.addEventListener('mouseleave',function(){if(currentIdx===null){document.querySelectorAll('.fight-item').forEach(function(fi){fi.classList.remove('faded');});}});
});

{{NAV_JS}}
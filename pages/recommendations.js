var FIGHT_COLORS={
  'Save More':'#BE185D','Build More':'#047857','Earn More':'#6D28D9','Care More':'#C2410C','Protect More Rights':'#B45309'
};

var currentEdIdx=null;
var EDS=[];

fetch('content.json?v='+Date.now()).then(function(r){return r.json();}).then(function(data){
  EDS=data.executiveDirectives||[];

  EDS.forEach(function(ed,i){
    document.getElementById('edNum'+i).textContent=ed.num;
    document.getElementById('edName'+i).textContent=ed.title;

    var circle=document.getElementById('edCircle'+i);
    circle.style.background='linear-gradient(140deg,'+ed.color+'EE,'+ed.color+'BB)';

    var fightTags='';
    (ed.fights||[]).forEach(function(f){
      fightTags+='<span class="ehc-fight-tag" style="background:'+(FIGHT_COLORS[f]||ed.color)+'">'+f+'</span>';
    });
    document.getElementById('ehcFights'+i).innerHTML=fightTags;
    document.getElementById('ehcSummary'+i).textContent=ed.summary;

    circle.addEventListener('click',function(e){
      if(e.target.closest('.ed-hover-card')) openEdModal(i);
      else openEdModal(i);
    });
  });
}).catch(function(err){console.error('Failed to load EDs:',err);});

function openEdModal(idx){
  currentEdIdx=idx;
  var ed=EDS[idx];
  if(!ed) return;

  var hdr=document.getElementById('edModalHeader');
  hdr.style.background='linear-gradient(140deg,'+ed.color+'F0,'+ed.color+'CC)';

  var fightTags='';
  (ed.fights||[]).forEach(function(f){
    fightTags+='<span class="ed-modal-fight-tag">'+f+'</span>';
  });

  hdr.innerHTML=
    '<div class="ed-modal-hdr">'+
      '<div class="ed-seal-row">'+
        '<div class="ed-seal"><img src="seal.svg" alt="City Seal"></div>'+
        '<div><div class="ed-office">Office of the Mayor</div><div class="ed-office-sub">City of Los Angeles</div></div>'+
      '</div>'+
      '<div class="ed-modal-num">'+ed.num+'</div>'+
      '<div class="ed-modal-title">'+ed.title+'</div>'+
      '<div class="ed-modal-subtitle">'+ed.subtitle+'</div>'+
      '<div class="ed-modal-fights">'+fightTags+'</div>'+
    '</div>';

  var body=document.getElementById('edModalBody');
  var html='';

  html+='<div class="ed-body-section"><div class="ed-sec-label">Findings</div>';
  (ed.background||[]).forEach(function(b){
    html+='<div class="ed-whereas">WHEREAS, '+b+'</div>';
  });
  html+='</div>';

  html+='<div class="ed-body-section"><div class="ed-sec-label">Operative Directives</div>';
  (ed.sections||[]).forEach(function(s){
    html+='<div class="ed-section-title">'+s.title+'</div>';
    html+='<div class="ed-section-body">'+s.body+'</div>';
  });
  html+='</div>';

  html+='<div class="ed-body-section">';
  html+='<div class="ed-impl"><strong>Implementation Authority:</strong> '+ed.implementation+'</div>';
  html+='</div>';

  html+='<div class="ed-body-section">';
  html+='<div class="ed-impl"><strong>Reporting Requirement:</strong> '+ed.reporting+'</div>';
  html+='</div>';

  body.innerHTML=html;

  document.getElementById('edModalScroll').scrollTop=0;
  document.getElementById('edOverlay').classList.add('open');
}

function closeEdModal(){
  document.getElementById('edOverlay').classList.remove('open');
  currentEdIdx=null;
}

function downloadED(){
  if(currentEdIdx===null) return;
  var ed=EDS[currentEdIdx];
  if(!ed) return;

  var text='OFFICE OF THE MAYOR\nCITY OF LOS ANGELES\n\n';
  text+=ed.num.toUpperCase()+': '+ed.title.toUpperCase()+'\n';
  text+=ed.subtitle+'\n\n';
  text+='FINDINGS\n\n';
  (ed.background||[]).forEach(function(b){
    text+='WHEREAS, '+b+'\n\n';
  });
  text+='NOW, THEREFORE, I direct the following:\n\n';
  (ed.sections||[]).forEach(function(s){
    text+=s.title.toUpperCase()+'\n\n';
    text+=s.body+'\n\n';
  });
  text+='IMPLEMENTATION AUTHORITY\n\n'+ed.implementation+'\n\n';
  text+='REPORTING REQUIREMENT\n\n'+ed.reporting+'\n\n';
  text+='Mayor Karen Bass\nCity of Los Angeles\n';

  var blob=new Blob([text],{type:'text/plain'});
  var a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download=ed.id+'-draft.txt';
  a.click();
  URL.revokeObjectURL(a.href);
}

document.getElementById('edOverlay').addEventListener('click',function(e){
  if(e.target===this) closeEdModal();
});
document.addEventListener('keydown',function(e){if(e.key==='Escape') closeEdModal();});

{{NAV_JS}}

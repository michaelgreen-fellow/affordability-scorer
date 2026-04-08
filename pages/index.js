var F=[];
var sel=null,hov=null;

// Smooth animation: how far each segment is pulled out (0 to 1)
var segOffsets=[0,0,0,0,0];
var targetOffsets=[0,0,0,0,0];

// Load seal image for center
var sealImg=new Image();
sealImg.src='seal.svg';
var sealLoaded=false;
sealImg.onload=function(){sealLoaded=true;};

// Background color (must match --bg)
var BG='#EAF4FC';

Promise.all([
  fetch('content.json?v='+Date.now()).then(function(r){return r.json();}),
  fetch('config.json?v='+Date.now()).then(function(r){return r.json();})
]).then(function(results){
  var data=results[0];
  var cfg=results[1];

  // Get bg color from config
  BG=cfg.colors.bg||BG;

  data.fights.forEach(function(f){
    if(!f.wheelDescription) return; // Skip fights without wheel data
    F.push({
      n:f.name,c:f.color,
      d:f.wheelDescription,
      s:f.stats.map(function(s){return {v:s.value,l:s.label};}),
      p:f.wheelPrograms
    });
  });

  var s=data.site;
  document.getElementById('hdrByline').textContent=s.byline;
  var ht=document.getElementById('hdrTitle');
  ht.innerHTML=s.headerTitle.replace('Affordability for All','<b>Affordability for All</b>');
  document.getElementById('cpEye').textContent=s.subtitle+' \u00B7 2026';
  var ch=document.getElementById('cpH');
  ch.innerHTML=s.title.replace('Affordability for All','Affordability <em>for All</em>');
  document.getElementById('cpBody').textContent=s.overviewBody;

  // Left-side page title from content.json
  var ptEl=document.getElementById('pageTitle');
  if(ptEl && s.pageTitle) ptEl.textContent=s.pageTitle;

  // Overview fight grid
  var grid=document.getElementById('cpGrid');
  data.fights.forEach(function(f,i){
    var div=document.createElement('div');
    div.className='cp-f'+(i===data.fights.length-1?' full':'');
    div.style.background=f.color;
    div.innerHTML=f.name+'<span>'+f.subtitle+'</span>';
    grid.appendChild(div);
  });

  // Thumbnails: structure from config, text from content
  var thumbsEl=document.getElementById('thumbs');
  var thumbCfg=cfg.thumbnails||[];
  var thumbContent=s.thumbnails||{};
  if(thumbsEl && thumbCfg.length){
    thumbsEl.innerHTML='';
    thumbCfg.forEach(function(tc){
      if(tc.feature && cfg.features && !cfg.features[tc.feature]) return;
      var txt=thumbContent[tc.id]||{title:tc.id,sub:''};
      var a=document.createElement('a');
      a.className='th';a.href=tc.href;
      var prevHtml='';
      var lbl=txt.label||'';
      if(tc.style==='inventory'){
        prevHtml='<div class="th-prev" style="position:relative;background:linear-gradient(140deg,#D4EAF8,#EAF4FC)"><div style="position:absolute;top:6px;left:7px;right:7px"><div style="height:2px;background:rgba(212,135,10,.5);border-radius:1px;width:50%;margin-bottom:5px"></div><div style="display:flex;gap:2px;flex-wrap:wrap"><div style="height:5px;width:18%;background:rgba(109,40,217,.25);border-radius:1px"></div><div style="height:5px;width:14%;background:rgba(4,120,87,.25);border-radius:1px"></div><div style="height:5px;width:22%;background:rgba(190,24,93,.2);border-radius:1px"></div><div style="height:5px;width:16%;background:rgba(194,65,12,.2);border-radius:1px"></div><div style="height:5px;width:12%;background:rgba(180,83,9,.2);border-radius:1px"></div><div style="height:5px;width:20%;background:rgba(109,40,217,.15);border-radius:1px"></div><div style="height:5px;width:15%;background:rgba(4,120,87,.15);border-radius:1px"></div><div style="height:5px;width:18%;background:rgba(190,24,93,.12);border-radius:1px"></div></div></div><div style="position:absolute;bottom:6px;right:7px;font-family:var(--mono);font-size:7px;letter-spacing:.08em;color:rgba(11,28,51,.3)">'+lbl+'</div></div>';
      } else if(tc.style==='skew'){
        prevHtml='<div class="th-prev camp-p"></div>';
      } else if(tc.style==='circles'){
        prevHtml='<div class="th-prev" style="position:relative;background:linear-gradient(140deg,#EAF4FC,#D4EAF8);display:flex;align-items:center;justify-content:center"><div style="position:relative;width:36px;height:36px"><div style="position:absolute;width:16px;height:16px;border-radius:50%;background:rgba(190,24,93,.35);top:0;left:50%;transform:translateX(-50%)"></div><div style="position:absolute;width:16px;height:16px;border-radius:50%;background:rgba(4,120,87,.35);bottom:2px;left:4px"></div><div style="position:absolute;width:16px;height:16px;border-radius:50%;background:rgba(109,40,217,.35);bottom:2px;right:4px"></div></div><div style="position:absolute;bottom:6px;right:7px;font-family:var(--mono);font-size:6px;letter-spacing:.08em;color:rgba(212,135,10,.6)">'+lbl+'</div></div>';
      } else if(tc.style==='points'){
        prevHtml='<div class="th-prev" style="position:relative;background:linear-gradient(140deg,#EAF4FC,#D4EAF8)"><div style="position:absolute;top:8px;left:8px;right:8px;display:flex;flex-direction:column;gap:3px"><div style="display:flex;align-items:center;gap:4px"><div style="width:4px;height:4px;border-radius:50%;background:rgba(109,40,217,.4);flex-shrink:0"></div><div style="height:2px;background:rgba(11,28,51,.08);border-radius:1px;flex:1"></div></div><div style="display:flex;align-items:center;gap:4px"><div style="width:4px;height:4px;border-radius:50%;background:rgba(4,120,87,.4);flex-shrink:0"></div><div style="height:2px;background:rgba(11,28,51,.06);border-radius:1px;flex:1"></div></div><div style="display:flex;align-items:center;gap:4px"><div style="width:4px;height:4px;border-radius:50%;background:rgba(190,24,93,.4);flex-shrink:0"></div><div style="height:2px;background:rgba(11,28,51,.05);border-radius:1px;flex:1"></div></div><div style="display:flex;align-items:center;gap:4px"><div style="width:4px;height:4px;border-radius:50%;background:rgba(194,65,12,.4);flex-shrink:0"></div><div style="height:2px;background:rgba(11,28,51,.04);border-radius:1px;flex:1"></div></div><div style="display:flex;align-items:center;gap:4px"><div style="width:4px;height:4px;border-radius:50%;background:rgba(180,83,9,.4);flex-shrink:0"></div><div style="height:2px;background:rgba(11,28,51,.03);border-radius:1px;flex:1"></div></div></div><div style="position:absolute;bottom:6px;right:7px;font-family:var(--mono);font-size:6px;letter-spacing:.08em;color:rgba(212,135,10,.5)">'+lbl+'</div></div>';
      } else if(tc.style==='stack'){
        prevHtml='<div class="th-prev" style="position:relative;background:linear-gradient(140deg,#EAF4FC,#F5E8CC);overflow:hidden"><div style="position:absolute;bottom:6px;left:8px;right:8px;display:flex;flex-direction:column-reverse;gap:2px"><div style="height:5px;background:rgba(212,135,10,.55);border-radius:1px;width:92%"></div><div style="height:4px;background:rgba(190,24,93,.45);border-radius:1px;width:78%"></div><div style="height:4px;background:rgba(109,40,217,.4);border-radius:1px;width:64%"></div><div style="height:3px;background:rgba(4,120,87,.35);border-radius:1px;width:50%"></div><div style="height:3px;background:rgba(194,65,12,.3);border-radius:1px;width:38%"></div></div><div style="position:absolute;top:6px;right:7px;font-family:var(--mono);font-size:6px;letter-spacing:.08em;color:rgba(212,135,10,.7);font-weight:600">'+lbl+'</div></div>';
      } else if(tc.style==='initials'){
        prevHtml='<div class="th-prev contact-p"><span style="font-family:var(--serif);font-size:13px;color:rgba(11,28,51,0.18)">'+lbl+'</span></div>';
      } else {
        prevHtml='<div class="th-prev"></div>';
      }
      a.innerHTML=prevHtml+'<div class="th-body"><div class="th-ttl">'+txt.title+'</div><div class="th-sub">'+txt.sub+'</div></div>';
      thumbsEl.appendChild(a);
    });
  }
}).catch(function(err){console.error('Failed to load content.json:',err);});


var cv=document.getElementById('wc');
var cx2=cv.getContext('2d');
var W,H,cxC,cyC,oR,iR;
var SEG=Math.PI*2/5,OFF=-Math.PI/2;
var PULL=14;

function rsz(){
  W=cv.width=window.innerWidth;H=cv.height=window.innerHeight;
  cxC=W/2;cyC=H/2;
  var m=Math.min(W,H);
  oR=m*.295;iR=m*.1;
}
rsz();

function segAt(mx,my){
  var dx=mx-cxC,dy=my-cyC,d=Math.sqrt(dx*dx+dy*dy);
  if(d<iR||d>oR+PULL+14)return -1;
  var a=Math.atan2(dy,dx)-OFF;
  a=((a%(Math.PI*2))+Math.PI*2)%(Math.PI*2);
  return Math.floor(a/SEG)%5;
}

function draw(){
  // Fill background to match page
  cx2.fillStyle=BG;
  cx2.fillRect(0,0,W,H);

  // Animate offsets
  for(var i=0;i<5;i++){
    segOffsets[i]+=(targetOffsets[i]-segOffsets[i])*.14;
    if(Math.abs(segOffsets[i]-targetOffsets[i])<0.004) segOffsets[i]=targetOffsets[i];
  }

  F.forEach(function(f,i){
    var sa=OFF+i*SEG,ea=sa+SEG,mid=(sa+ea)/2;
    var isSel=sel===i;
    var pull=segOffsets[i]*PULL;
    var px=Math.cos(mid)*pull;
    var py=Math.sin(mid)*pull;
    var r=oR*(isSel?1.04:1);

    cx2.save();
    cx2.translate(px,py);

    // Shadow
    cx2.shadowColor=isSel?'rgba(11,28,51,.3)':'rgba(11,28,51,.12)';
    cx2.shadowBlur=isSel?26:8;
    cx2.shadowOffsetY=isSel?6:3;

    // Segment fill at full color, no dimming
    cx2.beginPath();cx2.moveTo(cxC,cyC);cx2.arc(cxC,cyC,r,sa,ea);cx2.closePath();
    cx2.fillStyle=f.c;
    cx2.fill();

    // Border
    cx2.shadowBlur=0;
    cx2.strokeStyle='rgba(255,255,255,.92)';
    cx2.lineWidth=isSel?3.5:2;
    cx2.stroke();

    // Glow ring on selected
    if(isSel){
      cx2.beginPath();cx2.moveTo(cxC,cyC);cx2.arc(cxC,cyC,r,sa,ea);cx2.closePath();
      cx2.strokeStyle='rgba(255,255,255,.25)';
      cx2.lineWidth=7;
      cx2.stroke();
    }

    cx2.restore();

    // Label
    var lx=cxC+px+Math.cos(mid)*oR*.65;
    var ly=cyC+py+Math.sin(mid)*oR*.65;
    var needsFlip=Math.sin(mid)>0;
    var labelRot=needsFlip?mid-Math.PI/2:mid+Math.PI/2;
    cx2.save();cx2.translate(lx,ly);
    cx2.rotate(labelRot);
    var fs=Math.max(12,oR*.108);
    var words=f.n.split(' ');
    cx2.textAlign='center';cx2.textBaseline='middle';

    cx2.font='400 '+fs+'px Outfit';
    cx2.fillStyle='rgba(255,255,255,1)';
    cx2.fillText(words[0],0,-fs*.6);
    cx2.font='700 '+(fs*1.08)+'px Outfit';
    cx2.fillText(words[1]||'',0,fs*.6);
    cx2.restore();
  });

  // Center circle: seal image with blue border
  cx2.save();
  cx2.shadowColor='rgba(11,28,51,.25)';cx2.shadowBlur=18;cx2.shadowOffsetY=4;

  // Clip to circle for the seal
  cx2.beginPath();cx2.arc(cxC,cyC,iR,0,Math.PI*2);
  cx2.fillStyle='#FFFFFF';
  cx2.fill();
  cx2.shadowBlur=0;

  // Blue border ring
  cx2.strokeStyle='rgba(30,58,138,.35)';
  cx2.lineWidth=2;
  cx2.stroke();

  // Draw seal image clipped to circle
  if(sealLoaded){
    cx2.save();
    cx2.beginPath();cx2.arc(cxC,cyC,iR-2,0,Math.PI*2);cx2.clip();
    var sealSize=iR*1.8;
    cx2.drawImage(sealImg,cxC-sealSize/2,cyC-sealSize/2,sealSize,sealSize);
    cx2.restore();
  }

  cx2.restore();
}

function loop(){requestAnimationFrame(loop);draw();}
loop();

// Hover shows panel and separates segment
cv.addEventListener('mousemove',function(e){
  var s=segAt(e.clientX,e.clientY);
  var dx=e.clientX-cxC,dy=e.clientY-cyC,d=Math.sqrt(dx*dx+dy*dy);
  cv.style.cursor=(s>=0||d<iR)?'pointer':'default';

  if(s>=0 && s!==hov){
    hov=s;
    sel=s;
    for(var i=0;i<5;i++) targetOffsets[i]=(i===s)?1:0;
    if(F.length>0){
      document.getElementById('cp').classList.remove('show');
      showFP(F[s]);
    }
  } else if(s<0 && d>=iR && hov!==null){
    hov=null;
  }
});

cv.addEventListener('mouseleave',function(){
  hov=null;
  // Reset everything: no selection, all slices back in
  sel=null;
  for(var i=0;i<5;i++) targetOffsets[i]=0;
  closeFP();
});

cv.addEventListener('click',function(e){
  var dx=e.clientX-cxC,dy=e.clientY-cyC,d=Math.sqrt(dx*dx+dy*dy);
  if(d<iR){
    closeAll();
    document.getElementById('cp').classList.add('show');
  }
});

function showFP(f){
  document.getElementById('fpBar').style.background=f.c;
  document.getElementById('fpName').textContent=f.n;
  document.getElementById('fpName').style.color=f.c;
  document.getElementById('fpDesc').textContent=f.d;
  document.getElementById('fpStats').innerHTML=f.s.map(function(s){return '<div class="fp-stat"><div class="fp-sn" style="color:'+f.c+'">'+s.v+'</div><div class="fp-sl">'+s.l+'</div></div>';}).join('');
  document.getElementById('fpProgs').innerHTML=f.p.map(function(p){return '<div class="fp-p"><span class="fp-dot" style="background:'+f.c+'"></span>'+p+'</div>';}).join('');
  document.getElementById('fpMore').style.color=f.c;
  document.getElementById('fp').classList.add('show');
}

function closeFP(){
  sel=null;
  for(var i=0;i<5;i++) targetOffsets[i]=0;
  document.getElementById('fp').classList.remove('show');
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
window.addEventListener('resize',rsz);

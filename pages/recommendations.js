var FIGHT_COLORS={
  'Save More':'#BE185D','Build More':'#047857','Earn More':'#6D28D9','Care More':'#C2410C','Protect More Rights':'#B45309'
};

var currentEdIdx=null;
var EDS=[];

fetch('content.json?v='+Date.now()).then(function(r){return r.json();}).then(function(data){
  EDS=data.executiveDirectives||[];

  EDS.forEach(function(ed,i){
    document.getElementById('edNum'+i).textContent='Executive Directive No. '+ed.num;
    document.getElementById('edName'+i).textContent=ed.title;

    var circle=document.getElementById('edCircle'+i);
    circle.style.background='linear-gradient(140deg,'+ed.color+'EE,'+ed.color+'BB)';

    var fightTags='';
    (ed.fights||[]).forEach(function(f){
      fightTags+='<span class="ehc-fight-tag" style="background:'+(FIGHT_COLORS[f]||ed.color)+'">'+f+'</span>';
    });
    document.getElementById('ehcFights'+i).innerHTML=fightTags;
    document.getElementById('ehcSummary'+i).textContent=ed.summary;

    circle.addEventListener('click',function(){openEdModal(i);});
  });
}).catch(function(err){console.error('Failed to load EDs:',err);});

function openEdModal(idx){
  currentEdIdx=idx;
  var ed=EDS[idx];
  if(!ed) return;

  var scroll=document.getElementById('edModalScroll');
  var html='<div class="ed-doc">';

  // Seal and header (page 1 style)
  html+='<div class="ed-doc-seal"><img src="seal.svg" alt="City of Los Angeles Seal"></div>';
  html+='<div class="ed-doc-org">KAREN BASS</div>';
  html+='<div class="ed-doc-office">MAYOR</div>';
  html+='<div class="ed-doc-rule"></div>';
  html+='<div class="ed-doc-title">EXECUTIVE DIRECTIVE NO. '+ed.num+'</div>';
  html+='<div class="ed-doc-date">Issue Date: '+ed.issueDate+'</div>';
  html+='<div class="ed-doc-subject"><strong>Subject:</strong>&emsp;'+ed.subject+'</div>';
  html+='<div class="ed-doc-rule2"></div>';

  // Preamble paragraphs
  (ed.preamble||[]).forEach(function(p){
    html+='<div class="ed-doc-para">'+p+'</div>';
  });

  // Directives
  (ed.directives||[]).forEach(function(d){
    html+='<div class="ed-doc-directive">';
    html+='<div class="ed-doc-dir-letter">'+d.letter+'.</div>';
    html+='<div class="ed-doc-dir-body">';
    html+='<div class="ed-doc-dir-text">'+d.text+'</div>';
    if(d.items&&d.items.length){
      html+='<ol class="ed-doc-items">';
      d.items.forEach(function(item){
        html+='<li>'+item+'</li>';
      });
      html+='</ol>';
    }
    html+='</div></div>';
  });

  // Implementation and reporting
  html+='<div class="ed-doc-impl-section">';
  html+='<div class="ed-doc-para">'+ed.implementation+'</div>';
  html+='<div class="ed-doc-para">'+ed.reporting+'</div>';
  html+='</div>';

  // Signature block
  html+='<div class="ed-doc-sig">';
  html+='<div class="ed-doc-sig-exec">Executed this _____ day of __________, 2026</div>';
  html+='<div class="ed-doc-sig-line"></div>';
  html+='<div class="ed-doc-sig-name">KAREN BASS</div>';
  html+='<div class="ed-doc-sig-title">Mayor</div>';
  html+='</div>';

  // Footer
  html+='<div class="ed-doc-footer">';
  html+='200 N. SPRING STREET, ROOM 303 LOS ANGELES, CA 90012 (213) 978-0600';
  html+='<br>MAYOR.LACITY.ORG';
  html+='</div>';

  html+='</div>';

  scroll.innerHTML=html;
  scroll.scrollTop=0;
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

  var jsPDF=window.jspdf.jsPDF;
  var doc=new jsPDF({unit:'pt',format:'letter'});
  var W=612,H=792;
  var ML=72,MR=72,MT=72,MB=72;
  var TW=W-ML-MR;
  var y=MT;
  var pageNum=1;
  var totalPages=1; // Will calculate after

  function addPageHeader(){
    if(pageNum>1){
      doc.setFont('times','normal');
      doc.setFontSize(10);
      doc.text('Mayor Karen Bass',W-MR,54,{align:'right'});
      doc.text('Executive Directive No. '+ed.num,W-MR,66,{align:'right'});
      doc.text('Page '+pageNum,W-MR,78,{align:'right'});
      y=MT+20;
    }
  }

  function checkPage(needed){
    if(y+needed>H-MB){
      doc.addPage();
      pageNum++;
      y=MT;
      addPageHeader();
    }
  }

  function wrapText(text,fontSize,fontStyle,indent){
    indent=indent||0;
    doc.setFontSize(fontSize);
    doc.setFont('times',fontStyle||'normal');
    var lines=doc.splitTextToSize(text,TW-indent);
    lines.forEach(function(line){
      checkPage(fontSize*1.4);
      doc.text(line,ML+indent,y);
      y+=fontSize*1.4;
    });
  }

  // Page 1: Title block
  doc.setFont('times','bold');
  doc.setFontSize(14);
  doc.text('KAREN BASS',W/2,y,{align:'center'});
  y+=18;
  doc.setFont('times','normal');
  doc.setFontSize(12);
  doc.text('MAYOR',W/2,y,{align:'center'});
  y+=30;

  // Rule
  doc.setLineWidth(1.5);
  doc.line(ML,y,W-MR,y);
  y+=24;

  // Title
  doc.setFont('times','bold');
  doc.setFontSize(14);
  doc.text('EXECUTIVE DIRECTIVE NO. '+ed.num,W/2,y,{align:'center'});
  y+=28;

  // Issue date
  doc.setFont('times','normal');
  doc.setFontSize(11);
  doc.text('Issue Date: '+ed.issueDate,W/2,y,{align:'center'});
  y+=24;

  // Subject
  doc.setFont('times','bold');
  doc.setFontSize(11);
  doc.text('Subject:',ML,y);
  doc.text(ed.subject,ML+70,y);
  y+=28;

  // Rule
  doc.setLineWidth(0.5);
  doc.line(ML,y,W-MR,y);
  y+=20;

  // Preamble
  (ed.preamble||[]).forEach(function(p){
    wrapText(p,11,'normal',24);
    y+=8;
  });

  // Directives
  (ed.directives||[]).forEach(function(d){
    y+=6;
    checkPage(30);
    doc.setFont('times','normal');
    doc.setFontSize(11);
    doc.text(d.letter+'.',ML+24,y);

    var dirLines=doc.splitTextToSize(d.text,TW-48);
    dirLines.forEach(function(line){
      checkPage(15);
      doc.text(line,ML+48,y);
      y+=15;
    });
    y+=4;

    if(d.items&&d.items.length){
      d.items.forEach(function(item,idx){
        checkPage(15);
        doc.text((idx+1)+'.',ML+60,y);
        var itemLines=doc.splitTextToSize(item,TW-84);
        itemLines.forEach(function(line){
          checkPage(15);
          doc.text(line,ML+84,y);
          y+=15;
        });
        y+=6;
      });
    }
  });

  // Implementation
  y+=12;
  wrapText(ed.implementation,11,'normal',24);
  y+=8;
  wrapText(ed.reporting,11,'normal',24);

  // Signature block
  y+=36;
  checkPage(80);
  doc.setFont('times','normal');
  doc.setFontSize(11);
  doc.text('Executed this _____ day of __________, 2026',W/2,y,{align:'center'});
  y+=48;
  doc.setLineWidth(0.5);
  doc.line(W/2-100,y,W/2+100,y);
  y+=16;
  doc.setFont('times','bold');
  doc.text('KAREN BASS',W/2,y,{align:'center'});
  y+=14;
  doc.setFont('times','normal');
  doc.text('Mayor',W/2,y,{align:'center'});

  // Footer on page 1
  doc.setPage(1);
  doc.setFont('times','normal');
  doc.setFontSize(8);
  doc.text('200 N. SPRING STREET, ROOM 303 LOS ANGELES, CA 90012 (213) 978-0600',W/2,H-36,{align:'center'});
  doc.text('MAYOR.LACITY.ORG',W/2,H-26,{align:'center'});

  doc.save('Executive-Directive-No-'+ed.num+'-'+ed.title.replace(/\s+/g,'-')+'.pdf');
}

document.getElementById('edOverlay').addEventListener('click',function(e){
  if(e.target===this) closeEdModal();
});
document.addEventListener('keydown',function(e){if(e.key==='Escape') closeEdModal();});

{{NAV_JS}}

// ══════════════════════════════════════════════
// Making Ends Meet Calculator
// Pure delta: how much you could be leaving on
// the table by not using city programs.
// ══════════════════════════════════════════════

var PROFILE={income:'50_80k',housing:'renter_apt',transportation:'drives',family:'single',age:'25_54',status:['neither']};
var PERIOD='annual';
var PROGRAMS=[];
var ASSUMPTIONS={};
var BRACKETS=['under30k','30_50k','50_80k','80_120k','over120k'];

// ---- CSV Parser (trims every field) ----
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
      else if(ch===','){row.push(field.trim());field='';}
      else if(ch==='\n'||ch==='\r'){
        if(ch==='\r'&&text[i+1]==='\n')i++;
        row.push(field.trim());field='';
        if(row.length>1||row[0]!=='')lines.push(row);
        row=[];
      } else {field+=ch;}
    }
  }
  if(field||row.length){row.push(field.trim());lines.push(row);}
  return lines;
}

function csvToObjects(text){
  var rows=parseCSV(text);
  if(!rows.length)return [];
  var headers=rows[0];
  var out=[];
  for(var i=1;i<rows.length;i++){
    var o={};
    for(var j=0;j<headers.length;j++){o[headers[j]]=rows[i][j]||'';}
    out.push(o);
  }
  return out;
}

function parseAssumptions(text){
  var objs=csvToObjects(text);
  var map={};
  for(var i=0;i<objs.length;i++){
    var row=objs[i];
    map[row.key]={value:parseFloat(row.value),period:row.period,source:row.source,last_updated:row.last_updated};
  }
  return map;
}

function A(key){return (ASSUMPTIONS[key]&&ASSUMPTIONS[key].value)||0;}

// ---- Format ----
function fmt(n){
  var v=Math.round(n);
  return v.toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0});
}

function showSkeleton(){
  document.getElementById('stack').innerHTML='<div class="skeleton">'+Array(6).fill('<div class="sk-band"></div>').join('')+'</div>';
}

// ---- Fetch both CSVs ----
function loadData(){
  showSkeleton();
  Promise.all([
    fetch('making-ends-meet-programs.csv?v='+Date.now()).then(function(r){if(!r.ok)throw new Error('programs');return r.text();}),
    fetch('making-ends-meet-assumptions.csv?v='+Date.now()).then(function(r){if(!r.ok)throw new Error('assumptions');return r.text();})
  ]).then(function(results){
    PROGRAMS=csvToObjects(results[0]);
    ASSUMPTIONS=parseAssumptions(results[1]);
    render();
  }).catch(function(err){
    console.error('Load failed:',err);
    document.getElementById('stack').innerHTML='<div class="err">Could not load affordability data. Check that <code>making-ends-meet-programs.csv</code> and <code>making-ends-meet-assumptions.csv</code> are published to <code>public/</code>.<br><button onclick="loadData()">Retry</button></div>';
  });
}

// ---- Selectors ----
function bindSelectors(){
  var selectorsEl=document.getElementById('selectors');
  var pills=selectorsEl.querySelectorAll('.pill');
  pills.forEach(function(btn){
    btn.addEventListener('click',function(){
      var group=btn.parentElement;
      var key=group.getAttribute('data-key');
      var val=btn.getAttribute('data-value');
      if(group.classList.contains('multi')){
        if(val==='neither'){
          group.querySelectorAll('.pill').forEach(function(b){b.classList.remove('on');});
          btn.classList.add('on');
          PROFILE.status=['neither'];
        } else {
          var neitherBtn=group.querySelector('[data-value="neither"]');
          if(neitherBtn)neitherBtn.classList.remove('on');
          btn.classList.toggle('on');
          var selected=[];
          group.querySelectorAll('.pill.on').forEach(function(b){selected.push(b.getAttribute('data-value'));});
          if(!selected.length){
            neitherBtn.classList.add('on');
            selected=['neither'];
          }
          PROFILE.status=selected;
        }
      } else {
        group.querySelectorAll('.pill').forEach(function(b){b.classList.remove('on');});
        btn.classList.add('on');
        PROFILE[key]=val;
      }
      render();
    });
  });
}

// ---- Period toggle ----
function setPeriod(p){
  PERIOD=p;
  document.querySelectorAll('.pt-btn').forEach(function(b){
    b.classList.toggle('on',b.getAttribute('data-period')===p);
  });
  render();
}

function displayAmount(annualValue,isOneTime){
  if(isOneTime)return fmt(annualValue);
  if(PERIOD==='monthly')return fmt(annualValue/12);
  return fmt(annualValue);
}

// ---- Cost calculations (used for benefit math, not displayed as stack) ----
function getIncome(){return A('income_'+PROFILE.income+'_midpoint');}

function getRent(){
  if(PROFILE.housing==='unhoused')return 0;
  var monthly;
  if(PROFILE.housing==='renter_apt'){
    monthly=(PROFILE.family==='single'||PROFILE.family==='couple')?A('la_median_rent_1br'):A('la_median_rent_2br');
  } else {
    monthly=A('la_median_rent_2br');
  }
  return monthly*12;
}

function getUtilities(){return A('utility_'+PROFILE.housing);}

function getChildcare(){
  if(PROFILE.family==='family_2')return A('childcare_family_2');
  if(PROFILE.family==='family_3')return A('childcare_family_3');
  if(PROFILE.family==='single_parent')return A('childcare_single_parent');
  return 0;
}

function hasChildren(){
  return ['family_2','family_3','single_parent'].indexOf(PROFILE.family)>=0;
}

// ---- Eligibility ----
function bracketIndex(b){return BRACKETS.indexOf(b);}

function matchField(required,userValue){
  if(!required)return true;
  var opts=required.split('|').map(function(s){return s.trim();});
  if(Array.isArray(userValue)){
    for(var i=0;i<opts.length;i++){if(userValue.indexOf(opts[i])>=0)return true;}
    return false;
  }
  return opts.indexOf(userValue)>=0;
}

function matchFamilyWithChildren(required){
  if(!required)return true;
  if(required==='family_with_children')return hasChildren();
  return PROFILE.family===required;
}

function isEligible(p){
  if(p.income_max_bracket){
    if(bracketIndex(PROFILE.income)>bracketIndex(p.income_max_bracket))return false;
  }
  if(!matchField(p.housing_required,PROFILE.housing))return false;
  if(!matchField(p.transportation_required,PROFILE.transportation))return false;
  if(!matchField(p.age_required,PROFILE.age))return false;
  if(p.status_required){
    if(PROFILE.status.indexOf('neither')>=0)return false;
    if(!matchField(p.status_required,PROFILE.status))return false;
  }
  if(!matchFamilyWithChildren(p.family_size_required))return false;
  return true;
}

// ---- Benefit calculation ----
function calcBenefit(p){
  var amt=parseFloat(p.benefit_amount)||0;
  var type=p.benefit_type;
  if(type==='flat')return amt;
  if(type==='percentage_income')return amt*getIncome();
  if(type==='percentage_rent')return amt*getRent();
  if(type==='percentage_utility')return amt*getUtilities();
  if(type==='percentage_childcare')return amt*getChildcare();
  if(type==='cost_offset')return amt;
  if(type==='rent_gap'){
    var gap=getRent()-(getIncome()*0.30);
    return Math.max(0,gap);
  }
  return 0;
}

// ---- Rendering ----
function fightClass(fight){
  var m={'Earn More':'fight-earn','Build More':'fight-build','Save More':'fight-save','Care More':'fight-care','Protect More':'fight-protect','Protect More Rights':'fight-protect'};
  return m[fight]||'fight-save';
}

function renderStack(eligible){
  var el=document.getElementById('stack');
  if(!eligible.length){
    el.innerHTML='<div class="programs-empty">No programs in our database currently match this profile. Try adjusting your income, housing, family, or status to see what becomes available.</div>';
    return;
  }
  // Sort biggest first so largest benefits sit at the top of the stack
  eligible.sort(function(a,b){return b.value-a.value;});
  // Reverse so animation plays bottom-up (smaller ones appear first, bigger ones stack on top)
  var html='';
  var ordered=eligible.slice().reverse();
  ordered.forEach(function(item,i){
    var p=item.program,value=item.value;
    var isOneTime=p.benefit_period==='one-time';
    var amountHtml='<span class="plus">+</span>'+displayAmount(value,isOneTime);
    if(isOneTime)amountHtml+='<span class="ot">one-time</span>';
    var formula=(p.benefit_formula||'').replace(/"/g,'&quot;');
    var dept=(p.department||'').replace(/"/g,'&quot;');
    html+='<div class="program-band '+fightClass(p.fight)+'" data-formula="'+formula+'" style="animation-delay:'+(i*55)+'ms">'
      +'<div class="program-left"><div class="program-label">'+p.name+'</div>'
      +'<div class="program-meta"><span class="program-fight">'+p.fight+'</span><span class="program-dept">'+dept+'</span></div></div>'
      +'<div class="program-amount">'+amountHtml+'</div></div>';
  });
  // Render in reverse visual order so biggest ends on top
  el.innerHTML='<div style="display:flex;flex-direction:column-reverse;gap:3px">'+html+'</div>';
}

function baseNoteText(eligible){
  if(!eligible.length)return 'Adjust your profile to see eligible programs stack up.';
  var childcareNote=hasChildren()?' Childcare is factored into the cost baseline for families with children.':'';
  return 'Based on your profile, these are the annual programs you could be accessing.'+childcareNote;
}

function render(){
  if(!PROGRAMS.length||!Object.keys(ASSUMPTIONS).length)return;

  var eligible=[];
  PROGRAMS.forEach(function(p){
    if(isEligible(p)){
      var v=calcBenefit(p);
      if(v>0)eligible.push({program:p,value:v});
    }
  });

  var totalSavings=eligible.reduce(function(s,e){return s+e.value;},0);

  // Hero number
  var heroEl=document.getElementById('heroAmount');
  heroEl.textContent=displayAmount(totalSavings,false);
  heroEl.classList.toggle('zero',totalSavings===0);
  document.getElementById('heroPeriod').textContent=PERIOD==='monthly'?'per month':'per year';

  // Stack
  renderStack(eligible);

  // Header counts
  document.getElementById('stackCount').textContent=eligible.length+' program'+(eligible.length===1?'':'s');
  document.getElementById('baseNote').textContent=baseNoteText(eligible);
}

// ---- PNG Export ----
function loadHtml2Canvas(){
  return new Promise(function(resolve,reject){
    if(window.html2canvas)return resolve(window.html2canvas);
    var s=document.createElement('script');
    s.src='https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
    s.onload=function(){resolve(window.html2canvas);};
    s.onerror=function(){reject(new Error('Could not load html2canvas'));};
    document.head.appendChild(s);
  });
}

function exportPNG(){
  var btn=document.getElementById('exportBtn');
  var originalText=btn.innerHTML;
  btn.disabled=true;
  btn.innerHTML='Preparing...';
  loadHtml2Canvas().then(function(h2c){
    var target=document.getElementById('exportTarget');
    return h2c(target,{backgroundColor:'#EAF4FC',scale:2,useCORS:true,logging:false});
  }).then(function(canvas){
    canvas.toBlob(function(blob){
      var url=URL.createObjectURL(blob);
      var a=document.createElement('a');
      a.href=url;
      var date=new Date().toISOString().slice(0,10);
      a.download='making-ends-meet-'+date+'.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function(){URL.revokeObjectURL(url);},1000);
      btn.disabled=false;
      btn.innerHTML=originalText;
    });
  }).catch(function(err){
    console.error('Export failed:',err);
    btn.disabled=false;
    btn.innerHTML=originalText;
    alert('Could not export PNG. Check your connection and try again.');
  });
}

// Init
bindSelectors();
loadData();

{{NAV_JS}}

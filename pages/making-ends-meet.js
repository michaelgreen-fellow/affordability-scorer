// ══════════════════════════════════════════════
// Making Ends Meet — Affordability Calculator
// Fetches two CSVs, runs profile-based eligibility,
// renders baseline + programs-applied stacks.
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

// ---- Loading skeleton ----
function showSkeleton(){
  var sk='<div class="skeleton">'+Array(7).fill('<div class="sk-band"></div>').join('')+'</div>';
  document.getElementById('stackLeft').innerHTML=sk;
  document.getElementById('stackRight').innerHTML=sk;
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
    document.getElementById('columns').innerHTML='<div class="err">Could not load affordability data. Check that <code>making-ends-meet-programs.csv</code> and <code>making-ends-meet-assumptions.csv</code> are published to <code>public/</code>.<br><button onclick="loadData()">Retry</button></div>';
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

// ---- Cost calculations ----
function getIncome(){return A('income_'+PROFILE.income+'_midpoint');}

function getTaxes(){return getIncome()*A('tax_rate_'+PROFILE.income);}

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

function personCount(){
  var m={single:1,couple:2,family_2:4,family_3:5,single_parent:2};
  return m[PROFILE.family]||1;
}
function getGroceries(){return A('food_cost_per_person')*personCount();}

function getTransportation(){
  if(PROFILE.transportation==='drives')return A('annual_driving_cost');
  if(PROFILE.transportation==='transit')return A('annual_transit_cost');
  if(PROFILE.transportation==='both')return A('annual_transit_blended');
  return 0;
}

function getHealthcare(){
  var level=(PROFILE.income==='under30k'||PROFILE.income==='30_50k')?'low':'mid';
  return A('healthcare_'+PROFILE.age+'_'+level);
}

function getCostBreakdown(){
  return [
    {label:'Taxes',amount:getTaxes()},
    {label:'Housing',amount:getRent()},
    {label:'Utilities',amount:getUtilities()},
    {label:'Groceries',amount:getGroceries()},
    {label:'Transportation',amount:getTransportation()},
    {label:'Healthcare',amount:getHealthcare()}
  ];
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
  if(required==='family_with_children'){
    return ['family_2','family_3','single_parent'].indexOf(PROFILE.family)>=0;
  }
  return PROFILE.family===required;
}

function isEligible(p){
  // Income: user bracket must be <= program cap
  if(p.income_max_bracket){
    if(bracketIndex(PROFILE.income)>bracketIndex(p.income_max_bracket))return false;
  }
  if(!matchField(p.housing_required,PROFILE.housing))return false;
  if(!matchField(p.transportation_required,PROFILE.transportation))return false;
  if(!matchField(p.age_required,PROFILE.age))return false;
  if(p.status_required){
    // Status: neither means none match
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
  if(type==='cost_offset')return amt;
  if(type==='rent_gap'){
    var gap=getRent()-(getIncome()*0.30);
    return Math.max(0,gap);
  }
  return 0;
}

// ---- Rendering ----
function renderStack(el,income,breakdown){
  var html='<div class="band band-gross"><span class="band-label">Gross Income</span><span class="band-amount">'+displayAmount(income,false)+'</span></div>';
  breakdown.forEach(function(c){
    html+='<div class="band band-cost"><span class="band-label">'+c.label+'</span><span class="band-amount">-'+displayAmount(c.amount,false)+'</span></div>';
  });
  el.innerHTML=html;
}

function renderLeftover(el,noteEl,value){
  var cls=value<0?'neg':(value>0?'pos':'');
  el.innerHTML='<span class="leftover-label">Left Over</span><span class="leftover-amount '+cls+'">'+displayAmount(value,false)+'</span>';
  if(noteEl){
    if(value<0){
      noteEl.textContent='Most Angelenos at this income level spend more than they earn before any programs apply.';
    } else {
      noteEl.textContent='';
    }
  }
}

function fightClass(fight){
  var m={'Earn More':'fight-earn','Build More':'fight-build','Save More':'fight-save','Care More':'fight-care','Protect More':'fight-protect','Protect More Rights':'fight-protect'};
  return m[fight]||'fight-save';
}

function renderPrograms(eligible){
  var el=document.getElementById('programsRight');
  if(!eligible.length){
    el.innerHTML='<div class="programs-empty">No programs in our database currently match this profile. Try adjusting your income, housing, or status.</div>';
    document.getElementById('rightSub').textContent='0 programs apply';
    return;
  }
  var html='';
  eligible.forEach(function(item,i){
    var p=item.program,value=item.value;
    var isOneTime=p.benefit_period==='one-time';
    var amountHtml=displayAmount(value,isOneTime)+(isOneTime&&PERIOD==='monthly'?'<span class="ot">one-time</span>':'');
    var formula=(p.benefit_formula||'').replace(/"/g,'&quot;');
    html+='<div class="program-band '+fightClass(p.fight)+'" data-formula="'+formula+'" style="animation-delay:'+(i*60)+'ms">'
      +'<div><div class="program-label">'+p.name+'</div><div class="program-fight">'+p.fight+'</div></div>'
      +'<div class="program-amount">+'+amountHtml+'</div></div>';
  });
  el.innerHTML=html;
  document.getElementById('rightSub').textContent=eligible.length+' program'+(eligible.length===1?'':'s')+' apply';
}

function profileSentence(){
  var inc={'under30k':'under $30k','30_50k':'$30k-$50k','50_80k':'$50k-$80k','80_120k':'$80k-$120k','over120k':'over $120k'}[PROFILE.income];
  var house={renter_apt:'renter',renter_house:'renter (house)',homeowner:'homeowner',unhoused:'unhoused Angeleno'}[PROFILE.housing];
  var fam={single:'single',couple:'couple',family_2:'family with 2 kids',family_3:'family with 3+ kids',single_parent:'single parent'}[PROFILE.family];
  var age={'18_24':'age 18-24','25_54':'age 25-54','55_64':'age 55-64','65plus':'age 65+'}[PROFILE.age];
  var trans={drives:'drives',transit:'takes transit',both:'both drives and transit',no_commute:'does not commute'}[PROFILE.transportation];
  var status='';
  if(PROFILE.status.indexOf('neither')<0){
    var parts=[];
    if(PROFILE.status.indexOf('veteran')>=0)parts.push('veteran');
    if(PROFILE.status.indexOf('disability')>=0)parts.push('with a disability');
    if(parts.length)status=', '+parts.join(' ');
  }
  return 'A '+fam+' '+house+' earning '+inc+' who '+trans+', '+age+status+'.';
}

function renderSummary(eligible,baselineLeft,programsLeft){
  var totalSavings=0;
  eligible.forEach(function(e){totalSavings+=e.value;});
  var html='<div class="sum-profile">'+profileSentence()+'</div>'
    +'<div class="sum-stat"><span class="sum-label">Programs Apply</span><span class="sum-value">'+eligible.length+'</span></div>'
    +'<div class="sum-stat"><span class="sum-label">Annual Savings</span><span class="sum-value pos">'+fmt(totalSavings)+'</span></div>'
    +'<div class="sum-stat"><span class="sum-label">With Programs</span><span class="sum-value">'+fmt(programsLeft)+'</span></div>';
  document.getElementById('summary').innerHTML=html;
}

function render(){
  if(!PROGRAMS.length||!Object.keys(ASSUMPTIONS).length)return;
  var income=getIncome();
  var breakdown=getCostBreakdown();
  var totalCosts=breakdown.reduce(function(s,c){return s+c.amount;},0);
  var baselineLeft=income-totalCosts;

  renderStack(document.getElementById('stackLeft'),income,breakdown);
  renderStack(document.getElementById('stackRight'),income,breakdown);
  renderLeftover(document.getElementById('leftoverLeft'),document.getElementById('leftoverNoteLeft'),baselineLeft);

  // Eligibility
  var eligible=[];
  PROGRAMS.forEach(function(p){
    if(isEligible(p)){
      var v=calcBenefit(p);
      if(v>0)eligible.push({program:p,value:v});
    }
  });
  // Sort by value desc for visual impact
  eligible.sort(function(a,b){return b.value-a.value;});

  renderPrograms(eligible);

  var totalSavings=eligible.reduce(function(s,e){return s+e.value;},0);
  var programsLeft=baselineLeft+totalSavings;
  renderLeftover(document.getElementById('leftoverRight'),null,programsLeft);

  // Savings counter
  var sc=document.getElementById('savingsCounter');
  sc.innerHTML='<span class="sc-label">Total Annual Savings</span><span class="sc-amount">'+fmt(totalSavings)+'</span>';

  renderSummary(eligible,baselineLeft,programsLeft);
}

// Init
bindSelectors();
loadData();

{{NAV_JS}}

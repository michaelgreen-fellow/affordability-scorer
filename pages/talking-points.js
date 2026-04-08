{{NAV_JS}}

// Fetch content.json for fight metadata and talking-points.csv for points
Promise.all([
  fetch('content.json?v='+Date.now()).then(function(r){return r.json();}),
  fetch('talking-points.csv?v='+Date.now()).then(function(r){return r.text();})
]).then(function(results){
  var content = results[0];
  var csvText = results[1];

  // Parse CSV
  var lines = csvText.trim().split('\n');
  var tpDB = {};
  lines.slice(1).forEach(function(line){
    var parts = [];
    var current = '';
    var inQuotes = false;
    for(var i=0;i<line.length;i++){
      var char = line[i];
      if(char==='"'){
        inQuotes = !inQuotes;
      } else if(char===',' && !inQuotes){
        parts.push(current.replace(/^"|"$/g,''));
        current = '';
      } else {
        current += char;
      }
    }
    parts.push(current.replace(/^"|"$/g,''));
    if(parts.length>=3){
      var fightId = parts[0].trim();
      if(!tpDB[fightId]) tpDB[fightId] = [];
      tpDB[fightId].push(parts[2]);
    }
  });

  // Page header text
  document.getElementById('tpEye').textContent = content.site.subtitle || 'Mayor Karen Bass';
  document.getElementById('tpDesc').textContent = 'The Five Fights. What the Mayor says when constituents ask what are you doing about affordability.';

  // State: current index per fight
  var state = {};
  content.fights.forEach(function(f){ state[f.id] = 0; });

  // Build cards
  var grid = document.getElementById('tpGrid');
  grid.innerHTML = '';

  content.fights.forEach(function(fight){
    var points = tpDB[fight.id] || ['No talking points loaded.'];
    state[fight.id] = 0;

    var card = document.createElement('div');
    card.className = 'tp-card';
    card.setAttribute('data-fight', fight.id);

    card.innerHTML =
      '<div class="tp-bar" style="background:'+fight.color+'"></div>' +
      '<div class="tp-card-top">' +
        '<div class="tp-fight-name">'+fight.name+'</div>' +
        '<div class="tp-fight-sub">'+fight.subtitle+'</div>' +
      '</div>' +
      '<div class="tp-text-wrap">' +
        '<div class="tp-text" id="text-'+fight.id+'">'+points[0]+'</div>' +
      '</div>' +
      '<div class="tp-nav">' +
        '<button class="tp-arrow" id="prev-'+fight.id+'" aria-label="Previous talking point">' +
          '<svg viewBox="0 0 24 24"><polyline points="15,18 9,12 15,6"/></svg>' +
        '</button>' +
        '<div class="tp-dots" id="dots-'+fight.id+'"></div>' +
        '<button class="tp-arrow" id="next-'+fight.id+'" aria-label="Next talking point">' +
          '<svg viewBox="0 0 24 24"><polyline points="9,18 15,12 9,6"/></svg>' +
        '</button>' +
      '</div>';

    grid.appendChild(card);

    // Build dots
    buildDots(fight.id, points.length, fight.color);

    // Wire arrows
    document.getElementById('prev-'+fight.id).addEventListener('click', function(){
      var cur = state[fight.id];
      var next = (cur - 1 + points.length) % points.length;
      animateCard(fight.id, points, cur, next, 'prev');
      state[fight.id] = next;
    });

    document.getElementById('next-'+fight.id).addEventListener('click', function(){
      var cur = state[fight.id];
      var next = (cur + 1) % points.length;
      animateCard(fight.id, points, cur, next, 'next');
      state[fight.id] = next;
    });
  });

}).catch(function(err){
  document.getElementById('tpGrid').innerHTML =
    '<div class="tp-loading">Could not load talking points. Make sure talking-points.csv is in the public folder.</div>';
  console.error('Talking points load error:', err);
});

function buildDots(fightId, count, color){
  var container = document.getElementById('dots-'+fightId);
  container.innerHTML = '';
  for(var i=0;i<count;i++){
    var dot = document.createElement('div');
    dot.className = 'tp-dot' + (i===0?' active':'');
    dot.style.setProperty('--fight-color', color);
    container.appendChild(dot);
  }
}

function updateDots(fightId, activeIdx, color){
  var dots = document.getElementById('dots-'+fightId).querySelectorAll('.tp-dot');
  dots.forEach(function(d,i){
    d.className = 'tp-dot' + (i===activeIdx?' active':'');
    d.style.setProperty('--fight-color', color);
  });
}

function animateCard(fightId, points, fromIdx, toIdx, direction){
  var textEl = document.getElementById('text-'+fightId);
  var exitClass = direction === 'next' ? 'exit-left' : 'exit-right';
  var enterClass = direction === 'next' ? 'enter-left' : 'enter-right';

  // Exit current
  textEl.className = 'tp-text ' + exitClass;

  setTimeout(function(){
    // Swap text and enter
    textEl.textContent = points[toIdx];
    textEl.className = 'tp-text ' + enterClass;

    // Reset class after animation
    setTimeout(function(){
      textEl.className = 'tp-text';
    }, 240);

    // Get fight color for dots
    var card = document.querySelector('[data-fight="'+fightId+'"]');
    var bar = card ? card.querySelector('.tp-bar') : null;
    var color = bar ? bar.style.background : '#0B1C33';
    updateDots(fightId, toIdx, color);

  }, 200);
}

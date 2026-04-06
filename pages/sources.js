{{NAV_JS}}

var allSources = [];

// Fetch content.json and sources.csv
Promise.all([
  fetch('content.json?v='+Date.now()).then(function(r){return r.json();}),
  fetch('sources.csv?v='+Date.now()).then(function(r){return r.text();})
]).then(function(results){
  var content = results[0];
  var csvText = results[1];

  // Parse CSV
  var lines = csvText.trim().split('\n');
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
    if(parts.length>=5){
      allSources.push({
        title: parts[0].trim(),
        url: parts[1].trim(),
        description: parts[2].trim(),
        where_used: parts[3].trim(),
        category: parts[4].trim()
      });
    }
  });

  // Header text
  document.getElementById('srcEye').textContent = content.site.subtitle || 'Mayor Karen Bass';
  document.getElementById('srcDesc').textContent = 'Research sources, data, and references supporting Affordability for All. All links are public and paywall-free.';

  // Render table
  renderTable(allSources);

  // Wire search and filter
  document.getElementById('srcSearch').addEventListener('keyup', applyFilters);
  document.getElementById('srcCategory').addEventListener('change', applyFilters);

}).catch(function(err){
  document.getElementById('srcTable').innerHTML =
    '<div class="src-loading">Could not load sources. Make sure sources.csv is in the public folder.</div>';
  console.error('Sources load error:', err);
});

function renderTable(sources){
  if(sources.length===0){
    document.getElementById('srcTable').innerHTML =
      '<div class="src-loading">No sources found.</div>';
    return;
  }

  var html = '<div class="src-table-wrap"><div class="src-row header">'+
    '<div class="src-cell header">Title</div>'+
    '<div class="src-cell header">Category</div>'+
    '<div class="src-cell header">Where Used</div>'+
    '<div class="src-cell header"></div>'+
    '</div>';

  sources.forEach(function(src){
    html += '<div class="src-row">'+
      '<div class="src-cell"><a href="'+escapeHtml(src.url)+'" target="_blank" rel="noopener" class="src-title-link">'+escapeHtml(src.title)+'</a><div style="font-size:11px;color:var(--text3);margin-top:.3rem;font-family:var(--mono)">'+escapeHtml(src.url.replace(/https?:\/\//,''))+'</div><div style="font-size:12px;color:var(--text2);margin-top:.5rem;line-height:1.6">'+escapeHtml(src.description)+'</div></div>'+
      '<div class="src-cell"><span class="src-category">'+escapeHtml(src.category)+'</span></div>'+
      '<div class="src-cell src-where">'+escapeHtml(src.where_used)+'</div>'+
      '<div class="src-cell" style="display:flex;align-items:center;justify-content:center;padding:1rem"><a href="'+escapeHtml(src.url)+'" target="_blank" rel="noopener" title="Open in new tab" style="width:24px;height:24px;display:flex;align-items:center;justify-content:center;border-radius:50%;border:1px solid rgba(11,28,51,.15);color:var(--text3);text-decoration:none;font-size:14px;transition:all .18s">→</a></div>'+
      '</div>';
  });
  html += '</div>';
  document.getElementById('srcTable').innerHTML = html;
}

function applyFilters(){
  var searchVal = document.getElementById('srcSearch').value.toLowerCase();
  var categoryVal = document.getElementById('srcCategory').value;

  var filtered = allSources.filter(function(src){
    var matchSearch = !searchVal ||
      src.title.toLowerCase().indexOf(searchVal)>-1 ||
      src.description.toLowerCase().indexOf(searchVal)>-1 ||
      src.where_used.toLowerCase().indexOf(searchVal)>-1 ||
      src.category.toLowerCase().indexOf(searchVal)>-1;

    var matchCategory = !categoryVal || src.category === categoryVal;

    return matchSearch && matchCategory;
  });

  renderTable(filtered);
}

function escapeHtml(text){
  var map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g,function(m){return map[m];});
}

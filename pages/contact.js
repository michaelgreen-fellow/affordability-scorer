{{NAV_JS}}
fetch('content.json?v='+Date.now()).then(function(r){return r.json();}).then(function(d){
  var c=d.contact;
  var parts=c.name.split(' ');
  var first=parts[0];
  var rest=parts.slice(1).join(' ');
  document.getElementById('contactCard').innerHTML=
    '<div class="eye" style="justify-content:center">Get in touch</div>'+
    '<div class="name">'+first+'<br><em>'+rest+'</em></div>'+
    '<div class="tl">'+c.title+'<br>'+c.organization+'<br>'+c.location+'</div>'+
    '<div class="div"></div>'+
    '<div class="el">Email</div>'+
    '<a class="ea" href="mailto:'+c.email+'">'+c.email+'</a>'+
    '<p class="ctx">'+c.description+'</p>'+
    '<div class="lks">'+
      '<a class="lk" href="index.html">&rarr; Five Fights</a>'+
      '<a class="lk" href="inventory.html">&rarr; Inventory</a>'+
      '<a class="lk" href="dashboard.html">&rarr; Dashboard</a>'+
      '<a class="lk" href="recommendations.html">&rarr; Policy Shortlist</a>'+
      '<a class="lk" href="about.html">&rarr; About</a>'+
    '</div>';
});

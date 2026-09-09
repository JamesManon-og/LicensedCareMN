
(function(){
  var data = window.COMPANY_DATA.slice();
  var tbody = document.getElementById("companyTableBody");
  var filterInput = document.getElementById("companyFilter");
  var emptyEl = document.getElementById("companyEmpty");
  var countEl = document.getElementById("companyCount");
  var sortKey = "n_locations", sortDir = -1;

  function escapeHtml(s){ return (s||"").replace(/[&<>"']/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]; }); }

  function tierPill(t){
    if (t === "B") return '<span class="tier-pill b">Tier B</span>';
    if (t === "C") return '<span class="tier-pill c">Tier C</span>';
    return '<span class="tier-pill" style="background:oklch(93% 0.03 305);color:var(--tier-a);">Tier A</span>';
  }

  function statusSummary(r){
    var parts = [];
    if (r.active) parts.push(r.active + ' active');
    if (r.caution) parts.push(r.caution + ' provisional');
    if (r.critical) parts.push(r.critical + ' not licensed');
    return parts.join(', ') || '&mdash;';
  }

  function render(){
    var q = filterInput.value.trim().toLowerCase();
    var rows = data.filter(function(r){ return !q || r.name.toLowerCase().indexOf(q) !== -1; });
    rows.sort(function(a,b){
      var av = a[sortKey], bv = b[sortKey];
      if (typeof av === "string") return sortDir * av.localeCompare(bv);
      return sortDir * (av - bv);
    });
    tbody.innerHTML = rows.map(function(r){
      return '<tr><td style="font-weight:700;color:var(--ink);">' + escapeHtml(r.name) + '</td>' +
        '<td>' + tierPill(r.tier) + '</td>' +
        '<td class="tabular">' + r.n_locations + '</td>' +
        '<td style="max-width:260px;">' + escapeHtml(r.counties.join(', ')) + '</td>' +
        '<td>' + statusSummary(r) + '</td></tr>';
    }).join('');
    emptyEl.style.display = rows.length ? 'none' : 'block';
    countEl.textContent = rows.length + ' of ' + data.length + ' companies';
  }

  filterInput.oninput = render;
  document.querySelectorAll('th[data-sort]').forEach(function(th){
    th.onclick = function(){
      var k = th.dataset.sort;
      if (sortKey === k) { sortDir *= -1; } else { sortKey = k; sortDir = (k === "name") ? 1 : -1; }
      render();
    };
  });
  render();
})();

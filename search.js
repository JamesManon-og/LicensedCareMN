
const STATUS_LABEL = {active:"Active License", caution:"Provisional / Conditional", critical:"Not Currently Licensed"};
const ICONS = {
  "check-circle": '<path d="M8.2 12.3l2.5 2.5 5-5.4"/><circle cx="12" cy="12" r="9" style="display:none"/>',
};
let ALL = [];
let selectedTags = new Set();
let selectedCounty = "";
let statusMode = "active";
let query = "";

function escapeHtml(s){ return (s||"").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }

function cardHtml(l){
  const tagline = l.tags.slice(0,2).join(" · ") || "Community Residential Setting";
  const statusClass = l.status_class;
  const statusIcon = statusClass === "active"
    ? '<circle cx="12" cy="12" r="9"/><path d="M8.2 12.3l2.5 2.5 5-5.4"/>'
    : '<path d="M12 3.5 21.5 20h-19L12 3.5Z"/><line x1="12" y1="9.5" x2="12" y2="13.5"/><circle cx="12" cy="16.3" r="0.9" fill="currentColor" stroke="none"/>';
  return `
  <div class="bcard">
    <div class="avatar-init">${escapeHtml(l.program_name.slice(0,2).toUpperCase())}</div>
    <div style="flex:1;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
        <div>
          <div class="bcard-title">${escapeHtml(l.program_name)}</div>
          <div class="bcard-meta">${escapeHtml(tagline)} &middot; ${escapeHtml(l.city)}, ${escapeHtml(l.county)} County</div>
        </div>
      </div>
      <div class="bcard-tags">
        <div class="badge badge-dhs"><svg class="icon" style="width:12px;height:12px" viewBox="0 0 24 24" fill="none"><path d="M12 3l7 3v5c0 5-3.2 8.5-7 10-3.8-1.5-7-5-7-10V6l7-3Z"/><path d="M8.7 12.2l2.3 2.3 4.3-4.6"/></svg>DHS-Verified</div>
        <div class="status status-${statusClass}"><svg class="icon" style="width:12px;height:12px" viewBox="0 0 24 24" fill="none">${statusIcon}</svg>${STATUS_LABEL[statusClass]}</div>
        <div class="badge badge-unverified">Unclaimed</div>
      </div>
      <div class="bcard-cta">
        <a class="btn-primary" href="profiles/${l.slug}.html">View profile</a>
        <a class="btn-secondary" href="tel:${escapeHtml((l.phone||"").replace(/[^0-9+]/g,""))}"><svg class="icon" style="width:14px;height:14px" viewBox="0 0 24 24" fill="none"><path d="M7 3.5H4.5A1.5 1.5 0 0 0 3 5c0 9.4 7.6 17 17 17a1.5 1.5 0 0 0 1.5-1.5V18c0-.6-.4-1.1-1-1.2-1.2-.3-2.3-.7-3.4-1.2-.5-.2-1 0-1.4.4l-1.7 1.7a15.3 15.3 0 0 1-6.2-6.2l1.7-1.7c.4-.4.5-.9.4-1.4a12 12 0 0 1-1.2-3.4c-.1-.6-.6-1-1.2-1Z"/></svg>${escapeHtml(l.phone||"")}</a>
      </div>
    </div>
  </div>`;
}

function applyFilters(){
  let out = ALL;
  if (statusMode === "active") out = out.filter(l => l.status_class === "active");
  if (selectedTags.size) out = out.filter(l => l.tags.some(t => selectedTags.has(t)));
  if (selectedCounty) out = out.filter(l => l.county === selectedCounty);
  if (query.trim()){
    const q = query.trim().toLowerCase();
    out = out.filter(l => (l.program_name + " " + l.company + " " + l.city + " " + l.county).toLowerCase().includes(q));
  }
  return out;
}

function renderChips(){
  const el = document.getElementById("activeChips");
  const chips = [];
  if (query.trim()) chips.push({label: `"${query.trim()}"`, clear: () => { query=""; document.getElementById("q").value=""; }});
  selectedTags.forEach(t => chips.push({label: t, clear: () => { selectedTags.delete(t); render(); }}));
  if (selectedCounty) chips.push({label: selectedCounty + " County", clear: () => { selectedCounty=""; document.getElementById("countySel").value=""; }});
  if (statusMode === "active") chips.push({label: "Active license", clear: () => { statusMode="any"; document.querySelector('input[name=status][value=any]').checked = true; }});
  el.innerHTML = chips.map((c,i) => `<span class="chip" data-i="${i}">${escapeHtml(c.label)} &times;</span>`).join("");
  [...el.children].forEach((node, i) => node.onclick = () => { chips[i].clear(); render(); });
}

function render(){
  const filtered = applyFilters();
  document.getElementById("resultCount").textContent = `${filtered.length} provider${filtered.length===1?"":"s"} match your search`;
  document.getElementById("results").innerHTML = filtered.map(cardHtml).join("");
  document.getElementById("empty").style.display = filtered.length ? "none" : "block";
  renderChips();
}

function init(locations){
  ALL = locations;
  const counties = [...new Set(locations.map(l=>l.county))].sort();
  const countySel = document.getElementById("countySel");
  counties.forEach(c => { const o=document.createElement("option"); o.value=c; o.textContent = c + " County"; countySel.appendChild(o); });

  const tags = [...new Set(locations.flatMap(l=>l.tags))].sort();
  const tagBox = document.getElementById("tagFilters");
  tagBox.innerHTML = tags.map(t => `<label style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--ink-2);padding:5px 0;"><input type="checkbox" data-tag="${escapeHtml(t)}"> ${escapeHtml(t)}</label>`).join("");
  tagBox.querySelectorAll("input[type=checkbox]").forEach(cb => cb.onchange = () => {
    if (cb.checked) selectedTags.add(cb.dataset.tag); else selectedTags.delete(cb.dataset.tag);
    render();
  });

  document.getElementById("q").oninput = (e) => { query = e.target.value; render(); };
  countySel.onchange = (e) => { selectedCounty = e.target.value; render(); };
  document.querySelectorAll('input[name=status]').forEach(r => r.onchange = (e) => { statusMode = e.target.value; render(); });
  document.getElementById("clearBtn").onclick = () => {
    selectedTags.clear(); selectedCounty=""; statusMode="active"; query="";
    document.getElementById("q").value = "";
    countySel.value = "";
    tagBox.querySelectorAll("input").forEach(cb=>cb.checked=false);
    document.querySelector('input[name=status][value=active]').checked = true;
    render();
  };

  const params = new URLSearchParams(location.search);
  if (params.get("q")) { query = params.get("q"); document.getElementById("q").value = query; }
  if (params.get("tag")) { const t = params.get("tag"); if (tags.includes(t)) { selectedTags.add(t); tagBox.querySelector(`input[data-tag="${t}"]`).checked = true; } }
  if (params.get("county")) { const c = params.get("county"); if (counties.includes(c)) { selectedCounty = c; countySel.value = c; } }

  render();
}

if (window.LOCATIONS_DATA) {
  init(window.LOCATIONS_DATA);
} else {
  fetch("data/locations.json").then(r => r.json()).then(init);
}

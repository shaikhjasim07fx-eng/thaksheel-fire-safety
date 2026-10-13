const $ = s => document.querySelector(s);
const status = $('#adminStatus');
let adminKey = sessionStorage.getItem('thaksheelAdminKey') || '';
if (adminKey) $('#adminKey').value = adminKey;
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function api(path, options={}) {
  const res = await fetch(path, {...options, headers:{'Content-Type':'application/json','Authorization':`Bearer ${adminKey}`,...(options.headers||{})}});
  const data = await res.json().catch(()=>({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}
function reviewTable(rows) {
  if (!rows.length) return '<p>No reviews submitted yet.</p>';
  return `<table class="admin-table"><thead><tr><th>Review</th><th>Status</th><th>Actions</th></tr></thead><tbody>${rows.map(r=>`<tr><td><b>${esc(r.rating)} / 5 stars</b><br>${esc(r.display_name||'Anonymous')} · ${esc(r.service_type)}<p>${esc(r.comment)}</p><small>${esc(r.created_at)} · public consent: ${r.publish_consent?'yes':'no'}</small></td><td>${esc(r.status)}</td><td><div class="admin-actions"><button class="approve" data-review="${r.id}" data-status="approved">Approve</button><button data-review="${r.id}" data-status="rejected">Reject</button><button data-review="${r.id}" data-status="pending">Reset</button></div></td></tr>`).join('')}</tbody></table>`;
}
function enquiryTable(rows) {
  if (!rows.length) return '<p>No enquiries stored yet.</p>';
  return `<table class="admin-table"><thead><tr><th>Enquiry</th><th>Contact</th></tr></thead><tbody>${rows.map(r=>`<tr><td><b>${esc(r.enquiry_type)}</b><br>${esc(r.message)}<p><small>${esc(r.created_at)} · ${esc(r.status)}</small></p></td><td>${esc(r.name)}<br>${esc(r.company)}<br>${esc(r.phone)}<br>${esc(r.email)}</td></tr>`).join('')}</tbody></table>`;
}
async function loadDashboard() {
  status.textContent='Loading database records…'; status.classList.remove('admin-error');
  try {
    const [reviews,enquiries] = await Promise.all([api('/api/reviews?view=admin'),api('/api/enquiries')]);
    $('#reviewsArea').innerHTML=reviewTable(reviews.reviews||[]); $('#enquiriesArea').innerHTML=enquiryTable(enquiries.enquiries||[]);
    status.textContent='Connected. '+(reviews.reviews||[]).length+' review(s), '+(enquiries.enquiries||[]).length+' enquiry/ies loaded.';
  } catch (e) { status.textContent=e.message; status.classList.add('admin-error'); }
}
$('#adminLogin').addEventListener('submit', async e=>{e.preventDefault();adminKey=$('#adminKey').value.trim();sessionStorage.setItem('thaksheelAdminKey',adminKey);await loadDashboard();});
$('#adminLogout').addEventListener('click',()=>{adminKey='';sessionStorage.removeItem('thaksheelAdminKey');$('#adminKey').value='';status.textContent='Admin key cleared from this tab.';});
document.addEventListener('click',async e=>{const b=e.target.closest('[data-review][data-status]');if(!b)return;try{await api('/api/reviews/'+b.dataset.review,{method:'PATCH',body:JSON.stringify({status:b.dataset.status})});await loadDashboard();}catch(err){status.textContent=err.message;status.classList.add('admin-error');}});
if(adminKey) loadDashboard();

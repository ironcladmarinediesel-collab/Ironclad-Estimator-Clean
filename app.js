const services = [
  {name:'Initial dockside inspection / consultation', hours:1.0},
  {name:'Diesel diagnostic troubleshooting', hours:2.0},
  {name:'Replace alternator - one engine', hours:2.0},
  {name:'Replace belt tensioner - one engine', hours:1.0},
  {name:'Replace seawater pump impeller - one engine', hours:1.5},
  {name:'Replace seawater pump impellers (both engines)', hours:3.0},
  {name:'Inspect seawater pump wear plate / housing', hours:0.5},
  {name:'Replace seawater hose', hours:1.5},
  {name:'RACOR fuel filter service / clean housing - each', hours:0.75},
  {name:'RACOR fuel filter service x3', hours:2.0},
  {name:'Fuel contamination inspection', hours:1.5},
  {name:'Battery / charging system checks', hours:1.0},
  {name:'Generator service inspection', hours:1.5},
  {name:'Sanitation system limited troubleshooting', hours:1.5},
  {name:'Sea trial / operational test', hours:1.5}
];

let selected = [];
const $ = id => document.getElementById(id);
$('date').valueAsDate = new Date();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js'));
}

function money(n){ return n.toLocaleString(undefined,{style:'currency',currency:'USD'}); }

function renderButtons(){
  const div = $('serviceButtons');
  div.innerHTML = '';
  services.forEach(s => {
    const b = document.createElement('button');
    b.textContent = `${s.name} — ${s.hours} hr`;
    b.onclick = () => { selected.push({...s, qty:1}); renderSelected(); };
    div.appendChild(b);
  });
}

function renderSelected(){
  const div = $('selected');
  div.innerHTML = '';
  if(!selected.length){
    div.innerHTML = '<p class="small">No work selected yet.</p>';
  }
  selected.forEach((s,i)=>{
    const line = document.createElement('div');
    line.className = 'line';
    line.innerHTML = `
      <div class="lineTop">
        <strong>${s.name}</strong>
        <button class="secondary" data-remove="${i}">Remove</button>
      </div>
      <div class="lineControls">
        <label>Hours Each<input type="number" step="0.25" min="0" value="${s.hours}" data-hours="${i}"></label>
        <label>Qty<input type="number" step="1" min="1" value="${s.qty || 1}" data-qty="${i}"></label>
      </div>`;
    div.appendChild(line);
  });

  div.querySelectorAll('[data-remove]').forEach(b => b.onclick = e => {
    selected.splice(Number(e.target.dataset.remove),1); renderSelected();
  });
  div.querySelectorAll('[data-hours]').forEach(inp => inp.oninput = e => {
    selected[Number(e.target.dataset.hours)].hours = Number(e.target.value || 0); updateTotal();
  });
  div.querySelectorAll('[data-qty]').forEach(inp => inp.oninput = e => {
    selected[Number(e.target.dataset.qty)].qty = Number(e.target.value || 1); updateTotal();
  });
  updateTotal();
}

function updateTotal(){
  const rate = Number($('rate').value);
  const hours = selected.reduce((sum,s)=>sum + Number(s.hours || 0) * Number(s.qty || 1),0);
  $('total').textContent = money(hours * rate);
}

function buildEstimate(){
  const rate = Number($('rate').value);
  const hours = selected.reduce((sum,s)=>sum + Number(s.hours || 0) * Number(s.qty || 1),0);
  const lines = [];

  lines.push('IRONCLAD DIESEL & POWER');
  lines.push('Mobile Marine & Diesel Service');
  lines.push('');
  lines.push('LABOR ESTIMATE');
  lines.push(`Estimate #: ${$('estimateNumber').value || 'ICP-2026-001'}`);
  lines.push(`Date: ${$('date').value || ''}`);
  lines.push('');
  lines.push(`Prepared For: ${$('customer').value || ''}`);
  lines.push(`Vessel: ${$('vessel').value || ''}`);
  lines.push(`Location: ${$('location').value || ''}`);
  lines.push(`Estimated Service Window: ${$('serviceWindow').value || 'TBD'}`);
  lines.push(`Labor Rate: $${rate}/hr`);
  lines.push(`Parts: ${$('parts').value}`);
  lines.push('');
  lines.push('ESTIMATED WORK');

  if (!selected.length) lines.push('No services selected.');

  selected.forEach((s,idx)=>{
    const qty = Number(s.qty || 1);
    const h = Number(s.hours || 0);
    const lineHours = h * qty;
    lines.push(`${idx+1}. ${s.name}`);
    lines.push(`   Qty: ${qty} | Est. Hours: ${lineHours.toFixed(2)} | Labor: ${money(lineHours*rate)}`);
  });

  lines.push('');
  lines.push(`Estimated Labor Hours: ${hours.toFixed(2)}`);
  lines.push(`Estimated Labor Total: ${money(hours*rate)}`);
  lines.push('');
  lines.push('NOTES');
  lines.push($('notes').value || '');
  lines.push('');
  lines.push('Prepared by Ironclad Diesel & Power');
  lines.push('');
  lines.push('Clint Harris');
  lines.push('Owner / Lead Technician');
  lines.push('Ironclad Diesel & Power');
  lines.push('Mobile Marine & Diesel Service');
  lines.push('ironclad.marine.diesel@gmail.com');
  lines.push('757-493-1986');

  return lines.join('\n');
}
$('rate').onchange = updateTotal;
$('generate').onclick = async () => {
  const rate = Number($('rate').value);
  const hours = selected.reduce((sum, s) => sum + Number(s.hours || 0) * Number(s.qty || 1), 0);

  const scopeOfWork = selected.length
    ? selected.map((s, idx) => `${idx + 1}. ${s.name} - Qty: ${s.qty || 1}, Hours: ${(Number(s.hours || 0) * Number(s.qty || 1)).toFixed(2)}`).join('\n')
    : 'No services selected.';

  const estimateData = {
    clientName: $('customer').value,
    phoneNumber: '',
    email: '',
    vesselName: $('vessel').value,
    marina: $('location').value,
    scopeOfWork: scopeOfWork,
    estimatedHours: hours,
    laborRate: rate,
    partsSuppliedBy: $('parts').value,
    notes: $('notes').value
  };

  const saved = await sendEstimateToAirtable(estimateData);

  if (saved && saved.estimateNumber) {
    $('estimateNumber').value = saved.estimateNumber;
  }

  $('output').value = buildEstimate();
};
$('share').onclick = async () => {
  const text = $('output').value || buildEstimate();
  $('output').value = text;
  if(navigator.share) await navigator.share({title:'Ironclad Estimate', text});
  else { await navigator.clipboard.writeText(text); alert('Copied to clipboard.'); }
};
$('clear').onclick = () => {
  if(confirm('Clear estimate?')){
    ['customer','vessel','location','output'].forEach(id => $(id).value = '');
    $('date').valueAsDate = new Date();
    selected = [];
    renderSelected();
  }
};
$('addCustom').onclick = () => {
  const name = prompt('Custom work line:');
  if(name) { selected.push({name, hours:1.0, qty:1}); renderSelected(); }
};

renderButtons();
renderSelected();

async function sendEstimateToAirtable(data) {
  const response = await fetch("/.netlify/functions/create-estimate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  const result = await response.json();

  if (!response.ok) {
    console.error(result);
    alert("Error saving estimate");
    return null;
  }

  return result;
}

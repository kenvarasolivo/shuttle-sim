import {nodes as originalNodes,defaults,simulate,summarize,pairedSavings,generateDemand,travelTime,resultStats} from './simulation.js';
const $=id=>document.getElementById(id);
let config={...defaults},run,time=45,playing=true,last=0,selectedStop=null,page=0,toastTimer,manualTrips=[];
let nodes=originalNodes;
const pageSize=6;
const vehicleMarkers={baseline:[],shuttle:[]};
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
const clock=t=>`${String(8+Math.floor(t/60)).padStart(2,'0')}:${String(Math.floor(t)%60).padStart(2,'0')}`;
const number=v=>v===null||v===undefined?'—':Math.round(v).toLocaleString();
const minutes=v=>v===null||v===undefined?'—':`${Math.max(0,Math.round(v))} min`;
const glyph=(x,y,color,label)=>`<g transform="translate(${x},${y})"><rect x="-17" y="-13" width="34" height="25" rx="6" fill="${color}" stroke="white" stroke-width="2.5"/><path d="M-11-6H-5M5-6H11" stroke="white" stroke-width="3"/><text text-anchor="middle" y="6" fill="white" font-size="12" font-weight="600">${label}</text><circle cx="-10" cy="14" r="3" fill="${color}"/><circle cx="10" cy="14" r="3" fill="${color}"/></g>`;
function curve(a,b){const p=nodes[a],q=nodes[b];return {p,q,cx:(p.x+q.x)/2,cy:(p.y+q.y)/2+(Math.min(a,b)%2? -20:28)};}
function road(a,b){const {p,q,cx,cy}=curve(a,b);return `M${p.x},${p.y}Q${cx},${cy} ${q.x},${q.y}`;}
function point(a,b,f){if(a===b)return nodes[a];const {p,q,cx,cy}=curve(a,b),u=1-f;return {x:u*u*p.x+2*u*f*cx+f*f*q.x,y:u*u*p.y+2*u*f*cy+f*f*q.y};}
function vehiclePosition(v,kind){
  const sampleTime=reducedMotion.matches?Math.floor(time):time;
  const progress=v.moving?Math.max(0,Math.min(1,(sampleTime-v.moving.start)/(v.moving.end-v.moving.start))):0;
  const p=point(v.from,v.to,progress);
  // A small, stable lane offset keeps vehicles apart without a sideways jump at stops.
  const ordinal=kind==='shuttle'?Number(v.id):Number(String(v.id).split('-')[0]);
  return `translate(${(p.x+((ordinal-1)%3-1)*8).toFixed(2)},${(p.y-23).toFixed(2)})`;
}
function animateVehicles(){
  for(const kind of ['baseline','shuttle']) for(const marker of vehicleMarkers[kind]) {
    const transform=vehiclePosition(marker.vehicle,kind);
    if(marker.transform!==transform){marker.element.setAttribute('transform',transform);marker.transform=transform;}
  }
}
const landscape=`<rect width="800" height="550" fill="#f2f5ee"/><path d="M0 30L185 0l40 104-136 74L0 134Z M546 0h254v112l-105 44-108-56Z M0 415l148-37 97 172H0Z M555 390l245-37v197H636Z" fill="#e8eedf"/><path d="M288 0q-62 110-8 184t8 161 39 205" fill="none" stroke="#dce9e7" stroke-width="16"/><path d="M0 215l800 315M0 210L800 525" fill="none" stroke="#e8ecdf" stroke-width="2"/><path d="M610 0L800 178M585 0L800 200M0 500l178-22M0 518l185-23" stroke="#dce5d2" stroke-width="2"/><g fill="#dde7d3">${[[53,55],[76,71],[46,85],[96,38],[720,475],[747,461],[754,496],[692,499],[72,417],[90,440],[115,408],[690,48],[713,66],[733,40]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="13"/><circle cx="${x-9}" cy="${y+8}" r="9"/>`).join('')}</g><g fill="#e4e8df">${[[377,102],[394,89],[453,111],[473,127],[651,229],[674,235],[696,269],[645,296],[401,432],[414,470],[461,477],[480,449],[103,223],[126,226],[165,233]].map(([x,y])=>`<rect x="${x}" y="${y}" width="15" height="11" rx="2"/>`).join('')}</g><text x="39" y="343" fill="#7c8a72" font-size="11">Rural district</text>`;
function renderMap(kind,t) {
  const s=run[kind].history[t],color=kind==='shuttle'?'#2c7052':'#77818a';
  let html=landscape;
  for(let a=0;a<nodes.length;a++)for(let b=a+1;b<nodes.length;b++) {
    if(nodes.length>4&&a!==0)continue;
    html+=`<path d="${road(a,b)}" fill="none" stroke="#fff" stroke-width="10"/><path d="${road(a,b)}" fill="none" stroke="#d9e0d5" stroke-width="1.5"/>`;
    if(kind==='baseline'&&a===0)html+=`<path d="${road(a,b)}" fill="none" stroke="#9aa4aa" stroke-width="2.5"/>`;
  }
  if(kind==='shuttle') for(const v of s.vehicles) {
    let from=v.node;
    for(const stop of v.route) {if(from!==stop.node)html+=`<path d="${road(from,stop.node)}" fill="none" stroke="${color}" stroke-width="2.5" stroke-dasharray="7 6" opacity=".5"/>`;from=stop.node;}
    if(v.moving) html+=`<path d="${road(v.from,v.to)}" fill="none" stroke="${color}" stroke-width="3.5"/>`;
  }
  for(let i=0;i<nodes.length;i++) {
    const n=nodes[i],count=s.queues[i].length,active=selectedStop===i;
    const lx=Math.max(5,Math.min(653,n.x-71)),ly=n.y<200?n.y-80:n.y+32;
    html+=`<g class="station" role="button" tabindex="0" data-node="${i}" aria-label="${n.name}: ${count} waiting. Filter passenger list."><title>${n.name} · ${count} passengers waiting</title><circle cx="${n.x}" cy="${n.y}" r="${active?18:14}" fill="white" stroke="${active?color:'#c7d2c3'}" stroke-width="2"/><circle cx="${n.x}" cy="${n.y}" r="6" fill="${color}"/><rect class="station-label" x="${lx}" y="${ly}" width="142" height="49" rx="6" fill="white" stroke="${active?color:'#e0e6dc'}"/><text x="${lx+11}" y="${ly+20}" fill="#25342b" font-size="24" font-weight="500">${i===0?'Hbf':n.name}</text><text x="${lx+11}" y="${ly+37}" fill="#637168" font-size="14">${i===0?'Main station':run.config.network.distances[0][i]+' km to Hbf'}</text><rect x="${lx+103}" y="${ly+10}" width="29" height="28" rx="5" fill="${count?'#edf2eb':'#f5f6f3'}"/><text x="${lx+117.5}" y="${ly+29}" text-anchor="middle" fill="${color}" font-size="20" font-weight="500">${count}</text></g>`;
    const dots=Math.min(count,15);
    for(let k=0;k<dots;k++)html+=`<circle cx="${n.x-24+(k%5)*10}" cy="${n.y+105+Math.floor(k/5)*10}" r="2.5" fill="${color}" opacity=".7"/>`;
  }
  s.vehicles.forEach(v=>{
    html+=`<g data-vehicle="${v.id}" transform="${vehiclePosition(v,kind)}"><title>${kind==='shuttle'?'Shuttle':'Bus'} ${v.id}: ${v.load}/${v.capacity} riders${v.route.length?`, next ${nodes[v.route[0].node].short}`:''}</title>${glyph(0,0,color,v.load)}</g>`;
  });
  $(kind+'-map').innerHTML=html;
  const elements=[...$(kind+'-map').querySelectorAll('[data-vehicle]')];
  vehicleMarkers[kind]=s.vehicles.map((vehicle,i)=>({vehicle,element:elements[i],transform:elements[i].getAttribute('transform')}));
}
function metrics(kind,s) {
  $(kind+'-metrics').innerHTML=[['Waiting now',s.waiting,'people','Across all stops'],['Avg. journey',s.averageJourney,'min',`${s.delivered} completed trips`],['On time',s.onTime,'%',s.delivered?'Of completed trips':'No completed trips yet']].map(([label,value,unit,sub])=>`<div><span class="metric-label">${label}</span><span class="metric-value">${number(value)} <small>${unit}</small></span><span class="metric-sub">${sub}</span></div>`).join('');
  $(kind+'-delivered').textContent=`${s.delivered} at destination · ${s.onboard} riding`;
}
function queueEstimate(kind,ids,t) {
  if(!ids.length)return '—';
  const e=run[kind].history[t].estimates;
  const values=ids.map(id=>e[id]?.dropoff).filter(v=>v!==undefined);
  if(!values.length)return 'unassigned';
  const eta=minutes(values.reduce((a,b)=>a+b-t,0)/values.length);
  return `${eta}${values.length<ids.length?' + ?':''}`;
}
function renderQueues(t) {
  $('queues').innerHTML=`<div class="queue-head"><span>Stop</span><span>Scheduled</span><span>Landlink</span></div>`+nodes.map((n,i)=>{
    const a=run.baseline.history[t].queues[i],b=run.shuttle.history[t].queues[i];
    return `<button class="queue-row ${selectedStop===i?'selected':''}" data-node="${i}" aria-pressed="${selectedStop===i}"><span><span class="station-letter">${n.short}</span>${i===0?'Main station':n.name}</span><span><strong>${a.length}</strong><small> / ${queueEstimate('baseline',a,t)}</small></span><span class="green-text"><strong>${b.length}</strong><small> / ${queueEstimate('shuttle',b,t)}</small></span></button>`;
  }).join('');
  $('clear-stop').hidden=selectedStop===null;
}
function renderTrend(t){
  const W=600,H=168,left=35,right=15,top=10,bottom=25;
  const max=Math.max(5,...run.baseline.history.slice(0,t+1).map(s=>s.waiting),...run.shuttle.history.slice(0,t+1).map(s=>s.waiting));
  const ceiling=Math.ceil(max/5)*5;
  const x=v=>left+v/config.duration*(W-left-right),y=v=>H-bottom-v/ceiling*(H-bottom-top);
  let html='';
  for(let i=0;i<3;i++){const n=ceiling*i/2;html+=`<line x1="${left}" y1="${y(n)}" x2="${W-right}" y2="${y(n)}" stroke="#edf0ed"/><text x="${left-9}" y="${y(n)+4}" text-anchor="end">${number(n)}</text>`;}
  for(const v of [0,config.duration/2,config.duration])html+=`<text x="${x(v)}" y="${H-5}" text-anchor="${v===0?'start':v===config.duration?'end':'middle'}">${clock(v)}</text>`;
  for(const [kind,color] of [['baseline','#77818a'],['shuttle','#2c7052']]) {
    const path=run[kind].history.slice(0,t+1).map((s,i)=>`${i?'L':'M'}${x(i).toFixed(1)},${y(s.waiting).toFixed(1)}`).join(' ');
    html+=`<path d="${path}" fill="none" stroke="${color}" stroke-width="2.3" stroke-linejoin="round"/><circle cx="${x(t)}" cy="${y(run[kind].history[t].waiting)}" r="3" fill="${color}"/>`;
  }
  $('trend').innerHTML=html;
}
function state(p,t) {return p.dropoff!==null&&p.dropoff<=t?'Done':p.pickup!==null&&p.pickup<=t?'Riding':'Waiting';}
function tripEstimate(p,kind,t) {
  const e=run[kind].history[t].estimates[p.id];
  if(!e||e.dropoff===undefined) return '<span class="minor">Unassigned</span>';
  const done=state(p,t)==='Done',wait=e.wait??(e.pickup===undefined?Math.max(0,t-p.arrival):e.pickup-p.arrival);
  return `${minutes(wait)} <span class="minor">/</span> ${minutes(e.dropoff-p.arrival)}${done?'':' <span class="minor">est.</span>'}`;
}
function renderPassengers(t){
  const filter=$('passenger-filter').value;
  let rows=run.demand.filter(p=>p.arrival<=t&&(selectedStop===null||p.origin===selectedStop));
  if(filter==='active')rows=rows.filter(p=>state(run.baseline.passengers[p.id-1],t)!=='Done'||state(run.shuttle.passengers[p.id-1],t)!=='Done');
  if(filter==='completed')rows=rows.filter(p=>state(run.baseline.passengers[p.id-1],t)==='Done'&&state(run.shuttle.passengers[p.id-1],t)==='Done');
  if(filter==='late')rows=rows.filter(p=>{const e=run.shuttle.history[t].estimates[p.id];return e?.dropoff>p.deadline || (t>p.deadline&&state(run.shuttle.passengers[p.id-1],t)!=='Done');});
  rows.reverse();
  const pages=Math.max(1,Math.ceil(rows.length/pageSize));page=Math.min(page,pages-1);
  const visible=rows.slice(page*pageSize,(page+1)*pageSize);
  $('passengers').innerHTML=visible.length?visible.map(p=>{
    const a=run.baseline.passengers[p.id-1],b=run.shuttle.passengers[p.id-1],status=state(b,t),eta=run.shuttle.history[t].estimates[p.id]?.dropoff;
    const late=(eta!==undefined&&eta>p.deadline)||(t>p.deadline&&status!=='Done');
    return `<tr><td>#${String(p.id).padStart(3,'0')}</td><td>${nodes[p.origin].short==='Hbf'?'Hbf':nodes[p.origin].name}<span class="route-arrow">→</span>${nodes[p.destination].short==='Hbf'?'Hbf':nodes[p.destination].name}</td><td>${clock(p.arrival)} <span class="minor">/ ${clock(p.deadline)}</span></td><td>${tripEstimate(a,'baseline',t)}</td><td>${tripEstimate(b,'shuttle',t)}</td><td><span class="status ${late?'late':status==='Riding'?'riding':''}">${status}${late?status==='Done'?' · late':' · at risk':''}</span></td></tr>`;
  }).join(''):`<tr><td class="empty-cell" colspan="6">${t===0?'Waiting for the first passengers. Press play to begin.':'No journeys match this view.'}</td></tr>`;
  $('table-count').textContent=rows.length?`${page*pageSize+1}–${Math.min((page+1)*pageSize,rows.length)} of ${rows.length} passengers`:'No matching arrivals';
  $('page-label').textContent=`${page+1} / ${pages}`;$('previous').disabled=page===0;$('next').disabled=page>=pages-1;
  $('passenger-caption').textContent=selectedStop===null?'Live estimates for the same people in both scenarios.':`Passengers departing ${nodes[selectedStop].name}.`;
}
let lastRendered=-1;
const resultRows=[
  ['averageWait','Average waiting time','min','Before boarding + any transfer wait. Completed journeys.'],
  ['averageInVehicle','Average onboard time','min','Time aboard vehicles, including shuttle stop time. Completed journeys.'],
  ['averageJourney','Average total journey','min','From reaching the origin stop to reaching the destination. Completed journeys.'],
  ['p90Wait','90th-percentile wait','min','90% of completed journeys waited this long or less.'],
  ['averagePassengersPerLeg','Average passengers per ride leg','riders','Mean onboard count when leaving a stop. Includes empty legs.'],
  ['seatUtilization','Seat utilization while driving','%','Passenger-minutes divided by available seat-minutes.'],
  ['rideLegs','Vehicle departures','legs','One leg = travel from one stop to the next; includes empty and in-progress legs.'],
  ['emptyLegShare','Empty departures','%','Share of departed ride legs with no passengers aboard.'],
  ['onTime','Arrived by their deadline','%','Among completed journeys only.'],
  ['delivered','Completed journeys','people','Reached their final destination inside the simulation window.'],
  ['waiting','Still waiting at the end','people','Includes people waiting to transfer at Hbf.'],
  ['onboard','Still riding at the end','people','Boarded, but have not yet reached their destination.'],
  ['peakQueue','Largest waiting queue','people','Peak combined number waiting across all active stops.']
];
function resultValue(value,unit){return value===null||value===undefined?'—':`${['people','legs'].includes(unit)?Math.round(value):value.toFixed(1)} <span class="minor">${unit}</span>`;}
function renderResults(t){
  const finished=t===config.duration;
  $('final-results').hidden=!finished;
  $('run-to-end').textContent=finished?'View results':'Run to end';
  const hourly=config.headway;
  $('baseline-dispatch').textContent=`${config.cityCount} lines, each leaving Hbf every ${hourly} min, even when empty. Departures staggered ${Math.floor(hourly/config.cityCount)} min apart: ${nodes.slice(1,4).map((n,i)=>`${n.short} ${clock(i*Math.floor(hourly/config.cityCount))}`).join(', ')}${config.cityCount>3?', …':''}.`;
  $('shuttle-dispatch').textContent='Dispatches when a request is assigned. No timetable or minimum load; one minute at each pickup/dropoff, then it continues. Idle shuttles wait where they finish.';
  if(!finished)return;
  const a=resultStats(run.baseline,t),b=resultStats(run.shuttle,t),saving=pairedSavings(run,t);
  $('results-caption').textContent=`08:00–${clock(t)} · ${config.cityCount} cities + Hbf · ${a.arrived} identical passengers · seed ${config.seed}`;
  $('results-resources').textContent=`Resources differ: ${config.cityCount} scheduled lines versus ${config.fleet} shuttles. Demand is ${config.demand} passengers/hour across the whole network. This is a synthetic scenario, not proof of an equal-cost improvement.`;
  $('results-rows').innerHTML=resultRows.map(([key,label,unit,note])=>`<tr><th scope="row">${label}<span class="result-definition">${note}</span></th><td>${resultValue(a[key],unit)}</td><td>${resultValue(b[key],unit)}</td></tr>`).join('');
  $('results-finding').textContent=saving.count?`For the same ${saving.count} passengers completed in both: Landlink ${saving.minutes>=0?'saved':'added'} ${Math.abs(saving.minutes).toFixed(1)} minutes per journey on average.`:'No passengers completed in both systems yet, so a matched journey saving cannot be calculated.';
}
function render(force=false){
  const t=Math.min(config.duration,Math.floor(time));
  $('timeline').value=time;
  if(!force&&t===lastRendered){animateVehicles();return;}
  $('clock').textContent=clock(t);$('elapsed').textContent=`${t} of ${config.duration} min`;
  lastRendered=t;
  const a=summarize(run.baseline,t),b=summarize(run.shuttle,t),saving=pairedSavings(run,t);
  metrics('baseline',a);metrics('shuttle',b);renderMap('baseline',t);renderMap('shuttle',t);renderQueues(t);renderTrend(t);renderPassengers(t);renderResults(t);
  $('arrival-count').textContent=a.arrived;
  $('finding').textContent=saving.count?`${Math.abs(saving.minutes).toFixed(1)} min ${saving.minutes>=0?'saved':'longer'} per shared completed journey`:'Waiting for the first shared trips to finish.';
  $('paired-note').textContent=saving.count?`Saving based on ${saving.count} identical passengers completed in both scenarios.`:'Journey savings compare only passengers who finished in both scenarios.';
}
function playState(){ $('play').innerHTML=playing?'<span aria-hidden="true">Ⅱ</span> Pause':'<span aria-hidden="true">▶</span> Play';$('play').setAttribute('aria-label',playing?'Pause simulation':'Play simulation'); }
function toast(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,3000);}
function build(start=0){
  const demand=[...generateDemand(config),...manualTrips].sort((a,b)=>a.arrival-b.arrival).map((p,i)=>({...p,id:i+1}));
  run=simulate(config,demand);nodes=run.config.network.nodes;time=start;lastRendered=-1;page=0;
  const tripForm=$('trip-form');
  for(const key of ['origin','destination']){
    const previous=Number(tripForm.elements[key].value);
    tripForm.elements[key].replaceChildren(...nodes.map((n,i)=>new Option(i===0?'Hbf · Main station':n.name,String(i))));
    tripForm.elements[key].value=String(previous<nodes.length?previous:key==='origin'?0:1);
  }
  updateCityPreview();
  $('network-scope').textContent=`${config.cityCount} cities + Hbf · ${config.demand} passengers/h total · ${config.fleet} shuttles`;
  $('network-comparison').textContent=`Scheduled adds one line per city. Shuttle fleet stays fixed. Increase total demand separately to test growth.`;
  $('queue-hint').textContent=`${nodes.length>4?'Scroll for all '+nodes.length+' stops. ':''}Click a stop to inspect passengers. ETA includes wait + ride.`;
  $('baseline-map').setAttribute('aria-label',`Scheduled bus map: Hbf and ${config.cityCount} cities, queues and buses`);
  $('shuttle-map').setAttribute('aria-label',`On-demand map: Hbf and ${config.cityCount} cities, queues and shuttles`);
  $('timeline').max=config.duration;$('end-time').textContent=clock(config.duration);
  $('fleet-label').textContent=`${config.fleet} shuttles · ${config.capacity} seats each`;
  $('scenario-name').textContent=config.pattern==='waves'?'Train arrival waves':'Everyday demand';
  render(true);playState();
}
$('play').addEventListener('click',()=>{if(time>=config.duration)time=0;playing=!playing;playState();render(true);});
$('restart').addEventListener('click',()=>{time=0;page=0;render(true);});
$('run-to-end').addEventListener('click',()=>{time=config.duration;playing=false;playState();render(true);$('final-results').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});$('results-title').focus({preventScroll:true});});
$('timeline').addEventListener('input',e=>{time=Number(e.target.value);playing=false;playState();render(true);});
$('speed').addEventListener('change',()=>{last=0;});
function updateCityPreview(){
  const count=Number($('city-count').value),valid=Number.isInteger(count)&&count>=3&&count<=10;
  $('city-preview').textContent=valid?`Hbf + Cities A–${String.fromCharCode(64+count)}`:'Choose 3 to 10 cities';
  $('add-city').disabled=!valid||count>=10;$('remove-city').disabled=!valid||count<=3;
}
for(const [id,delta] of [['add-city',1],['remove-city',-1]])$(id).addEventListener('click',()=>{
  $('city-count').value=Math.max(3,Math.min(10,Number($('city-count').value)+delta));
  $('city-count').dispatchEvent(new Event('input',{bubbles:true}));
});
$('city-count').addEventListener('input',updateCityPreview);
$('settings').addEventListener('input',e=>{for(const [key,unit] of [['demand',''],['headway',' min'],['slack',' min']])if(e.target.name===key)$(key+'-value').textContent=e.target.value+unit;$('settings-status').textContent='Changes pending. Apply to restart both scenarios.';});
$('settings').addEventListener('submit',e=>{
  e.preventDefault();const data=new FormData(e.target),next={...config};
  for(const [key,value] of data.entries())next[key]=key==='pattern'?value:Number(value);
  try {config=next;manualTrips=[];selectedStop=null;build();playing=true;playState();$('settings-status').textContent='Both scenarios use identical arrivals.';toast('New scenario ready. Same arrivals, fair comparison.');}catch(err){$('settings-status').textContent=err.message;}
});
$('new-seed').addEventListener('click',()=>{document.querySelector('[name=seed]').value=Math.floor(Math.random()*999999)+1;$('settings-status').textContent='New seed chosen. Apply to run this demand stream.';});
$('restore').addEventListener('click',()=>{config={...defaults};manualTrips=[];$('settings').reset();for(const [k,u]of [['demand',''],['headway',' min'],['slack',' min']])$(k+'-value').textContent=defaults[k]+u;selectedStop=null;playing=true;build();$('settings-status').textContent='Both scenarios use identical arrivals.';});
$('mobile-settings').addEventListener('click',()=>{const open=document.querySelector('.sidebar').classList.toggle('expanded');$('mobile-settings').setAttribute('aria-expanded',open);$('mobile-settings').textContent=open?'Fewer settings ↑':'More settings ↓';});
function chooseStop(e){const el=e.target.closest('[data-node]');if(!el)return;const node=Number(el.dataset.node);selectedStop=selectedStop===node?null:node;page=0;render(true);}
for(const id of ['baseline-map','shuttle-map','queues']) {$(id).addEventListener('click',chooseStop);$(id).addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();chooseStop(e);}});}
$('clear-stop').addEventListener('click',()=>{selectedStop=null;page=0;render(true);});
$('passenger-filter').addEventListener('change',()=>{page=0;render(true);});
$('previous').addEventListener('click',()=>{page--;render(true);});$('next').addEventListener('click',()=>{page++;render(true);});
let wasPlaying=false;
for(const id of ['model-top','model-bottom'])$(id).addEventListener('click',()=>{wasPlaying=playing;playing=false;playState();$('model-dialog').showModal();});
$('close-model').addEventListener('click',()=>$('model-dialog').close());
$('model-dialog').addEventListener('close',()=>{playing=wasPlaying&&time<config.duration;playState();});
$('model-dialog').addEventListener('click',e=>{if(e.target===$('model-dialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
$('export').addEventListener('click',()=>{
  const header=['seed','scenario','passenger_id','origin','destination','arrival_min_after_0800','deadline_min_after_0800','pickup_min_after_0800','dropoff_min_after_0800','total_wait_min','journey_min','on_time','completed_within_horizon'];
  const rows=[header];
  for(const kind of ['baseline','shuttle']) for(const p of run[kind].passengers) {
    const completed=p.dropoff!==null&&p.dropoff<=config.duration;
    rows.push([config.seed,kind,p.id,nodes[p.origin].name,nodes[p.destination].name,p.arrival,p.deadline,p.pickup??'',p.dropoff??'',p.wait??(p.pickup===null?'':p.pickup-p.arrival),p.dropoff===null?'':p.dropoff-p.arrival,p.dropoff===null?'':p.dropoff<=p.deadline,completed]);
  }
  const csv=rows.map(row=>row.map(v=>`"${String(v).replaceAll('"','""')}"`).join(',')).join('\r\n');
  const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})),link=document.createElement('a');link.href=url;link.download=`landlink-seed-${config.seed}-trips.csv`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Exported full-run trips, including unfinished journeys.');
});
$('export-results').addEventListener('click',()=>{
  const a=resultStats(run.baseline,config.duration),b=resultStats(run.shuttle,config.duration);
  const rows=[['Metric','Unit','Scheduled','Landlink','Definition'],...resultRows.map(([key,label,unit,note])=>[label,unit,a[key]??'',b[key]??'',note])];
  rows.push(['Passenger arrivals','people',a.arrived,b.arrived,'Same demand stream in both scenarios'],['Random seed','',config.seed,config.seed,'Reproduce using the same settings'],['Horizon','minutes',config.duration,config.duration,'Minutes since 08:00'],['Cities excluding Hbf','cities',config.cityCount,config.cityCount,'One scheduled line per city; chosen shuttle fleet stays fixed'],['Total demand','people/hour',config.demand,config.demand,'Across the whole network'],['Shuttle fleet','vehicles','',config.fleet,'Number of on-demand vehicles']);
  const csv=rows.map(row=>row.map(v=>`"${String(v).replaceAll('"','""')}"`).join(',')).join('\r\n');
  const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})),link=document.createElement('a');link.href=url;link.download=`landlink-seed-${config.seed}-results.csv`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
let tripWasPlaying=false;
$('add-trip').addEventListener('click',()=>{tripWasPlaying=playing;playing=false;playState();const arrival=Math.min(config.duration-1,Math.ceil(time));$('trip-form').elements.arrival.value=clock(arrival);$('trip-form').elements.deadline.value=clock(arrival+40);$('trip-error').textContent='';$('trip-dialog').showModal();});
$('close-trip').addEventListener('click',()=>$('trip-dialog').close());
$('trip-dialog').addEventListener('close',()=>{playing=tripWasPlaying&&time<config.duration;playState();});
$('trip-form').addEventListener('submit',e=>{
  e.preventDefault();const d=new FormData(e.target),origin=Number(d.get('origin')),destination=Number(d.get('destination'));
  const parse=v=>{const [h,m]=v.split(':').map(Number);return (h-8)*60+m;};
  const arrival=parse(d.get('arrival')),deadline=parse(d.get('deadline'));
  if(origin===destination){$('trip-error').textContent='Choose two different stops.';return;}
  if(arrival<0||arrival>=config.duration){$('trip-error').textContent=`Arrival must be between 08:00 and ${clock(config.duration-1)}.`;return;}
  if(deadline<arrival+travelTime(origin,destination,config.speed,run.config.network)){$('trip-error').textContent=`Allow at least ${travelTime(origin,destination,config.speed,run.config.network)} minutes for the direct drive.`;return;}
  manualTrips.push({arrival,deadline,origin,destination,manual:true});selectedStop=origin;build(arrival);tripWasPlaying=false;playing=false;playState();$('trip-dialog').close();$('passenger-filter').value='all';render(true);toast(`Added your ${nodes[origin].short} → ${nodes[destination].short} trip. Press play to follow it.`);
});
try {build(45);}catch(err){$('settings-status').textContent=`Unable to run simulation: ${err.message}`;playing=false;playState();}
function frame(now){
  if(last&&playing&&!document.hidden){time=Math.min(config.duration,time+Math.min(now-last,200)/1000*Number($('speed').value));if(time>=config.duration){playing=false;playState();}render();}
  last=now;requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

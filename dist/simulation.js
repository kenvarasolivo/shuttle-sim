// All time quantities are simulation minutes; distances are synthetic road kilometres.
export const nodes = [
  {name:'Hauptbahnhof',short:'Hbf',x:145,y:265},
  {name:'City A',short:'A',x:420,y:120},
  {name:'City B',short:'B',x:665,y:270},
  {name:'City C',short:'C',x:440,y:450}
];
export const distances = [[0,8,12,10],[8,0,7,14],[12,7,0,8],[10,14,8,0]];
export const defaults = {seed:42,demand:24,duration:180,fleet:3,capacity:8,headway:60,busCapacity:30,speed:35,slack:25,pattern:'steady'};
export const travelTime = (a,b,speed) => a===b ? 0 : Math.max(1,Math.ceil(distances[a][b]/speed*60));
const mean = a => a.length ? a.reduce((s,v)=>s+v,0)/a.length : null;
function random(seed) { let s=seed>>>0; return () => { s+=0x6D2B79F5; let t=Math.imul(s^s>>>15,1|s); t^=t+Math.imul(t^t>>>7,61|t); return ((t^t>>>14)>>>0)/4294967296; }; }
export function generateDemand(options={}) {
  const c={...defaults,...options},r=random(c.seed),out=[];
  for(let t=0;t<c.duration;t++) {
    // Poisson counts per minute. Rush periods model train-arrival waves without changing either cohort.
    const factor=c.pattern==='waves' ? (t%30<5 ? 3.4 : 0.52) : 1;
    const lambda=c.demand/60*factor,limit=Math.exp(-lambda); let product=1,k=0;
    do { product*=r(); k++; } while(product>limit);
    for(let j=0;j<k-1;j++) {
      const origin=r()<0.6 ? 0 : 1+Math.floor(r()*3);
      let destination=origin===0 ? 1+Math.floor(r()*3) : (r()<0.72 ? 0 : 1+Math.floor(r()*3));
      if(destination===origin) destination=origin%3+1;
      out.push({id:out.length+1,arrival:t,origin,destination,deadline:t+travelTime(origin,destination,c.speed)+c.slack+Math.floor(r()*11)});
    }
  }
  return out;
}
function routeEstimate(v,route,time,c,people) {
  let node=v.node,t=Math.max(time,v.ready),load=v.onboard.length,cost=0;
  const etas=new Map();
  for(let i=0;i<route.length;i++) {
    const s=route[i];
    if(i===0 && v.moving) t=v.moving.end;
    else t+=travelTime(node,s.node,c.speed);
    const p=people.get(s.pid),e=etas.get(s.pid)||{};
    if(s.kind==='pickup') { load++; e.pickup=t; }
    else { load--; e.dropoff=t; cost+=Math.max(0,t-p.deadline)*20+(t-p.arrival)*0.25; }
    if(load<0 || load>v.capacity) return null;
    etas.set(s.pid,e); node=s.node; t++;
  }
  return {cost:cost+(t-time),etas,end:t};
}
export function planRequest(v,p,time,c,people) {
  if(v.route.length>=20) return null;
  let best=null;
  const base=routeEstimate(v,v.route,time,c,people)?.cost||0;
  for(let i=v.moving?1:0;i<=v.route.length;i++) {
    for(let j=i+1;j<=v.route.length+1;j++) {
      const route=[...v.route];
      route.splice(i,0,{node:p.origin,kind:'pickup',pid:p.id});
      route.splice(j,0,{node:p.destination,kind:'dropoff',pid:p.id});
      const estimate=routeEstimate(v,route,time,c,people);
      if(!estimate) continue;
      const eta=estimate.etas.get(p.id).dropoff,score=estimate.cost-base;
      if(!best || score<best.score) best={route,score,eta};
    }
  }
  return best;
}
function baseline(demand,c) {
  const reserved=new Map();
  function book(origin,destination,earliest) {
    const village=origin||destination,ride=travelTime(0,village,c.speed);
    const offset=(village-1)*Math.floor(c.headway/3)+(origin===0?0:ride+1);
    let departure=offset+Math.max(0,Math.ceil((earliest-offset)/c.headway))*c.headway;
    let key=`${origin}-${destination}-${departure}`;
    while((reserved.get(key)||0)>=c.busCapacity) {departure+=c.headway;key=`${origin}-${destination}-${departure}`;}
    reserved.set(key,(reserved.get(key)||0)+1);
    return {origin,destination,start:departure,end:departure+ride};
  }
  const passengers=demand.map(p=>{
    const first=book(p.origin,p.origin===0?p.destination:0,p.arrival);
    const legs=[first];
    if(p.origin!==0 && p.destination!==0) legs.push(book(0,p.destination,first.end+2));
    return {...p,pickup:first.start,dropoff:legs.at(-1).end,legs,wait:legs.reduce((sum,l,i)=>sum+l.start-(i?legs[i-1].end:p.arrival),0)};
  });
  const history=[];
  for(let t=0;t<=c.duration;t++) {
    const queues=[[],[],[],[]]; let arrived=0,waiting=0,onboard=0,delivered=0,late=0;
    const estimates={};
    for(const p of passengers) {
      if(p.arrival>t) continue;
      arrived++; estimates[p.id]={pickup:p.pickup,dropoff:p.dropoff,wait:p.wait};
      if(p.dropoff<=t) {delivered++;if(p.dropoff>p.deadline) late++;}
      else if(p.legs.some(l=>l.start<=t && l.end>t)) onboard++;
      else {waiting++;const leg=p.legs.find(l=>l.start>t);queues[leg.origin].push(p.id);}
    }
    const vehicles=[];
    for(let city=1;city<=3;city++) {
      const ride=travelTime(0,city,c.speed),offset=(city-1)*Math.floor(c.headway/3);
      const cycle=Math.floor((t-offset)/c.headway);
      for(let n=Math.max(0,cycle-1);n<=cycle;n++) {
        const start=offset+n*c.headway,dt=t-start;
        if(dt>=0 && dt<2*ride+1) {
          const outbound=dt<ride,from=outbound?0:city,to=outbound?city:0;
          const progress=outbound?dt/ride:Math.max(0,(dt-ride-1)/ride);
          const load=passengers.filter(p=>p.legs.some(l=>l.origin===from&&l.destination===to&&l.start<=t&&l.end>t&&l.start===(outbound?start:start+ride+1))).length;
          vehicles.push({id:`${city}-${n}`,node:from,from,to,progress,load,capacity:c.busCapacity,route:[],moving:{start:outbound?start:start+ride+1,end:outbound?start+ride:start+2*ride+1,to}});
        }
      }
    }
    history.push({time:t,arrived,waiting,onboard,delivered,late,queues,vehicles,estimates});
  }
  return {passengers,history};
}
function shuttles(demand,c) {
  const passengers=demand.map(p=>({...p,pickup:null,dropoff:null,assigned:false}));
  const people=new Map(passengers.map(p=>[p.id,p]));
  const vehicles=Array.from({length:c.fleet},(_,i)=>({id:i+1,node:0,route:[],onboard:[],moving:null,ready:0,capacity:c.capacity,km:0}));
  const history=[];
  function serve(v,t) {
    const s=v.route.shift(),p=people.get(s.pid);
    if(s.kind==='pickup') {v.onboard.push(p.id);p.pickup=t;}
    else {v.onboard=v.onboard.filter(id=>id!==p.id);p.dropoff=t;}
    v.ready=t+1;
  }
  for(let t=0;t<=c.duration;t++) {
    for(const v of vehicles) if(v.moving && v.moving.end<=t) {v.node=v.moving.to;v.moving=null;serve(v,t);}
    const pending=passengers.filter(p=>p.arrival<=t&&!p.assigned).sort((a,b)=>(a.deadline-(t-a.arrival)*0.5)-(b.deadline-(t-b.arrival)*0.5)||a.id-b.id);
    for(const p of pending) {
      let best=null;
      for(const v of vehicles) {const plan=planRequest(v,p,t,c,people);if(plan && (!best||plan.score<best.plan.score)) best={v,plan};}
      if(best) {best.v.route=best.plan.route;p.assigned=true;}
    }
    for(const v of vehicles) {
      if(v.moving||v.ready>t||!v.route.length) continue;
      const to=v.route[0].node;
      if(to===v.node) serve(v,t);
      else {v.moving={from:v.node,to,start:t,end:t+travelTime(v.node,to,c.speed)};v.km+=distances[v.node][to];}
    }
    const queues=[[],[],[],[]],estimates={};let arrived=0,waiting=0,onboard=0,delivered=0,late=0;
    for(const v of vehicles) {
      const e=routeEstimate(v,v.route,t,c,people);
      if(e) for(const [id,eta] of e.etas) estimates[id]=eta;
    }
    for(const p of passengers) {
      if(p.arrival>t) continue;
      arrived++;
      if(p.dropoff!==null) {delivered++;if(p.dropoff>p.deadline) late++;estimates[p.id]={pickup:p.pickup,dropoff:p.dropoff};}
      else if(p.pickup!==null) {onboard++;estimates[p.id]={...estimates[p.id],pickup:p.pickup};}
      else {waiting++;queues[p.origin].push(p.id);}
    }
    history.push({time:t,arrived,waiting,onboard,delivered,late,queues,estimates,vehicles:vehicles.map(v=>({id:v.id,node:v.node,from:v.moving?.from??v.node,to:v.moving?.to??v.node,progress:v.moving?(t-v.moving.start)/(v.moving.end-v.moving.start):0,load:v.onboard.length,capacity:v.capacity,route:v.route.map(s=>({...s})),moving:v.moving?{...v.moving}:null,km:v.km}))});
  }
  return {passengers,history};
}
export function simulate(options={},customDemand=null) {
  const c={...defaults,...options};
  for(const key of ['duration','demand','fleet','capacity','headway','busCapacity','speed','slack','seed']) if(!Number.isFinite(c[key])) throw new Error(`${key} must be finite`);
  if(c.duration<1||c.duration>360||c.demand<0||c.demand>240||c.fleet<0||c.fleet>8||c.capacity<1||c.headway<1||c.busCapacity<1||c.speed<1||c.slack<0) throw new Error('Configuration outside supported range');
  for(const key of ['duration','fleet','capacity','busCapacity']) if(!Number.isInteger(c[key])) throw new Error(`${key} must be an integer`);
  const demand=customDemand?customDemand.map(p=>({...p})):generateDemand(c);
  return {config:c,demand,baseline:baseline(demand,c),shuttle:shuttles(demand,c)};
}
export function summarize(system,time) {
  const s=system.history[Math.max(0,Math.min(system.history.length-1,Math.floor(time)))];
  const completed=system.passengers.filter(p=>p.arrival<=time&&p.dropoff!==null&&p.dropoff<=time);
  const waits=completed.map(p=>p.wait??p.pickup-p.arrival);
  return {...s,averageWait:mean(waits),averageJourney:mean(completed.map(p=>p.dropoff-p.arrival)),onTime:completed.length?completed.filter(p=>p.dropoff<=p.deadline).length/completed.length*100:null};
}
export function pairedSavings(run,time) {
  const pairs=run.demand.map((p,i)=>[run.baseline.passengers[i],run.shuttle.passengers[i]]).filter(([a,b])=>a.dropoff!==null&&b.dropoff!==null&&a.dropoff<=time&&b.dropoff<=time);
  return {count:pairs.length,minutes:mean(pairs.map(([a,b])=>(a.dropoff-a.arrival)-(b.dropoff-b.arrival)))};
}
// A ride leg is one actual vehicle departure between two different stops.
// Count empty legs too; a multi-stop shuttle tour consists of several legs.
export function resultStats(system,time) {
  const end=Math.max(0,Math.min(system.history.length-1,Math.floor(time)));
  const summary=summarize(system,end);
  const completed=system.passengers.filter(p=>p.dropoff!==null&&p.dropoff<=end&&p.arrival<=end);
  const averageInVehicle=mean(completed.map(p=>p.legs?p.legs.reduce((sum,l)=>sum+l.end-l.start,0):p.dropoff-p.pickup));
  const legs=new Map();let passengerMinutes=0,seatMinutes=0;
  for(const snapshot of system.history.slice(0,end+1)) for(const v of snapshot.vehicles) {
    const m=v.moving;
    if(!m||m.start>snapshot.time||m.end<=snapshot.time||v.from===v.to)continue;
    const key=`${v.id}/${m.start}/${v.from}/${v.to}`;
    if(!legs.has(key))legs.set(key,{load:v.load,capacity:v.capacity});
    // Integrate [minute, minute+1), clipped to the observation window.
    const dt=Math.max(0,Math.min(snapshot.time+1,m.end,end)-Math.max(snapshot.time,m.start));
    passengerMinutes+=v.load*dt;seatMinutes+=v.capacity*dt;
  }
  const departures=[...legs.values()];
  const sortedWait=completed.map(p=>p.wait??p.pickup-p.arrival).sort((a,b)=>a-b);
  return {...summary,averageInVehicle,rideLegs:departures.length,
    averagePassengersPerLeg:mean(departures.map(v=>v.load)),
    emptyLegShare:departures.length?departures.filter(v=>v.load===0).length/departures.length*100:null,
    seatUtilization:seatMinutes?passengerMinutes/seatMinutes*100:null,
    p90Wait:sortedWait.length?sortedWait[Math.ceil(sortedWait.length*.9)-1]:null,
    peakQueue:Math.max(...system.history.slice(0,end+1).map(s=>s.waiting))};
}

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateDemand, simulate, defaults, summarize, planRequest, travelTime, resultStats } from '../dist/simulation.js';

test('seeded arrivals are repeatable and include all four origins and feasible deadlines', () => {
  const a = generateDemand({...defaults, demand: 120});
  assert.deepEqual(a, generateDemand({...defaults, demand: 120}));
  assert.equal(new Set(a.map(p => p.origin)).size, 4);
  for (const p of a) {
    assert.notEqual(p.origin, p.destination);
    assert.ok(p.deadline >= p.arrival + travelTime(p.origin, p.destination, defaults.speed));
  }
});

test('both systems receive exactly the same passengers; people and seats are conserved', () => {
  const run = simulate({...defaults, duration: 120, demand: 90});
  assert.deepEqual(run.baseline.passengers.map(p => p.id), run.shuttle.passengers.map(p => p.id));
  for (const system of [run.baseline, run.shuttle]) {
    for (const snapshot of system.history) {
      assert.equal(snapshot.waiting + snapshot.onboard + snapshot.delivered, snapshot.arrived);
      for (const v of snapshot.vehicles) assert.ok(v.load >= 0 && v.load <= v.capacity);
    }
    for (const p of system.passengers) {
      if (p.dropoff !== null) assert.ok(p.dropoff >= p.pickup && p.pickup >= p.arrival);
    }
  }
});

test('zero demand and zero shuttles produce honest empty or unserved states', () => {
  const empty = simulate({...defaults, demand: 0, duration: 30});
  assert.equal(empty.demand.length, 0);
  assert.equal(summarize(empty.shuttle, 30).averageJourney, null);
  const noFleet = simulate({...defaults, fleet: 0, duration: 60});
  assert.equal(summarize(noFleet.shuttle, 60).delivered, 0);
  assert.equal(summarize(noFleet.shuttle, 60).waiting, noFleet.demand.length);
});

test('a single direct request is delivered; scarce capacity leaves a visible queue', () => {
  const passengers = Array.from({length: 10}, (_, i) => ({id: i + 1, arrival: 0, origin: 0, destination: 1, deadline: 35}));
  const run = simulate({...defaults, duration: 30, fleet: 1, capacity: 2}, passengers);
  const result = summarize(run.shuttle, 30);
  assert.ok(result.delivered > 0);
  assert.ok(result.waiting > 0);
  assert.ok(run.shuttle.history.every(s => s.vehicles[0].load <= 2));
});

test('route insertion never schedules a dropoff before pickup and returns a feasible ETA', () => {
  const vehicle = {id: 1, node: 0, route: [], onboard: [], moving: null, ready: 0, capacity: 2};
  const p = {id: 1, origin: 0, destination: 2, arrival: 0, deadline: 30};
  const plan = planRequest(vehicle, p, 0, defaults, new Map([[1, p]]));
  assert.ok(plan);
  assert.deepEqual(plan.route.map(s => s.kind), ['pickup', 'dropoff']);
  assert.ok(plan.eta >= travelTime(0, 2, defaults.speed));
});

test('a full scheduled departure rolls excess passengers into the next service', () => {
  const passengers=Array.from({length:4},(_,i)=>({id:i+1,arrival:0,origin:0,destination:1,deadline:40}));
  const r=simulate({...defaults,duration:90,busCapacity:2},passengers);
  assert.deepEqual(r.baseline.passengers.map(p=>p.pickup),[0,0,60,60]);
  assert.equal(r.baseline.history[30].queues[0].length,2);
});

test('village-to-village timetables include the transfer and conserve total wait', () => {
  const r=simulate({...defaults,duration:120},[{id:1,arrival:0,origin:1,destination:2,deadline:70}]);
  const p=r.baseline.passengers[0];
  assert.equal(p.legs.length,2);
  assert.ok(p.legs[1].start>=p.legs[0].end+2);
  assert.equal(p.wait,p.dropoff-p.arrival-p.legs.reduce((s,l)=>s+l.end-l.start,0));
  const transferTime=p.legs[0].end;
  assert.deepEqual(r.baseline.history[transferTime].queues[0],[1]);
});

test('the shuttle planner cannot see future requests; booked ETAs respect seat capacity', () => {
  const config={...defaults,duration:60};
  const request={id:1,arrival:0,origin:0,destination:1,deadline:30};
  const early=simulate(config,[request]);
  const later=simulate(config,[request,{id:2,arrival:30,origin:2,destination:0,deadline:60}]);
  assert.deepEqual(early.shuttle.history.slice(0,30),later.shuttle.history.slice(0,30));
});

test('invalid numerical settings fail clearly', () => {
  for(const config of [{capacity:0},{fleet:-1},{speed:0},{duration:500},{seed:NaN},{fleet:1.5}])assert.throws(()=>simulate(config));
});

test('a repeated run has identical routing, and metrics exclude unfinished trips', () => {
  const config = {...defaults, duration: 90};
  const a = simulate(config), b = simulate(config);
  assert.deepEqual(a.shuttle.history, b.shuttle.history);
  const s = summarize(a.shuttle, 90);
  const delivered = a.shuttle.passengers.filter(p => p.dropoff !== null && p.dropoff <= 90);
  assert.equal(s.delivered, delivered.length);
  assert.equal(s.averageJourney, delivered.length ? delivered.reduce((n,p) => n+p.dropoff-p.arrival,0)/delivered.length : null);
});

test('final results split waiting, onboard time and total journey, including transfers', () => {
  const r=simulate({...defaults,duration:120},[{id:1,arrival:0,origin:1,destination:2,deadline:100}]);
  for(const kind of ['baseline','shuttle']) {
    const s=resultStats(r[kind],120);
    assert.equal(s.delivered,1);
    assert.equal(s.averageWait+s.averageInVehicle,s.averageJourney);
    assert.equal(s.arrived,s.delivered+s.waiting+s.onboard);
  }
});

test('ride load counts departures once, includes empty legs, and ignores future timetable legs', () => {
  const snapshots=[
    {time:0,arrived:0,waiting:0,onboard:0,delivered:0,vehicles:[{id:'bus',from:0,to:1,load:2,capacity:8,moving:{start:0,end:2}}]},
    {time:1,arrived:0,waiting:0,onboard:0,delivered:0,vehicles:[{id:'bus',from:0,to:1,load:2,capacity:8,moving:{start:0,end:2}}]},
    {time:2,arrived:0,waiting:0,onboard:0,delivered:0,vehicles:[{id:'bus',from:1,to:0,load:0,capacity:8,moving:{start:3,end:5}}]},
    {time:3,arrived:0,waiting:0,onboard:0,delivered:0,vehicles:[{id:'bus',from:1,to:0,load:0,capacity:8,moving:{start:3,end:5}}]}
  ];
  const system={history:snapshots,passengers:[]};
  const before=resultStats(system,2);
  assert.equal(before.rideLegs,1);assert.equal(before.averagePassengersPerLeg,2);assert.equal(before.seatUtilization,25);
  const after=resultStats(system,3);
  assert.equal(after.rideLegs,2);assert.equal(after.averagePassengersPerLeg,1);assert.equal(after.emptyLegShare,50);
});

test('unfinished riders do not vanish from final results and empty averages stay null', () => {
  const r=simulate({...defaults,fleet:0,duration:60});
  const s=resultStats(r.shuttle,60);
  assert.equal(s.waiting,r.demand.length);assert.equal(s.averageWait,null);assert.equal(s.averageInVehicle,null);
  assert.equal(s.averagePassengersPerLeg,null);assert.equal(s.seatUtilization,null);assert.equal(s.rideLegs,0);
});

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createNetwork,simulate,generateDemand,defaults,travelTime,distances,nodes} from '../dist/simulation.js';

test('expanded networks are deterministic, complete and preserve original road distances',()=>{
  for(const count of [3,4,7,10]){
    const n=createNetwork(count);assert.deepEqual(n,createNetwork(count));
    assert.equal(n.nodes.length,count+1);assert.equal(n.nodes.at(-1).short,String.fromCharCode(64+count));
    for(let a=0;a<=count;a++)for(let b=0;b<=count;b++){
      assert.equal(n.distances[a][b],n.distances[b][a]);
      assert.ok(a===b?n.distances[a][b]===0:n.distances[a][b]>0);
      if(a<4&&b<4)assert.equal(n.distances[a][b],distances[a][b]);
      assert.ok(Number.isFinite(travelTime(a,b,35,n)));
    }
  }
  assert.deepEqual(createNetwork(3).nodes,nodes);
  const smaller=createNetwork(6),bigger=createNetwork(10);
  for(let a=0;a<=6;a++)for(let b=0;b<=6;b++)assert.equal(smaller.distances[a][b],bigger.distances[a][b]);
  for(const count of [2,11,3.5,NaN])assert.throws(()=>createNetwork(count));
});

test('new cities receive demand and both systems conserve people and seats on the expanded network',()=>{
  const config={...defaults,cityCount:10,demand:120,duration:90};
  const demand=generateDemand(config);
  assert.equal(new Set(demand.map(p=>p.origin)).size,11);
  assert.equal(new Set(demand.map(p=>p.destination)).size,11);
  const r=simulate(config);
  assert.equal(r.config.network.nodes.length,11);
  for(const kind of ['baseline','shuttle'])for(const s of r[kind].history){
    assert.equal(s.queues.length,11);assert.equal(s.waiting+s.onboard+s.delivered,s.arrived);
    for(const v of s.vehicles)assert.ok(v.load<=v.capacity&&v.load>=0);
  }
  assert.deepEqual(r.baseline.passengers.map(p=>p.id),r.shuttle.passengers.map(p=>p.id));
});

test('a request between added cities is routed and independent runs do not leak network state',()=>{
  const request={id:1,arrival:0,origin:4,destination:6,deadline:150};
  const r=simulate({...defaults,cityCount:6,duration:180,fleet:1},[request]);
  for(const kind of ['baseline','shuttle'])assert.ok(r[kind].passengers[0].dropoff!==null&&r[kind].passengers[0].dropoff<=180);
  assert.equal(simulate({...defaults,duration:30}).config.network.nodes.length,4);
  assert.equal(nodes.length,4);assert.equal(distances.length,4);
  assert.throws(()=>simulate({...defaults,cityCount:3},[request]),/stop|city|network/i);
});

test('the same number of arrivals is generated when only the service area changes',()=>{
  assert.equal(generateDemand({...defaults,cityCount:3}).length,generateDemand({...defaults,cityCount:10}).length);
});

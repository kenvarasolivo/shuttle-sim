import {test} from 'node:test';
import assert from 'node:assert/strict';
import {simulate,defaults,pairedSavings} from '../dist/simulation.js';

test('ten shuttles are supported, eleven are rejected',()=>{
  const r=simulate({...defaults,fleet:10,cityCount:10,duration:30,demand:0});
  assert.equal(r.shuttle.history[30].vehicles.length,10);
  assert.throws(()=>simulate({...defaults,fleet:11}));
});

test('headline journey means and difference use exactly the same completed passengers',()=>{
  const r={demand:[{},{}],baseline:{passengers:[{arrival:0,dropoff:80},{arrival:5,dropoff:90}]},shuttle:{passengers:[{arrival:0,dropoff:60},{arrival:5,dropoff:null}]}};
  const s=pairedSavings(r,100);
  assert.equal(s.count,1);assert.equal(s.baselineAverage,80);assert.equal(s.shuttleAverage,60);
  assert.equal(s.minutes,20);assert.equal(s.percent,25);
  assert.equal(s.baselineAverage-s.shuttleAverage,s.minutes);
});

test('the report preserves negative differences and unknown empty metrics',()=>{
  const r={demand:[{}],baseline:{passengers:[{arrival:0,dropoff:5}]},shuttle:{passengers:[{arrival:0,dropoff:10}]}};
  const late=pairedSavings(r,10);assert.equal(late.minutes,-5);assert.equal(late.percent,-100);
  const early=pairedSavings(r,4);assert.equal(early.count,0);assert.equal(early.baselineAverage,null);assert.equal(early.shuttleAverage,null);assert.equal(early.percent,null);
});

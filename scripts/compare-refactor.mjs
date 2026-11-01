// Compare actual actions, full state, and score explanations against a local Git release.
// No network, checkout mutation, or fixture regeneration; the reference is extracted to temp.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,writeFileSync,rmSync,mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import * as next from '../dist/engine.js';
import {scoreBreakdown} from '../dist/scores.js';

const count=Number(process.argv[2]||1000), ref=process.argv[3]||'v1.0.0';
assert(Number.isInteger(count)&&count>0,'Match count must be a positive integer');
assert(/^[a-zA-Z0-9._/-]+$/.test(ref)&&!ref.startsWith('-'),'Invalid reference');
const root=fileURLToPath(new URL('../',import.meta.url));
const baselineCommit=execFileSync('git',['rev-parse','--verify',`${ref}^{commit}`],{cwd:root,encoding:'utf8'}).trim();
const temp=mkdtempSync(path.join(tmpdir(),'pawkaido-reference-'));
const report={baseline:ref,baselineCommit,matchesPerEditionPerPolicy:count,policies:[],totalMatches:0,comparedActions:0,legacyRestores:0,mismatches:0};
const stateWithoutMetadata=s=>{const {extensions,...rest}=s;return rest;};
const rowsWithoutMetadata=detail=>({...detail,rows:detail.rows.map(({featured,...row})=>row)});
try {
  mkdirSync(path.join(temp,'dist'));
  for(const file of ['package.json','dist/engine.js','dist/data.js','dist/wishes.js','dist/scores.js'])
    writeFileSync(path.join(temp,file),execFileSync('git',['show',`${baselineCommit}:${file}`],{cwd:root}));
  const previous=await import(pathToFileURL(path.join(temp,'dist/engine.js')));
  const previousScores=await import(pathToFileURL(path.join(temp,'dist/scores.js')));
  for(const policy of ['production','unaware']) {
    const totals={policy,classic:{wins:[0,0,0,0],scores:[0,0,0,0]},wishes:{wins:[0,0,0,0],scores:[0,0,0,0]}};
    for(let seed=1;seed<=count;seed++) for(const edition of ['classic','wishes']) {
      const label=`${policy}/${edition}/${seed}`;
      let old=previous.newGame(Math.imul(seed,2654435761),'solo',edition);
      let current=next.newGame(Math.imul(seed,2654435761),'solo',edition);
      assert.deepEqual(stateWithoutMetadata(current),old,`${label}: initial state`);
      for(let step=0;!old.ended;step++) {
        assert(step<700,`${label}: did not finish`);
        const action=previous.aiAction(policy==='unaware'?{...old,edition:'classic'}:old);
        assert.deepEqual(next.aiAction(current,{useExtensions:policy!=='unaware'}),action,`${label}: AI step ${step}`);
        // Resume actual v1.0.0 mid-game saves through the new engine, including pending decisions.
        if(step%37===0) {
          const restored=JSON.parse(JSON.stringify(old));
          assert(next.validateSave(restored),`${label}: old save`);
          assert.deepEqual(stateWithoutMetadata(next.act(current,action)),next.act(restored,action),`${label}: restore step ${step}`);
          report.legacyRestores++;
        }
        old=previous.act(old,action); current=next.act(current,action);
        assert(next.validateSave(current),`${label}: validation step ${step}`);
        assert.deepEqual(stateWithoutMetadata(current),old,`${label}: state step ${step}`);
        report.comparedActions++;
      }
      for(const p of current.players) {
        const detail=scoreBreakdown(p,current.players);
        assert.equal(detail.total,p.score,`${label}: ledger`);
        assert.deepEqual(rowsWithoutMetadata(detail),previousScores.scoreBreakdown(old.players[p.id],old.players),`${label}: score explanations`);
        totals[edition].scores[p.id]+=p.score;
        if(current.winners.includes(p.id))totals[edition].wins[p.id]+=1/current.winners.length;
      }
      report.totalMatches++;
    }
    report.policies.push(totals);
    console.log(`${policy}: ${count} classic + ${count} wishes matches agree with ${ref}`);
  }
  writeFileSync(path.join(root,'artifacts/dlc-refactor-comparison.json'),JSON.stringify(report,null,2)+'\n');
  console.log(`${report.totalMatches} matches; ${report.comparedActions} identical actions/states; ${report.legacyRestores} legacy restores; zero differences.`);
} finally { rmSync(temp,{recursive:true,force:true}); }

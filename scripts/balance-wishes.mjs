// Reproducible paired matches; the exact same deal/seat seed is used for both editions.
// Production AI in every seat. Draft policy is either production choice or seeded first/second choice.
import {writeFileSync} from 'node:fs';
import {newGame,act,aiAction,validateSave} from '../dist/engine.js';
import {DOGS,ROLE} from '../dist/data.js';
import {WISHES,wishProgress} from '../dist/wishes.js';
import {scoreBreakdown} from '../dist/scores.js';
const totals={};
const sampleCount=Number(process.argv[2]||1000);
function stats(){return {games:0,wins:0,score:0,complete:0,bonus:0};}
for(const draft of (process.argv[3]?[process.argv[3]]:['production','varied'])){
 const batch={matchesPerEdition:sampleCount,draft,classic:DOGS.map(stats),wishes:DOGS.map(stats),roles:{},changedWinner:0};
 for(let seed=1;seed<=sampleCount;seed++){
  const results={};
  for(const edition of ['classic','wishes']){
   let s=newGame(Math.imul(seed,2654435761),'solo',edition),actions=0;
   while(!s.ended&&actions++<700){const p=s.players[s.current];const action=s.phase==='draft'&&draft==='varied'?{type:'role',id:p.draft[((seed*1103515245+p.id*12345)>>>8)%2]}:aiAction(s,{useExtensions:draft!=='unaware'});s=act(s,action);}
   if(!s.ended||!validateSave(s))throw Error(`Invalid match ${draft}/${edition}/${seed}`);
   results[edition]=s;
   for(const p of s.players){if(scoreBreakdown(p,s.players).total!==p.score)throw Error('Ledger mismatch');const win=s.winners.includes(p.id)?1/s.winners.length:0;const record=r=>{r.games++;r.wins+=win;r.score+=p.score;r.complete+=Number(wishProgress(p)?.complete||false);r.bonus+=p.ledger.wishes||0;};record(batch[edition][p.id]);const key=`${p.id}/${p.role}`;batch.roles[key]??={dog:DOGS[p.id].name,role:ROLE[p.role].name,classic:stats(),wishes:stats()};record(batch.roles[key][edition]);}
  }
  if(results.classic.winners.join()!==results.wishes.winners.join())batch.changedWinner++;
 }
 const summarize=r=>({games:r.games,winPct:+(100*r.wins/r.games).toFixed(2),avgScore:+(r.score/r.games).toFixed(2),completionPct:+(100*r.complete/r.games).toFixed(2),avgBonus:+(r.bonus/r.games).toFixed(2)});
 for(const edition of ['classic','wishes'])batch[edition]=batch[edition].map((r,i)=>({dog:DOGS[i].name,...summarize(r)}));
 batch.roles=Object.values(batch.roles).map(r=>({...r,classic:summarize(r.classic),wishes:summarize(r.wishes)}));totals[draft]=batch;
 console.log(JSON.stringify({draft,matchesPerEdition:sampleCount,classic:batch.classic,wishes:batch.wishes,changedWinner:batch.changedWinner},null,2));
}
writeFileSync(new URL(`../artifacts/wishes-balance${process.argv[4]?'-'+process.argv[4]:''}${process.argv[3]?'-'+process.argv[3]:''}.json`,import.meta.url),JSON.stringify({rewards:WISHES.map(w=>w.points),wishTargets:WISHES.map(w=>w.target),seedFormula:'Math.imul(seed,2654435761), seeds 1..N',notes:'Paired deterministic heuristic AI matches, split credit for tied winners; not human win-rate predictions.',...totals},null,2)+'\n');

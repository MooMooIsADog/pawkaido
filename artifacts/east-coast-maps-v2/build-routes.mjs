// Hand-traced road centre lines in the 1536 × 1024 revised artwork.
// This edits only the map package's presentation geometry; station IDs stay fixed.
import {readFile,writeFile} from 'node:fs/promises';
const controls=JSON.parse(await readFile(new URL('road-centres.json',import.meta.url),'utf8'));
const counts=[15,14,15,14];
const routes=[],stops=[];
for(const [leg,points] of controls.entries()){
 const dense=[points[0]];
 for(let i=1;i<points.length;i++){
  const a=points[i-1],b=points[i],prev=points[Math.max(0,i-2)],next=points[Math.min(points.length-1,i+1)];
  for(let j=1;j<=8;j++){
   const t=j/8,u=1-t;
   dense.push(a.map((v,k)=>u*u*u*v+3*u*u*t*(v+(b[k]-prev[k])/6)+3*u*t*t*(b[k]-(next[k]-v)/6)+t*t*t*b[k]));
  }
 }
 const distance=[0];
 for(let i=1;i<dense.length;i++)distance.push(distance[i-1]+Math.hypot(dense[i][0]-dense[i-1][0],dense[i][1]-dense[i-1][1]));
 const indices=Array.from({length:counts[leg]},(_,i)=>{
  const target=distance.at(-1)*i/(counts[leg]-1);
  let best=0;for(let j=1;j<distance.length;j++)if(Math.abs(distance[j]-target)<Math.abs(distance[best]-target))best=j;
  return best;
 });
 routes.push(dense.map(([x,y])=>[+(x/15.36).toFixed(3),+(y/10.24).toFixed(3)]));stops.push(indices);
 console.log(`Chapter ${leg+1}: ${Math.round(distance.at(-1))} px road, ${Math.round(distance.at(-1)/(counts[leg]-1))} px between stops`);
}
const dest=new URL('../../dist/map-packs/east-coast/index.js',import.meta.url);
let code=await readFile(dest,'utf8');
code=code.replace(/const routes=.*?;\nconst stops=.*?;/s,`const routes=${JSON.stringify(routes)};\nconst stops=${JSON.stringify(stops)};`);
await writeFile(dest,code);

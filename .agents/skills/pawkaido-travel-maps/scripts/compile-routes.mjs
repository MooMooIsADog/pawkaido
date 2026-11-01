#!/usr/bin/env node
// Compile hand-traced pixels into a new map geometry module. No production edits.
import {readFile,writeFile} from 'node:fs/promises';
function fail(message){throw new Error(message);}
function finite(v){return typeof v==='number'&&Number.isFinite(v);}
const args=process.argv.slice(2);
if(args.length===1&&args[0]==='--help'){
 console.log('node compile-routes.mjs input.json output.js [--reference-width 1000] [--min-gap 70]\nInput: {imageSize:[width,height],chapters:[{stopCount:15,controlPoints:[[x,y],...]} × 4]}\nWrites a NEW ES module exporting [{route,stops},...]; reports spacing at reference width.');
 process.exit(0);
}
try{
 const [input,output,...options]=args;
 if(!input||!output||options.length%2)fail('Expected input.json output.js and optional key/value pairs; see --help');
 let referenceWidth=1000,minGap=0;
 for(let i=0;i<options.length;i+=2){const value=Number(options[i+1]);
  if(!finite(value)||value<0)fail('Invalid numeric option');
  if(options[i]==='--reference-width')referenceWidth=value;
  else if(options[i]==='--min-gap')minGap=value;
  else fail('Unknown option: '+options[i]);
 }
 if(referenceWidth<=0)fail('Reference width must be positive');
 const spec=JSON.parse(await readFile(input,'utf8'));
 if(!Array.isArray(spec.imageSize)||spec.imageSize.length!==2||spec.imageSize.some(v=>!finite(v)||v<=0))fail('imageSize must be two positive numbers');
 const [width,height]=spec.imageSize;
 if(Math.abs(width/height-1.5)>0.001)fail('Current Pawkaido canvas uses 3:2; adapt renderer before using other ratios');
 if(!Array.isArray(spec.chapters)||spec.chapters.length!==4)fail('Expected four chapters');
 const geometry=[],metrics=[];
 for(const [leg,chapter] of spec.chapters.entries()){
  const {controlPoints:points,stopCount}=chapter;
  if(!Number.isInteger(stopCount)||stopCount<2||stopCount>1000)fail(`Chapter ${leg+1}: invalid stopCount`);
  if(!Array.isArray(points)||points.length<2||points.length>10000)fail(`Chapter ${leg+1}: need 2..10000 control points`);
  for(const [i,p] of points.entries()){
   if(!Array.isArray(p)||p.length!==2||p.some((v,k)=>!finite(v)||v<0||v>spec.imageSize[k]))fail(`Chapter ${leg+1}: invalid control point ${i}`);
   if(i&&p.every((v,k)=>v===points[i-1][k]))fail(`Chapter ${leg+1}: duplicate consecutive control points`);
  }
  const dense=[points[0]];
  for(let i=1;i<points.length;i++){
   const a=points[i-1],b=points[i],prev=points[Math.max(0,i-2)],next=points[Math.min(points.length-1,i+1)];
   for(let j=1;j<=8;j++){
    const t=j/8,u=1-t;
    const p=a.map((v,k)=>u*u*u*v+3*u*u*t*(v+(b[k]-prev[k])/6)+3*u*t*t*(b[k]-(next[k]-v)/6)+t*t*t*b[k]);
    if(p.some((v,k)=>v<0||v>spec.imageSize[k]))fail(`Chapter ${leg+1}: curve overshoots canvas; adjust edge control points`);
    dense.push(p);
   }
  }
  const distance=[0];
  for(let i=1;i<dense.length;i++)distance.push(distance[i-1]+Math.hypot(dense[i][0]-dense[i-1][0],dense[i][1]-dense[i-1][1]));
  const stops=Array.from({length:stopCount},(_,i)=>{
   const target=distance.at(-1)*i/(stopCount-1);let best=0;
   for(let j=1;j<distance.length;j++)if(Math.abs(distance[j]-target)<Math.abs(distance[best]-target))best=j;
   return best;
  });
  if(stops.some((v,i)=>i&&v<=stops[i-1]))fail(`Chapter ${leg+1}: insufficient geometry resolution for distinct stops`);
  const route=dense.map(([x,y])=>[+(x/width*100).toFixed(3),+(y/height*100).toFixed(3)]);
  let gap=Infinity,pair=[];
  for(let i=0;i<stops.length;i++)for(let j=i+1;j<stops.length;j++){
   const a=route[stops[i]],b=route[stops[j]],d=Math.hypot((a[0]-b[0])/100*referenceWidth,(a[1]-b[1])/100*referenceWidth*height/width);
   if(d<gap){gap=d;pair=[i,j];}
  }
  if(gap<minGap)fail(`Chapter ${leg+1}: minimum stop gap ${gap.toFixed(1)}px < ${minGap}px at width ${referenceWidth}; stops ${pair.join('/')}`);
  geometry.push({route,stops});metrics.push({chapter:leg+1,roadLengthPx:+distance.at(-1).toFixed(1),averageAlongRoadPx:+(distance.at(-1)/(stopCount-1)).toFixed(1),referenceWidth,minStopGapPx:+gap.toFixed(1),closestStops:pair});
 }
 await writeFile(output,'// Generated from hand-traced pixels; validate against the final artwork.\nexport default '+JSON.stringify(geometry)+';\n',{flag:'wx'});
 console.log(JSON.stringify({output,metrics},null,2));
}catch(error){console.error(error.message);process.exitCode=1;}

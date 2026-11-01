// Publish a small static export while leaving the original artwork/audio intact.
import {readdir,readFile,writeFile,mkdir,mkdtemp,rename,rm,lstat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {createHash} from 'node:crypto';
const run=promisify(execFile),project=fileURLToPath(new URL('../',import.meta.url));
const source=path.join(project,'dist'),parent=path.join(project,'.1gp');
// Optional map DLCs are distributed separately to preserve the 3 MiB base limit.
const includeMapPacks=process.argv.includes('--include-map-packs');
const output=path.join(parent,'static-output'),report=path.join(parent,'static-build.json');
await mkdir(parent,{recursive:true});
const temp=await mkdtemp(path.join(parent,'static-build-'));
const sourceFiles=[];
async function copy(relative=''){
 for(const entry of await readdir(path.join(source,relative),{withFileTypes:true})){
  const name=path.join(relative,entry.name),from=path.join(source,name);
  if(!includeMapPacks&&relative==='map-packs'&&entry.isDirectory()&&entry.name!=='japan')continue;
  if(entry.isSymbolicLink())throw Error('Linked source asset: '+name);
  if(entry.isDirectory()){await mkdir(path.join(temp,name),{recursive:true});await copy(name);continue;}
  if(!entry.isFile())throw Error('Unsupported source asset: '+name);
  const original=await readFile(from);sourceFiles.push({file:name,sha256:createHash('sha256').update(original).digest('hex')});
  if(name.endsWith('.png')){
   await run('cwebp',['-quiet','-q','70','-alpha_q','100','-m','5','-metadata','none',from,'-o',path.join(temp,name.replace(/\.png$/,'.webp'))]);
  }else if(name.endsWith('.wav')){
   await run('afconvert',['-f','mp4f','-d','aac','-b','64000',from,path.join(temp,name.replace(/\.wav$/,'.mp4'))]);
  }else{
   let data=!includeMapPacks&&name==='map-packs/catalog.js'?Buffer.from('export default [];\n'):original;
   if(['.js','.css','.html'].includes(path.extname(name))){
    data=Buffer.from(data.toString('utf8').replaceAll('ukiyo-map-atlas.png','ukiyo-map-atlas.webp').replaceAll('${DOGS[id].file}.png','${DOGS[id].file}.webp').replaceAll('sakura-pawprints.wav','sakura-pawprints.mp4'));
   }
   await writeFile(path.join(temp,name),data);
  }
 }
}
try{
 await copy();
 const files=[];
 async function scan(dir,relative=''){
  for(const name of await readdir(dir)){const full=path.join(dir,name),rel=path.join(relative,name),stat=await lstat(full);if(stat.isDirectory())await scan(full,rel);else files.push({file:rel,bytes:stat.size,sha256:createHash('sha256').update(await readFile(full)).digest('hex')});}
 }
 await scan(temp);const bytes=files.reduce((sum,f)=>sum+f.bytes,0);
 if(bytes>3*1024*1024)throw Error(`Export is ${bytes} bytes; AIWANNA static limit is 3 MiB.`);
 // Only replace the prior generated export after the new export is complete.
 const prior=await lstat(output).catch(e=>{if(e.code==='ENOENT')return null;throw e;});
 if(prior){if(prior.isSymbolicLink()||!prior.isDirectory())throw Error('Unsafe output path');await readFile(report);await rm(output,{recursive:true});}
 await rename(temp,output);
 await writeFile(report,JSON.stringify({source:'dist',output:'.1gp/static-output',includeMapPacks,bytes,sourceFiles,files},null,2)+'\n');
 console.log(JSON.stringify({output:'.1gp/static-output',files:files.length,bytes},null,2));
}catch(error){await rm(temp,{recursive:true,force:true});throw error;}

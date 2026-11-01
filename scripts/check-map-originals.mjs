import {readFile,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=new URL('../artifacts/east-coast-maps-v1/',import.meta.url);
const manifest=JSON.parse(await readFile(new URL('ORIGINALS.sha256.json',root),'utf8'));
for(const [name,expected] of Object.entries(manifest.files)){
 const file=new URL(name,root),data=await readFile(file),actual=createHash('sha256').update(data).digest('hex');
 if(actual!==expected)throw Error('Original map changed: '+name);
 const mode=(await stat(file)).mode;
 console.log(`OK ${name} · SHA-256 unchanged${mode&0o222?' · writable (use read-only permissions for extra protection)':' · read-only'}`);
}

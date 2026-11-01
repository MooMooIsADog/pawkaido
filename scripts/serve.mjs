import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
// Local static preview only; game state and rules run in the browser.
const project=fileURLToPath(new URL('../',import.meta.url));
const root=path.resolve(project,process.argv[2]||'dist')+path.sep;
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.wav':'audio/wav','.mp4':'audio/mp4','.json':'application/json'};
const port=Number(process.env.PORT||4175);
http.createServer(async(req,res)=>{try{
 const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 const file=path.resolve(root,'.'+(name==='/'?'/index.html':name));
 if(!file.startsWith(root)) throw Error('path');
 const data=await readFile(file); res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});res.end(data);
}catch{res.writeHead(404);res.end('Not found');}}).listen(port,'127.0.0.1',()=>console.log(`Pawkaido local: http://127.0.0.1:${port}/`));

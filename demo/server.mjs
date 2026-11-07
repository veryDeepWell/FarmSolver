import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const root=new URL('./dist/',import.meta.url);
http.createServer(async(req,res)=>{try{const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);const url=new URL('.'+(path==='/'?'/index.html':path),root);if(!fileURLToPath(url).startsWith(fileURLToPath(root))){res.writeHead(403).end();return}const data=await readFile(url);res.writeHead(200,{'Content-Type':url.pathname.endsWith('.png')?'image/png':url.pathname.endsWith('.json')?'application/json':url.pathname.endsWith('.css')?'text/css':url.pathname.endsWith('.mjs')?'application/javascript':'text/html; charset=utf-8'});res.end(data)}catch{res.writeHead(404).end('Not found')}}).listen(4173,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:4173'));

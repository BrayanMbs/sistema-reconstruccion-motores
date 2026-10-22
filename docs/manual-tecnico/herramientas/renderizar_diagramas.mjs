// Instalar herramientas aisladas: npm install --prefix artifacts/manual-doc-tools --no-save mermaid playwright
// Renderizado local con Microsoft Edge; no modifica código ni accede a servicios externos.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
process.chdir(ROOT);
const require=createRequire(path.join(ROOT,'artifacts/manual-doc-tools/package.json'));
const {chromium}=require('playwright');
const root=process.cwd();
fs.mkdirSync(path.join(root,'artifacts/manual-audit'),{recursive:true});
const server=http.createServer((req,res)=>{
 const filename=path.join(root,decodeURIComponent(req.url.split('?')[0]));
 if(!filename.startsWith(root)||!fs.existsSync(filename)){res.writeHead(404);res.end();return;}
 res.setHeader('Content-Type',filename.endsWith('.mjs')||filename.endsWith('.js')?'text/javascript':filename.endsWith('.html')?'text/html':'text/plain');res.end(fs.readFileSync(filename));
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
let browser;
try {
 browser=await chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage({viewport:{width:1800,height:1400},deviceScaleFactor:2});
 const base=`http://127.0.0.1:${server.address().port}`;
 fs.writeFileSync('artifacts/manual-audit/render.html','<html><body style="margin:24px;background:white"><div id="diagram"></div></body></html>');
 await page.goto(base+'/artifacts/manual-audit/render.html');
 await page.evaluate(async()=>{window.mermaid=(await import('/artifacts/manual-doc-tools/node_modules/mermaid/dist/mermaid.esm.min.mjs')).default;window.mermaid.initialize({startOnLoad:false,theme:'neutral',securityLevel:'strict',fontFamily:'Calibri',flowchart:{htmlLabels:false},er:{useMaxWidth:false},sequence:{width:100,actorMargin:15,wrap:true,messageFontSize:18,actorFontSize:18}});});
 for(const name of fs.readdirSync('docs/manual-tecnico/diagramas').filter(n=>n.endsWith('.mmd'))){
  const source=fs.readFileSync('docs/manual-tecnico/diagramas/'+name,'utf8');
  const svg=await page.evaluate(async(src)=>{const result=await window.mermaid.render('graph'+Date.now(),src);document.querySelector('#diagram').innerHTML=result.svg;return result.svg;},source);
  const stem='docs/manual-tecnico/diagramas/'+name.slice(0,-4);
  fs.writeFileSync(stem+'.svg',svg);
  const element=page.locator('#diagram svg');
  await element.evaluate(el=>{el.style.maxWidth='none';const v=el.viewBox.baseVal;el.setAttribute('width',v.width);el.setAttribute('height',v.height);});
  await element.screenshot({path:stem+'.png'});
  console.log(name+' '+JSON.stringify(await element.boundingBox()));
 }
}finally{await browser?.close();server.close();}

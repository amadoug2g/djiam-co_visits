// Variante 2 : maison inversée et centrée (passage des deux côtés), fond de parcelle inversé, façade gardée
const M=JSON.parse(JSON.stringify(require('./model.js')));
const AH=10.37, AB=11.0; // axe maison (centrée entre clôtures), axe fond de parcelle
M.mirror={house:AH,back:AB};
// --- v3 : retouches dans le repère d'origine, avant inversion ---
{const sh=(poly,d)=>poly.map(([x,y])=>[+(x+d).toFixed(3),y]);
 const R=id=>M.rooms.find(r=>r.id===id);
 R('entree').poly=sh(R('entree').poly,-2.53);           // porche 8.44-11.78
 R('escalier').poly=[[11.93,18.5],[14.31,18.5],[14.31,22.26],[11.93,22.26]];
 R('degag').poly=[[4.78,16.61],[14.31,16.61],[14.31,18.5],[11.78,18.5],[11.78,21.18],[8.44,21.18],[8.44,18.5],[4.78,18.5]];
 M.stairs={...M.stairs,r:[11.93,18.5,14.31,22.26],mid:13.12};
 const W=(o,n)=>{const i=M.walls.findIndex(w=>w.join()===o.join());if(i<0)throw 'mur '+o;M.walls[i]=n};
 W([10.82,18.5,10.97,22.36],[11.78,18.5,11.93,22.36]);
 W([8.44,22.26,10.97,22.36],[11.78,22.26,14.31,22.36]);
 W([10.97,21.18,11.32,21.28],[8.44,21.18,8.79,21.28]);
 W([12.81,21.18,14.31,21.28],[10.28,21.18,11.78,21.28]);
 const de=M.doors.find(d=>d.id==='d-entree');de.a=8.79;de.b=10.28;
 M.slits=[10.62,10.92,11.22];
 M.claustraX=[12.04,14.04];
 M.zones.find(z=>z.id==='walk').r=[8.44,22.36,11.78,22.95];
 M.zones.find(z=>z.id==='strip').r=[11.78,22.36,14.31,22.76];
 M.steps=M.steps.filter(s=>s.ax!=='v');                 // plus de sortie latérale côté hall
 M.steps.forEach(s=>{if(s.ax==='h')s.r=[8.44,s.r[1],11.78,s.r[3]]});
 M.windows=M.windows.filter(w=>w.id!=='g1');M.walls.push([4.68,16.61,4.78,18.5]);
 const w3=M.windows.find(w=>w.id==='w3');w3.r=[18.27,14.04,18.37,14.84];
 M.doors.push({id:'d-cuis-ext',ax:'v',c:18.32,a:15.0,b:15.9,hinge:'b',side:1,src:'est',room:'cuis-am',label:'Sortie cuisine (hypothèse)'});
 M.dims.forEach(d=>{if(d.t==='3,37'){d.p=[8.44,19.3];d.q=[11.78,19.3];d.t='3,34'}});
}

const f=(A,x)=>+(2*A-x).toFixed(3);
const mr=(A,r)=>[f(A,r[2]),r[1],f(A,r[0]),r[3]];
const backRoom=new Set(['local','douche','pool-house']),keepRoom=new Set(['gardien','se']);
const isBack=r=>Math.max(r[1],r[3])<=10.2;
const isFront=r=>Math.min(r[1],r[3])>=25.1;
const axOf=r=>isBack(r)?AB:AH;
// zones
const Z={};M.zones.forEach(z=>Z[z.id]=z);
const back=['deck','deck2','garden-e','pool'];
back.forEach(id=>Z[id].r=mr(AB,Z[id].r));
['terrace','steps-w','walk','strip'].forEach(id=>Z[id].r=mr(AH,Z[id].r));
delete Z['passage-w'];delete Z['garden-side'];
Z.parking.r=[1.17,23.95,6.17,27.71];
Z.front.r=[6.32,22.76,16.59,27.71];
Z.front2.r=[16.59,22.76,20.83,25.14];
Z.walk2.r=[11.85,22.95,13.3,27.71]; // allée côté rue inchangée
Z['palier']={id:'palier',type:'paving',r:[8.96,22.95,13.3,24.1]};
Z['side-l']={id:'side-l',type:'paving',label:'Passage',r:[1.17,10.97,2.36,23.95]};
Z['side-r']={id:'side-r',type:'paving',label:'Passage',r:[19.61,10.06,20.83,22.76]};
Z['side-r2']={id:'side-r2',type:'paving',r:[17.96,10.06,19.61,16.61]};
M.zones=Object.values(Z);
// pièces
M.rooms=M.rooms.map(r=>keepRoom.has(r.id)?r:{...r,poly:r.poly.map(([x,y])=>[f(backRoom.has(r.id)?AB:AH,x),y]).reverse()});
M.walls=M.walls.map(w=>isFront(w)?w:mr(axOf(w),w));
M.windows=M.windows.map(w=>keepRoom.has(w.room)?w:{...w,r:mr(backRoom.has(w.room)||isBack(w.r)?AB:AH,w.r)});
M.doors=M.doors.map(d=>{if(keepRoom.has(d.room))return d;const A=backRoom.has(d.room)?AB:AH;
 if(d.ax==='h')return{...d,a:f(A,d.b),b:f(A,d.a),hinge:d.hinge==='a'?'b':d.hinge==='b'?'a':d.hinge};
 return{...d,c:f(A,d.c),side:d.side?-d.side:d.side}});
M.stairs={...M.stairs,r:mr(AH,M.stairs.r),mid:f(AH,M.stairs.mid)};
M.steps=M.steps.map(s=>({...s,r:mr(AH,s.r),at:s.ax==='v'?s.at.map(x=>f(AH,x)).reverse():s.at}));
M.dims=M.dims.map(d=>{const A=Math.max(d.p[1],d.q[1])<10.2?AB:AH;return{...d,p:[f(A,d.q[0]),d.p[1]],q:[f(A,d.p[0]),d.q[1]]}});
if(M.slits)M.slits=M.slits.map(x=>f(AH,x+.12));if(M.claustraX)M.claustraX=[f(AH,M.claustraX[1]),f(AH,M.claustraX[0])];
M.cars=[{x:3.36,z0:24.0,L:4.6,W:1.85,H:1.55,label:'Voiture type (4,60 x 1,85 m)'}];
require('fs').writeFileSync('model_mirror.js','globalThis.VILLA_MODEL='+JSON.stringify(M)+';\nif(typeof module!=="undefined")module.exports=globalThis.VILLA_MODEL;\n');
const ent=M.rooms.find(r=>r.id==='entree'),st=M.rooms.find(r=>r.id==='escalier');
console.log('entree x',Math.min(...ent.poly.map(p=>p[0])),Math.max(...ent.poly.map(p=>p[0])),'escalier x',Math.min(...st.poly.map(p=>p[0])),Math.max(...st.poly.map(p=>p[0])));

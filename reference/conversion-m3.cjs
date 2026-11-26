/* Conversion unique, déjà faite (ne pas relancer : m3.json est maintenant la source). Garde la trace du passage
   prototype corrigé (model.js + objets codés en dur dans geo.js) -> m3.json en coordonnées absolues. */
const fs=require('fs');
const REF=__dirname+'/prototype-corrige/';
const M=JSON.parse(JSON.stringify(require(REF+'model.js')));
const AH=M.mirror.house, AB=M.mirror.back;
const r3=v=>+(+v).toFixed(3);
const fx=(A,x)=>r3(2*A-x);
const box=(A,x0,y0,z0,x1,y1,z1)=>A?[fx(A,x1),r3(y0),r3(z0),fx(A,x0),r3(y1),r3(z1)]:[x0,y0,z0,x1,y1,z1].map(r3);
const deg=a=>r3(a*180/Math.PI);
const FL=0.1,H=3.0;

/* ---- murs : hauteur explicite (fonction wallH du prototype), écart corrigé pour local technique et pool house ---- */
function wallH(w){const cy=(w[1]+w[3])/2,cx=(w[0]+w[2])/2;if(cy<7)return cx>16?2.8:(w[1]>6.6?2.2:2.4);if(cy>25)return 2.8;return H}
const walls=M.walls.map(w=>{const cy=(w[1]+w[3])/2,cx=(w[0]+w[2])/2;let h=wallH(w);
  // fond de parcelle inversé : la règle du prototype (cx>16) visait l'ancien côté du pool house
  if(cy<7){h=w[1]>6.6?2.2:(cx<11?2.8:2.4)}
  const o={r:w};if(h!==H)o.h=h;return o});

/* ---- ouvertures : allège et linteau explicites (openSpec du prototype) ---- */
function openSpec(w){
 if(/^b[123]$/.test(w.id))return{sill:0,head:2.6};
 if(w.id==='b4'||w.id==='w9')return{sill:.25,head:2.6};
 if(w.glass)return{sill:0,head:2.3};
 const len=Math.max(w.r[2]-w.r[0],w.r[3]-w.r[1]);
 if(w.id==='w3')return{sill:1.05,head:2.3};
 if(len<.8)return{sill:1.5,head:2.2};
 return{sill:.95,head:2.3}}
const windows=M.windows.map(w=>({...w,...openSpec(w)}));
const doors=M.doors.map(d=>{const o={...d,head:d.passage?2.5:2.2};if(d.id==='d-entree')o.leaf='dark';return o});
const slits=M.slits.map((x,i)=>({id:'f'+(i+1),ax:'h',c:21.23,a:x,b:r3(x+.12),sill:.35,head:2.45,src:'est'}));

/* ---- pièces : étiquettes et sols particuliers ---- */
const rooms=M.rooms.map(r=>{const o={...r};
 if(r.id==='degag')o.label={x:fx(AH,7.6),z:17.55,w:5.5,h:1.9};
 if(r.id==='cuis-am')o.label={x:fx(AH,16.3),z:15.0,w:3.9,h:2.9};
 if(r.id==='buand'||r.id==='tc'){const zs=r.poly.map(p=>p[1]);o.label={x:fx(AH,17.3),z:r3((Math.min(...zs)+Math.max(...zs))/2),w:1.85,h:r3(Math.max(...zs)-Math.min(...zs))}}
 if(r.id==='local')o.floor='#b9b4ab';
 return o});
const zones=M.zones.map(z=>{const o={...z};
 if(!o.src)o.src='est';
 if(z.id==='deck')o.label={x:fx(AB,9.2),z:9.35,w:r3(z.r[2]-z.r[0]),h:1.6};
 if(z.id==='front')o.label={x:8.4,z:25.3,w:r3(z.r[2]-z.r[0]),h:r3(z.r[3]-z.r[1])};
 if(z.id==='parking'){o.name='Parking';o.label={x:3.6,z:25.3,w:4.9,h:4.9}}
 if(z.label==='Passage'){delete o.label;o.note='Passage d’environ 1,2 m, absent du plan, confirmé par Amadougaye.'}
 return o});
const gates=M.gates.map(g=>{const o={...g,z:[27.71,27.81]};if(g.label==='Portail véhicules')o.bars=true;return o});

/* ---- objets : mobilier, annexes, végétation, étage indicatif, éclairages (ordre du prototype) ---- */
const O=[];
const B=(A,calque,couleur,mat,c,extra={})=>O.push({type:'boite',calque,r:box(A,...c),couleur,mat,...extra});
// plans de travail (plan)
[[14.34,11.11,16.6,11.71],[14.34,11.71,14.94,13.0],[17.66,13.6,18.24,16.4],[16.2,15.9,17.66,16.45]].forEach(([x0,z0,x1,z1])=>O.push({type:'plan-travail',r:[fx(AH,x1),z0,fx(AH,x0),z1],src:'plan'}));
// annexes : pool house, local technique
B(AB,'base','wood','bois',[16.87,0,3.15,20.78,2.85,3.32]);
B(AB,'base','wall','uni',[20.66,0,3.15,20.83,2.85,6.11]);
B(AB,'base','wall','uni',[16.87,0,3.15,17.04,2.85,4.9],{collision:true});
B(AB,'base','wall','uni',[16.87,0,5.86,17.12,2.85,6.12]);
B(AB,'base','wall','uni',[16.75,2.85,3.04,20.95,3.1,6.32]);
B(AB,'base','wood','bois',[17.4,FL,3.36,20.4,1.05,3.92],{collision:true});
B(AB,'base','#e9e5de','uni',[17.36,1.05,3.32,20.44,1.1,4.0]);
for(const x of [17.8,18.3,18.8,19.3,19.8])B(AB,'base','dark','uni',[x-.12,FL,4.2,x+.12,.75,4.44]);
B(AB,'base','wall','uni',[1.1,2.4,3.04,2.8,2.55,5.3]);
B(AB,'base','stone','pierre',[1.17,0,6.66,2.67,2.2,6.74]);
B(0,'base','wall','uni',[16.55,2.8,25.1,20.95,3.0,27.81]);
// mobilier extérieur (rendus)
[[14.9,5.0,0],[15.8,5.0,0],[14.9,9.3,Math.PI/2]].forEach(([x,z,a])=>O.push({type:'transat',x:fx(AB,x),z,rot:deg(-a)||0,src:'est'}));
[[4.4,10.95,2.2,.85,Math.PI],[6.2,10.6,.8,.8,Math.PI*1.15]].forEach(([x,z,w,d,a])=>O.push({type:'canape',x:fx(AH,x),z,l:w,p:d,rot:deg(-a),src:'est'}));
B(AH,'base','#d8d4cc','uni',[5.0,FL,10.25,5.8,.45,10.85]);
// jardinières
[[AH,3.7,22.9,8.3,23.35,'#7d68b8'],[AH,14.5,24.05,18.2,24.5,'#7d68b8'],[0,6.3,27.15,9.9,27.6,'#6d9a49']].forEach(([A,x0,z0,x1,z1,c])=>O.push({type:'jardiniere',r:A?[fx(A,x1),z0,fx(A,x0),z1]:[x0,z0,x1,z1],couleur:c,src:'est'}));
// palmiers (les 3 du fond étaient retournés par symétrie)
[[0,7.3,25.3,5.6,[.4,-.2]],[0,15.0,26.4,4.8,[-.3,.3]],[AB,19.7,8.4,6.0,[.2,.4]],[AB,19.7,15.0,5.0,[.3,-.2]],[AB,19.6,21.0,5.6,[-.2,.3]]].forEach(([A,x,z,h,l])=>O.push({type:'palmier',x:A?fx(A,x):x,z,h,inclinaison:A?[r3(-l[0]),l[1]]:l,src:'est'}));
[[-7,18,1.2],[29,9,1.1],[27,33,1.3],[-5,2,1],[8,38,1.1],[-9,34,.9],[33,22,1]].forEach(([x,z,s])=>O.push({type:'acacia',x,z,echelle:s,src:'est'}));
[[2.6,3.6,1],[3.4,3.55,0],[15.6,3.6,1],[9.1,9.75,1],[2.95,9.7,0]].forEach(([x,z,f])=>O.push({type:'pot',x:fx(AB,x),z,fleurs:!!f,src:'est'}));
O.push({type:'barbecue',x:fx(AB,16.1),z:9.6,src:'est'});
O.push({type:'douche',x:fx(AB,1.9),z:6.2,src:'est'});
// étage : volume indicatif
const R='roof';
B(AH,R,'wall','uni',[1.12,H,10.0,18.37,H+.3,23.45]);B(AH,R,'wall','uni',[14.31,H,23.45,18.37,H+.3,23.95]);
B(AH,R,'wall','uni',[2.67,3.3,12.9,18.37,6.2,22.4]);B(AH,R,'wall','uni',[14.31,3.3,22.4,18.37,6.2,23.95]);
B(AH,R,'#ebe8e1','uni',[2.6,6.2,12.85,18.42,6.45,22.45]);B(AH,R,'#ebe8e1','uni',[14.26,6.2,22.4,18.42,6.45,24.0]);
[[3.5,6.5],[7.2,10.2],[10.9,13.9]].forEach(([a,b])=>{B(AH,R,'#2e3a42','verre',[a,3.45,12.86,b,5.95,12.92]);B(AH,R,'frame','uni',[a-.05,3.4,12.84,b+.05,3.45,12.93])});
[[3.9,7.6],[9.3,12.6]].forEach(([a,b])=>B(AH,R,'#2e3a42','verre',[a,3.45,22.38,b,5.95,22.44]));
B(AH,R,'wood','bois',[14.9,3.5,23.95,17.7,6.0,24.05]);
// claustra de façade : position des données (devant l'escalier), le prototype la retournait une seconde fois
O.push({type:'claustra',calque:'base',x0:M.claustraX[0],x1:M.claustraX[1],z0:22.82,z1:22.9,y0:FL,y1:H,pas:.16,lame:.07,src:'est'});
// claustra de l'étage : lames du prototype, retournées
{const xs=[];for(let x=3.0;x<4.2;x+=.16)xs.push(x);const x0=fx(AH,xs[xs.length-1]+.07);
 O.push({type:'claustra',calque:R,x0,x1:r3(x0+(xs.length-1)*.16+.03),z0:22.5,z1:22.58,y0:3.4,y1:6.1,pas:.16,lame:.07,src:'est'})}
B(AH,'glassR','#7f8f97','verre',[2.67,3.3,10.03,14.21,4.3,10.07]);B(AH,'glassR','#7f8f97','verre',[1.2,3.3,23.4,14.31,4.3,23.44]);
// éclairages
const spot=(A,calque,x,y,z,I,eclaire)=>O.push({type:'spot',calque,x:A?fx(A,x):r3(x),y,z,I,eclaire});
for(let x=3.2;x<14;x+=1.5){spot(AH,R,x,3.0,10.57,1.4,'roof');spot(AH,R,x,3.0,23.07,1.4,'roof')}
for(let x=17.6;x<20.5;x+=1.2)spot(AB,'base',x,2.85,5.07,1.0,'both');
[[5.2,14.3],[8.5,14.3],[11.8,14.3],[16.3,15.0],[16.3,12.2],[7.6,17.55],[12.6,19.8],[5.95,20.6],[2.35,19.45],[2.35,21.5],[16.3,21.7],[17.2,17.3],[17.2,18.75],[15.2,18.75],[12.6,21.8],[9.6,20.4]].forEach(([x,z])=>{
 // plafonnier du porche : le prototype l'avait laissé à l'ancienne place du porche (dans l'escalier)
 if(x===12.6&&z===21.8){spot(0,R,10.63,3.0,z,2.6,'roof');return}
 spot(AH,R,x,3.0,z,2.6,'roof')});
spot(AB,'base',1.9,2.4,4.2,1.1,'both');
[[18.1,26.5],[20.25,26.5]].forEach(([x,z])=>spot(0,'base',x,2.8,z,1.1,'both'));

/* ---- points à vérifier ---- */
const checks=[
 {id:'portes',t:'Portes intérieures',d:'Suite, dressing, salle de bain, chambre bonne et porte d’entrée ne sont pas dessinées sur le plan. Positions proposées.',focus:'d-suite',focusRect:[6.34,18.5,19.54,22.7]},
 {id:'passage',t:'Lien hall / séjour',d:'Le plan montre un mur continu entre le dégagement et le séjour. Passage de 1,80 m proposé dans l’axe de l’entrée.',focus:'o-sejour'},
 {id:'baies',t:'Baies côté terrasse',d:'Aucune baie dessinée sur la façade piscine. Trois baies coulissantes reprises des rendus.',focus:'b2'},
 {id:'baie-bonne',t:'Baie de la chambre bonne',d:'Fenêtre en façade avant tirée des rendus, absente du plan.',focus:'b4'},
 {id:'allee',t:'Allée d’entrée',d:'Allée dallée du portillon aux marches, et dallage jusqu’au porche : tracés estimés.',focus:'walk2'},
 {id:'sortie-cuisine',t:'Sortie de la cuisine',d:'Hypothèse : porte de 0,90 m de la cuisine américaine vers le passage gauche, position exacte à confirmer. Attention, à cet endroit le plan dessine le plan de travail (de 13,60 à 16,40 m le long du mur) : la porte le traverse.',focus:'d-cuis-ext'},
 {id:'parking',t:'Profondeur du parking',d:'Fait (calculé) : 3,76 m entre la chambre bonne et la clôture, contre 4,95 m avant correctif. La voiture type de 4,60 m dépasse d’environ 0,90 m. La jardinière de 0,45 m devant la chambre bonne réduit encore la place. Profondeur de la chambre bonne ou du parking à mesurer sur place.',focus:'parking'},
 {id:'parcelle',t:'Dimensions de la parcelle',d:'Le plan annonce 20 × 25 m. Le dessin mesure 19,88 × 24,77 m à l’extérieur des clôtures.',focus:null},
 {id:'murs',t:'Épaisseur des murs',d:'Murs dessinés à 10 cm sur le plan (15 cm pour l’escalier). À confirmer.',focus:null},
 {id:'hauteurs',t:'Hauteurs',d:'Non fournies. Hypothèse pour la 3D : 3 m sous plafond au RDC, allèges et linteaux estimés, étage entièrement estimé.',focus:null}
];

const OUT={
 id:'m3',name:'Villa M3',level:'Rez-de-chaussée',subtitle:'Keur Cheikh · parcelle 20 × 25 m · M3_RDC',
 repere:'Mètres, repère du PDF M3_RDC à l’échelle 1:75 (1 m = 37,795 pt). X = x du plan, Z = y du plan, Y = hauteur. Intérieur inversé gauche/droite selon le correctif du 26/11/2026.',
 heights:{rdc:H,floor:FL,src:'est'},
 site:M.site,zones,rooms,fence:M.fence,walls,windows,slits,doors,stairs:M.stairs,steps:M.steps,gates,dims:M.dims,cars:M.cars.map(c=>({...c,src:'est'})),
 objects:O,checks
};
/* écriture : une entrée par ligne pour garder des diffs lisibles */
const lines=['{'];const keys=Object.keys(OUT);
keys.forEach((k,i)=>{const v=OUT[k],end=i<keys.length-1?',':'';
 if(Array.isArray(v)&&v.length&&typeof v[0]==='object'){lines.push(` "${k}": [`);v.forEach((e,j)=>lines.push('  '+JSON.stringify(e)+(j<v.length-1?',':'')));lines.push(' ]'+end)}
 else lines.push(` "${k}": ${JSON.stringify(v)}${end}`)});
lines.push('}');
fs.writeFileSync(__dirname+'/../src/data/gabarits/m3.json',lines.join('\n')+'\n');
console.log('objets',O.length,'murs',walls.filter(w=>w.h).map(w=>w.r.join(',')+' h'+w.h));

/* Villa M3 : construction de la géométrie 3D (navigateur et Node).
   Repère : X = x du plan, Z = y du plan, Y = hauteur (m). */
(function(G){
'use strict';
/* ---------- maths ---------- */
const I4=()=>{const m=new Float32Array(16);m[0]=m[5]=m[10]=m[15]=1;return m};
function mul(a,b){const o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++){let s=0;for(let k=0;k<4;k++)s+=a[k*4+r]*b[c*4+k];o[c*4+r]=s}return o}
const mT=(x,y,z)=>{const m=I4();m[12]=x;m[13]=y;m[14]=z;return m};
const mS=(x,y,z)=>{const m=I4();m[0]=x;m[5]=y;m[10]=z;return m};
const mRy=a=>{const m=I4(),c=Math.cos(a),s=Math.sin(a);m[0]=c;m[2]=-s;m[8]=s;m[10]=c;return m};
const mRx=a=>{const m=I4(),c=Math.cos(a),s=Math.sin(a);m[5]=c;m[6]=s;m[9]=-s;m[10]=c;return m};
const mRz=a=>{const m=I4(),c=Math.cos(a),s=Math.sin(a);m[0]=c;m[1]=s;m[4]=-s;m[5]=c;return m};
function persp(f,a,n,fa){const t=1/Math.tan(f/2),m=new Float32Array(16);m[0]=t/a;m[5]=t;m[10]=(fa+n)/(n-fa);m[11]=-1;m[14]=2*fa*n/(n-fa);return m}
function ortho(l,r,b,t,n,f){const m=I4();m[0]=2/(r-l);m[5]=2/(t-b);m[10]=-2/(f-n);m[12]=-(r+l)/(r-l);m[13]=-(t+b)/(t-b);m[14]=-(f+n)/(f-n);return m}
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const norm=a=>{const l=Math.hypot(a[0],a[1],a[2])||1;return[a[0]/l,a[1]/l,a[2]/l]};
function lookAt(e,c,u){const z=norm(sub(e,c)),x=norm(cross(u,z)),y=cross(z,x);const m=I4();
 m[0]=x[0];m[4]=x[1];m[8]=x[2];m[1]=y[0];m[5]=y[1];m[9]=y[2];m[2]=z[0];m[6]=z[1];m[10]=z[2];
 m[12]=-dot(x,e);m[13]=-dot(y,e);m[14]=-dot(z,e);return m}
const tp=(m,p)=>[m[0]*p[0]+m[4]*p[1]+m[8]*p[2]+m[12],m[1]*p[0]+m[5]*p[1]+m[9]*p[2]+m[13],m[2]*p[0]+m[6]*p[1]+m[10]*p[2]+m[14]];
const hex=h=>{const n=parseInt(h.slice(1),16);return[(n>>16&255)/255,(n>>8&255)/255,(n&255)/255]};

function buildScene(M){
const H_RDC=3.0,FL=0.1,LIGHTS=[];
const MH=(M.mirror&&M.mirror.house)||0,MB=(M.mirror&&M.mirror.back)||0;let MC=0,MIR=false,MM=null;const setM=a=>{MC=a;MIR=!!a;MM=mul(mT(2*a,0,0),mS(-1,1,1))};
const mxr=r=>MIR?[2*MC-r[2],r[1],2*MC-r[0],r[3]]:r;

/* ---------- géométrie ---------- */
const BATCH={};
const bat=k=>BATCH[k]||(BATCH[k]={p:[],n:[],c:[],m:[],i:[],nv:0});
const CORN=[[-.5,-.5,-.5],[.5,-.5,-.5],[.5,.5,-.5],[-.5,.5,-.5],[-.5,-.5,.5],[.5,-.5,.5],[.5,.5,.5],[-.5,.5,.5]];
const FACES=[[0,3,2,1],[4,5,6,7],[0,4,7,3],[1,2,6,5],[3,7,6,2],[0,1,5,4]];
const CELL=.3,MAXC=48;
function vtx(b,p,n,c,mat){b.p.push(p[0],p[1],p[2]);b.n.push(n[0],n[1],n[2]);b.c.push(c[0],c[1],c[2]);b.m.push(mat);return b.nv++}
function boxM(k,m,col,mat){if(MIR)m=mul(MM,m);const b=bat(k),C=CORN.map(p=>tp(m,p)),ctr=tp(m,[0,0,0]),c=typeof col==='string'?hex(col):col;
 for(const f of FACES){const q=f.map(i=>C[i]);let n=norm(cross(sub(q[1],q[0]),sub(q[3],q[0])));
  if(!isFinite(n[0]))continue;
  const fc=[(q[0][0]+q[2][0])/2,(q[0][1]+q[2][1])/2,(q[0][2]+q[2][2])/2];
  let flip=false;if(dot(n,sub(fc,ctr))<0){n=n.map(v=>-v);flip=true}
  const eu=sub(q[1],q[0]),ev=sub(q[3],q[0]);
  const nu=Math.min(MAXC,Math.max(1,Math.ceil(Math.hypot(...eu)/CELL))),nvv=Math.min(MAXC,Math.max(1,Math.ceil(Math.hypot(...ev)/CELL)));
  const base=b.nv;
  for(let j=0;j<=nvv;j++)for(let i=0;i<=nu;i++){const u=i/nu,v=j/nvv;vtx(b,[q[0][0]+eu[0]*u+ev[0]*v,q[0][1]+eu[1]*u+ev[1]*v,q[0][2]+eu[2]*u+ev[2]*v],n,c,mat)}
  const W=nu+1;if(nu>1||nvv>1)(b.g||(b.g=[])).push([base,W,nvv+1]);
  for(let j=0;j<nvv;j++)for(let i=0;i<nu;i++){const a=base+j*W+i,bb=a+1,cc=a+W+1,d=a+W;
   if(flip)b.i.push(a,cc,bb,a,d,cc);else b.i.push(a,bb,cc,a,cc,d)}}}
function bx(k,x0,y0,z0,x1,y1,z1,col,mat=0){if(x1-x0<1e-4||y1-y0<1e-4||z1-z0<1e-4)return;boxM(k,mul(mT((x0+x1)/2,(y0+y1)/2,(z0+z1)/2),mS(x1-x0,y1-y0,z1-z0)),col,mat)}
function tri(k,a,b,c,col,mat){if(MIR){const f=p=>[2*MC-p[0],p[1],p[2]];[a,b,c]=[f(a),f(c),f(b)]}const B=bat(k),cc=typeof col==='string'?hex(col):col;const n=norm(cross(sub(b,a),sub(c,a)));if(!isFinite(n[0]))return;for(const p of [a,b,c])B.i.push(vtx(B,p,n,cc,mat))}
/* prisme à n côtés (troncs, pots, colonnes) */
function prism(k,cx,cz,r0,r1,y0,y1,n,col,mat=0,cap=true,ox=0,oz=0){const c=typeof col==='string'?hex(col):col;
 for(let i=0;i<n;i++){const a0=i/n*Math.PI*2,a1=(i+1)/n*Math.PI*2;
  const p0=[cx+Math.cos(a0)*r0,y0,cz+Math.sin(a0)*r0],p1=[cx+Math.cos(a1)*r0,y0,cz+Math.sin(a1)*r0],q0=[cx+ox+Math.cos(a0)*r1,y1,cz+oz+Math.sin(a0)*r1],q1=[cx+ox+Math.cos(a1)*r1,y1,cz+oz+Math.sin(a1)*r1];
  tri(k,p0,q0,q1,c,mat);tri(k,p0,q1,p1,c,mat);
  if(cap)tri(k,[cx+ox,y1,cz+oz],q1,q0,c,mat)}}
/* boîte le long d'un segment du plan (pour vantaux de porte, planches) */
function seg(k,x0,z0,x1,z1,th,y0,y1,col,mat=0){const L=Math.hypot(x1-x0,z1-z0),a=Math.atan2(z1-z0,x1-x0);
 boxM(k,mul(mT((x0+x1)/2,(y0+y1)/2,(z0+z1)/2),mul(mRy(-a),mS(L,y1-y0,th))),col,mat)}

/* matériaux : 0 uni, 1 lames bois terrasse, 2 gazon, 3 eau, 4 mosaïque, 5 carrelage, 6 bois vertical, 7 pavés, 8 lumineux, 9 verre, 10 pierre */
const C={wall:'#f2f0ea',fence:'#ecebe5',frame:'#3a3d41',glass:'#9fb6c2',floor:'#d9d3c8',deck:'#9b968f',lawn:'#557d38',sand:'#c9a27a',paving:'#c3bcb0',park:'#8f8b85',terr:'#dcd7cf',wood:'#8a5a36',dark:'#2a2a2c',stone:'#8d8a84',spot:'#fff3d6',door:'#ebe5db'};

/* ---------- ouvertures ---------- */
function openSpec(w){
 if(/^b[123]$/.test(w.id))return{sill:0,head:2.6};
 if(w.id==='b4'||w.id==='w9')return{sill:.25,head:2.6};
 if(w.glass)return{sill:0,head:2.3};
 const len=Math.max(w.r[2]-w.r[0],w.r[3]-w.r[1]);
 if(w.id==='w3')return{sill:1.05,head:2.3};
 if(len<.8)return{sill:1.5,head:2.2};
 return{sill:.95,head:2.3}}
const OPS=[];
M.windows.forEach(w=>{const [x0,y0,x1,y1]=w.r,hz=(x1-x0)>(y1-y0);OPS.push({ax:hz?'h':'v',c:hz?(y0+y1)/2:(x0+x1)/2,a:hz?x0:y0,b:hz?x1:y1,...openSpec(w),win:true,id:w.id})});
M.doors.forEach(d=>OPS.push({ax:d.ax,c:d.c,a:d.a,b:d.b,sill:0,head:d.passage?2.5:2.2,door:true,id:d.id}));
(M.slits||[13.15,13.45,13.75]).forEach((x,i)=>OPS.push({ax:'h',c:21.23,a:x,b:x+.12,sill:.35,head:2.45,win:true,id:'slit'+i}));
const COLL=[];{const _cp=COLL.push.bind(COLL);COLL.push=r=>_cp(mxr(r));}
function wallH(w){const cy=(w[1]+w[3])/2,cx=(w[0]+w[2])/2;if(cy<7)return cx>16?2.8:(w[1]>6.6?2.2:2.4);if(cy>25)return 2.8;return H_RDC}
function buildWall(w){
 const [x0,y0,x1,y1]=w,hz=(x1-x0)>=(y1-y0),H=wallH(w),cs=hz?(y0+y1)/2:(x0+x1)/2,ht=(hz?y1-y0:x1-x0)/2,A=hz?x0:y0,B=hz?x1:y1;
 const ops=OPS.filter(o=>o.ax===(hz?'h':'v')&&Math.abs(o.c-cs)<=ht+.04&&o.b>A+.01&&o.a<B-.01).map(o=>({...o,a:Math.max(o.a,A),b:Math.min(o.b,B)})).sort((p,q)=>p.a-q.a);
 const put=(a,b,ya,yb,col=C.wall,mat=12,k='base')=>{if(b-a<.005)return;if(hz)bx(k,a,ya,y0,b,yb,y1,col,mat);else bx(k,x0,ya,a,x1,yb,b,col,mat);if(ya<1&&k==='base')COLL.push(hz?[a,y0,b,y1]:[x0,a,x1,b])};
 let cur=A;
 for(const o of ops){put(cur,o.a,0,H);if(o.sill>0)put(o.a,o.b,0,o.sill);if(o.head<H)put(o.a,o.b,o.head,H);
  if(o.win){const t=.05,fr=(a,b,ya,yb)=>{if(hz)bx('base',a,ya,cs-t,b,yb,cs+t,C.frame);else bx('base',cs-t,ya,a,cs+t,yb,b,C.frame)};
   fr(o.a,o.a+.05,o.sill,o.head);fr(o.b-.05,o.b,o.sill,o.head);fr(o.a,o.b,o.sill,o.sill+.05);fr(o.a,o.b,o.head-.05,o.head);
   const W=o.b-o.a;if(W>1.6){const n=Math.round(W/1.5);for(let i=1;i<n;i++){const m=o.a+W*i/n;fr(m-.025,m+.025,o.sill,o.head)}}
   if(hz)bx('glass',o.a,o.sill,cs-.012,o.b,o.head,cs+.012,'#7f8f97',9);else bx('glass',cs-.012,o.sill,o.a,cs+.012,o.head,o.b,'#7f8f97',9);
   if(o.sill>0)COLL.push(hz?[o.a,y0,o.b,y1]:[x0,o.a,x1,o.b]);
   if(o.sill===0&&o.id!=='g1')COLL.push(hz?[o.a,y0,o.b,y1]:[x0,o.a,x1,o.b])}
  cur=o.b}
 put(cur,B,0,H)}
M.walls.forEach(buildWall);

/* vantaux de porte, ouverts à 90° */
M.doors.forEach(d=>{if(d.passage)return;const P=(u,v)=>d.ax==='h'?[u,v]:[v,u],col=d.id==='d-entree'?C.dark:C.door,w=d.b-d.a;
 const leaf=(hv,len)=>{const H=P(hv,d.c),L=P(hv,d.c+d.side*len);seg('base',H[0],H[1],L[0],L[1],.04,FL,2.18,col)};
 if(d.double){leaf(d.a,w/2);leaf(d.b,w/2)}else leaf(d.hinge==='a'?d.a:d.b,w)});

/* ---------- sols ---------- */
function rectsOfPoly(poly){const xs=[...new Set(poly.map(p=>p[0]))].sort((a,b)=>a-b),ys=[...new Set(poly.map(p=>p[1]))].sort((a,b)=>a-b),out=[];
 const inside=(x,y)=>{let c=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const [xi,yi]=poly[i],[xj,yj]=poly[j];if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)c=!c}return c};
 for(let i=0;i<xs.length-1;i++)for(let j=0;j<ys.length-1;j++)if(inside((xs[i]+xs[i+1])/2,(ys[j]+ys[j+1])/2))out.push([xs[i],ys[j],xs[i+1],ys[j+1]]);return out}
M.rooms.forEach(r=>rectsOfPoly(r.poly).forEach(([a,b,c,d])=>bx('base',a-.06,0,b-.06,c+.06,FL,d+.06,r.id==='local'?'#b9b4ab':C.floor,5)));
const pool=((M.zones.find(z=>z.type==='pool')||{}).r)||[4.24,3.67,14.14,8.62];
minus([-40,-30,62,60],pool).forEach(r=>bx('base',r[0],-.3,r[1],r[2],-.02,r[3],C.sand,2));
function minus(r,h){const [a,b,c,d]=r,[e,f,g,k]=h;if(g<=a||e>=c||k<=b||f>=d)return[r];const o=[];
 if(f>b)o.push([a,b,c,f]);if(k<d)o.push([a,k,c,d]);const yb=Math.max(b,f),yt=Math.min(d,k);if(e>a)o.push([a,yb,e,yt]);if(g<c)o.push([g,yb,c,yt]);return o}
minus([1.07,3.04,20.95,27.81],pool).forEach(r=>bx('base',r[0],-.1,r[1],r[2],-.005,r[3],'#7d6a55',0));
const ZS={deck:[C.deck,1,.06],lawn:[C.lawn,2,.015],paving:[C.paving,7,.03],parking:[C.park,7,.025],covered:[C.terr,5,.08]};
M.zones.forEach(z=>{if(z.type==='pool')return;const [col,mat,h]=ZS[z.type];(z.type==='deck'?minus(z.r,pool):[z.r]).forEach(r=>bx('base',r[0],-.01,r[1],r[2],h,r[3],col,mat))});
/* piscine */
const [px0,pz0,px1,pz1]=pool,PD=-1.4;
bx('base',px0,PD-.1,pz0,px1,PD,pz1,'#2f7fb4',4);
[[px0,pz0,px1,pz0+.15],[px0,pz1-.15,px1,pz1],[px0,pz0,px0+.15,pz1],[px1-.15,pz0,px1,pz1]].forEach(r=>bx('base',r[0],PD,r[1],r[2],-.02,r[3],'#2f7fb4',4));
[[px0-.32,pz0-.32,px1+.32,pz0],[px0-.32,pz1,px1+.32,pz1+.32],[px0-.32,pz0,px0,pz1],[px1,pz0,px1+.32,pz1]].forEach(r=>bx('base',r[0],-.02,r[1],r[2],.1,r[3],'#efece6',0));
bx('water',px0+.15,-.17,pz0+.15,px1-.15,-.16,pz1-.15,'#0f7590',3);
COLL.push(pool);
/* marches */
M.steps.forEach(s=>{const n=s.at.length-1;for(let i=0;i<n;i++){const h=FL*(i+1)/(n+1)+.02;
 if(s.ax==='v'){const a=s.at[n-1-i],b=s.at[n-i];bx('base',Math.min(a,b),0,s.r[1],Math.max(a,b)+(i?0:0),h+.03,s.r[3],C.paving,7)}
 else bx('base',s.r[0],0,s.at[i],s.r[2],FL*(n-i)/(n+1)+.02,s.at[i+1],C.paving,7)}});
bx('base',3.28,0,16.61,4.68,FL,18.5,C.paving,7);
/* escalier intérieur en U */
{const st=M.stairs,[sx0,sz0,sx1,sz1]=st.r,mid=st.mid;
 const n1=10,d1=(21.45-19.1)/n1;for(let i=0;i<n1;i++){const z=21.45-(i+1)*d1;bx('base',mid+.05,FL,z,sx1,FL+(i+1)*.17,z+d1+(i?0:.0),C.floor,5)}
 bx('base',sx0,FL,sz0,sx1,FL+1.7,19.1,C.floor,5);
 const n2=8,d2=(21.45-19.1)/n2;for(let i=0;i<n2;i++){const z=19.1+i*d2;bx('base',sx0,FL,z,mid-.05,FL+1.7+(i+1)*.1625,z+d2,C.floor,5)}
 bx('base',mid-.05,0,19.1,mid+.05,H_RDC,21.45,C.wall)}
/* clôture et portail */
M.fence.forEach(f=>{bx('base',f[0],0,f[1],f[2],2.2,f[3],C.fence,12);bx('base',f[0]-.02,2.2,f[1]-.02,f[2]+.02,2.26,f[3]+.02,'#dedbd4');COLL.push(f)});
for(let x=1.68;x<5.06;x+=.14)bx('base',x,.05,27.73,x+.08,2.0,27.79,C.dark);
bx('base',1.63,1.95,27.72,5.09,2.02,27.8,C.dark);COLL.push([1.63,27.71,5.09,27.81]);
/* plans de travail des cuisines (dessinés sur le plan) */
setM(MH);
const counter=(x0,z0,x1,z1)=>{bx('base',x0,FL,z0,x1,.88,z1,'#f4f2ee');bx('base',x0-.02,.88,z0-.02,x1+.02,.92,z1+.02,'#3b3936',0);COLL.push([x0,z0,x1,z1])};
counter(14.34,11.11,16.6,11.71);counter(14.34,11.71,14.94,13.0);counter(17.66,13.6,18.24,16.4);counter(16.2,15.9,17.66,16.45);
/* annexes : pool house, local technique, gardien */
setM(MB);
bx('base',16.87,0,3.15,20.78,2.85,3.32,C.wood,6);
bx('base',20.66,0,3.15,20.83,2.85,6.11,C.wall);
bx('base',16.87,0,3.15,17.04,2.85,4.9,C.wall);COLL.push([16.87,3.15,17.04,4.9]);
bx('base',16.87,0,5.86,17.12,2.85,6.12,C.wall);
bx('base',16.75,2.85,3.04,20.95,3.1,6.32,C.wall);
bx('base',17.4,FL,3.36,20.4,1.05,3.92,C.wood,6);bx('base',17.36,1.05,3.32,20.44,1.1,4.0,'#e9e5de');COLL.push([17.4,3.36,20.4,3.92]);
for(const x of [17.8,18.3,18.8,19.3,19.8])bx('base',x-.12,FL,4.2,x+.12,.75,4.44,C.dark);
bx('base',1.1,2.4,3.04,2.8,2.55,5.3,C.wall);
bx('base',1.17,0,6.66,2.67,2.2,6.74,C.stone,10);
setM(0);bx('base',16.55,2.8,25.1,20.95,3.0,27.81,C.wall);setM(MB);
/* mobilier extérieur repris des rendus (indicatif) */
const lounger=(x,z,a)=>{const k='base',m0=mul(mT(x,0,z),mRy(a));boxM(k,mul(m0,mul(mT(0,.18,0),mS(.68,.22,1.9))),'#f1efea',0);
 boxM(k,mul(m0,mul(mT(0,.34,.15),mS(.62,.08,1.5))),'#b4373f',0);boxM(k,mul(m0,mul(mT(0,.5,-.72),mul(mRx(-.6),mS(.62,.08,.55)))),'#b4373f',0)};
lounger(14.9,5.0,0);lounger(15.8,5.0,0);lounger(14.9,9.3,Math.PI/2);
const sofa=(x,z,w,d,a)=>{const m0=mul(mT(x,0,z),mRy(a));boxM('base',mul(m0,mul(mT(0,.22,0),mS(w,.3,d))),'#e8e6e1',0);
 boxM('base',mul(m0,mul(mT(0,.44,0),mS(w-.1,.16,d-.1))),'#6a5fc4',0);boxM('base',mul(m0,mul(mT(0,.6,-d/2+.12),mS(w,.5,.22))),'#e8e6e1',0)};
setM(MH);sofa(4.4,10.95,2.2,.85,Math.PI);sofa(6.2,10.6,.8,.8,Math.PI*1.15);bx('base',5.0,FL,10.1+.15,5.8,.45,10.1+.75,'#d8d4cc');
/* jardinières de façade */
const bed=(x0,z0,x1,z1,col)=>{bx('base',x0,0,z0,x1,.42,z1,'#f2f0ea');bx('base',x0+.06,.42,z0+.06,x1-.06,.62,z1-.06,col,2)};
bed(3.7,22.9,8.3,23.35,'#7d68b8');bed(14.5,24.05,18.2,24.5,'#7d68b8');setM(0);bed(6.3,27.15,9.9,27.6,'#6d9a49');
/* palmiers, acacias, pots */
let SEED=7;const rnd=()=>{SEED=(SEED*16807)%2147483647;return SEED/2147483647};
function palm(x,z,h,lean){const k='base',n=12;let px=x,pz=z,y=0;
 for(let i=0;i<n;i++){const t=i/n,t2=(i+1)/n,r0=.2-.07*t,r1=.2-.07*t2;
  const nx=x+lean[0]*t2*t2*h*.13,nz=z+lean[1]*t2*t2*h*.13;
  prism(k,px,pz,r0,r1*.96,y,y+h/n,8,i%2?'#8a7a66':'#7d6d5a',11,false,nx-px,nz-pz);px=nx;pz=nz;y+=h/n}
 prism(k,px,pz,.2,.08,y,y+.35,8,'#6f6a3a',2);
 const F=15;for(let i=0;i<F;i++){const a=i/F*Math.PI*2+rnd()*.3,len=2.3+rnd()*.8,up=.55-(i%3)*.32-rnd()*.15;
  let cx=px,cy=y+.2,cz=pz,pitch=up;const segs=5,sl=len/segs;
  const g=.85+rnd()*.25,col=[.22*g,.42*g,.15*g];
  for(let j=0;j<segs;j++){const w=(.62-j*.1)*(j===0?.6:1),dx=Math.cos(a)*Math.cos(pitch)*sl,dy=Math.sin(pitch)*sl,dz=Math.sin(a)*Math.cos(pitch)*sl;
   boxM(k,mul(mT(cx+dx/2,cy+dy/2,cz+dz/2),mul(mRy(-a),mul(mRz(pitch),mS(sl*1.05,.02,w)))),col,13);
   cx+=dx;cy+=dy;cz+=dz;pitch-=.28}}}
palm(7.3,25.3,5.6,[.4,-.2]);palm(15.0,26.4,4.8,[-.3,.3]);setM(MB);palm(19.7,8.4,6.0,[.2,.4]);palm(19.7,15.0,5.0,[.3,-.2]);palm(19.6,21.0,5.6,[-.2,.3]);
function acacia(x,z,s){const k='base';prism(k,x,z,.18*s,.13*s,0,1.6*s,7,'#5d4a3a',11,false);
 [[.9,.6],[-.8,.4],[.1,-.9]].forEach(([dx,dz])=>prism(k,x,z,.12*s,.07*s,1.6*s,2.8*s,6,'#5d4a3a',11,false,dx*s,dz*s));
 for(let i=0;i<4;i++){const ox=(rnd()-.5)*2.2*s,oz=(rnd()-.5)*2.2*s,r=(1.6+rnd()*.8)*s,y=(2.7+rnd()*.35)*s;
  prism(k,x+ox,z+oz,r,r*.92,y,y+.32*s,10,[.24,.33,.15],13);prism(k,x+ox,z+oz,r*.55,r*.5,y-.14*s,y,10,[.2,.28,.13],13,false)}}
setM(0);acacia(-7,18,1.2);acacia(29,9,1.1);acacia(27,33,1.3);acacia(-5,2,1);acacia(8,38,1.1);acacia(-9,34,.9);acacia(33,22,1);
setM(MB);function pot(x,z,flower){prism('base',x,z,.26,.32,0,.55,10,'#8b6b4c',6);prism('base',x,z,.3,.3,.5,.55,10,'#6f5440',0,true);
 for(let i=0;i<26;i++){const a=rnd()*6.28,t=.15+rnd()*.55,h=.35+rnd()*.45;boxM('base',mul(mT(x+Math.cos(a)*(.06+t*h*.5),.52+h/2*Math.cos(t),z+Math.sin(a)*(.06+t*h*.5)),mul(mRy(-a),mul(mRz(-t),mS(.015,h,.045)))),flower&&i%3===0?'#8a6fd0':'#4f7f36',13)}}
pot(2.6,3.6,1);pot(3.4,3.55,0);pot(15.6,3.6,1);pot(9.1,9.75,1);pot(2.95,9.7,0);
/* barbecue et douche */
prism('base',16.1,9.6,.22,.22,.75,.95,10,'#7a2f3a',0);prism('base',16.1,9.6,.03,.03,0,.75,6,C.dark,0);
prism('base',1.9,6.2,.03,.03,0,2.2,6,'#b8b6b0',0);bx('base',1.85,2.1,6.0,1.95,2.14,6.3,'#b8b6b0');
/* ---------- étage (volume indicatif) + plafonds ---------- */
setM(MH);const R='roof';
bx(R,1.12,H_RDC,10.0,18.37,H_RDC+.3,23.45,C.wall);bx(R,14.31,H_RDC,23.45,18.37,H_RDC+.3,23.95,C.wall);
bx(R,2.67,3.3,12.9,18.37,6.2,22.4,C.wall);bx(R,14.31,3.3,22.4,18.37,6.2,23.95,C.wall);
bx(R,2.6,6.2,12.85,18.42,6.45,22.45,'#ebe8e1');bx(R,14.26,6.2,22.4,18.42,6.45,24.0,'#ebe8e1');
[[3.5,6.5],[7.2,10.2],[10.9,13.9]].forEach(([a,b])=>{bx(R,a,3.45,12.86,b,5.95,12.92,'#2e3a42',9);bx(R,a-.05,3.4,12.84,b+.05,3.45,12.93,C.frame)});
[[3.9,7.6],[9.3,12.6]].forEach(([a,b])=>bx(R,a,3.45,22.38,b,5.95,22.44,'#2e3a42',9));
bx(R,14.9,3.5,23.95,17.7,6.0,24.05,C.wood,6);
for(let x=(M.claustraX||[8.7,10.7])[0];x<(M.claustraX||[8.7,10.7])[1];x+=.16)bx('base',x,FL,22.82,x+.07,H_RDC,22.9,C.wood,6);
for(let x=3.0;x<4.2;x+=.16)bx(R,x,3.4,22.5,x+.07,6.1,22.58,C.wood,6);
bx('glassR',2.67,3.3,10.03,14.21,4.3,10.07,'#7f8f97',9);bx('glassR',1.2,3.3,23.4,14.31,4.3,23.44,'#7f8f97',9);
const spot=(k,x,y,z,I,st)=>{bx(k,x-.07,y-.015,z-.07,x+.07,y,z+.07,C.spot,8);LIGHTS.push({p:[MIR?2*MC-x:x,y-.03,z],I,st})};
for(let x=3.2;x<14;x+=1.5){spot(R,x,3.0,10.57,1.4,'roof');spot(R,x,3.0,23.07,1.4,'roof')}
setM(MB);for(let x=17.6;x<20.5;x+=1.2)spot('base',x,2.85,5.07,1.0,'both');
setM(MH);/* plafonniers intérieurs (indicatifs, pour éclairer la visite) */
const ceil=[[5.2,14.3],[8.5,14.3],[11.8,14.3],[16.3,15.0],[16.3,12.2],[7.6,17.55],[12.6,19.8],[5.95,20.6],[2.35,19.45],[2.35,21.5],[16.3,21.7],[17.2,17.3],[17.2,18.75],[15.2,18.75],[12.6,21.8],[9.6,20.4]];
ceil.forEach(([x,z])=>spot(R,x,3.0,z,2.6,'roof'));
setM(MB);spot('base',1.9,2.4,4.2,1.1,'both');setM(0);[[18.1,26.5],[20.25,26.5]].forEach(([x,z])=>spot('base',x,2.8,z,1.1,'both'));

/* voiture type pour juger le parking */
setM(0);(M.cars||[]).forEach(c=>{const x0=c.x-c.W/2,x1=c.x+c.W/2,z0=c.z0,z1=c.z0+c.L;
 bx('base',x0,.32,z0,x1,.85,z1,'#8e9aa4',0);bx('base',x0+.12,.85,z0+1.1,x1-.12,1.4,z1-1.0,'#2e3a42',9);bx('base',x0+.14,1.4,z0+1.2,x1-.14,c.H,z1-1.1,'#8e9aa4',0);
 [[z0+.75],[z1-.8]].forEach(([z])=>{bx('base',x0-.02,0,z-.33,x0+.24,.66,z+.33,'#1c1c1c',0);bx('base',x1-.24,0,z-.33,x1+.02,.66,z+.33,'#1c1c1c',0)})});
return {BATCH,COLL,LIGHTS};
}
G.buildScene=buildScene;G.GEO_MATH={I4,mul,mT,mS,mRy,mRx,mRz,persp,ortho,lookAt,norm,sub,cross,dot,hex,tp};
if(typeof module!=='undefined')module.exports={buildScene,GEO_MATH:G.GEO_MATH};
})(globalThis);

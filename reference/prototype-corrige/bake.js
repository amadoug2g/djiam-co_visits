/* Calcul de la lumière indirecte par sommet (ciel, rebond du soleil, éclairages).
   Usage : node bake.js [rayons]  -> écrit baked.bin et baked.json */
'use strict';
const fs=require('fs');
const {Worker,isMainThread,parentPort,workerData}=require('worker_threads');
const M=require('./model.js');
const {buildScene,GEO_MATH:{norm}}=require('./geo.js');
const RAYS=+(process.argv[2]||64);
const SUN=norm([-.6,.52,.6]),SUNC=[3.2,3.2*.82,3.2*.62];
const ORDER=['base','roof','glass','water','glassR'];

function scene(){
 const S=buildScene(M);
 /* triangles opaques -> tableaux plats */
 const T=[];
 for(const k of ['base','roof']){const b=S.BATCH[k],roof=k==='roof'?1:0;
  for(let t=0;t<b.i.length;t+=3){const ia=b.i[t],ib=b.i[t+1],ic=b.i[t+2];
   const m=b.m[ia];if(m===9)continue;
   const P=i=>[b.p[i*3],b.p[i*3+1],b.p[i*3+2]];
   const lin=v=>Math.pow(v,2.2);const f=m===2||m===13?.8:m===8?1:.88;
   T.push({a:P(ia),b:P(ib),c:P(ic),alb:[lin(b.c[ia*3])*f,lin(b.c[ia*3+1])*f,lin(b.c[ia*3+2])*f],roof})}}
 return {S,T};
}

/* ---------- BVH ---------- */
function buildBVH(T){
 const n=T.length,V=new Float32Array(n*9),ALB=new Float32Array(n*3),NRM=new Float32Array(n*3),FL=new Uint8Array(n);
 const cen=new Float32Array(n*3),bmin=new Float32Array(n*3),bmax=new Float32Array(n*3);
 T.forEach((t,i)=>{V.set(t.a,i*9);V.set(t.b,i*9+3);V.set(t.c,i*9+6);ALB.set(t.alb,i*3);FL[i]=t.roof;
  const e1=[t.b[0]-t.a[0],t.b[1]-t.a[1],t.b[2]-t.a[2]],e2=[t.c[0]-t.a[0],t.c[1]-t.a[1],t.c[2]-t.a[2]];
  const nn=norm([e1[1]*e2[2]-e1[2]*e2[1],e1[2]*e2[0]-e1[0]*e2[2],e1[0]*e2[1]-e1[1]*e2[0]]);NRM.set(nn,i*3);
  for(let a=0;a<3;a++){const lo=Math.min(t.a[a],t.b[a],t.c[a]),hi=Math.max(t.a[a],t.b[a],t.c[a]);bmin[i*3+a]=lo;bmax[i*3+a]=hi;cen[i*3+a]=(lo+hi)/2}});
 const idx=new Uint32Array(n);for(let i=0;i<n;i++)idx[i]=i;
 const NODES=[];// [minx,miny,minz,maxx,maxy,maxz,left/start,right/count,leaf]
 function rec(s,e){const node={};let mn=[1e9,1e9,1e9],mx=[-1e9,-1e9,-1e9],cmn=[1e9,1e9,1e9],cmx=[-1e9,-1e9,-1e9];
  for(let i=s;i<e;i++){const t=idx[i];for(let a=0;a<3;a++){mn[a]=Math.min(mn[a],bmin[t*3+a]);mx[a]=Math.max(mx[a],bmax[t*3+a]);cmn[a]=Math.min(cmn[a],cen[t*3+a]);cmx[a]=Math.max(cmx[a],cen[t*3+a])}}
  const id=NODES.length;NODES.push(null);
  if(e-s<=4){NODES[id]=[...mn,...mx,s,e-s,1];return id}
  let ax=0;const ext=[cmx[0]-cmn[0],cmx[1]-cmn[1],cmx[2]-cmn[2]];if(ext[1]>ext[ax])ax=1;if(ext[2]>ext[ax])ax=2;
  const sub=Array.from(idx.subarray(s,e)).sort((p,q)=>cen[p*3+ax]-cen[q*3+ax]);idx.set(sub,s);
  const mid=(s+e)>>1;const l=rec(s,mid),r=rec(mid,e);NODES[id]=[...mn,...mx,l,r,0];return id}
 rec(0,n);
 const N=new Float32Array(NODES.length*9);NODES.forEach((d,i)=>N.set(d,i*9));
 return {V,ALB,NRM,FL,idx,N};
}

/* ---------- lancer de rayons ---------- */
function makeTracer(B){
 const {V,NRM,FL,idx,N}=B,stack=new Int32Array(128);
 return function trace(ox,oy,oz,dx,dy,dz,tmax,closed,any){
  const ix=1/dx,iy=1/dy,iz=1/dz;let best=tmax,hit=-1,sp=0;stack[sp++]=0;
  while(sp){const ni=stack[--sp]*9;
   let t0=(N[ni]-ox)*ix,t1=(N[ni+3]-ox)*ix;let tn=Math.min(t0,t1),tf=Math.max(t0,t1);
   t0=(N[ni+1]-oy)*iy;t1=(N[ni+4]-oy)*iy;tn=Math.max(tn,Math.min(t0,t1));tf=Math.min(tf,Math.max(t0,t1));
   t0=(N[ni+2]-oz)*iz;t1=(N[ni+5]-oz)*iz;tn=Math.max(tn,Math.min(t0,t1));tf=Math.min(tf,Math.max(t0,t1));
   if(tf<Math.max(tn,0)||tn>best)continue;
   if(N[ni+8]){const s=N[ni+6],c=N[ni+7];
    for(let k=s;k<s+c;k++){const t=idx[k];if(!closed&&FL[t])continue;const o=t*9;
     const ax=V[o],ay=V[o+1],az=V[o+2],e1x=V[o+3]-ax,e1y=V[o+4]-ay,e1z=V[o+5]-az,e2x=V[o+6]-ax,e2y=V[o+7]-ay,e2z=V[o+8]-az;
     const px=dy*e2z-dz*e2y,py=dz*e2x-dx*e2z,pz=dx*e2y-dy*e2x,det=e1x*px+e1y*py+e1z*pz;
     if(det>-1e-9&&det<1e-9)continue;const inv=1/det,tx=ox-ax,ty=oy-ay,tz=oz-az,u=(tx*px+ty*py+tz*pz)*inv;if(u<0||u>1)continue;
     const qx=ty*e1z-tz*e1y,qy=tz*e1x-tx*e1z,qz=tx*e1y-ty*e1x,v=(dx*qx+dy*qy+dz*qz)*inv;if(v<0||u+v>1)continue;
     const tt=(e2x*qx+e2y*qy+e2z*qz)*inv;if(tt>1e-4&&tt<best){best=tt;hit=t;if(any)return t}}}
   else{stack[sp++]=N[ni+6];stack[sp++]=N[ni+7]}}
  return hit<0?-1:(trace.t=best,hit)}}

function skyL(dy){if(dy<0)return[.30,.26,.21];const s=Math.min(1,dy/.6),k=s*s*(3-2*s);return[.46+(.33-.46)*k,.39+(.41-.39)*k,.32+(.55-.32)*k]}

function bakeRange(job){
 const B=job.B,trace=makeTracer(B),{V,ALB,NRM}=B;const L=job.lights;
 const out=new Float32Array((job.end-job.start)*6);
 let seed=12345+job.start;const rnd=()=>{seed=(seed*16807)%2147483647;return seed/2147483647};
 const P=job.P,Nn=job.Nrm;const R=job.rays,sq=Math.round(Math.sqrt(R));
 for(let v=job.start;v<job.end;v++){
  const nx=Nn[v*3],ny=Nn[v*3+1],nz=Nn[v*3+2];
  const ox=P[v*3]+nx*.012,oy=P[v*3+1]+ny*.012,oz=P[v*3+2]+nz*.012;
  /* repère tangent */
  let tx,ty,tz;if(Math.abs(nx)<.9){tx=0;ty=-nz;tz=ny}else{tx=nz;ty=0;tz=-nx}
  let l=Math.hypot(tx,ty,tz);tx/=l;ty/=l;tz/=l;const bx=ny*tz-nz*ty,by=nz*tx-nx*tz,bz=nx*ty-ny*tx;
  const rot=rnd()*6.283;
  for(let st=0;st<2;st++){const closed=st===1;if(!closed&&!job.needOpen[v-job.start]){out.set([0,0,0],(v-job.start)*6);continue}
   let r=0,g=0,b=0;
   for(let i=0;i<sq;i++)for(let j=0;j<sq;j++){
    const u1=(i+rnd())/sq,u2=(j+rnd())/sq,rr=Math.sqrt(u1),ph=u2*6.283+rot;
    const lx=rr*Math.cos(ph),lz=rr*Math.sin(ph),ly=Math.sqrt(Math.max(0,1-u1));
    const dx=tx*lx+bx*lz+nx*ly,dy=ty*lx+by*lz+ny*ly,dz=tz*lx+bz*lz+nz*ly;
    const h=trace(ox,oy,oz,dx,dy,dz,60,closed,false);
    if(h<0){const s=skyL(dy);r+=s[0];g+=s[1];b+=s[2];continue}
    const t=trace.t,hx=ox+dx*t,hy=oy+dy*t,hz=oz+dz*t;
    let hnx=NRM[h*3],hny=NRM[h*3+1],hnz=NRM[h*3+2];if(hnx*dx+hny*dy+hnz*dz>0){hnx=-hnx;hny=-hny;hnz=-hnz}
    let lo=[ALB[h*3]*.33,ALB[h*3+1]*.35,ALB[h*3+2]*.38];
    const cs=hnx*SUN[0]+hny*SUN[1]+hnz*SUN[2];
    if(cs>0&&trace(hx+hnx*.01,hy+hny*.01,hz+hnz*.01,SUN[0],SUN[1],SUN[2],80,closed,true)<0){lo[0]+=ALB[h*3]*SUNC[0]*cs;lo[1]+=ALB[h*3+1]*SUNC[1]*cs;lo[2]+=ALB[h*3+2]*SUNC[2]*cs}
    r+=lo[0];g+=lo[1];b+=lo[2]}
   const k=1/(sq*sq);r*=k;g*=k;b*=k;
   /* éclairages : spots dirigés vers le bas */
   for(const Lt of L){if(Lt.st==='roof'&&!closed)continue;const lx=Lt.p[0]-ox,ly=Lt.p[1]-oy,lz=Lt.p[2]-oz,d2=lx*lx+ly*ly+lz*lz;if(d2>64)continue;
    const d=Math.sqrt(d2),ux=lx/d,uy=ly/d,uz=lz/d,ct=ux*nx+uy*ny+uz*nz;if(ct<=0||uy<=0)continue;
    if(trace(ox,oy,oz,ux,uy,uz,d-.05,closed,true)>=0)continue;
    const e=Lt.I*Math.pow(uy,1.4)*ct/Math.max(d2,.3);r+=e;g+=e*.86;b+=e*.66}
   out.set([r,g,b],(v-job.start)*6+st*3)}}
 return out}

if(!isMainThread){const w=workerData;parentPort.postMessage(bakeRange(w),[]);return}

(async()=>{
 const t0=Date.now();const {S,T}=scene();const B=buildBVH(T);
 console.log('triangles',T.length,'bvh',(Date.now()-t0)+'ms');
 const meta={rays:RAYS,batches:{}},chunks=[];
 for(const k of ORDER){const b=S.BATCH[k];if(!b)continue;meta.batches[k]=b.nv;
  if(k!=='base'&&k!=='roof'){const a=new Uint8Array(b.nv*6).fill(Math.round(Math.sqrt(.4/4)*255));chunks.push(a);continue}
  const P=new Float32Array(b.p),Nrm=new Float32Array(b.n),needOpen=k==='base';
  const nw=2,per=Math.ceil(b.nv/nw),parts=[];
  for(let w=0;w<nw;w++){const start=w*per,end=Math.min(b.nv,start+per);
   parts.push(new Promise((res,rej)=>{const wk=new Worker(__filename,{workerData:{B,P,Nrm,start,end,rays:RAYS,lights:S.LIGHTS,needOpen:new Uint8Array(end-start).fill(needOpen?1:0)}});wk.on('message',res);wk.on('error',rej)}))}
  const res=await Promise.all(parts);const F=new Float32Array(b.nv*6);let o=0;for(const r of res){F.set(r,o);o+=r.length}
  /* lissage dans chaque grille de face */
  for(let pass=0;pass<2;pass++)for(const [base,W,H] of (b.g||[])){const tmp=new Float32Array(W*H*6);
   for(let j=0;j<H;j++)for(let i=0;i<W;i++){let n=0;const acc=[0,0,0,0,0,0];
    for(let dj=-1;dj<=1;dj++)for(let di=-1;di<=1;di++){const ii=i+di,jj=j+dj;if(ii<0||jj<0||ii>=W||jj>=H)continue;const v=base+jj*W+ii,wgt=di||dj?1:2;for(let c=0;c<6;c++)acc[c]+=F[v*6+c]*wgt;n+=wgt}
    for(let c=0;c<6;c++)tmp[(j*W+i)*6+c]=acc[c]/n}
   F.set(tmp,base*6)}
  if(k==='roof')for(let v=0;v<b.nv;v++)for(let c=0;c<3;c++)F[v*6+c]=F[v*6+3+c];
  const a=new Uint8Array(b.nv*6);for(let i=0;i<F.length;i++)a[i]=Math.round(Math.sqrt(Math.min(F[i],4)/4)*255);chunks.push(a);
  console.log(k,b.nv,'sommets',(Date.now()-t0)/1000+'s')}
 const all=Buffer.concat(chunks.map(c=>Buffer.from(c.buffer)));fs.writeFileSync('baked.bin',all);fs.writeFileSync('baked.txt',all.toString('base64'));
 fs.writeFileSync('baked.json',JSON.stringify(meta));console.log('total',all.length,'octets',(Date.now()-t0)/1000+'s')
})();

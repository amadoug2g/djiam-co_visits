/* Villa M3, vue 3D et visite. Moteur WebGL2 maison, sans dépendance.
   Repère : X = x du plan, Z = y du plan, Y = hauteur (m). */
(function(){
'use strict';
const V=window.VILLA,M=V.MODEL;
const {mul,mT,persp,ortho,lookAt,norm}=globalThis.GEO_MATH;
const H_RDC=3.0,FL=0.1;
const SC=globalThis.buildScene(M),BATCH=SC.BATCH,COLL=SC.COLL;

/* ---------- WebGL ---------- */
const cv=document.getElementById('gl');
const gl=cv.getContext('webgl2',{antialias:true,alpha:true,preserveDrawingBuffer:false});
if(!gl){window.G3={ok:false};return}
const VS=`#version 300 es
layout(location=0) in vec3 aP;layout(location=1) in vec3 aN;layout(location=2) in vec3 aC;layout(location=3) in float aM;layout(location=4) in vec3 aB0;layout(location=5) in vec3 aB1;
uniform mat4 uVP,uL;uniform float uRoof;out vec3 vP,vN,vC,vB;out float vM;out vec4 vL;
void main(){vP=aP;vN=aN;vC=aC;vM=aM;vec3 b=uRoof>.5?aB1:aB0;vB=b*b*4.;vL=uL*vec4(aP,1.);gl_Position=uVP*vec4(aP,1.);}`;
const FS=`#version 300 es
precision highp float;precision highp sampler2DShadow;
in vec3 vP,vN,vC,vB;in float vM;in vec4 vL;uniform sampler2DShadow uS;uniform vec3 uSun,uEye;uniform float uT,uA,uSz,uRoof,uExp;out vec4 o;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float ns(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+1.),f.x),f.y);}
float fb(vec2 p){return .5*ns(p)+.25*ns(p*2.1)+.125*ns(p*4.3)+.125*ns(p*8.7);}
float gr(vec2 p,float w){vec2 g=abs(fract(p)-.5);return smoothstep(.5-w,.5-w*.3,max(g.x,g.y));}
vec3 skyC(float y){return mix(vec3(.80,.62,.45),vec3(.22,.36,.62),smoothstep(-.05,.6,y));}
vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}
void main(){vec3 n=normalize(vN);int m=int(vM+.5);vec3 an=abs(n);
 vec3 c=pow(vC,vec3(2.2));
 vec2 uv=an.y>.5?vP.xz:(an.x>.5?vP.zy:vP.xy);
 float rough=1.;
 if(m==1){float r=floor(vP.z/.15);c*=.84+.28*h(vec2(r,floor(vP.x/1.1+r*.37)));c*=.92+.12*ns(vec2(vP.x*9.,r));c*=1.-.5*smoothstep(.42,.5,abs(fract(vP.z/.15)-.5));}
 else if(m==2){float f=fb(vP.xz*3.+vP.y);c*=.6+.6*f;c*=.85+.3*ns(vP.xz*55.);}
 else if(m==4){c*=(.82+.3*h(floor(uv/.05)))*(1.-.4*gr(uv/.05,.08));
  if(vP.y<-.3){float ca=abs(sin(vP.x*3.1+uT*.9)+sin(vP.z*3.7-uT*1.2)+sin((vP.x+vP.z)*2.3+uT*.7)+sin((vP.x-vP.z)*4.1-uT*.5))/4.;c*=1.+.35*pow(1.-ca,6.);}}
 else if(m==5){vec2 t=floor(uv/.6);c*=.93+.08*h(t);float v=fb(uv*2.3+t*7.);c*=.96+.06*smoothstep(.55,.75,v);c*=1.-.22*gr(uv/.6,.012);rough=.5;}
 else if(m==6){float s=an.x>.5?vP.z:vP.x;c*=.75+.38*h(vec2(floor(s/.11),3.));c*=.84+.18*ns(vec2(s*30.,vP.y*1.2));c*=1.-.5*smoothstep(.43,.5,abs(fract(s/.11)-.5));}
 else if(m==7){c*=(.88+.16*h(floor(uv/vec2(.4,.2))))*(.94+.08*ns(uv*9.))*(1.-.32*gr(uv/vec2(.4,.2),.04));}
 else if(m==10){vec2 q=uv/vec2(.6,.25);q.x+=floor(q.y)*.5;c*=.78+.32*h(floor(q));c*=.9+.15*ns(uv*12.);c*=1.-.35*gr(q,.05);}
 else if(m==11){c*=.8+.25*ns(vec2(atan(n.z,n.x)*3.,vP.y*14.));c*=1.-.3*smoothstep(.35,.5,abs(fract(vP.y*2.6)-.5));}
 else if(m==12){c*=.965+.045*fb(uv*4.)+.015*ns(uv*60.);}
 else if(m==13){c*=.8+.35*ns(vP.xz*9.+vP.y*5.);}
 if(m==8){o=vec4(aces(c*6.),1.);o.rgb=pow(o.rgb,vec3(1./2.2));return;}
 float sh=1.;vec3 lp=vL.xyz/vL.w*.5+.5;
 if(lp.x>0.&&lp.x<1.&&lp.y>0.&&lp.y<1.&&lp.z<1.){sh=0.;vec2 t=vec2(1./uSz);float b=.0009+.0018*(1.-abs(dot(n,uSun)));
  float ang=h(vP.xz*91.)*6.283;mat2 R=mat2(cos(ang),-sin(ang),sin(ang),cos(ang));
  vec2 K[8]=vec2[8](vec2(-.94,-.4),vec2(.95,-.77),vec2(-.09,-.93),vec2(.34,.29),vec2(-.92,.46),vec2(.54,.92),vec2(-.27,.36),vec2(.77,.06));
  for(int i=0;i<8;i++)sh+=texture(uS,vec3(lp.xy+R*K[i]*t*1.8,lp.z-b));sh/=8.;}
 float d=max(dot(n,uSun),0.);if(m==13)d=max(dot(n,uSun),0.)*.6+.4*max(-dot(n,uSun),0.);
 vec3 amb=vB;bool inside=vP.x>1.1&&vP.x<18.4&&vP.z>10.9&&vP.z<23.96&&vP.y<3.05&&vP.y>-.01;
 vec3 sun=vec3(1.,.82,.62)*3.2;
 vec3 col=c*(amb+sun*d*sh);
 vec3 v=normalize(uEye-vP);
 if(m==5&&an.y>.5){vec3 r=reflect(-v,n);col+=skyC(r.y)*.05*(1.-.6*float(inside));}
 float alpha=uA;
 if(m==3||m==9){vec3 nn=n;if(m==3)nn=normalize(n+vec3(.035*sin(vP.x*4.+uT*1.3)+.02*sin(vP.z*7.+uT*2.),0.,.035*sin(vP.z*3.3-uT)+.02*sin(vP.x*6.-uT*1.7)));
  float ndv=max(abs(dot(nn,v)),0.);float fr=.04+.96*pow(1.-ndv,5.);vec3 r=reflect(-v,nn);
  vec3 refl=skyC(r.y)*1.3;float sp=pow(max(dot(r,uSun),0.),220.)*sh;
  if(m==9){col=c*.08+refl*(.12+fr*.7)+sun*sp*1.2;alpha=uA+fr*.55;}
  else{float sp2=pow(max(dot(r,uSun),0.),900.)*sh;col=mix(c*(amb+sun*d*sh*.35),refl*.7,fr*.8)+sun*sp2*.8;alpha=mix(uA,1.,fr*.6);}}
 float dist=length(uEye-vP);float fg=1.-exp(-dist*.006);col=mix(col,vec3(.78,.62,.47)*1.4,fg*.45);
 col=aces(col*uExp);o=vec4(pow(col,vec3(1./2.2)),clamp(alpha,0.,1.));}`;
const SVS=`#version 300 es
layout(location=0) in vec3 aP;uniform mat4 uL;void main(){gl_Position=uL*vec4(aP,1.);}`;
const SFS=`#version 300 es
precision mediump float;out vec4 o;void main(){o=vec4(1.);}`;
function prog(vs,fs){const p=gl.createProgram();for(const [t,s] of [[gl.VERTEX_SHADER,vs],[gl.FRAGMENT_SHADER,fs]]){const sh=gl.createShader(t);gl.shaderSource(sh,s);gl.compileShader(sh);
 if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(sh));gl.attachShader(p,sh)}gl.linkProgram(p);
 if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));return p}
const P=prog(VS,FS),SP=prog(SVS,SFS);
const U={};for(const n of ['uVP','uL','uS','uSun','uEye','uT','uA','uSz','uRoof','uExp'])U[n]=gl.getUniformLocation(P,n);const SUL=gl.getUniformLocation(SP,'uL');
const VAO={};
for(const [k,b] of Object.entries(BATCH)){const va=gl.createVertexArray();gl.bindVertexArray(va);
 [[b.p,3],[b.n,3],[b.c,3],[b.m,1]].forEach(([d,s],i)=>{const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(d),gl.STATIC_DRAW);gl.enableVertexAttribArray(i);gl.vertexAttribPointer(i,s,gl.FLOAT,false,0,0)});
 const ib=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint32Array(b.i),gl.STATIC_DRAW);
 VAO[k]={va,n:b.i.length,nv:b.nv}}
/* lumière pré-calculée : valeur par défaut, puis fichier baked.bin */
const B0=Math.sqrt(.4/4);
for(const k in VAO){gl.bindVertexArray(VAO[k].va);gl.disableVertexAttribArray(4);gl.disableVertexAttribArray(5)}
gl.vertexAttrib3f(4,B0,B0,B0);gl.vertexAttrib3f(5,B0,B0,B0);
const ORDER=['base','roof','glass','water','glassR'];
Promise.all([fetch('baked.json').then(r=>r.json()),fetch('baked.txt').then(r=>r.text()).then(t=>{const s=atob(t.trim()),a=new Uint8Array(s.length);for(let i=0;i<s.length;i++)a[i]=s.charCodeAt(i);return a.buffer})]).then(([meta,buf])=>{
 let off=0;const u8=new Uint8Array(buf);
 for(const k of ORDER){if(!meta.batches[k])continue;const n=meta.batches[k];
  if(!VAO[k]||VAO[k].nv!==n)throw new Error('bake obsolète');
  const bb=gl.createBuffer();gl.bindVertexArray(VAO[k].va);gl.bindBuffer(gl.ARRAY_BUFFER,bb);gl.bufferData(gl.ARRAY_BUFFER,u8.subarray(off,off+n*6),gl.STATIC_DRAW);
  gl.enableVertexAttribArray(4);gl.vertexAttribPointer(4,3,gl.UNSIGNED_BYTE,true,6,0);gl.enableVertexAttribArray(5);gl.vertexAttribPointer(5,3,gl.UNSIGNED_BYTE,true,6,3);off+=n*6}
 gl.bindVertexArray(null);window.G3&&(window.G3.baked=true);
}).catch(e=>{console.warn('Lumière pré-calculée indisponible :',e.message)});
gl.bindVertexArray(null);
/* ombres */
const SZ=Math.min(4096,gl.getParameter(gl.MAX_TEXTURE_SIZE)>=4096&&!/Mobi|Android|iPhone|iPad/.test(navigator.userAgent)?4096:2048);
const stex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,stex);gl.texStorage2D(gl.TEXTURE_2D,1,gl.DEPTH_COMPONENT24,SZ,SZ);
gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_COMPARE_MODE,gl.COMPARE_REF_TO_TEXTURE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_COMPARE_FUNC,gl.LEQUAL);
const sfb=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,sfb);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.TEXTURE_2D,stex,0);
gl.drawBuffers([gl.NONE]);gl.readBuffer(gl.NONE);gl.bindFramebuffer(gl.FRAMEBUFFER,null);
const SUN=norm([-.6,.52,.6]),CTR=[11,0,15.4];
const LM=mul(ortho(-24,24,-24,24,1,110),lookAt([CTR[0]+SUN[0]*50,SUN[1]*50,CTR[2]+SUN[2]*50],CTR,[0,1,0]));
let shadowDirty=true;

/* ---------- caméras ---------- */
const S={mode:'orbit',roof:false,orb:{yaw:.55,pitch:.72,dist:33,t:[10.9,0,15.6]},fp:{x:12.6,z:26.9,yaw:Math.PI,pitch:-.02},keys:{},joy:[0,0],t0:performance.now(),run:false};
const ORB0=JSON.parse(JSON.stringify(S.orb));
function camera(){const a=cv.width/cv.height;
 if(S.mode==='orbit'){const T=S.orb;if(!S.oc)S.oc=JSON.parse(JSON.stringify(T));const o=S.oc,k=.2;
  let dy=T.yaw-o.yaw;o.yaw+=dy*k;o.pitch+=(T.pitch-o.pitch)*k;o.dist+=(T.dist-o.dist)*k;for(let i=0;i<3;i++)o.t[i]+=(T.t[i]-o.t[i])*k;const e=[o.t[0]+o.dist*Math.cos(o.pitch)*Math.sin(o.yaw),o.t[1]+o.dist*Math.sin(o.pitch),o.t[2]+o.dist*Math.cos(o.pitch)*Math.cos(o.yaw)];
  return{eye:e,vp:mul(persp(.75,a,.1,300),lookAt(e,o.t,[0,1,0]))}}
 const f=S.fp,e=[f.x,FL+1.62,f.z],d=[Math.sin(f.yaw)*Math.cos(f.pitch),Math.sin(f.pitch),Math.cos(f.yaw)*Math.cos(f.pitch)];
 return{eye:e,vp:mul(persp(a<1?1.25:1.05,a,.05,300),lookAt(e,[e[0]+d[0],e[1]+d[1],e[2]+d[2]],[0,1,0]))}}
function draw(){
 const dpr=Math.min(window.devicePixelRatio||1,2),W=Math.round(cv.clientWidth*dpr),H=Math.round(cv.clientHeight*dpr);
 if(cv.width!==W||cv.height!==H){cv.width=W;cv.height=H}
 const roof=S.roof||S.mode==='walk';
 const opaque=['base'].concat(roof?['roof']:[]);
 gl.enable(gl.DEPTH_TEST);gl.enable(gl.CULL_FACE);
 if(shadowDirty||roof!==S._lastRoof){gl.bindFramebuffer(gl.FRAMEBUFFER,sfb);gl.viewport(0,0,SZ,SZ);gl.clear(gl.DEPTH_BUFFER_BIT);gl.useProgram(SP);gl.uniformMatrix4fv(SUL,false,LM);
  gl.cullFace(gl.FRONT);for(const k of opaque){gl.bindVertexArray(VAO[k].va);gl.drawElements(gl.TRIANGLES,VAO[k].n,gl.UNSIGNED_INT,0)}gl.cullFace(gl.BACK);
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);shadowDirty=false;S._lastRoof=roof}
 gl.viewport(0,0,W,H);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
 const cam=camera();gl.useProgram(P);
 gl.uniformMatrix4fv(U.uVP,false,cam.vp);gl.uniformMatrix4fv(U.uL,false,LM);gl.uniform3fv(U.uSun,SUN);gl.uniform3fv(U.uEye,cam.eye);
 gl.uniform1f(U.uT,(performance.now()-S.t0)/1000);gl.uniform1f(U.uSz,SZ);gl.uniform1f(U.uRoof,roof?1:0);{const f=S.fp,inH=S.mode==='walk'&&f.x>1.2&&f.x<18.3&&f.z>11.1&&f.z<23.9;S.exp=(S.exp||.6)+((inH?.95:.6)-(S.exp||.6))*.06;gl.uniform1f(U.uExp,S.exp)}gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,stex);gl.uniform1i(U.uS,0);
 gl.uniform1f(U.uA,1);for(const k of opaque){gl.bindVertexArray(VAO[k].va);gl.drawElements(gl.TRIANGLES,VAO[k].n,gl.UNSIGNED_INT,0)}
 gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);gl.disable(gl.CULL_FACE);
 const tr=[['water',window.NOWATER?0:.32],['glass',.18]];if(roof)tr.push(['glassR',.18]);
 for(const [k,a] of tr){if(!VAO[k])continue;gl.uniform1f(U.uA,a);gl.bindVertexArray(VAO[k].va);gl.drawElements(gl.TRIANGLES,VAO[k].n,gl.UNSIGNED_INT,0)}
 gl.depthMask(true);gl.disable(gl.BLEND);gl.bindVertexArray(null)}

/* ---------- déplacement en visite ---------- */
const RAD=.22;
const hit=(x,z)=>COLL.some(r=>x>r[0]-RAD&&x<r[2]+RAD&&z>r[1]-RAD&&z<r[3]+RAD)||x<1.2||x>20.8||z<3.2||z>27.68;
function step(dt){const f=S.fp,k=S.keys;let fw=(k.f?1:0)-(k.b?1:0)+(-S.joy[1]),st=(k.r?1:0)-(k.l?1:0)+S.joy[0];
 const tl=(k.tl?1:0)-(k.tr?1:0);f.yaw+=tl*dt*1.8;
 if(!fw&&!st)return false;const L=Math.hypot(fw,st);if(L>1){fw/=L;st/=L}
 const sp=(k.run?3.2:1.6)*dt,sy=Math.sin(f.yaw),cy=Math.cos(f.yaw);
 const dx=(sy*fw-cy*st)*sp,dz=(cy*fw+sy*st)*sp;
 if(!hit(f.x+dx,f.z))f.x+=dx;if(!hit(f.x,f.z+dz))f.z+=dz;return true}

/* ---------- boucle ---------- */
let running=false,last=0;
function loop(t){if(!running)return;const dt=Math.min((t-(last||t))/1000,.05);last=t;if(S.mode==='walk')step(dt);draw();requestAnimationFrame(loop)}
function start(){if(running)return;running=true;last=0;requestAnimationFrame(loop)}
function stop(){running=false}

/* ---------- interactions ---------- */
const ptr=new Map();let lastPinch=null,drag=null;
cv.addEventListener('contextmenu',e=>e.preventDefault());
cv.addEventListener('pointerdown',e=>{cv.setPointerCapture(e.pointerId);ptr.set(e.pointerId,{x:e.clientX,y:e.clientY});
 drag={x:e.clientX,y:e.clientY,pan:e.button===2||e.shiftKey};if(ptr.size===2)lastPinch=null});
cv.addEventListener('pointermove',e=>{if(!ptr.has(e.pointerId))return;const p=ptr.get(e.pointerId),dx=e.clientX-p.x,dy=e.clientY-p.y;p.x=e.clientX;p.y=e.clientY;
 if(ptr.size===2){const [a,b]=[...ptr.values()],d=Math.hypot(a.x-b.x,a.y-b.y),c=[(a.x+b.x)/2,(a.y+b.y)/2];
  if(lastPinch){if(S.mode==='orbit'){S.orb.dist=Math.min(90,Math.max(4,S.orb.dist*lastPinch.d/d));pan(c[0]-lastPinch.c[0],c[1]-lastPinch.c[1])}}
  lastPinch={d,c};return}
 if(S.mode==='orbit'){if(drag&&drag.pan)pan(dx,dy);else{S.orb.yaw-=dx*.006;S.orb.pitch=Math.min(1.5,Math.max(.08,S.orb.pitch+dy*.005))}}
 else{S.fp.yaw-=dx*.004;S.fp.pitch=Math.min(1.1,Math.max(-1.1,S.fp.pitch+dy*.003))}});
const pend=e=>{ptr.delete(e.pointerId);if(ptr.size<2)lastPinch=null;if(!ptr.size)drag=null};
cv.addEventListener('pointerup',pend);cv.addEventListener('pointercancel',pend);
function pan(dx,dy){const o=S.orb,k=o.dist*.0016,cy=Math.cos(o.yaw),sy=Math.sin(o.yaw);o.t[0]+=(-dx*cy-dy*sy)*k;o.t[2]+=(dx*sy-dy*cy)*k}
cv.addEventListener('wheel',e=>{e.preventDefault();if(S.mode==='orbit')S.orb.dist=Math.min(90,Math.max(4,S.orb.dist*Math.exp(e.deltaY*.0012)))},{passive:false});
const KM={z:'f',w:'f',arrowup:'f',s:'b',arrowdown:'b',q:'l',a:'l',d:'r',arrowleft:'tl',arrowright:'tr',shift:'run'};
addEventListener('keydown',e=>{if(S.mode!=='walk')return;const k=KM[e.key.toLowerCase()];if(k){S.keys[k]=true;e.preventDefault()}});
addEventListener('keyup',e=>{const k=KM[e.key.toLowerCase()];if(k)S.keys[k]=false});
addEventListener('blur',()=>S.keys={});
/* joystick tactile */
const joy=document.getElementById('joy'),knob=joy.querySelector('i');let jid=null,jc=null;
joy.addEventListener('pointerdown',e=>{e.stopPropagation();jid=e.pointerId;joy.setPointerCapture(jid);const r=joy.getBoundingClientRect();jc=[r.left+r.width/2,r.top+r.height/2];jm(e)});
const jm=e=>{if(e.pointerId!==jid)return;let dx=e.clientX-jc[0],dy=e.clientY-jc[1];const L=Math.hypot(dx,dy),R=44;if(L>R){dx*=R/L;dy*=R/L}
 knob.style.transform=`translate(${dx}px,${dy}px)`;S.joy=[dx/R,dy/R]};
joy.addEventListener('pointermove',jm);
const je=e=>{if(e.pointerId!==jid)return;jid=null;S.joy=[0,0];knob.style.transform=''};joy.addEventListener('pointerup',je);joy.addEventListener('pointercancel',je);

/* ---------- API pour l'interface ---------- */
function roomCenter(id){const r=M.rooms.find(r=>r.id===id);if(!r)return null;const [a,b,c,d]=r.bb;return[(a+c)/2,(b+d)/2,r]}
window.G3={ok:true,
 show(mode){S.mode=mode;S.keys={};cv.hidden=false;if(!S._shown){S._shown=1;if(innerWidth/innerHeight<.8){S.orb.dist=52;ORB0.dist=52}}start()},
 hide(){stop();cv.hidden=true},
 setRoof(on){S.roof=on},
 reset(){if(S.mode==='orbit')S.orb=JSON.parse(JSON.stringify(ORB0));else Object.assign(S.fp,{x:12.6,z:26.9,yaw:Math.PI,pitch:-.02})},
 zoom(f){if(S.mode==='orbit')S.orb.dist=Math.min(90,Math.max(4,S.orb.dist*f))},
 focus(id){const c=roomCenter(id);if(!c)return;if(S.mode==='orbit'){S.orb.t=[c[0],0,c[1]];S.orb.dist=Math.max(9,Math.min(16,Math.hypot(c[2].bb[2]-c[2].bb[0],c[2].bb[3]-c[2].bb[1])*2.2));S.orb.pitch=.85}
  else{let x=c[0],z=c[1];if(hit(x,z)){for(let r=.2;r<2;r+=.1){const t=[[x+r,z],[x-r,z],[x,z+r],[x,z-r]].find(p=>!hit(p[0],p[1]));if(t){[x,z]=t;break}}}S.fp.x=x;S.fp.z=z}},
 state:S};
})();

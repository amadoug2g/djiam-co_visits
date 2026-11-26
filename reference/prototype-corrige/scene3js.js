/* Villa M3 : moteur 3D Three.js (r170).
   Rendu physique, ciel, ombres douces, lumière pré-calculée, occlusion d'écran, halo des lumières.
   En cas d'échec, l'app bascule sur le moteur de secours (scene3d.js). */
const DIAG=window.VILLA_DIAG;
function legacy(reason){DIAG&&DIAG.err('three: '+reason);if(window.G3&&window.G3.engine==='three'){window.G3=null}
 const c=document.getElementById('gl');if(c){const n=document.createElement('canvas');n.id='gl';n.hidden=true;c.replaceWith(n)}
 const s=document.createElement('script');s.src='scene3d.js';
 s.onload=()=>DIAG&&DIAG.later({engine:'legacy',reason:String(reason).slice(0,300)});document.body.appendChild(s)}

(async()=>{
let THREE,Sky;
try{THREE=await import('three');({Sky}=await import('three/addons/objects/Sky.js'))}
catch(e){return legacy('chargement '+(e&&e.message))}
const MOBILE=matchMedia('(pointer:coarse)').matches||innerWidth<820;
let POST=null;
{try{const [a,b,c,d,e]=await Promise.all(['EffectComposer','RenderPass','GTAOPass','UnrealBloomPass','OutputPass'].map(n=>import('three/addons/postprocessing/'+n+'.js')));
 POST={EffectComposer:a.EffectComposer,RenderPass:b.RenderPass,GTAOPass:c.GTAOPass,UnrealBloomPass:d.UnrealBloomPass,OutputPass:e.OutputPass}}catch(e){DIAG&&DIAG.err('post: '+e.message)}}
try{init(THREE,Sky,POST,MOBILE)}catch(e){console.error(e);return legacy('init '+(e&&e.stack||e))}
})();

function init(THREE,Sky,POST,MOBILE){
const M=window.VILLA.MODEL,FL=.1;
const SC=globalThis.buildScene(M),BATCH=SC.BATCH,COLL=SC.COLL;
const old=document.getElementById('gl');
const renderer=new THREE.WebGLRenderer({antialias:!POST,powerPreference:'high-performance',alpha:false});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,MOBILE?1.5:2));
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.62;
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;
const cv=renderer.domElement;cv.id='gl';cv.hidden=true;cv.style.background='#9fb3c8';old.replaceWith(cv);

const scene=new THREE.Scene();
const SUN=new THREE.Vector3(-.6,.52,.6).normalize(),CTR=new THREE.Vector3(11,0,15.4);
/* ciel physique + environnement pour les reflets */
const sky=new Sky();sky.scale.setScalar(4000);
const su=sky.material.uniforms;su.turbidity.value=5.5;su.rayleigh.value=1.4;su.mieCoefficient.value=.004;su.mieDirectionalG.value=.86;su.sunPosition.value.copy(SUN).multiplyScalar(1000);
scene.add(sky);
const pmrem=new THREE.PMREMGenerator(renderer);
const envScene=new THREE.Scene();const sky2=new Sky();sky2.scale.setScalar(4000);sky2.material.uniforms.sunPosition.value.copy(SUN).multiplyScalar(1000);
for(const k of ['turbidity','rayleigh','mieCoefficient','mieDirectionalG'])sky2.material.uniforms[k].value=su[k].value;
envScene.add(sky2);const envRT=pmrem.fromScene(envScene);scene.environment=envRT.texture;
scene.fog=new THREE.Fog(0xcdb79a,70,320);
/* soleil */
const sun=new THREE.DirectionalLight(new THREE.Color(1,.82,.62),3.2*Math.PI);
sun.position.copy(CTR).addScaledVector(SUN,60);sun.target.position.copy(CTR);
sun.castShadow=true;sun.shadow.mapSize.set(MOBILE?2048:4096,MOBILE?2048:4096);
Object.assign(sun.shadow.camera,{left:-24,right:24,top:24,bottom:-24,near:1,far:130});sun.shadow.camera.updateProjectionMatrix();
sun.shadow.bias=-.0002;sun.shadow.normalBias=.025;sun.shadow.radius=3;
scene.add(sun,sun.target);

/* ---------- matériaux : motifs procéduraux + lumière pré-calculée ---------- */
const U={uT:{value:0},uRoof:{value:0}};
const HEAD=`varying vec3 vWPos;varying vec3 vWNrm;varying vec3 vBk;varying float vMat;uniform float uT;
float h1(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float ns(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h1(i),h1(i+vec2(1,0)),f.x),mix(h1(i+vec2(0,1)),h1(i+1.),f.x),f.y);}
float fb(vec2 p){return .5*ns(p)+.25*ns(p*2.1)+.125*ns(p*4.3)+.125*ns(p*8.7);}
float gr(vec2 p,float w){vec2 g=abs(fract(p)-.5);return smoothstep(.5-w,.5-w*.3,max(g.x,g.y));}
`;
const PATTERN=`{vec3 n=normalize(vWNrm),an=abs(n);int m=int(vMat+.5);vec3 c=diffuseColor.rgb;vec3 P=vWPos;
 vec2 uv=an.y>.5?P.xz:(an.x>.5?P.zy:P.xy);
 if(m==1){float r=floor(P.z/.15);c*=.84+.28*h1(vec2(r,floor(P.x/1.1+r*.37)));c*=.92+.12*ns(vec2(P.x*9.,r));c*=1.-.5*smoothstep(.42,.5,abs(fract(P.z/.15)-.5));}
 else if(m==2){float f=fb(P.xz*3.+P.y);c*=.6+.6*f;c*=.85+.3*ns(P.xz*55.);}
 else if(m==4){c*=(.82+.3*h1(floor(uv/.05)))*(1.-.4*gr(uv/.05,.08));
  if(P.y<-.3){float ca=abs(sin(P.x*3.1+uT*.9)+sin(P.z*3.7-uT*1.2)+sin((P.x+P.z)*2.3+uT*.7)+sin((P.x-P.z)*4.1-uT*.5))/4.;c*=1.+.5*pow(1.-ca,6.);}}
 else if(m==5){vec2 t=floor(uv/.6);c*=.93+.08*h1(t);float v=fb(uv*2.3+t*7.);c*=.96+.06*smoothstep(.55,.75,v);c*=1.-.22*gr(uv/.6,.012);}
 else if(m==6){float s=an.x>.5?P.z:P.x;c*=.75+.38*h1(vec2(floor(s/.11),3.));c*=.84+.18*ns(vec2(s*30.,P.y*1.2));c*=1.-.5*smoothstep(.43,.5,abs(fract(s/.11)-.5));}
 else if(m==7){c*=(.88+.16*h1(floor(uv/vec2(.4,.2))))*(.94+.08*ns(uv*9.))*(1.-.32*gr(uv/vec2(.4,.2),.04));}
 else if(m==10){vec2 q=uv/vec2(.6,.25);q.x+=floor(q.y)*.5;c*=.78+.32*h1(floor(q));c*=.9+.15*ns(uv*12.);c*=1.-.35*gr(q,.05);}
 else if(m==11){c*=.8+.25*ns(vec2(atan(n.z,n.x)*3.,P.y*14.));c*=1.-.3*smoothstep(.35,.5,abs(fract(P.y*2.6)-.5));}
 else if(m==12){c*=.965+.045*fb(uv*4.)+.015*ns(uv*60.);}
 else if(m==13){c*=.8+.35*ns(P.xz*9.+P.y*5.);}
 diffuseColor.rgb=c;}`;
const ROUGH=`{int m=int(vMat+.5);roughnessFactor=m==5?.32:m==4?.25:m==1?.75:m==6?.6:m==2||m==13?.95:m==8?.5:.85;}`;
function patch(mat,water){
 mat.onBeforeCompile=sh=>{sh.uniforms.uT=U.uT;sh.uniforms.uRoof=U.uRoof;
  sh.vertexShader='attribute float aMat;attribute vec3 aB0;attribute vec3 aB1;uniform float uRoof;varying vec3 vWPos;varying vec3 vWNrm;varying vec3 vBk;varying float vMat;\n'+
   sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n vWPos=position;vWNrm=normal;vMat=aMat;vec3 bb=uRoof>.5?aB1:aB0;vBk=bb*bb*4.;');
  let f=HEAD+sh.fragmentShader;
  f=f.replace('#include <color_fragment>','#include <color_fragment>\n'+(water?'':PATTERN));
  f=f.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\n'+(water?'':ROUGH));
  if(water)f=f.replace('#include <normal_fragment_maps>','#include <normal_fragment_maps>\n normal=normalize(normal+(viewMatrix*vec4(.045*sin(vWPos.x*4.+uT*1.3)+.02*sin(vWPos.z*7.+uT*2.),0.,.045*sin(vWPos.z*3.3-uT)+.02*sin(vWPos.x*6.-uT*1.7),0.)).xyz);');
  f=f.replace('#include <lights_fragment_maps>','#include <lights_fragment_maps>\n iblIrradiance=vBk*PI;irradiance=vec3(0.);\n#if defined( RE_IndirectSpecular )\n radiance*=clamp(dot(vBk,vec3(.333))/.35,.12,1.);\n#endif');
  f=f.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\n if(vMat>7.5&&vMat<8.5)totalEmissiveRadiance=diffuseColor.rgb*6.;');
  sh.fragmentShader=f};
 mat.customProgramCacheKey=()=>water?'villa-water':'villa';return mat}
const MAT={
 opaque:patch(new THREE.MeshStandardMaterial({vertexColors:true,roughness:.85,metalness:0})),
 glass:patch(new THREE.MeshStandardMaterial({color:new THREE.Color(.04,.06,.07),roughness:.03,metalness:0,transparent:true,opacity:.22,depthWrite:false,side:THREE.DoubleSide,envMapIntensity:1.6})),
 water:patch(new THREE.MeshStandardMaterial({color:new THREE.Color(.006,.17,.25),roughness:.04,metalness:0,transparent:true,opacity:.55,depthWrite:false,envMapIntensity:1.2}),true)};
MAT.glass.customProgramCacheKey=()=>'villa-glass';

/* ---------- géométries ---------- */
const B0=Math.round(Math.sqrt(.4/4)*255),MESH={},IB={};
const lin=v=>Math.pow(v,2.2);
for(const [k,b] of Object.entries(BATCH)){const g=new THREE.BufferGeometry();
 g.setAttribute('position',new THREE.Float32BufferAttribute(b.p,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(b.n,3));
 const c=new Float32Array(b.c.length);for(let i=0;i<c.length;i++)c[i]=lin(b.c[i]);g.setAttribute('color',new THREE.BufferAttribute(c,3));
 g.setAttribute('aMat',new THREE.Float32BufferAttribute(b.m,1));
 const ib=new THREE.InterleavedBuffer(new Uint8Array(b.nv*6).fill(B0),6);IB[k]=ib;
 g.setAttribute('aB0',new THREE.InterleavedBufferAttribute(ib,3,0,true));g.setAttribute('aB1',new THREE.InterleavedBufferAttribute(ib,3,3,true));
 g.setIndex(new THREE.BufferAttribute(new Uint32Array(b.i),1));g.computeBoundingSphere();
 const mat=k==='glass'||k==='glassR'?MAT.glass:k==='water'?MAT.water:MAT.opaque;
 const mesh=new THREE.Mesh(g,mat);mesh.matrixAutoUpdate=false;
 if(mat===MAT.opaque){mesh.castShadow=true;mesh.receiveShadow=true}else{mesh.renderOrder=k==='water'?1:2;mesh.receiveShadow=k==='water'}
 scene.add(mesh);MESH[k]=mesh}
/* lumière pré-calculée */
Promise.all([fetch('baked.json').then(r=>r.json()),fetch('baked.txt').then(r=>r.text()).then(t=>{const s=atob(t.trim()),a=new Uint8Array(s.length);for(let i=0;i<s.length;i++)a[i]=s.charCodeAt(i);return a.buffer})]).then(([meta,buf])=>{
 let off=0;const u8=new Uint8Array(buf);
 for(const k of ['base','roof','glass','water','glassR']){const n=meta.batches[k];if(!n)continue;if(!IB[k]||IB[k].count!==n)throw new Error('bake obsolète '+k);
  IB[k].array.set(u8.subarray(off,off+n*6));IB[k].needsUpdate=true;off+=n*6}
 G3.baked=true}).catch(e=>DIAG&&DIAG.err('bake: '+e.message));

/* ---------- caméra et post-traitement ---------- */
const camera=new THREE.PerspectiveCamera(43,1,.05,6000);
let composer=null,gtao=null;
if(POST){try{
 const rt=new THREE.WebGLRenderTarget(4,4,{type:THREE.HalfFloatType,samples:4});
 composer=new POST.EffectComposer(renderer,rt);composer.addPass(new POST.RenderPass(scene,camera));
 try{gtao=new POST.GTAOPass(scene,camera,4,4);if(gtao.updateGtaoMaterial)gtao.updateGtaoMaterial({radius:.45,distanceExponent:1.5,thickness:1,scale:1});if('blendIntensity' in gtao)gtao.blendIntensity=.65;composer.addPass(gtao)}catch(e){gtao=null;DIAG&&DIAG.err('gtao: '+e.message)}
 composer.addPass(new POST.UnrealBloomPass(new THREE.Vector2(256,256),.22,.45,.92));
 composer.addPass(new POST.OutputPass());
}catch(e){composer=null;DIAG&&DIAG.err('composer: '+e.message)}}

const S={mode:'orbit',roof:false,orb:{yaw:.55,pitch:.72,dist:33,t:[10.9,0,15.6]},fp:{x:12.6,z:26.9,yaw:Math.PI,pitch:-.02},keys:{},joy:[0,0],t0:performance.now(),exp:.62};
const ORB0=JSON.parse(JSON.stringify(S.orb));
let lastRoof=null,W0=0,H0=0;
function frame(){
 const w=cv.clientWidth,h=cv.clientHeight;
 if(w!==W0||h!==H0){W0=w;H0=h;renderer.setSize(w,h,false);if(composer){composer.setPixelRatio(renderer.getPixelRatio());composer.setSize(w,h)}}
 const a=w/Math.max(h,1);camera.aspect=a;
 if(S.mode==='orbit'){const T=S.orb;if(!S.oc)S.oc=JSON.parse(JSON.stringify(T));const o=S.oc,k=.2;
  o.yaw+=(T.yaw-o.yaw)*k;o.pitch+=(T.pitch-o.pitch)*k;o.dist+=(T.dist-o.dist)*k;for(let i=0;i<3;i++)o.t[i]+=(T.t[i]-o.t[i])*k;
  camera.fov=43;camera.position.set(o.t[0]+o.dist*Math.cos(o.pitch)*Math.sin(o.yaw),o.t[1]+o.dist*Math.sin(o.pitch),o.t[2]+o.dist*Math.cos(o.pitch)*Math.cos(o.yaw));camera.lookAt(o.t[0],o.t[1],o.t[2])}
 else{const f=S.fp;camera.fov=a<1?72:60;camera.position.set(f.x,FL+1.62,f.z);camera.lookAt(f.x+Math.sin(f.yaw)*Math.cos(f.pitch),FL+1.62+Math.sin(f.pitch),f.z+Math.cos(f.yaw)*Math.cos(f.pitch))}
 camera.updateProjectionMatrix();
 const roof=S.roof||S.mode==='walk';
 if(roof!==lastRoof){lastRoof=roof;MESH.roof.visible=roof;if(MESH.glassR)MESH.glassR.visible=roof;U.uRoof.value=roof?1:0;renderer.shadowMap.needsUpdate=true}
 const f=S.fp,inH=S.mode==='walk'&&f.x>1.2&&f.x<18.3&&f.z>11.1&&f.z<23.9;S.exp+=((inH?1.0:.62)-S.exp)*.06;renderer.toneMappingExposure=S.exp;
 U.uT.value=(performance.now()-S.t0)/1000;
 if(composer)composer.render();else renderer.render(scene,camera);
 if(S.capture){const c=S.capture;S.capture=null;try{const s=document.createElement('canvas'),W=480,H=Math.round(480*h/Math.max(w,1));s.width=W;s.height=H;s.getContext('2d').drawImage(cv,0,0,W,H);c(s.toDataURL('image/jpeg',.62))}catch(e){c(null)}}}

/* ---------- déplacement en visite ---------- */
const RAD=.22;
const hit=(x,z)=>COLL.some(r=>x>r[0]-RAD&&x<r[2]+RAD&&z>r[1]-RAD&&z<r[3]+RAD)||x<1.2||x>20.8||z<3.2||z>27.68;
function step(dt){const f=S.fp,k=S.keys;let fw=(k.f?1:0)-(k.b?1:0)+(-S.joy[1]),st=(k.r?1:0)-(k.l?1:0)+S.joy[0];
 f.yaw+=((k.tl?1:0)-(k.tr?1:0))*dt*1.8;if(!fw&&!st)return;const L=Math.hypot(fw,st);if(L>1){fw/=L;st/=L}
 const sp=(k.run?3.2:1.6)*dt,sy=Math.sin(f.yaw),cy=Math.cos(f.yaw),dx=(sy*fw-cy*st)*sp,dz=(cy*fw+sy*st)*sp;
 if(!hit(f.x+dx,f.z))f.x+=dx;if(!hit(f.x,f.z+dz))f.z+=dz}
let running=false,last=0,fpsN=0,fpsT=0;
function loop(t){if(!running)return;const dt=Math.min((t-(last||t))/1000,.05);last=t;if(S.mode==='walk')step(dt);
 try{frame()}catch(e){running=false;DIAG&&DIAG.err('frame: '+e.message);return}
 fpsN++;if(!fpsT)fpsT=t;if(t-fpsT>2000){S.fps=Math.round(fpsN*1000/(t-fpsT));fpsN=0;fpsT=t;
  /* qualité adaptative : si l'appareil peine, on retire d'abord l'occlusion d'écran */
  if(S.fps<40&&gtao&&gtao.enabled){gtao.enabled=false;S.degraded=(S.degraded||'')+'gtao-off ';DIAG&&DIAG.err('fps '+S.fps+' : occlusion désactivée')}}
 requestAnimationFrame(loop)}
function start(){if(running)return;running=true;last=0;requestAnimationFrame(loop)}

/* ---------- interactions ---------- */
const ptr=new Map();let lastPinch=null,drag=null;
cv.addEventListener('contextmenu',e=>e.preventDefault());
cv.addEventListener('pointerdown',e=>{cv.setPointerCapture(e.pointerId);ptr.set(e.pointerId,{x:e.clientX,y:e.clientY});drag={pan:e.button===2||e.shiftKey};if(ptr.size===2)lastPinch=null});
cv.addEventListener('pointermove',e=>{if(!ptr.has(e.pointerId))return;const p=ptr.get(e.pointerId),dx=e.clientX-p.x,dy=e.clientY-p.y;p.x=e.clientX;p.y=e.clientY;
 if(ptr.size===2){const [a,b]=[...ptr.values()],d=Math.hypot(a.x-b.x,a.y-b.y),c=[(a.x+b.x)/2,(a.y+b.y)/2];
  if(lastPinch&&S.mode==='orbit'){S.orb.dist=Math.min(90,Math.max(4,S.orb.dist*lastPinch.d/d));pan(c[0]-lastPinch.c[0],c[1]-lastPinch.c[1])}lastPinch={d,c};return}
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
const joy=document.getElementById('joy'),knob=joy.querySelector('i');let jid=null,jc=null;
const jm=e=>{if(e.pointerId!==jid)return;let dx=e.clientX-jc[0],dy=e.clientY-jc[1];const L=Math.hypot(dx,dy),R=44;if(L>R){dx*=R/L;dy*=R/L}knob.style.transform=`translate(${dx}px,${dy}px)`;S.joy=[dx/R,dy/R]};
joy.addEventListener('pointerdown',e=>{e.stopPropagation();jid=e.pointerId;joy.setPointerCapture(jid);const r=joy.getBoundingClientRect();jc=[r.left+r.width/2,r.top+r.height/2];jm(e)});
joy.addEventListener('pointermove',jm);
const je=e=>{if(e.pointerId!==jid)return;jid=null;S.joy=[0,0];knob.style.transform=''};joy.addEventListener('pointerup',je);joy.addEventListener('pointercancel',je);

/* ---------- API pour l'interface ---------- */
function roomCenter(id){const r=M.rooms.find(r=>r.id===id);if(!r)return null;const [a,b,c,d]=r.bb;return[(a+c)/2,(b+d)/2,r]}
const shots={};
function diag(mode){if(!DIAG||shots[mode])return;shots[mode]=1;setTimeout(()=>{S.capture=img=>DIAG.send({engine:'three',mode,fps:S.fps||0,post:!!composer,gtao:!!(gtao&&gtao.enabled),degraded:S.degraded||'',baked:!!G3.baked,w:cv.clientWidth,h:cv.clientHeight,dpr:renderer.getPixelRatio(),gpu:(()=>{try{const g=renderer.getContext(),x=g.getExtension('WEBGL_debug_renderer_info');return x?g.getParameter(x.UNMASKED_RENDERER_WEBGL):''}catch(e){return''}})(),shot:img})},5000)}
const G3=window.G3={ok:true,engine:'three',
 show(mode){S.mode=mode;S.keys={};cv.hidden=false;if(!S._shown){S._shown=1;if(innerWidth/innerHeight<.8){S.orb.dist=52;ORB0.dist=52}}start();diag(mode)},
 hide(){running=false;cv.hidden=true},
 setRoof(on){S.roof=on},
 reset(){if(S.mode==='orbit')S.orb=JSON.parse(JSON.stringify(ORB0));else Object.assign(S.fp,{x:12.6,z:26.9,yaw:Math.PI,pitch:-.02})},
 zoom(f){if(S.mode==='orbit')S.orb.dist=Math.min(90,Math.max(4,S.orb.dist*f))},
 focus(id){const c=roomCenter(id);if(!c)return;if(S.mode==='orbit'){S.orb.t=[c[0],0,c[1]];S.orb.dist=Math.max(9,Math.min(16,Math.hypot(c[2].bb[2]-c[2].bb[0],c[2].bb[3]-c[2].bb[1])*2.2));S.orb.pitch=.85}
  else{let x=c[0],z=c[1];if(hit(x,z)){for(let r=.2;r<2;r+=.1){const t=[[x+r,z],[x-r,z],[x,z+r],[x,z-r]].find(p=>!hit(p[0],p[1]));if(t){[x,z]=t;break}}}S.fp.x=x;S.fp.z=z}},
 state:S,three:{renderer,scene,camera}};
/* compile une première image tout de suite pour détecter une erreur de shader */
renderer.setSize(Math.max(cv.clientWidth,2),Math.max(cv.clientHeight,2),false);renderer.shadowMap.needsUpdate=true;renderer.render(scene,camera);
const gl=renderer.getContext();const prog=renderer.info.programs||[];
for(const p of prog){const d=p.diagnostics;if(d&&!d.runnable)throw new Error('shader: '+(d.fragmentShader&&d.fragmentShader.log||d.vertexShader&&d.vertexShader.log||d.programLog))}
}

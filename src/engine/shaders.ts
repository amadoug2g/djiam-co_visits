/* Motifs procéduraux et réglages de matière, repris tels quels du prototype (scene3js.js). */
/** bruit et grilles communs */
export const HEAD = `varying vec3 vWPos;varying vec3 vWNrm;varying vec3 vBk;varying float vMat;uniform float uT;
float h1(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float ns(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h1(i),h1(i+vec2(1,0)),f.x),mix(h1(i+vec2(0,1)),h1(i+1.),f.x),f.y);}
float fb(vec2 p){return .5*ns(p)+.25*ns(p*2.1)+.125*ns(p*4.3)+.125*ns(p*8.7);}
float gr(vec2 p,float w){vec2 g=abs(fract(p)-.5);return smoothstep(.5-w,.5-w*.3,max(g.x,g.y));}
`;

/** motif selon l’indice de matériau (voir MAT dans geo/build.ts) */
export const PATTERN = `{vec3 n=normalize(vWNrm),an=abs(n);int m=int(vMat+.5);vec3 c=diffuseColor.rgb;vec3 P=vWPos;
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

/** rugosité selon l’indice de matériau */
export const ROUGH = `{int m=int(vMat+.5);roughnessFactor=m==5?.32:m==4?.25:m==1?.75:m==6?.6:m==2||m==13?.95:m==8?.5:.85;}`;

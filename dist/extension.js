var b=(e,r)=>()=>{try{return r||e((r={exports:{}}).exports,r),r.exports}catch(n){throw r=0,n}};var D=b((Eo,N)=>{"use strict";function Ye(e){return typeof e>"u"||e===null}function tn(e){return typeof e=="object"&&e!==null}function ln(e){return Array.isArray(e)?e:Ye(e)?[]:[e]}function an(e,r){var n,o,i,l;if(r)for(l=Object.keys(r),n=0,o=l.length;n<o;n+=1)i=l[n],e[i]=r[i];return e}function cn(e,r){var n="",o;for(o=0;o<r;o+=1)n+=e;return n}function sn(e){return e===0&&Number.NEGATIVE_INFINITY===1/e}N.exports.isNothing=Ye;N.exports.isObject=tn;N.exports.toArray=ln;N.exports.repeat=cn;N.exports.isNegativeZero=sn;N.exports.extend=an});var q=b((ko,Ke)=>{"use strict";function Ge(e,r){var n="",o=e.reason||"(unknown reason)";return e.mark?(e.mark.name&&(n+='in "'+e.mark.name+'" '),n+="("+(e.mark.line+1)+":"+(e.mark.column+1)+")",!r&&e.mark.snippet&&(n+=`

`+e.mark.snippet),o+" "+n):o}function K(e,r){Error.call(this),this.name="YAMLException",this.reason=e,this.mark=r,this.message=Ge(this,!1),Error.captureStackTrace?Error.captureStackTrace(this,this.constructor):this.stack=new Error().stack||""}K.prototype=Object.create(Error.prototype);K.prototype.constructor=K;K.prototype.toString=function(r){return this.name+": "+Ge(this,r)};Ke.exports=K});var Ue=b((So,je)=>{"use strict";var j=D();function ae(e,r,n,o,i){var l="",t="",a=Math.floor(i/2)-1;return o-r>a&&(l=" ... ",r=o-a+l.length),n-o>a&&(t=" ...",n=o+a-t.length),{str:l+e.slice(r,n).replace(/\t/g,"\u2192")+t,pos:o-r+l.length}}function ce(e,r){return j.repeat(" ",r-e.length)+e}function un(e,r){if(r=Object.create(r||null),!e.buffer)return null;r.maxLength||(r.maxLength=79),typeof r.indent!="number"&&(r.indent=1),typeof r.linesBefore!="number"&&(r.linesBefore=3),typeof r.linesAfter!="number"&&(r.linesAfter=2);for(var n=/\r?\n|\r|\0/g,o=[0],i=[],l,t=-1;l=n.exec(e.buffer);)i.push(l.index),o.push(l.index+l[0].length),e.position<=l.index&&t<0&&(t=o.length-2);t<0&&(t=o.length-1);var a="",c,s,p=Math.min(e.line+r.linesAfter,i.length).toString().length,u=r.maxLength-(r.indent+p+3);for(c=1;c<=r.linesBefore&&!(t-c<0);c++)s=ae(e.buffer,o[t-c],i[t-c],e.position-(o[t]-o[t-c]),u),a=j.repeat(" ",r.indent)+ce((e.line-c+1).toString(),p)+" | "+s.str+`
`+a;for(s=ae(e.buffer,o[t],i[t],e.position,u),a+=j.repeat(" ",r.indent)+ce((e.line+1).toString(),p)+" | "+s.str+`
`,a+=j.repeat("-",r.indent+p+3+s.pos)+`^
`,c=1;c<=r.linesAfter&&!(t+c>=i.length);c++)s=ae(e.buffer,o[t+c],i[t+c],e.position-(o[t]-o[t+c]),u),a+=j.repeat(" ",r.indent)+ce((e.line+c+1).toString(),p)+" | "+s.str+`
`;return a.replace(/\n$/,"")}je.exports=un});var _=b((To,ze)=>{"use strict";var We=q(),pn=["kind","multi","resolve","construct","instanceOf","predicate","represent","representName","defaultStyle","styleAliases"],dn=["scalar","sequence","mapping"];function fn(e){var r={};return e!==null&&Object.keys(e).forEach(function(n){e[n].forEach(function(o){r[String(o)]=n})}),r}function hn(e,r){if(r=r||{},Object.keys(r).forEach(function(n){if(pn.indexOf(n)===-1)throw new We('Unknown option "'+n+'" is met in definition of "'+e+'" YAML type.')}),this.options=r,this.tag=e,this.kind=r.kind||null,this.resolve=r.resolve||function(){return!0},this.construct=r.construct||function(n){return n},this.instanceOf=r.instanceOf||null,this.predicate=r.predicate||null,this.represent=r.represent||null,this.representName=r.representName||null,this.defaultStyle=r.defaultStyle||null,this.multi=r.multi||!1,this.styleAliases=fn(r.styleAliases||null),dn.indexOf(this.kind)===-1)throw new We('Unknown kind "'+this.kind+'" is specified for "'+e+'" YAML type.')}ze.exports=hn});var pe=b((Io,Ve)=>{"use strict";var U=q(),se=_();function $e(e,r){var n=[];return e[r].forEach(function(o){var i=n.length;n.forEach(function(l,t){l.tag===o.tag&&l.kind===o.kind&&l.multi===o.multi&&(i=t)}),n[i]=o}),n}function gn(){var e={scalar:{},sequence:{},mapping:{},fallback:{},multi:{scalar:[],sequence:[],mapping:[],fallback:[]}},r,n;function o(i){i.multi?(e.multi[i.kind].push(i),e.multi.fallback.push(i)):e[i.kind][i.tag]=e.fallback[i.tag]=i}for(r=0,n=arguments.length;r<n;r+=1)arguments[r].forEach(o);return e}function ue(e){return this.extend(e)}ue.prototype.extend=function(r){var n=[],o=[];if(r instanceof se)o.push(r);else if(Array.isArray(r))o=o.concat(r);else if(r&&(Array.isArray(r.implicit)||Array.isArray(r.explicit)))r.implicit&&(n=n.concat(r.implicit)),r.explicit&&(o=o.concat(r.explicit));else throw new U("Schema.extend argument should be a Type, [ Type ], or a schema definition ({ implicit: [...], explicit: [...] })");n.forEach(function(l){if(!(l instanceof se))throw new U("Specified list of YAML types (or a single Type object) contains a non-Type object.");if(l.loadKind&&l.loadKind!=="scalar")throw new U("There is a non-scalar type in the implicit list of a schema. Implicit resolving of such types is not supported.");if(l.multi)throw new U("There is a multi type in the implicit list of a schema. Multi tags can only be listed as explicit.")}),o.forEach(function(l){if(!(l instanceof se))throw new U("Specified list of YAML types (or a single Type object) contains a non-Type object.")});var i=Object.create(ue.prototype);return i.implicit=(this.implicit||[]).concat(n),i.explicit=(this.explicit||[]).concat(o),i.compiledImplicit=$e(i,"implicit"),i.compiledExplicit=$e(i,"explicit"),i.compiledTypeMap=gn(i.compiledImplicit,i.compiledExplicit),i};Ve.exports=ue});var de=b((Lo,Qe)=>{"use strict";var mn=_();Qe.exports=new mn("tag:yaml.org,2002:str",{kind:"scalar",construct:function(e){return e!==null?e:""}})});var fe=b((Oo,Xe)=>{"use strict";var xn=_();Xe.exports=new xn("tag:yaml.org,2002:seq",{kind:"sequence",construct:function(e){return e!==null?e:[]}})});var he=b((Fo,Ze)=>{"use strict";var vn=_();Ze.exports=new vn("tag:yaml.org,2002:map",{kind:"mapping",construct:function(e){return e!==null?e:{}}})});var ge=b((No,Je)=>{"use strict";var bn=pe();Je.exports=new bn({explicit:[de(),fe(),he()]})});var me=b((Mo,er)=>{"use strict";var yn=_();function wn(e){if(e===null)return!0;var r=e.length;return r===1&&e==="~"||r===4&&(e==="null"||e==="Null"||e==="NULL")}function _n(){return null}function Cn(e){return e===null}er.exports=new yn("tag:yaml.org,2002:null",{kind:"scalar",resolve:wn,construct:_n,predicate:Cn,represent:{canonical:function(){return"~"},lowercase:function(){return"null"},uppercase:function(){return"NULL"},camelcase:function(){return"Null"},empty:function(){return""}},defaultStyle:"lowercase"})});var xe=b((Bo,rr)=>{"use strict";var An=_();function En(e){if(e===null)return!1;var r=e.length;return r===4&&(e==="true"||e==="True"||e==="TRUE")||r===5&&(e==="false"||e==="False"||e==="FALSE")}function kn(e){return e==="true"||e==="True"||e==="TRUE"}function Sn(e){return Object.prototype.toString.call(e)==="[object Boolean]"}rr.exports=new An("tag:yaml.org,2002:bool",{kind:"scalar",resolve:En,construct:kn,predicate:Sn,represent:{lowercase:function(e){return e?"true":"false"},uppercase:function(e){return e?"TRUE":"FALSE"},camelcase:function(e){return e?"True":"False"}},defaultStyle:"lowercase"})});var ve=b((Ro,nr)=>{"use strict";var Tn=D(),In=_();function Ln(e){return 48<=e&&e<=57||65<=e&&e<=70||97<=e&&e<=102}function On(e){return 48<=e&&e<=55}function Fn(e){return 48<=e&&e<=57}function Nn(e){if(e===null)return!1;var r=e.length,n=0,o=!1,i;if(!r)return!1;if(i=e[n],(i==="-"||i==="+")&&(i=e[++n]),i==="0"){if(n+1===r)return!0;if(i=e[++n],i==="b"){for(n++;n<r;n++)if(i=e[n],i!=="_"){if(i!=="0"&&i!=="1")return!1;o=!0}return o&&i!=="_"}if(i==="x"){for(n++;n<r;n++)if(i=e[n],i!=="_"){if(!Ln(e.charCodeAt(n)))return!1;o=!0}return o&&i!=="_"}if(i==="o"){for(n++;n<r;n++)if(i=e[n],i!=="_"){if(!On(e.charCodeAt(n)))return!1;o=!0}return o&&i!=="_"}}if(i==="_")return!1;for(;n<r;n++)if(i=e[n],i!=="_"){if(!Fn(e.charCodeAt(n)))return!1;o=!0}return!(!o||i==="_")}function Mn(e){var r=e,n=1,o;if(r.indexOf("_")!==-1&&(r=r.replace(/_/g,"")),o=r[0],(o==="-"||o==="+")&&(o==="-"&&(n=-1),r=r.slice(1),o=r[0]),r==="0")return 0;if(o==="0"){if(r[1]==="b")return n*parseInt(r.slice(2),2);if(r[1]==="x")return n*parseInt(r.slice(2),16);if(r[1]==="o")return n*parseInt(r.slice(2),8)}return n*parseInt(r,10)}function Bn(e){return Object.prototype.toString.call(e)==="[object Number]"&&e%1===0&&!Tn.isNegativeZero(e)}nr.exports=new In("tag:yaml.org,2002:int",{kind:"scalar",resolve:Nn,construct:Mn,predicate:Bn,represent:{binary:function(e){return e>=0?"0b"+e.toString(2):"-0b"+e.toString(2).slice(1)},octal:function(e){return e>=0?"0o"+e.toString(8):"-0o"+e.toString(8).slice(1)},decimal:function(e){return e.toString(10)},hexadecimal:function(e){return e>=0?"0x"+e.toString(16).toUpperCase():"-0x"+e.toString(16).toUpperCase().slice(1)}},defaultStyle:"decimal",styleAliases:{binary:[2,"bin"],octal:[8,"oct"],decimal:[10,"dec"],hexadecimal:[16,"hex"]}})});var be=b((Do,or)=>{"use strict";var ir=D(),Rn=_(),Dn=new RegExp("^(?:[-+]?(?:[0-9][0-9_]*)(?:\\.[0-9_]*)?(?:[eE][-+]?[0-9]+)?|\\.[0-9_]+(?:[eE][-+]?[0-9]+)?|[-+]?\\.(?:inf|Inf|INF)|\\.(?:nan|NaN|NAN))$");function qn(e){return!(e===null||!Dn.test(e)||e[e.length-1]==="_")}function Pn(e){var r,n;return r=e.replace(/_/g,"").toLowerCase(),n=r[0]==="-"?-1:1,"+-".indexOf(r[0])>=0&&(r=r.slice(1)),r===".inf"?n===1?Number.POSITIVE_INFINITY:Number.NEGATIVE_INFINITY:r===".nan"?NaN:n*parseFloat(r,10)}var Hn=/^[-+]?[0-9]+e/;function Yn(e,r){var n;if(isNaN(e))switch(r){case"lowercase":return".nan";case"uppercase":return".NAN";case"camelcase":return".NaN"}else if(Number.POSITIVE_INFINITY===e)switch(r){case"lowercase":return".inf";case"uppercase":return".INF";case"camelcase":return".Inf"}else if(Number.NEGATIVE_INFINITY===e)switch(r){case"lowercase":return"-.inf";case"uppercase":return"-.INF";case"camelcase":return"-.Inf"}else if(ir.isNegativeZero(e))return"-0.0";return n=e.toString(10),Hn.test(n)?n.replace("e",".e"):n}function Gn(e){return Object.prototype.toString.call(e)==="[object Number]"&&(e%1!==0||ir.isNegativeZero(e))}or.exports=new Rn("tag:yaml.org,2002:float",{kind:"scalar",resolve:qn,construct:Pn,predicate:Gn,represent:Yn,defaultStyle:"lowercase"})});var ye=b((qo,tr)=>{"use strict";tr.exports=ge().extend({implicit:[me(),xe(),ve(),be()]})});var we=b((Po,lr)=>{"use strict";lr.exports=ye()});var _e=b((Ho,sr)=>{"use strict";var Kn=_(),ar=new RegExp("^([0-9][0-9][0-9][0-9])-([0-9][0-9])-([0-9][0-9])$"),cr=new RegExp("^([0-9][0-9][0-9][0-9])-([0-9][0-9]?)-([0-9][0-9]?)(?:[Tt]|[ \\t]+)([0-9][0-9]?):([0-9][0-9]):([0-9][0-9])(?:\\.([0-9]*))?(?:[ \\t]*(Z|([-+])([0-9][0-9]?)(?::([0-9][0-9]))?))?$");function jn(e){return e===null?!1:ar.exec(e)!==null||cr.exec(e)!==null}function Un(e){var r,n,o,i,l,t,a,c=0,s=null,p,u,f;if(r=ar.exec(e),r===null&&(r=cr.exec(e)),r===null)throw new Error("Date resolve error");if(n=+r[1],o=+r[2]-1,i=+r[3],!r[4])return new Date(Date.UTC(n,o,i));if(l=+r[4],t=+r[5],a=+r[6],r[7]){for(c=r[7].slice(0,3);c.length<3;)c+="0";c=+c}return r[9]&&(p=+r[10],u=+(r[11]||0),s=(p*60+u)*6e4,r[9]==="-"&&(s=-s)),f=new Date(Date.UTC(n,o,i,l,t,a,c)),s&&f.setTime(f.getTime()-s),f}function Wn(e){return e.toISOString()}sr.exports=new Kn("tag:yaml.org,2002:timestamp",{kind:"scalar",resolve:jn,construct:Un,instanceOf:Date,represent:Wn})});var Ce=b((Yo,ur)=>{"use strict";var zn=_();function $n(e){return e==="<<"||e===null}ur.exports=new zn("tag:yaml.org,2002:merge",{kind:"scalar",resolve:$n})});var Ee=b((Go,pr)=>{"use strict";var Vn=_(),Ae=`ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=
\r`;function Qn(e){if(e===null)return!1;var r,n,o=0,i=e.length,l=Ae;for(n=0;n<i;n++)if(r=l.indexOf(e.charAt(n)),!(r>64)){if(r<0)return!1;o+=6}return o%8===0}function Xn(e){var r,n,o=e.replace(/[\r\n=]/g,""),i=o.length,l=Ae,t=0,a=[];for(r=0;r<i;r++)r%4===0&&r&&(a.push(t>>16&255),a.push(t>>8&255),a.push(t&255)),t=t<<6|l.indexOf(o.charAt(r));return n=i%4*6,n===0?(a.push(t>>16&255),a.push(t>>8&255),a.push(t&255)):n===18?(a.push(t>>10&255),a.push(t>>2&255)):n===12&&a.push(t>>4&255),new Uint8Array(a)}function Zn(e){var r="",n=0,o,i,l=e.length,t=Ae;for(o=0;o<l;o++)o%3===0&&o&&(r+=t[n>>18&63],r+=t[n>>12&63],r+=t[n>>6&63],r+=t[n&63]),n=(n<<8)+e[o];return i=l%3,i===0?(r+=t[n>>18&63],r+=t[n>>12&63],r+=t[n>>6&63],r+=t[n&63]):i===2?(r+=t[n>>10&63],r+=t[n>>4&63],r+=t[n<<2&63],r+=t[64]):i===1&&(r+=t[n>>2&63],r+=t[n<<4&63],r+=t[64],r+=t[64]),r}function Jn(e){return Object.prototype.toString.call(e)==="[object Uint8Array]"}pr.exports=new Vn("tag:yaml.org,2002:binary",{kind:"scalar",resolve:Qn,construct:Xn,predicate:Jn,represent:Zn})});var ke=b((Ko,dr)=>{"use strict";var ei=_(),ri=Object.prototype.hasOwnProperty,ni=Object.prototype.toString;function ii(e){if(e===null)return!0;var r=[],n,o,i,l,t,a=e;for(n=0,o=a.length;n<o;n+=1){if(i=a[n],t=!1,ni.call(i)!=="[object Object]")return!1;for(l in i)if(ri.call(i,l))if(!t)t=!0;else return!1;if(!t)return!1;if(r.indexOf(l)===-1)r.push(l);else return!1}return!0}function oi(e){return e!==null?e:[]}dr.exports=new ei("tag:yaml.org,2002:omap",{kind:"sequence",resolve:ii,construct:oi})});var Se=b((jo,fr)=>{"use strict";var ti=_(),li=Object.prototype.toString;function ai(e){if(e===null)return!0;var r,n,o,i,l,t=e;for(l=new Array(t.length),r=0,n=t.length;r<n;r+=1){if(o=t[r],li.call(o)!=="[object Object]"||(i=Object.keys(o),i.length!==1))return!1;l[r]=[i[0],o[i[0]]]}return!0}function ci(e){if(e===null)return[];var r,n,o,i,l,t=e;for(l=new Array(t.length),r=0,n=t.length;r<n;r+=1)o=t[r],i=Object.keys(o),l[r]=[i[0],o[i[0]]];return l}fr.exports=new ti("tag:yaml.org,2002:pairs",{kind:"sequence",resolve:ai,construct:ci})});var Te=b((Uo,hr)=>{"use strict";var si=_(),ui=Object.prototype.hasOwnProperty;function pi(e){if(e===null)return!0;var r,n=e;for(r in n)if(ui.call(n,r)&&n[r]!==null)return!1;return!0}function di(e){return e!==null?e:{}}hr.exports=new si("tag:yaml.org,2002:set",{kind:"mapping",resolve:pi,construct:di})});var X=b((Wo,gr)=>{"use strict";gr.exports=we().extend({implicit:[_e(),Ce()],explicit:[Ee(),ke(),Se(),Te()]})});var Fr=b((zo,Fe)=>{"use strict";var B=D(),_r=q(),fi=Ue(),hi=X(),F=Object.prototype.hasOwnProperty,Z=1,Cr=2,Ar=3,J=4,Ie=1,gi=2,mr=3,mi=/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x84\x86-\x9F\uFFFE\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/,xi=/[\x85\u2028\u2029]/,vi=/[,\[\]\{\}]/,Er=/^(?:!|!!|![a-z\-]+!)$/i,kr=/^(?:!|[^,\[\]\{\}])(?:%[0-9a-f]{2}|[0-9a-z\-#;\/\?:@&=\+\$,_\.!~\*'\(\)\[\]])*$/i;function xr(e){return Object.prototype.toString.call(e)}function S(e){return e===10||e===13}function R(e){return e===9||e===32}function E(e){return e===9||e===32||e===10||e===13}function P(e){return e===44||e===91||e===93||e===123||e===125}function bi(e){var r;return 48<=e&&e<=57?e-48:(r=e|32,97<=r&&r<=102?r-97+10:-1)}function yi(e){return e===120?2:e===117?4:e===85?8:0}function wi(e){return 48<=e&&e<=57?e-48:-1}function vr(e){return e===48?"\0":e===97?"\x07":e===98?"\b":e===116||e===9?"	":e===110?`
`:e===118?"\v":e===102?"\f":e===114?"\r":e===101?"\x1B":e===32?" ":e===34?'"':e===47?"/":e===92?"\\":e===78?"\x85":e===95?"\xA0":e===76?"\u2028":e===80?"\u2029":""}function _i(e){return e<=65535?String.fromCharCode(e):String.fromCharCode((e-65536>>10)+55296,(e-65536&1023)+56320)}function Sr(e,r,n){r==="__proto__"?Object.defineProperty(e,r,{configurable:!0,enumerable:!0,writable:!0,value:n}):e[r]=n}var Tr=new Array(256),Ir=new Array(256);for(M=0;M<256;M++)Tr[M]=vr(M)?1:0,Ir[M]=vr(M);var M;function Ci(e,r){this.input=e,this.filename=r.filename||null,this.schema=r.schema||hi,this.onWarning=r.onWarning||null,this.legacy=r.legacy||!1,this.json=r.json||!1,this.listener=r.listener||null,this.implicitTypes=this.schema.compiledImplicit,this.typeMap=this.schema.compiledTypeMap,this.length=e.length,this.position=0,this.line=0,this.lineStart=0,this.lineIndent=0,this.firstTabInLine=-1,this.documents=[]}function Lr(e,r){var n={name:e.filename,buffer:e.input.slice(0,-1),position:e.position,line:e.line,column:e.position-e.lineStart};return n.snippet=fi(n),new _r(r,n)}function d(e,r){throw Lr(e,r)}function ee(e,r){e.onWarning&&e.onWarning.call(null,Lr(e,r))}var br={YAML:function(r,n,o){var i,l,t;r.version!==null&&d(r,"duplication of %YAML directive"),o.length!==1&&d(r,"YAML directive accepts exactly one argument"),i=/^([0-9]+)\.([0-9]+)$/.exec(o[0]),i===null&&d(r,"ill-formed argument of the YAML directive"),l=parseInt(i[1],10),t=parseInt(i[2],10),l!==1&&d(r,"unacceptable YAML version of the document"),r.version=o[0],r.checkLineBreaks=t<2,t!==1&&t!==2&&ee(r,"unsupported YAML version of the document")},TAG:function(r,n,o){var i,l;o.length!==2&&d(r,"TAG directive accepts exactly two arguments"),i=o[0],l=o[1],Er.test(i)||d(r,"ill-formed tag handle (first argument) of the TAG directive"),F.call(r.tagMap,i)&&d(r,'there is a previously declared suffix for "'+i+'" tag handle'),kr.test(l)||d(r,"ill-formed tag prefix (second argument) of the TAG directive");try{l=decodeURIComponent(l)}catch{d(r,"tag prefix is malformed: "+l)}r.tagMap[i]=l}};function O(e,r,n,o){var i,l,t,a;if(r<n){if(a=e.input.slice(r,n),o)for(i=0,l=a.length;i<l;i+=1)t=a.charCodeAt(i),t===9||32<=t&&t<=1114111||d(e,"expected valid JSON character");else mi.test(a)&&d(e,"the stream contains non-printable characters");e.result+=a}}function yr(e,r,n,o){var i,l,t,a;for(B.isObject(n)||d(e,"cannot merge mappings; the provided source object is unacceptable"),i=Object.keys(n),t=0,a=i.length;t<a;t+=1)l=i[t],F.call(r,l)||(Sr(r,l,n[l]),o[l]=!0)}function H(e,r,n,o,i,l,t,a,c){var s,p;if(Array.isArray(i))for(i=Array.prototype.slice.call(i),s=0,p=i.length;s<p;s+=1)Array.isArray(i[s])&&d(e,"nested arrays are not supported inside keys"),typeof i=="object"&&xr(i[s])==="[object Object]"&&(i[s]="[object Object]");if(typeof i=="object"&&xr(i)==="[object Object]"&&(i="[object Object]"),i=String(i),r===null&&(r={}),o==="tag:yaml.org,2002:merge")if(Array.isArray(l))for(s=0,p=l.length;s<p;s+=1)yr(e,r,l[s],n);else yr(e,r,l,n);else!e.json&&!F.call(n,i)&&F.call(r,i)&&(e.line=t||e.line,e.lineStart=a||e.lineStart,e.position=c||e.position,d(e,"duplicated mapping key")),Sr(r,i,l),delete n[i];return r}function Le(e){var r;r=e.input.charCodeAt(e.position),r===10?e.position++:r===13?(e.position++,e.input.charCodeAt(e.position)===10&&e.position++):d(e,"a line break is expected"),e.line+=1,e.lineStart=e.position,e.firstTabInLine=-1}function w(e,r,n){for(var o=0,i=e.input.charCodeAt(e.position);i!==0;){for(;R(i);)i===9&&e.firstTabInLine===-1&&(e.firstTabInLine=e.position),i=e.input.charCodeAt(++e.position);if(r&&i===35)do i=e.input.charCodeAt(++e.position);while(i!==10&&i!==13&&i!==0);if(S(i))for(Le(e),i=e.input.charCodeAt(e.position),o++,e.lineIndent=0;i===32;)e.lineIndent++,i=e.input.charCodeAt(++e.position);else break}return n!==-1&&o!==0&&e.lineIndent<n&&ee(e,"deficient indentation"),o}function re(e){var r=e.position,n;return n=e.input.charCodeAt(r),!!((n===45||n===46)&&n===e.input.charCodeAt(r+1)&&n===e.input.charCodeAt(r+2)&&(r+=3,n=e.input.charCodeAt(r),n===0||E(n)))}function Oe(e,r){r===1?e.result+=" ":r>1&&(e.result+=B.repeat(`
`,r-1))}function Ai(e,r,n){var o,i,l,t,a,c,s,p,u=e.kind,f=e.result,h;if(h=e.input.charCodeAt(e.position),E(h)||P(h)||h===35||h===38||h===42||h===33||h===124||h===62||h===39||h===34||h===37||h===64||h===96||(h===63||h===45)&&(i=e.input.charCodeAt(e.position+1),E(i)||n&&P(i)))return!1;for(e.kind="scalar",e.result="",l=t=e.position,a=!1;h!==0;){if(h===58){if(i=e.input.charCodeAt(e.position+1),E(i)||n&&P(i))break}else if(h===35){if(o=e.input.charCodeAt(e.position-1),E(o))break}else{if(e.position===e.lineStart&&re(e)||n&&P(h))break;if(S(h))if(c=e.line,s=e.lineStart,p=e.lineIndent,w(e,!1,-1),e.lineIndent>=r){a=!0,h=e.input.charCodeAt(e.position);continue}else{e.position=t,e.line=c,e.lineStart=s,e.lineIndent=p;break}}a&&(O(e,l,t,!1),Oe(e,e.line-c),l=t=e.position,a=!1),R(h)||(t=e.position+1),h=e.input.charCodeAt(++e.position)}return O(e,l,t,!1),e.result?!0:(e.kind=u,e.result=f,!1)}function Ei(e,r){var n,o,i;if(n=e.input.charCodeAt(e.position),n!==39)return!1;for(e.kind="scalar",e.result="",e.position++,o=i=e.position;(n=e.input.charCodeAt(e.position))!==0;)if(n===39)if(O(e,o,e.position,!0),n=e.input.charCodeAt(++e.position),n===39)o=e.position,e.position++,i=e.position;else return!0;else S(n)?(O(e,o,i,!0),Oe(e,w(e,!1,r)),o=i=e.position):e.position===e.lineStart&&re(e)?d(e,"unexpected end of the document within a single quoted scalar"):(e.position++,i=e.position);d(e,"unexpected end of the stream within a single quoted scalar")}function ki(e,r){var n,o,i,l,t,a;if(a=e.input.charCodeAt(e.position),a!==34)return!1;for(e.kind="scalar",e.result="",e.position++,n=o=e.position;(a=e.input.charCodeAt(e.position))!==0;){if(a===34)return O(e,n,e.position,!0),e.position++,!0;if(a===92){if(O(e,n,e.position,!0),a=e.input.charCodeAt(++e.position),S(a))w(e,!1,r);else if(a<256&&Tr[a])e.result+=Ir[a],e.position++;else if((t=yi(a))>0){for(i=t,l=0;i>0;i--)a=e.input.charCodeAt(++e.position),(t=bi(a))>=0?l=(l<<4)+t:d(e,"expected hexadecimal character");e.result+=_i(l),e.position++}else d(e,"unknown escape sequence");n=o=e.position}else S(a)?(O(e,n,o,!0),Oe(e,w(e,!1,r)),n=o=e.position):e.position===e.lineStart&&re(e)?d(e,"unexpected end of the document within a double quoted scalar"):(e.position++,o=e.position)}d(e,"unexpected end of the stream within a double quoted scalar")}function Si(e,r){var n=!0,o,i,l,t=e.tag,a,c=e.anchor,s,p,u,f,h,g=Object.create(null),x,y,k,m;if(m=e.input.charCodeAt(e.position),m===91)p=93,h=!1,a=[];else if(m===123)p=125,h=!0,a={};else return!1;for(e.anchor!==null&&(e.anchorMap[e.anchor]=a),m=e.input.charCodeAt(++e.position);m!==0;){if(w(e,!0,r),m=e.input.charCodeAt(e.position),m===p)return e.position++,e.tag=t,e.anchor=c,e.kind=h?"mapping":"sequence",e.result=a,!0;n?m===44&&d(e,"expected the node content, but found ','"):d(e,"missed comma between flow collection entries"),y=x=k=null,u=f=!1,m===63&&(s=e.input.charCodeAt(e.position+1),E(s)&&(u=f=!0,e.position++,w(e,!0,r))),o=e.line,i=e.lineStart,l=e.position,Y(e,r,Z,!1,!0),y=e.tag,x=e.result,w(e,!0,r),m=e.input.charCodeAt(e.position),(f||e.line===o)&&m===58&&(u=!0,m=e.input.charCodeAt(++e.position),w(e,!0,r),Y(e,r,Z,!1,!0),k=e.result),h?H(e,a,g,y,x,k,o,i,l):u?a.push(H(e,null,g,y,x,k,o,i,l)):a.push(x),w(e,!0,r),m=e.input.charCodeAt(e.position),m===44?(n=!0,m=e.input.charCodeAt(++e.position)):n=!1}d(e,"unexpected end of the stream within a flow collection")}function Ti(e,r){var n,o,i=Ie,l=!1,t=!1,a=r,c=0,s=!1,p,u;if(u=e.input.charCodeAt(e.position),u===124)o=!1;else if(u===62)o=!0;else return!1;for(e.kind="scalar",e.result="";u!==0;)if(u=e.input.charCodeAt(++e.position),u===43||u===45)Ie===i?i=u===43?mr:gi:d(e,"repeat of a chomping mode identifier");else if((p=wi(u))>=0)p===0?d(e,"bad explicit indentation width of a block scalar; it cannot be less than one"):t?d(e,"repeat of an indentation width identifier"):(a=r+p-1,t=!0);else break;if(R(u)){do u=e.input.charCodeAt(++e.position);while(R(u));if(u===35)do u=e.input.charCodeAt(++e.position);while(!S(u)&&u!==0)}for(;u!==0;){for(Le(e),e.lineIndent=0,u=e.input.charCodeAt(e.position);(!t||e.lineIndent<a)&&u===32;)e.lineIndent++,u=e.input.charCodeAt(++e.position);if(!t&&e.lineIndent>a&&(a=e.lineIndent),S(u)){c++;continue}if(e.lineIndent<a){i===mr?e.result+=B.repeat(`
`,l?1+c:c):i===Ie&&l&&(e.result+=`
`);break}for(o?R(u)?(s=!0,e.result+=B.repeat(`
`,l?1+c:c)):s?(s=!1,e.result+=B.repeat(`
`,c+1)):c===0?l&&(e.result+=" "):e.result+=B.repeat(`
`,c):e.result+=B.repeat(`
`,l?1+c:c),l=!0,t=!0,c=0,n=e.position;!S(u)&&u!==0;)u=e.input.charCodeAt(++e.position);O(e,n,e.position,!1)}return!0}function wr(e,r){var n,o=e.tag,i=e.anchor,l=[],t,a=!1,c;if(e.firstTabInLine!==-1)return!1;for(e.anchor!==null&&(e.anchorMap[e.anchor]=l),c=e.input.charCodeAt(e.position);c!==0&&(e.firstTabInLine!==-1&&(e.position=e.firstTabInLine,d(e,"tab characters must not be used in indentation")),!(c!==45||(t=e.input.charCodeAt(e.position+1),!E(t))));){if(a=!0,e.position++,w(e,!0,-1)&&e.lineIndent<=r){l.push(null),c=e.input.charCodeAt(e.position);continue}if(n=e.line,Y(e,r,Ar,!1,!0),l.push(e.result),w(e,!0,-1),c=e.input.charCodeAt(e.position),(e.line===n||e.lineIndent>r)&&c!==0)d(e,"bad indentation of a sequence entry");else if(e.lineIndent<r)break}return a?(e.tag=o,e.anchor=i,e.kind="sequence",e.result=l,!0):!1}function Ii(e,r,n){var o,i,l,t,a,c,s=e.tag,p=e.anchor,u={},f=Object.create(null),h=null,g=null,x=null,y=!1,k=!1,m;if(e.firstTabInLine!==-1)return!1;for(e.anchor!==null&&(e.anchorMap[e.anchor]=u),m=e.input.charCodeAt(e.position);m!==0;){if(!y&&e.firstTabInLine!==-1&&(e.position=e.firstTabInLine,d(e,"tab characters must not be used in indentation")),o=e.input.charCodeAt(e.position+1),l=e.line,(m===63||m===58)&&E(o))m===63?(y&&(H(e,u,f,h,g,null,t,a,c),h=g=x=null),k=!0,y=!0,i=!0):y?(y=!1,i=!0):d(e,"incomplete explicit mapping pair; a key node is missed; or followed by a non-tabulated empty line"),e.position+=1,m=o;else{if(t=e.line,a=e.lineStart,c=e.position,!Y(e,n,Cr,!1,!0))break;if(e.line===l){for(m=e.input.charCodeAt(e.position);R(m);)m=e.input.charCodeAt(++e.position);if(m===58)m=e.input.charCodeAt(++e.position),E(m)||d(e,"a whitespace character is expected after the key-value separator within a block mapping"),y&&(H(e,u,f,h,g,null,t,a,c),h=g=x=null),k=!0,y=!1,i=!1,h=e.tag,g=e.result;else if(k)d(e,"can not read an implicit mapping pair; a colon is missed");else return e.tag=s,e.anchor=p,!0}else if(k)d(e,"can not read a block mapping entry; a multiline key may not be an implicit key");else return e.tag=s,e.anchor=p,!0}if((e.line===l||e.lineIndent>r)&&(y&&(t=e.line,a=e.lineStart,c=e.position),Y(e,r,J,!0,i)&&(y?g=e.result:x=e.result),y||(H(e,u,f,h,g,x,t,a,c),h=g=x=null),w(e,!0,-1),m=e.input.charCodeAt(e.position)),(e.line===l||e.lineIndent>r)&&m!==0)d(e,"bad indentation of a mapping entry");else if(e.lineIndent<r)break}return y&&H(e,u,f,h,g,null,t,a,c),k&&(e.tag=s,e.anchor=p,e.kind="mapping",e.result=u),k}function Li(e){var r,n=!1,o=!1,i,l,t;if(t=e.input.charCodeAt(e.position),t!==33)return!1;if(e.tag!==null&&d(e,"duplication of a tag property"),t=e.input.charCodeAt(++e.position),t===60?(n=!0,t=e.input.charCodeAt(++e.position)):t===33?(o=!0,i="!!",t=e.input.charCodeAt(++e.position)):i="!",r=e.position,n){do t=e.input.charCodeAt(++e.position);while(t!==0&&t!==62);e.position<e.length?(l=e.input.slice(r,e.position),t=e.input.charCodeAt(++e.position)):d(e,"unexpected end of the stream within a verbatim tag")}else{for(;t!==0&&!E(t);)t===33&&(o?d(e,"tag suffix cannot contain exclamation marks"):(i=e.input.slice(r-1,e.position+1),Er.test(i)||d(e,"named tag handle cannot contain such characters"),o=!0,r=e.position+1)),t=e.input.charCodeAt(++e.position);l=e.input.slice(r,e.position),vi.test(l)&&d(e,"tag suffix cannot contain flow indicator characters")}l&&!kr.test(l)&&d(e,"tag name cannot contain such characters: "+l);try{l=decodeURIComponent(l)}catch{d(e,"tag name is malformed: "+l)}return n?e.tag=l:F.call(e.tagMap,i)?e.tag=e.tagMap[i]+l:i==="!"?e.tag="!"+l:i==="!!"?e.tag="tag:yaml.org,2002:"+l:d(e,'undeclared tag handle "'+i+'"'),!0}function Oi(e){var r,n;if(n=e.input.charCodeAt(e.position),n!==38)return!1;for(e.anchor!==null&&d(e,"duplication of an anchor property"),n=e.input.charCodeAt(++e.position),r=e.position;n!==0&&!E(n)&&!P(n);)n=e.input.charCodeAt(++e.position);return e.position===r&&d(e,"name of an anchor node must contain at least one character"),e.anchor=e.input.slice(r,e.position),!0}function Fi(e){var r,n,o;if(o=e.input.charCodeAt(e.position),o!==42)return!1;for(o=e.input.charCodeAt(++e.position),r=e.position;o!==0&&!E(o)&&!P(o);)o=e.input.charCodeAt(++e.position);return e.position===r&&d(e,"name of an alias node must contain at least one character"),n=e.input.slice(r,e.position),F.call(e.anchorMap,n)||d(e,'unidentified alias "'+n+'"'),e.result=e.anchorMap[n],w(e,!0,-1),!0}function Y(e,r,n,o,i){var l,t,a,c=1,s=!1,p=!1,u,f,h,g,x,y;if(e.listener!==null&&e.listener("open",e),e.tag=null,e.anchor=null,e.kind=null,e.result=null,l=t=a=J===n||Ar===n,o&&w(e,!0,-1)&&(s=!0,e.lineIndent>r?c=1:e.lineIndent===r?c=0:e.lineIndent<r&&(c=-1)),c===1)for(;Li(e)||Oi(e);)w(e,!0,-1)?(s=!0,a=l,e.lineIndent>r?c=1:e.lineIndent===r?c=0:e.lineIndent<r&&(c=-1)):a=!1;if(a&&(a=s||i),(c===1||J===n)&&(Z===n||Cr===n?x=r:x=r+1,y=e.position-e.lineStart,c===1?a&&(wr(e,y)||Ii(e,y,x))||Si(e,x)?p=!0:(t&&Ti(e,x)||Ei(e,x)||ki(e,x)?p=!0:Fi(e)?(p=!0,(e.tag!==null||e.anchor!==null)&&d(e,"alias node should not have any properties")):Ai(e,x,Z===n)&&(p=!0,e.tag===null&&(e.tag="?")),e.anchor!==null&&(e.anchorMap[e.anchor]=e.result)):c===0&&(p=a&&wr(e,y))),e.tag===null)e.anchor!==null&&(e.anchorMap[e.anchor]=e.result);else if(e.tag==="?"){for(e.result!==null&&e.kind!=="scalar"&&d(e,'unacceptable node kind for !<?> tag; it should be "scalar", not "'+e.kind+'"'),u=0,f=e.implicitTypes.length;u<f;u+=1)if(g=e.implicitTypes[u],g.resolve(e.result)){e.result=g.construct(e.result),e.tag=g.tag,e.anchor!==null&&(e.anchorMap[e.anchor]=e.result);break}}else if(e.tag!=="!"){if(F.call(e.typeMap[e.kind||"fallback"],e.tag))g=e.typeMap[e.kind||"fallback"][e.tag];else for(g=null,h=e.typeMap.multi[e.kind||"fallback"],u=0,f=h.length;u<f;u+=1)if(e.tag.slice(0,h[u].tag.length)===h[u].tag){g=h[u];break}g||d(e,"unknown tag !<"+e.tag+">"),e.result!==null&&g.kind!==e.kind&&d(e,"unacceptable node kind for !<"+e.tag+'> tag; it should be "'+g.kind+'", not "'+e.kind+'"'),g.resolve(e.result,e.tag)?(e.result=g.construct(e.result,e.tag),e.anchor!==null&&(e.anchorMap[e.anchor]=e.result)):d(e,"cannot resolve a node with !<"+e.tag+"> explicit tag")}return e.listener!==null&&e.listener("close",e),e.tag!==null||e.anchor!==null||p}function Ni(e){var r=e.position,n,o,i,l=!1,t;for(e.version=null,e.checkLineBreaks=e.legacy,e.tagMap=Object.create(null),e.anchorMap=Object.create(null);(t=e.input.charCodeAt(e.position))!==0&&(w(e,!0,-1),t=e.input.charCodeAt(e.position),!(e.lineIndent>0||t!==37));){for(l=!0,t=e.input.charCodeAt(++e.position),n=e.position;t!==0&&!E(t);)t=e.input.charCodeAt(++e.position);for(o=e.input.slice(n,e.position),i=[],o.length<1&&d(e,"directive name must not be less than one character in length");t!==0;){for(;R(t);)t=e.input.charCodeAt(++e.position);if(t===35){do t=e.input.charCodeAt(++e.position);while(t!==0&&!S(t));break}if(S(t))break;for(n=e.position;t!==0&&!E(t);)t=e.input.charCodeAt(++e.position);i.push(e.input.slice(n,e.position))}t!==0&&Le(e),F.call(br,o)?br[o](e,o,i):ee(e,'unknown document directive "'+o+'"')}if(w(e,!0,-1),e.lineIndent===0&&e.input.charCodeAt(e.position)===45&&e.input.charCodeAt(e.position+1)===45&&e.input.charCodeAt(e.position+2)===45?(e.position+=3,w(e,!0,-1)):l&&d(e,"directives end mark is expected"),Y(e,e.lineIndent-1,J,!1,!0),w(e,!0,-1),e.checkLineBreaks&&xi.test(e.input.slice(r,e.position))&&ee(e,"non-ASCII line breaks are interpreted as content"),e.documents.push(e.result),e.position===e.lineStart&&re(e)){e.input.charCodeAt(e.position)===46&&(e.position+=3,w(e,!0,-1));return}if(e.position<e.length-1)d(e,"end of the stream or a document separator is expected");else return}function Or(e,r){e=String(e),r=r||{},e.length!==0&&(e.charCodeAt(e.length-1)!==10&&e.charCodeAt(e.length-1)!==13&&(e+=`
`),e.charCodeAt(0)===65279&&(e=e.slice(1)));var n=new Ci(e,r),o=e.indexOf("\0");for(o!==-1&&(n.position=o,d(n,"null byte is not allowed in input")),n.input+="\0";n.input.charCodeAt(n.position)===32;)n.lineIndent+=1,n.position+=1;for(;n.position<n.length-1;)Ni(n);return n.documents}function Mi(e,r,n){r!==null&&typeof r=="object"&&typeof n>"u"&&(n=r,r=null);var o=Or(e,n);if(typeof r!="function")return o;for(var i=0,l=o.length;i<l;i+=1)r(o[i])}function Bi(e,r){var n=Or(e,r);if(n.length!==0){if(n.length===1)return n[0];throw new _r("expected a single document in the stream, but found more")}}Fe.exports.loadAll=Mi;Fe.exports.load=Bi});var Jr=b(($o,Zr)=>{"use strict";var oe=D(),Q=q(),Ri=X(),Yr=Object.prototype.toString,Gr=Object.prototype.hasOwnProperty,De=65279,Di=9,z=10,qi=13,Pi=32,Hi=33,Yi=34,Ne=35,Gi=37,Ki=38,ji=39,Ui=42,Kr=44,Wi=45,ne=58,zi=61,$i=62,Vi=63,Qi=64,jr=91,Ur=93,Xi=96,Wr=123,Zi=124,zr=125,C={};C[0]="\\0";C[7]="\\a";C[8]="\\b";C[9]="\\t";C[10]="\\n";C[11]="\\v";C[12]="\\f";C[13]="\\r";C[27]="\\e";C[34]='\\"';C[92]="\\\\";C[133]="\\N";C[160]="\\_";C[8232]="\\L";C[8233]="\\P";var Ji=["y","Y","yes","Yes","YES","on","On","ON","n","N","no","No","NO","off","Off","OFF"],eo=/^[-+]?[0-9_]+(?::[0-9_]+)+(?:\.[0-9_]*)?$/;function ro(e,r){var n,o,i,l,t,a,c;if(r===null)return{};for(n={},o=Object.keys(r),i=0,l=o.length;i<l;i+=1)t=o[i],a=String(r[t]),t.slice(0,2)==="!!"&&(t="tag:yaml.org,2002:"+t.slice(2)),c=e.compiledTypeMap.fallback[t],c&&Gr.call(c.styleAliases,a)&&(a=c.styleAliases[a]),n[t]=a;return n}function no(e){var r,n,o;if(r=e.toString(16).toUpperCase(),e<=255)n="x",o=2;else if(e<=65535)n="u",o=4;else if(e<=4294967295)n="U",o=8;else throw new Q("code point within a string may not be greater than 0xFFFFFFFF");return"\\"+n+oe.repeat("0",o-r.length)+r}var io=1,$=2;function oo(e){this.schema=e.schema||Ri,this.indent=Math.max(1,e.indent||2),this.noArrayIndent=e.noArrayIndent||!1,this.skipInvalid=e.skipInvalid||!1,this.flowLevel=oe.isNothing(e.flowLevel)?-1:e.flowLevel,this.styleMap=ro(this.schema,e.styles||null),this.sortKeys=e.sortKeys||!1,this.lineWidth=e.lineWidth||80,this.noRefs=e.noRefs||!1,this.noCompatMode=e.noCompatMode||!1,this.condenseFlow=e.condenseFlow||!1,this.quotingType=e.quotingType==='"'?$:io,this.forceQuotes=e.forceQuotes||!1,this.replacer=typeof e.replacer=="function"?e.replacer:null,this.implicitTypes=this.schema.compiledImplicit,this.explicitTypes=this.schema.compiledExplicit,this.tag=null,this.result="",this.duplicates=[],this.usedDuplicates=null}function Nr(e,r){for(var n=oe.repeat(" ",r),o=0,i=-1,l="",t,a=e.length;o<a;)i=e.indexOf(`
`,o),i===-1?(t=e.slice(o),o=a):(t=e.slice(o,i+1),o=i+1),t.length&&t!==`
`&&(l+=n),l+=t;return l}function Me(e,r){return`
`+oe.repeat(" ",e.indent*r)}function to(e,r){var n,o,i;for(n=0,o=e.implicitTypes.length;n<o;n+=1)if(i=e.implicitTypes[n],i.resolve(r))return!0;return!1}function ie(e){return e===Pi||e===Di}function V(e){return 32<=e&&e<=126||161<=e&&e<=55295&&e!==8232&&e!==8233||57344<=e&&e<=65533&&e!==De||65536<=e&&e<=1114111}function Mr(e){return V(e)&&e!==De&&e!==qi&&e!==z}function Br(e,r,n){var o=Mr(e),i=o&&!ie(e);return(n?o:o&&e!==Kr&&e!==jr&&e!==Ur&&e!==Wr&&e!==zr)&&e!==Ne&&!(r===ne&&!i)||Mr(r)&&!ie(r)&&e===Ne||r===ne&&i}function lo(e){return V(e)&&e!==De&&!ie(e)&&e!==Wi&&e!==Vi&&e!==ne&&e!==Kr&&e!==jr&&e!==Ur&&e!==Wr&&e!==zr&&e!==Ne&&e!==Ki&&e!==Ui&&e!==Hi&&e!==Zi&&e!==zi&&e!==$i&&e!==ji&&e!==Yi&&e!==Gi&&e!==Qi&&e!==Xi}function ao(e){return!ie(e)&&e!==ne}function W(e,r){var n=e.charCodeAt(r),o;return n>=55296&&n<=56319&&r+1<e.length&&(o=e.charCodeAt(r+1),o>=56320&&o<=57343)?(n-55296)*1024+o-56320+65536:n}function $r(e){var r=/^\n* /;return r.test(e)}var Vr=1,Be=2,Qr=3,Xr=4,G=5;function co(e,r,n,o,i,l,t,a){var c,s=0,p=null,u=!1,f=!1,h=o!==-1,g=-1,x=lo(W(e,0))&&ao(W(e,e.length-1));if(r||t)for(c=0;c<e.length;s>=65536?c+=2:c++){if(s=W(e,c),!V(s))return G;x=x&&Br(s,p,a),p=s}else{for(c=0;c<e.length;s>=65536?c+=2:c++){if(s=W(e,c),s===z)u=!0,h&&(f=f||c-g-1>o&&e[g+1]!==" ",g=c);else if(!V(s))return G;x=x&&Br(s,p,a),p=s}f=f||h&&c-g-1>o&&e[g+1]!==" "}return!u&&!f?x&&!t&&!i(e)?Vr:l===$?G:Be:n>9&&$r(e)?G:t?l===$?G:Be:f?Xr:Qr}function so(e,r,n,o,i){e.dump=(function(){if(r.length===0)return e.quotingType===$?'""':"''";if(!e.noCompatMode&&(Ji.indexOf(r)!==-1||eo.test(r)))return e.quotingType===$?'"'+r+'"':"'"+r+"'";var l=e.indent*Math.max(1,n),t=e.lineWidth===-1?-1:Math.max(Math.min(e.lineWidth,40),e.lineWidth-l),a=o||e.flowLevel>-1&&n>=e.flowLevel;function c(s){return to(e,s)}switch(co(r,a,e.indent,t,c,e.quotingType,e.forceQuotes&&!o,i)){case Vr:return r;case Be:return"'"+r.replace(/'/g,"''")+"'";case Qr:return"|"+Rr(r,e.indent)+Dr(Nr(r,l));case Xr:return">"+Rr(r,e.indent)+Dr(Nr(uo(r,t),l));case G:return'"'+po(r,t)+'"';default:throw new Q("impossible error: invalid scalar style")}})()}function Rr(e,r){var n=$r(e)?String(r):"",o=e[e.length-1]===`
`,i=o&&(e[e.length-2]===`
`||e===`
`),l=i?"+":o?"":"-";return n+l+`
`}function Dr(e){return e[e.length-1]===`
`?e.slice(0,-1):e}function uo(e,r){for(var n=/(\n+)([^\n]*)/g,o=(function(){var s=e.indexOf(`
`);return s=s!==-1?s:e.length,n.lastIndex=s,qr(e.slice(0,s),r)})(),i=e[0]===`
`||e[0]===" ",l,t;t=n.exec(e);){var a=t[1],c=t[2];l=c[0]===" ",o+=a+(!i&&!l&&c!==""?`
`:"")+qr(c,r),i=l}return o}function qr(e,r){if(e===""||e[0]===" ")return e;for(var n=/ [^ ]/g,o,i=0,l,t=0,a=0,c="";o=n.exec(e);)a=o.index,a-i>r&&(l=t>i?t:a,c+=`
`+e.slice(i,l),i=l+1),t=a;return c+=`
`,e.length-i>r&&t>i?c+=e.slice(i,t)+`
`+e.slice(t+1):c+=e.slice(i),c.slice(1)}function po(e){for(var r="",n=0,o,i=0;i<e.length;n>=65536?i+=2:i++)n=W(e,i),o=C[n],!o&&V(n)?(r+=e[i],n>=65536&&(r+=e[i+1])):r+=o||no(n);return r}function fo(e,r,n){var o="",i=e.tag,l,t,a;for(l=0,t=n.length;l<t;l+=1)a=n[l],e.replacer&&(a=e.replacer.call(n,String(l),a)),(I(e,r,a,!1,!1)||typeof a>"u"&&I(e,r,null,!1,!1))&&(o!==""&&(o+=","+(e.condenseFlow?"":" ")),o+=e.dump);e.tag=i,e.dump="["+o+"]"}function Pr(e,r,n,o){var i="",l=e.tag,t,a,c;for(t=0,a=n.length;t<a;t+=1)c=n[t],e.replacer&&(c=e.replacer.call(n,String(t),c)),(I(e,r+1,c,!0,!0,!1,!0)||typeof c>"u"&&I(e,r+1,null,!0,!0,!1,!0))&&((!o||i!=="")&&(i+=Me(e,r)),e.dump&&z===e.dump.charCodeAt(0)?i+="-":i+="- ",i+=e.dump);e.tag=l,e.dump=i||"[]"}function ho(e,r,n){var o="",i=e.tag,l=Object.keys(n),t,a,c,s,p;for(t=0,a=l.length;t<a;t+=1)p="",o!==""&&(p+=", "),e.condenseFlow&&(p+='"'),c=l[t],s=n[c],e.replacer&&(s=e.replacer.call(n,c,s)),I(e,r,c,!1,!1)&&(e.dump.length>1024&&(p+="? "),p+=e.dump+(e.condenseFlow?'"':"")+":"+(e.condenseFlow?"":" "),I(e,r,s,!1,!1)&&(p+=e.dump,o+=p));e.tag=i,e.dump="{"+o+"}"}function go(e,r,n,o){var i="",l=e.tag,t=Object.keys(n),a,c,s,p,u,f;if(e.sortKeys===!0)t.sort();else if(typeof e.sortKeys=="function")t.sort(e.sortKeys);else if(e.sortKeys)throw new Q("sortKeys must be a boolean or a function");for(a=0,c=t.length;a<c;a+=1)f="",(!o||i!=="")&&(f+=Me(e,r)),s=t[a],p=n[s],e.replacer&&(p=e.replacer.call(n,s,p)),I(e,r+1,s,!0,!0,!0)&&(u=e.tag!==null&&e.tag!=="?"||e.dump&&e.dump.length>1024,u&&(e.dump&&z===e.dump.charCodeAt(0)?f+="?":f+="? "),f+=e.dump,u&&(f+=Me(e,r)),I(e,r+1,p,!0,u)&&(e.dump&&z===e.dump.charCodeAt(0)?f+=":":f+=": ",f+=e.dump,i+=f));e.tag=l,e.dump=i||"{}"}function Hr(e,r,n){var o,i,l,t,a,c;for(i=n?e.explicitTypes:e.implicitTypes,l=0,t=i.length;l<t;l+=1)if(a=i[l],(a.instanceOf||a.predicate)&&(!a.instanceOf||typeof r=="object"&&r instanceof a.instanceOf)&&(!a.predicate||a.predicate(r))){if(n?a.multi&&a.representName?e.tag=a.representName(r):e.tag=a.tag:e.tag="?",a.represent){if(c=e.styleMap[a.tag]||a.defaultStyle,Yr.call(a.represent)==="[object Function]")o=a.represent(r,c);else if(Gr.call(a.represent,c))o=a.represent[c](r,c);else throw new Q("!<"+a.tag+'> tag resolver accepts not "'+c+'" style');e.dump=o}return!0}return!1}function I(e,r,n,o,i,l,t){e.tag=null,e.dump=n,Hr(e,n,!1)||Hr(e,n,!0);var a=Yr.call(e.dump),c=o,s;o&&(o=e.flowLevel<0||e.flowLevel>r);var p=a==="[object Object]"||a==="[object Array]",u,f;if(p&&(u=e.duplicates.indexOf(n),f=u!==-1),(e.tag!==null&&e.tag!=="?"||f||e.indent!==2&&r>0)&&(i=!1),f&&e.usedDuplicates[u])e.dump="*ref_"+u;else{if(p&&f&&!e.usedDuplicates[u]&&(e.usedDuplicates[u]=!0),a==="[object Object]")o&&Object.keys(e.dump).length!==0?(go(e,r,e.dump,i),f&&(e.dump="&ref_"+u+e.dump)):(ho(e,r,e.dump),f&&(e.dump="&ref_"+u+" "+e.dump));else if(a==="[object Array]")o&&e.dump.length!==0?(e.noArrayIndent&&!t&&r>0?Pr(e,r-1,e.dump,i):Pr(e,r,e.dump,i),f&&(e.dump="&ref_"+u+e.dump)):(fo(e,r,e.dump),f&&(e.dump="&ref_"+u+" "+e.dump));else if(a==="[object String]")e.tag!=="?"&&so(e,e.dump,r,l,c);else{if(a==="[object Undefined]")return!1;if(e.skipInvalid)return!1;throw new Q("unacceptable kind of an object to dump "+a)}e.tag!==null&&e.tag!=="?"&&(s=encodeURI(e.tag[0]==="!"?e.tag.slice(1):e.tag).replace(/!/g,"%21"),e.tag[0]==="!"?s="!"+s:s.slice(0,18)==="tag:yaml.org,2002:"?s="!!"+s.slice(18):s="!<"+s+">",e.dump=s+" "+e.dump)}return!0}function mo(e,r){var n=[],o=[],i,l;for(Re(e,n,o),i=0,l=o.length;i<l;i+=1)r.duplicates.push(n[o[i]]);r.usedDuplicates=new Array(l)}function Re(e,r,n){var o,i,l;if(e!==null&&typeof e=="object")if(i=r.indexOf(e),i!==-1)n.indexOf(i)===-1&&n.push(i);else if(r.push(e),Array.isArray(e))for(i=0,l=e.length;i<l;i+=1)Re(e[i],r,n);else for(o=Object.keys(e),i=0,l=o.length;i<l;i+=1)Re(e[o[i]],r,n)}function xo(e,r){r=r||{};var n=new oo(r);n.noRefs||mo(e,n);var o=e;return n.replacer&&(o=n.replacer.call({"":o},"",o)),I(n,0,o,!0,!0)?n.dump+`
`:""}Zr.exports.dump=xo});var rn=b((Vo,A)=>{"use strict";var en=Fr(),vo=Jr();function qe(e,r){return function(){throw new Error("Function yaml."+e+" is removed in js-yaml 4. Use yaml."+r+" instead, which is now safe by default.")}}A.exports.Type=_();A.exports.Schema=pe();A.exports.FAILSAFE_SCHEMA=ge();A.exports.JSON_SCHEMA=ye();A.exports.CORE_SCHEMA=we();A.exports.DEFAULT_SCHEMA=X();A.exports.load=en.load;A.exports.loadAll=en.loadAll;A.exports.dump=vo.dump;A.exports.YAMLException=q();A.exports.types={binary:Ee(),float:be(),map:he(),null:me(),pairs:Se(),set:Te(),timestamp:_e(),bool:xe(),int:ve(),merge:Ce(),omap:ke(),seq:fe(),str:de()};A.exports.safeLoad=qe("safeLoad","load");A.exports.safeLoadAll=qe("safeLoadAll","loadAll");A.exports.safeDump=qe("safeDump","dump")});var v=require("vscode"),T=require("fs"),nn=require("os"),L=require("path"),bo=require("crypto"),yo=rn(),Pe="crystalContext.configScope",te="crystalcontext_config.md",wo="crystalcontext_notepad.txt",on=".claude";function le(e){return e&&e.message?e.message:String(e)}var He=class{constructor(r,n){this._extensionUri=r,this._context=n,this._view=null,this._selectedTab=null,this._watcher=null,this._isWebviewReady=!1,this._ensuredDirs=new Set}_ensureDir(r){if(!this._ensuredDirs.has(r)){try{T.mkdirSync(r,{recursive:!0})}catch{}this._ensuredDirs.add(r)}}_getConfigScope(){return this._context.globalState.get(Pe)==="global"?"global":"local"}_resolveScopedPath(r){let n=this._getConfigScope();if(n==="local"){let o=v.workspace.workspaceFolders;return!o||!o.length?{scope:n,filePath:null}:{scope:n,filePath:L.join(o[0].uri.fsPath,r)}}return{scope:n,filePath:L.join(nn.homedir(),on,r)}}_resolveConfigPathInfo(){let{scope:r,filePath:n}=this._resolveScopedPath(te);return{scope:r,configPath:n}}_notepadPath(){let{filePath:r}=this._resolveScopedPath(wo);if(!r)throw new Error("No workspace folder open \u2014 open a folder for Local notepad, or choose Global (.claude).");return r}_localConfigPath(){let r=v.workspace.workspaceFolders;if(!r||!r.length)throw new Error("No workspace folder open \u2014 open a folder before creating a workspace config.");return L.join(r[0].uri.fsPath,te)}_globalConfigPath(){return L.join(nn.homedir(),on,te)}_setupConfigWatcher(){this._watcher&&(this._watcher.dispose(),this._watcher=null);let r=this._resolveConfigPathInfo();if(!r.configPath)return;let n=L.dirname(r.configPath);this._ensureDir(n);let o=L.basename(r.configPath);try{let i=new v.RelativePattern(v.Uri.file(n),o);this._watcher=v.workspace.createFileSystemWatcher(i),this._watcher.onDidChange(()=>this._loadItems()),this._watcher.onDidCreate(()=>this._loadItems()),this._watcher.onDidDelete(()=>this._loadItems())}catch{}}_syncConfigScopeToWebview(){this._view&&this._view.webview.postMessage({command:"configScope",scope:this._getConfigScope()})}async _notepadOp(r){try{let n=this._notepadPath();await r(n)}catch(n){this._view.webview.postMessage({command:"notepadError",detail:le(n)})}}resolveWebviewView(r){this._view=r,this._isWebviewReady=!1,r.webview.options={enableScripts:!0},r.webview.html=this._getHtml(),r.onDidChangeVisibility(()=>{r.visible?this._loadItems():this._view.webview.postMessage({command:"panelHidden"})}),r.onDidDispose(()=>{this._isWebviewReady=!1,this._watcher&&(this._watcher.dispose(),this._watcher=null)}),r.webview.onDidReceiveMessage(async n=>{switch(n.command){case"ready":this._isWebviewReady=!0,this._syncConfigScopeToWebview(),this._loadItems();break;case"setConfigScope":(n.scope==="local"||n.scope==="global")&&(await this._context.globalState.update(Pe,n.scope),this._setupConfigWatcher(),this._syncConfigScopeToWebview(),this._loadItems());break;case"refresh":this._loadItems();break;case"createLocalConfig":await this._createLocalConfig();break;case"editConfig":await this._openConfigInEditor();break;case"changeTab":this._selectedTab=n.tab||null,this._loadItems();break;case"sendToChat":await this._sendToChat(n.text);break;case"sendToTerminal":this._sendToTerminal(n.text);break;case"copyToClipboard":await v.env.clipboard.writeText(n.text),v.window.showInformationMessage("Prompt copied to clipboard!");break;case"notepadLoad":await this._notepadOp(async o=>{let i="";try{i=T.readFileSync(o,"utf8")}catch(l){if(l.code!=="ENOENT")throw l}this._view.webview.postMessage({command:"notepadContent",text:i,pathLabel:o})});break;case"saveNotepad":await this._notepadOp(o=>{this._ensureDir(L.dirname(o)),T.writeFileSync(o,n.text!=null?String(n.text):"","utf8"),this._view.webview.postMessage({command:"notepadSaved",pathLabel:o})});break;case"clearNotepad":await this._notepadOp(o=>{this._ensureDir(L.dirname(o)),T.writeFileSync(o,"","utf8"),this._view.webview.postMessage({command:"notepadContent",text:"",pathLabel:o})});break;case"copyNotepad":await v.env.clipboard.writeText(n.text!=null?String(n.text):""),v.window.showInformationMessage("Notepad copied to clipboard.");break}}),this._setupConfigWatcher()}async _createLocalConfig(){try{let r=this._globalConfigPath(),n=this._localConfigPath();if(!T.existsSync(r))throw new Error(`Global config not found: ${r}`);if(T.existsSync(n))throw new Error(`Workspace config already exists: ${n}`);this._ensureDir(L.dirname(n)),T.copyFileSync(r,n,T.constants.COPYFILE_EXCL),await this._context.globalState.update(Pe,"local"),this._setupConfigWatcher(),this._syncConfigScopeToWebview(),this._loadItems(),v.window.showInformationMessage(`Created workspace config: ${n}`)}catch(r){v.window.showErrorMessage(`Create local failed: ${le(r)}`)}}async _openConfigInEditor(){try{let{configPath:r}=this._resolveConfigPathInfo();if(!r)throw new Error("No workspace folder open \u2014 open a folder before editing the workspace config.");if(!T.existsSync(r))throw new Error(`Config file not found: ${r}`);let n=await v.workspace.openTextDocument(r);await v.window.showTextDocument(n,{preview:!1})}catch(r){v.window.showErrorMessage(`Edit config failed: ${le(r)}`)}}_loadItems(){if(!this._view||!this._isWebviewReady)return;let r=this._resolveConfigPathInfo(),n=r.scope;if(!r.configPath){this._view.webview.postMessage({command:"noWorkspace",configScope:n,detail:"Open a folder to load workspace config, or switch to Global (.claude)."});return}let o=r.configPath;try{let i=T.readFileSync(o,"utf8"),l=this._extractYamlBlock(i),t=yo.load(l);if(!t||typeof t!="object"||Array.isArray(t)){this._view.webview.postMessage({command:"parseError",configScope:n,detail:"Root YAML node must be a map of tabs."});return}let a=Object.keys(t);if(!a.length){this._view.webview.postMessage({command:"parseError",configScope:n,detail:"No tabs found in crystalcontext_config.md."});return}(!this._selectedTab||!a.includes(this._selectedTab))&&(this._selectedTab=a[0]);let c=t[this._selectedTab],s=this._sectionsFromTab(this._selectedTab,c);this._view.webview.postMessage({command:"loadItems",tabs:a,selectedTab:this._selectedTab,sections:s,configScope:n})}catch(i){if(i&&i.code==="ENOENT"){let l=n==="local"?"workspace root":"your user profile .claude folder";this._view.webview.postMessage({command:"noFile",configScope:n,pathLabel:l,detail:`No ${te} in ${l}.`})}else this._view.webview.postMessage({command:"parseError",configScope:n,detail:le(i)})}}_extractYamlBlock(r){let n=r.match(/```(?:yaml-table|yaml|yml)?\s*([\s\S]*?)```/i);return n&&n[1]?n[1].trim():r}_sectionsFromTab(r,n){let o=[];if(!n||typeof n!="object"||Array.isArray(n))return o;for(let[i,l]of Object.entries(n)){if(!Array.isArray(l))continue;let t={title:String(i).replace(/_/g," "),items:[]};for(let[a,c]of l.entries())t.items.push(...this._normalizeEntry(r,i,c,a));o.push(t)}return o}_normalizeEntry(r,n,o,i){if(typeof o=="string"){let p=this._parseStringEntry(o);return p.label?[{id:this._makeItemId(r,n,p.label,i),label:p.label,description:p.description,full:p.body,singleOutput:p.label,optionLabel:p.description||p.body||p.label,optionValue:p.description,control:null}]:[]}if(!o||typeof o!="object"||Array.isArray(o))return[];let l=String(o.label||"").trim();if(!l)return[];let t=String(o.description||"").trim(),a=String(o.value||l).trim()||l,c=String(o.control||"").trim().toLowerCase(),s=c==="select"||c==="dropdown"?"select":c==="checkbox"?"checkbox":c==="radio"?"radio":null;return Array.isArray(o.options)&&o.options.length?o.options.map((p,u)=>this._normalizeOption(r,n,l,p,i,u,s)).filter(Boolean):[{id:this._makeItemId(r,n,l,i),label:l,description:t,full:t?`${l}: ${t}`:l,singleOutput:a,optionLabel:t||l,optionValue:"",control:s}]}_normalizeOption(r,n,o,i,l,t,a){if(typeof i=="string"){let p=i.trim();return p?{id:this._makeItemId(r,n,`${o}_${p}`,`${l}_${t}`),label:o,description:p,full:`${o} ${p}`.trim(),singleOutput:o,optionLabel:p,optionValue:p,control:a}:null}if(!i||typeof i!="object"||Array.isArray(i))return null;let c=String(i.label||i.value||"").trim(),s=String(i.value||i.label||"").trim();return!c&&!s?null:{id:this._makeItemId(r,n,`${o}_${s||c}`,`${l}_${t}`),label:o,description:c,full:`${o} ${s||c}`.trim(),singleOutput:o,optionLabel:c||s,optionValue:s||c,control:a}}_parseStringEntry(r){let n=String(r).trim();if(!n)return{body:"",label:"",description:""};let o=n.indexOf(":"),i=n,l="";if(o!==-1)i=n.substring(0,o).trim(),l=n.substring(o+1).trim();else{let t=n.indexOf(" ");t!==-1&&(i=n.substring(0,t).trim(),l=n.substring(t+1).trim())}return{body:n,label:i,description:l}}_makeItemId(r,n,o,i){return`${r}_${n}_${o}_${i}`.replace(/\s+/g,"_")}async _sendToChat(r){let n=[()=>v.commands.executeCommand("workbench.action.chat.open",{query:r}),()=>v.commands.executeCommand("workbench.action.chat.open",r),()=>v.commands.executeCommand("composer.startComposerPrompt",{message:r}),()=>v.commands.executeCommand("aichat.newchataction",r)],o;for(let i of n)try{await i();return}catch(l){o=l}await v.env.clipboard.writeText(r),v.window.showInformationMessage("Chat unavailable \u2014 prompt copied to clipboard.")}_sendToTerminal(r){let n=v.window.activeTerminal??v.window.createTerminal("Crystal Context");n.show(),n.sendText(r,!1)}_getHtml(){let r=bo.randomBytes(16).toString("base64");return`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Crystal Context</title>
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${r}';">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: var(--vscode-font-family);
    font-size: var(--vscode-font-size);
    color: var(--vscode-foreground);
    background: var(--vscode-sideBar-background);
    padding: 8px;
    height: 100vh;
    display: flex;
    flex-direction: column;
    gap: 8px;
    overflow: hidden;
  }

  .top-bar {
    display: flex;
    gap: 4px;
    align-items: center;
    flex-shrink: 0;
  }

  .config-scope-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 12px;
    padding: 4px 0 6px;
    border-bottom: 1px solid var(--vscode-widget-border, rgba(128,128,128,0.25));
    margin-bottom: 4px;
    font-size: 11px;
    flex-shrink: 0;
  }

  .config-scope-row .scope-label {
    font-weight: 600;
    color: var(--vscode-descriptionForeground);
    margin-right: 4px;
  }

  .scope-radio-label {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 3px 10px;
    border-radius: 4px;
    border: 1px solid var(--vscode-widget-border, rgba(128,128,128,0.35));
    cursor: pointer;
    user-select: none;
    transition: background 0.12s ease, border-color 0.12s ease;
  }
  .scope-radio-label:hover { background: var(--vscode-list-hoverBackground); }
  .scope-radio-label.scope-radio-selected {
    border-color: var(--vscode-focusBorder);
    background: var(--vscode-input-background);
    font-weight: 600;
    box-shadow: 0 0 0 1px var(--vscode-focusBorder);
  }
  /* Native radio dots are often invisible in webviews; draw a clear checked state. */
  .config-scope-row input[type=radio] {
    appearance: none;
    -webkit-appearance: none;
    width: 14px;
    height: 14px;
    margin: 0;
    cursor: pointer;
    flex-shrink: 0;
    border-radius: 50%;
    border: 1.5px solid var(--vscode-widget-border, rgba(128,128,128,0.45));
    background-color: var(--vscode-input-background);
    background-image: none;
  }
  .config-scope-row input[type=radio]:checked {
    border-color: var(--vscode-focusBorder);
    background-color: var(--vscode-focusBorder);
    /* High-contrast center dot (radial alone can disappear in some webviews) */
    background-image: radial-gradient(
      circle at center,
      var(--vscode-sideBar-background, var(--vscode-editor-background)) 0,
      var(--vscode-sideBar-background, var(--vscode-editor-background)) 36%,
      transparent 37%
    );
  }
  .config-scope-row input[type=radio]:focus-visible {
    outline: 1px solid var(--vscode-focusBorder);
    outline-offset: 2px;
  }

  .tabs-bar {
    display: flex;
    gap: 4px;
    min-width: 0;
    overflow-x: auto;
  }

  .scope-actions {
    display: inline-flex;
    gap: 6px;
    margin-left: auto;
  }

  .tab-btn {
    background: transparent;
    color: var(--vscode-foreground);
    border: 1px solid var(--vscode-widget-border, rgba(128,128,128,0.3));
    padding: 3px 8px;
    cursor: pointer;
    font-size: 11px;
    border-radius: 10px;
    white-space: nowrap;
  }
  .tab-btn.active {
    background: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    border-color: var(--vscode-button-background);
  }
  .tab-btn:hover { background: var(--vscode-list-hoverBackground); }

  .top-bar button {
    background: var(--vscode-button-secondaryBackground);
    color: var(--vscode-button-secondaryForeground);
    border: none;
    padding: 3px 8px;
    cursor: pointer;
    font-size: 11px;
    border-radius: 2px;
  }
  .top-bar button:hover { background: var(--vscode-button-secondaryHoverBackground); }
  .top-bar .btn-refresh {
    font-size: 15px;
    line-height: 1;
    padding: 5px 12px;
    min-width: 40px;
    font-weight: 700;
  }
  .spacer { flex: 1; }

  .panels {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-height: 0;
  }

  .panel {
    border: 1px solid var(--vscode-widget-border, rgba(128,128,128,0.25));
    border-radius: 4px;
    overflow: hidden;
    flex-shrink: 0;
  }

  .panel-header {
    background: var(--vscode-sideBarSectionHeader-background, rgba(128,128,128,0.1));
    padding: 5px 8px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: space-between;
    user-select: none;
    color: var(--vscode-sideBarSectionHeader-foreground, var(--vscode-foreground));
  }
  .panel-header:hover { background: var(--vscode-list-hoverBackground); }

  .chevron { font-size: 9px; transition: transform 0.15s; opacity: 0.7; }
  .panel.collapsed .chevron { transform: rotate(-90deg); }
  .panel.collapsed .panel-body { display: none; }

  .panel-body { padding: 4px 0; }

  .item {
    display: flex;
    align-items: baseline;
    gap: 7px;
    padding: 4px 10px;
    cursor: pointer;
    border-radius: 2px;
  }
  .item:hover { background: var(--vscode-list-hoverBackground); }

  .item input[type=checkbox] {
    flex-shrink: 0;
    cursor: pointer;
    accent-color: var(--vscode-focusBorder);
    margin-top: 1px;
  }

  .item-radio-group { flex-wrap: wrap; align-items: flex-start; cursor: default; }
  .item-radio-group:hover { background: transparent; }

  .item-radio-options {
    display: flex;
    flex-wrap: wrap;
    gap: 10px 14px;
    align-items: center;
    margin-left: auto;
    flex: 1;
    min-width: 0;
    justify-content: flex-end;
  }

  .item-radio {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    cursor: pointer;
    font-size: 11px;
    color: var(--vscode-foreground);
    user-select: none;
  }
  .item-radio input[type=radio] {
    cursor: pointer;
    accent-color: var(--vscode-focusBorder);
    margin: 0;
    flex-shrink: 0;
  }

  .item-label { font-size: 12px; font-weight: 500; color: var(--vscode-foreground); white-space: nowrap; flex-shrink: 0; }

  .item-desc {
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .item-select {
    margin-left: auto;
    min-width: 120px;
    max-width: 45%;
    background: var(--vscode-dropdown-background, var(--vscode-input-background));
    color: var(--vscode-dropdown-foreground, var(--vscode-input-foreground));
    border: 1px solid var(--vscode-dropdown-border, rgba(128,128,128,0.3));
    border-radius: 2px;
    font-size: 11px;
    padding: 2px 4px;
  }

  .badge {
    background: var(--vscode-badge-background);
    color: var(--vscode-badge-foreground);
    font-size: 9px;
    padding: 0 5px;
    border-radius: 8px;
    font-weight: 700;
    min-width: 16px;
    text-align: center;
  }

  /* Assembled prompt \u2014 fixed height so it does not swallow the panel */
  .output-section {
    flex: 0 0 auto;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 5px;
    min-height: 0;
  }

  .output-label {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: var(--vscode-descriptionForeground);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .output-label a { color: var(--vscode-descriptionForeground); cursor: pointer; text-decoration: none; font-weight: 400; }
  .output-label a:hover { color: var(--vscode-foreground); }

  textarea {
    width: 100%;
    background: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    border: 1px solid var(--vscode-input-border, rgba(128,128,128,0.3));
    padding: 6px;
    font-size: 11px;
    font-family: var(--vscode-editor-font-family, monospace);
    border-radius: 3px;
    outline: none;
    line-height: 1.5;
  }
  #output {
    height: 75px;
    min-height: 75px;
    max-height: 75px;
    flex: 0 0 auto;
    resize: none;
    overflow-y: auto;
    box-sizing: border-box;
  }
  textarea:focus { border-color: var(--vscode-focusBorder); }

  .notepad-toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; flex-shrink: 0; }
  .notepad-path {
    font-size: 10px;
    color: var(--vscode-descriptionForeground);
    margin-left: auto;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .notepad-panel-inner { display: flex; flex-direction: column; flex: 1; min-height: 0; gap: 8px; height: 100%; }
  .notepad-editor {
    flex: 1;
    min-height: 8rem;
    width: 100%;
    resize: vertical;
    background: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    border: 1px solid var(--vscode-input-border, rgba(128,128,128,0.3));
    padding: 8px;
    font-size: 12px;
    font-family: var(--vscode-editor-font-family, monospace);
    line-height: 1.45;
    border-radius: 3px;
    outline: none;
  }
  .notepad-editor:focus { border-color: var(--vscode-focusBorder); }
  .notepad-error { flex-shrink: 0; padding: 6px 4px; color: var(--vscode-errorForeground); font-size: 11px; line-height: 1.4; }

  .action-row { display: flex; gap: 4px; }

  .btn-primary {
    flex: 1;
    background: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    border: none;
    padding: 5px 10px;
    cursor: pointer;
    font-size: 12px;
    border-radius: 3px;
    font-weight: 500;
  }
  .btn-primary:hover { background: var(--vscode-button-hoverBackground); }

  .btn-secondary {
    background: var(--vscode-button-secondaryBackground);
    color: var(--vscode-button-secondaryForeground);
    border: none;
    padding: 5px 12px;
    cursor: pointer;
    font-size: 12px;
    border-radius: 3px;
  }
  .btn-secondary:hover { background: var(--vscode-button-secondaryHoverBackground); }

  .empty { padding: 20px 10px; text-align: center; color: var(--vscode-descriptionForeground); font-size: 12px; line-height: 1.7; }
</style>
</head>
<body>

<div class="config-scope-row" id="configScopeRow" title="Where to load crystalcontext_config.md from">
  <span class="scope-label">Config</span>
  <label class="scope-radio-label" id="labelScopeLocal"><input type="radio" name="configScope" id="radioScopeLocal" value="local"><span> Workspace</span></label>
  <label class="scope-radio-label" id="labelScopeGlobal"><input type="radio" name="configScope" id="radioScopeGlobal" value="global"><span> Global (.claude)</span></label>
  <div class="scope-actions">
    <button type="button" class="btn-secondary" id="btnCreateLocal" title="Copy the global config into the workspace root">Create local</button>
  </div>
</div>

<div class="top-bar">
  <div id="tabsBar" class="tabs-bar" title="Select workflow tab"></div>
  <div class="spacer"></div>
  <button id="btnEditConfig" title="Open the current config file in the editor">Edit</button>
  <button id="btnReload" class="btn-refresh" title="Reload crystalcontext_config.md and clear selections">\u21BA</button>
</div>

<div class="panels" id="panels">
  <div class="empty">Loading\u2026</div>
</div>

<div class="output-section">
  <div class="output-label">
    <span>Assembled Prompt</span>
    <a id="btnClear" style="cursor:pointer;">\u2715 clear</a>
  </div>
  <textarea id="output" placeholder="Check items above\u2026" spellcheck="false"></textarea>
  <div class="action-row">
    <button class="btn-primary" id="btnSend">\u2B06 Send to Chat</button>
    <button class="btn-secondary" id="btnSendTerminal">\u2B9E Send to Terminal</button>
    <button class="btn-secondary" id="btnCopy">Copy</button>
  </div>
</div>

<script nonce="${r}">
  const vscode = acquireVsCodeApi();

  let sections = [];
  let tabs = [];
  let selectedTab = '';
  let checked = {};
  let groupChoice = {};
  let sectionGroupKeys = {};
  let selectedGroups = [];
  let userSuffix = '';
  let syncingOutput = false;
  // #14: removed configScope variable \u2014 dead state; scope is owned by radio DOM
  let notepadSaveTimer = null;
  // #16: cache built groups after render() so getGroupOutput doesn't rebuild per call
  let builtGroupsMap = {};
  // #10: isNotepad cached boolean \u2014 invalidated via updateSelectedTab
  let isNotepad = false;

  // #10: update selectedTab and cached isNotepad together
  function updateSelectedTab(tab) {
    selectedTab = tab || '';
    isNotepad = selectedTab.trim().replace(/\\s+/g, ' ').toLowerCase() === 'notepad';
  }

  function applyScopeToRadios(scope) {
    const local = document.getElementById('radioScopeLocal');
    const g = document.getElementById('radioScopeGlobal');
    const ll = document.getElementById('labelScopeLocal');
    const lg = document.getElementById('labelScopeGlobal');
    if (!local || !g) return;
    const s = scope === 'global' ? 'global' : 'local';
    // #14: no configScope variable update
    local.checked = s === 'local';
    g.checked = s === 'global';
    if (ll) ll.classList.toggle('scope-radio-selected', s === 'local');
    if (lg) lg.classList.toggle('scope-radio-selected', s === 'global');
  }

  const scopeRow = document.getElementById('configScopeRow');
  if (scopeRow) {
    scopeRow.addEventListener('change', e => {
      const t = e.target;
      if (t && t.name === 'configScope' && (t.value === 'local' || t.value === 'global')) {
        vscode.postMessage({ command: 'setConfigScope', scope: t.value });
      }
    });
  }

  document.getElementById('panels').addEventListener('input', e => {
    if (e.target && e.target.id === 'notepadEditor') {
      clearTimeout(notepadSaveTimer);
      notepadSaveTimer = setTimeout(() => {
        const ta = document.getElementById('notepadEditor');
        vscode.postMessage({ command: 'saveNotepad', text: ta ? ta.value : '' });
      }, 400);
    }
  });

  document.getElementById('tabsBar').addEventListener('click', onTabClick);
  document.getElementById('btnCreateLocal').addEventListener('click', createLocalConfig);
  document.getElementById('btnEditConfig').addEventListener('click', editConfig);
  document.getElementById('btnReload').addEventListener('click', handleReload);
  document.getElementById('btnClear').addEventListener('click', clearAll);
  document.getElementById('btnSend').addEventListener('click', sendToChat);
  document.getElementById('btnSendTerminal').addEventListener('click', sendToTerminal);
  document.getElementById('btnCopy').addEventListener('click', copyPrompt);
  document.getElementById('output').addEventListener('input', e => {
    if (syncingOutput) return;
    const raw = normalizeOutput(e.target.value);
    const generated = buildGeneratedOutput();
    if (!generated) { userSuffix = raw; return; }
    if (raw === generated) { userSuffix = ''; return; }
    if (raw.startsWith(generated + ' ')) { userSuffix = normalizeOutput(raw.slice(generated.length)); return; }
    userSuffix = raw;
  });

  document.getElementById('panels').addEventListener('click', e => {
    if (e.target.closest('#notepadCopy')) {
      const ta = document.getElementById('notepadEditor');
      vscode.postMessage({ command: 'copyNotepad', text: ta ? ta.value : '' });
      return;
    }
    if (e.target.closest('#notepadClear')) {
      vscode.postMessage({ command: 'clearNotepad' });
      return;
    }
    const header = e.target.closest('.panel-header');
    if (header) {
      const panel = header.closest('.panel');
      if (panel) panel.classList.toggle('collapsed');
      return;
    }
    if (!e.target.closest('.item-radio-group') && !e.target.closest('input[type=checkbox]') && !e.target.closest('select')) {
      const item = e.target.closest('.item[data-item-group]');
      if (item) {
        const cb = item.querySelector('input[type=checkbox]');
        if (cb) cb.click();
      }
    }
  });

  document.getElementById('panels').addEventListener('change', e => {
    const cb = e.target.closest('input[type=checkbox]');
    if (cb) {
      const group = cb.dataset.group;
      const label = cb.dataset.label;
      if (!group || !label) return;
      const select = cb.closest('.item') && cb.closest('.item').querySelector('select.item-select');
      if (select) select.disabled = !cb.checked;
      if (cb.checked) {
        checked[group] = label;
        if (!selectedGroups.includes(group)) selectedGroups.push(group);
      } else {
        delete checked[group];
        selectedGroups = selectedGroups.filter(key => key !== group);
      }
      rebuildOutput();
      renderBadges();
      return;
    }

    const select = e.target.closest('select.item-select');
    if (select) {
      const group = select.dataset.group;
      if (!group) return;
      groupChoice[group] = select.value;
      rebuildOutput();
      render();
      return;
    }

    const rad = e.target.closest('input.item-radio-input');
    if (rad && rad.checked) {
      const group = rad.dataset.group;
      const label = rad.dataset.label;
      const optId = rad.dataset.optId;
      if (!group || !label || !optId) return;
      groupChoice[group] = optId;
      checked[group] = label;
      if (!selectedGroups.includes(group)) selectedGroups.push(group);
      rebuildOutput();
      renderBadges();
    }
  });

  window.addEventListener('message', e => {
    const { command, sections: s, tabs: t, selectedTab: activeTab, detail } = e.data;
    // #13: hoisted \u2014 fires for any message that carries configScope (loadItems, noWorkspace, noFile, parseError)
    if (e.data.configScope) applyScopeToRadios(e.data.configScope);

    if (command === 'configScope') {
      applyScopeToRadios(e.data.scope);
      // #15: no explicit notepadLoad here \u2014 _loadItems fires next; render() handles it
    } else if (command === 'panelHidden') {
      // #13: flush pending notepad save before panel hides
      if (notepadSaveTimer !== null) {
        clearTimeout(notepadSaveTimer);
        notepadSaveTimer = null;
        const ta = document.getElementById('notepadEditor');
        if (ta) vscode.postMessage({ command: 'saveNotepad', text: ta.value });
      }
    } else if (command === 'notepadContent') {
      const ta = document.getElementById('notepadEditor');
      const hint = document.getElementById('notepadPathHint');
      const errEl = document.getElementById('notepadError');
      if (ta) ta.value = e.data.text != null ? e.data.text : '';
      if (hint && e.data.pathLabel) hint.textContent = e.data.pathLabel;
      if (errEl) { errEl.style.display = 'none'; errEl.textContent = ''; }
    } else if (command === 'notepadError') {
      const errEl = document.getElementById('notepadError');
      if (errEl) { errEl.style.display = 'block'; errEl.textContent = esc(e.data.detail || 'Could not load or save notepad.'); }
    } else if (command === 'notepadSaved') {
      const errEl = document.getElementById('notepadError');
      if (errEl) { errEl.style.display = 'none'; errEl.textContent = ''; }
      const hint = document.getElementById('notepadPathHint');
      if (hint && e.data.pathLabel) hint.textContent = e.data.pathLabel;
    } else if (command === 'loadItems') {
      tabs = Array.isArray(t) ? t : [];
      updateSelectedTab(activeTab);  // #10: caches isNotepad
      sections = Array.isArray(s) ? s : [];
      renderTabs();
      render();
    } else if (command === 'noWorkspace') {
      const msg = detail || 'No workspace folder open. Open a folder for Local config, or choose Global (.claude).';
      document.getElementById('panels').innerHTML = '<div class="empty">' + esc(msg) + '</div>';
    } else if (command === 'noFile') {
      const hint = e.data.detail || ('No crystalcontext_config.md in ' + (e.data.pathLabel || 'the selected location') + '.');
      document.getElementById('panels').innerHTML = '<div class="empty">' + esc(hint) + '</div>';
    } else if (command === 'parseError') {
      document.getElementById('panels').innerHTML =
        '<div class="empty">Failed to parse crystalcontext_config.md<br>' + esc(detail || 'Unknown error') + '</div>';
    }
  });

  function renderTabs() {
    const tabsBar = document.getElementById('tabsBar');
    tabsBar.innerHTML = tabs.map(tab => {
      const active = tab === selectedTab ? ' active' : '';
      return '<button class="tab-btn' + active + '" data-tab="' + esc(tab) + '">' + esc(tab) + '</button>';
    }).join('');
  }

  function onTabClick(e) {
    const btn = e.target.closest('.tab-btn');
    if (!btn) return;
    const nextTab = btn.dataset.tab;
    if (!nextTab || nextTab === selectedTab) return;

    updateSelectedTab(nextTab);  // #10: caches isNotepad
    groupChoice = {};
    resetSelections();  // #18
    document.getElementById('panels').innerHTML = '<div class="empty">Loading\u2026</div>';
    renderTabs();
    vscode.postMessage({ command: 'changeTab', tab: nextTab });
  }

  function render() {
    const container = document.getElementById('panels');
    sectionGroupKeys = {};
    builtGroupsMap = {};  // #16: invalidate cache on re-render
    if (isNotepad) {  // #10: cached boolean
      container.innerHTML =
        '<div class="notepad-panel-inner">' +
        '<div class="notepad-toolbar">' +
        '<button type="button" class="btn-secondary" id="notepadCopy">Copy</button>' +
        '<button type="button" class="btn-secondary" id="notepadClear">Clear</button>' +
        '<span class="notepad-path" id="notepadPathHint" title="Notepad file path"></span>' +
        '</div>' +
        '<textarea id="notepadEditor" class="notepad-editor" spellcheck="false" placeholder="Saves to crystalcontext_notepad.txt (Local = project root, Global = ~/.claude). Debounced save while typing."></textarea>' +
        '<div id="notepadError" class="notepad-error" style="display:none;"></div>' +
        '</div>';
      vscode.postMessage({ command: 'notepadLoad' });
      return;
    }
    if (!sections.length) {
      const suffix = selectedTab ? ' for tab ' + esc(selectedTab) : '';
      container.innerHTML = '<div class="empty">No sections found in crystalcontext_config.md' + suffix + '.</div>';
      return;
    }

    let html = '';
    sections.forEach(sec => {
      const groups = buildGroups(sec);
      groups.forEach(group => {
        builtGroupsMap[group.groupKey] = group;  // #16: populate cache
        if (!groupChoice[group.groupKey] || !group.items.some(i => i.id === groupChoice[group.groupKey])) {
          groupChoice[group.groupKey] = group.selectedId;
        }
        if (group.control === 'radio') {
          if (!checked[group.groupKey]) {
            checked[group.groupKey] = group.label;
            if (!selectedGroups.includes(group.groupKey)) selectedGroups.push(group.groupKey);
          }
        }
      });
      sectionGroupKeys[sec.title] = groups.map(g => g.groupKey);
      const checkedCount = groups.filter(g => checked[g.groupKey]).length;

      html += '<div class="panel" id="panel-' + esc(sec.title) + '">';
      html += '<div class="panel-header"><span>' + esc(sec.title) + '</span>';
      html += '<span style="display:flex;gap:5px;align-items:center;">';
      if (checkedCount) html += '<span class="badge">' + checkedCount + '</span>';
      html += '<span class="chevron">\u25BE</span></span></div>';
      html += '<div class="panel-body">';

      groups.forEach(group => {
        const isRadio = group.control === 'radio';
        html += '<div class="item' + (isRadio ? ' item-radio-group' : '') + '" data-item-group="' + esc(group.groupKey) + '">';
        if (isRadio) {
          html += '<span class="item-label">' + esc(group.label) + '</span>';
          html += '<div class="item-radio-options">';
          const gname = 'rg_' + String(group.groupKey).replace(/[^a-zA-Z0-9_]/g, '_');
          const sel = groupChoice[group.groupKey] || group.selectedId;
          group.items.forEach(opt => {
            const txt = opt.optionLabel || opt.description || opt.full || opt.label;
            html += '<label class="item-radio"><input type="radio" class="item-radio-input" name="' + esc(gname) + '" data-group="' + esc(group.groupKey) + '" data-opt-id="' + esc(opt.id) + '" data-label="' + esc(group.label) + '"';
            if (sel === opt.id) html += ' checked';
            html += '><span>' + esc(txt) + '</span></label>';
          });
          html += '</div>';
        } else {
          html += '<input type="checkbox" data-group="' + esc(group.groupKey) + '" data-label="' + esc(group.label) + '"';
          if (checked[group.groupKey]) html += ' checked';
          html += '>';
          html += '<span class="item-label">' + esc(group.label) + '</span>';
          if (group.control === 'select') {
            html += '<select class="item-select" data-group="' + esc(group.groupKey) + '"';
            if (!checked[group.groupKey]) html += ' disabled';
            html += '>';
            group.items.forEach(opt => {
              const txt = opt.optionLabel || opt.description || opt.full || opt.label;
              html += '<option value="' + esc(opt.id) + '"';
              if (opt.id === group.selectedId) html += ' selected';
              html += '>' + esc(txt) + '</option>';
            });
            html += '</select>';
          } else if (group.items[0].description) {
            html += '<span class="item-desc">' + esc(group.items[0].description) + '</span>';
          }
        }
        html += '</div>';
      });

      html += '</div></div>';
    });

    container.innerHTML = html;
  }

  function renderBadges() {
    if (isNotepad) return;  // #10: cached boolean
    sections.forEach(sec => {
      const panel = document.getElementById('panel-' + esc(sec.title));
      if (!panel) return;
      const header = panel.querySelector('.panel-header span:last-child');
      const keys = sectionGroupKeys[sec.title] || [];
      const count = keys.filter(k => checked[k]).length;
      const chevron = header.querySelector('.chevron');
      const existing = header.querySelector('.badge');
      if (existing) existing.remove();
      if (count) {
        const badge = document.createElement('span');
        badge.className = 'badge';
        badge.textContent = count;
        header.insertBefore(badge, chevron);
      }
    });
  }

  function buildGroups(sec) {
    const grouped = new Map();
    sec.items.forEach(item => {
      const groupKey = selectedTab + '::' + sec.title + '::' + item.label;
      if (!grouped.has(groupKey)) {
        grouped.set(groupKey, { groupKey, label: item.label, items: [], control: item.control || null, singleOutput: item.singleOutput || item.label });
      }
      const group = grouped.get(groupKey);
      if (!group.control && item.control) group.control = item.control;
      if (!group.singleOutput && item.singleOutput) group.singleOutput = item.singleOutput;
      group.items.push(item);
    });

    return Array.from(grouped.values()).map(group => {
      let control;
      if (group.control === 'radio') { control = 'radio'; }
      else if (group.control === 'select' || group.items.length > 1) { control = 'select'; }
      else { control = 'checkbox'; }
      const hasSelected = groupChoice[group.groupKey] && group.items.some(i => i.id === groupChoice[group.groupKey]);
      const selectedId = hasSelected ? groupChoice[group.groupKey] : group.items[0].id;
      return { ...group, control, selectedId };
    });
  }

  // #16: uses builtGroupsMap \u2014 no buildGroups calls per output rebuild
  function getGroupOutput(groupKey) {
    const group = builtGroupsMap[groupKey];
    if (!group) return '';
    let txt = String(group.singleOutput || group.label || '').trim();
    if (group.control === 'radio') {
      const selId = groupChoice[group.groupKey];
      const opt = group.items.find(i => i.id === selId) || group.items[0];
      return String(opt.optionValue || opt.description || opt.full || '').trim() || txt;
    }
    if (group.control === 'select') {
      const selId = groupChoice[group.groupKey];
      const opt = group.items.find(i => i.id === selId) || group.items[0];
      const value = String(opt.optionValue || opt.description || '').trim();
      if (txt && value) txt += ' ' + value;
      else if (!txt) txt = value;
    }
    return txt;
  }

  function normalizeOutput(text) {
    return String(text || '').replace(/\\s+/g, ' ').trim();
  }

  // #17: removed seen Set \u2014 selectedGroups already deduped at push time
  function buildGeneratedOutput() {
    const parts = [];
    selectedGroups.forEach(groupKey => {
      if (!checked[groupKey]) return;
      const txt = getGroupOutput(groupKey);
      if (txt) parts.push(txt);
    });
    return parts.join(' ');
  }

  function rebuildOutput() {
    const parts = [];
    const generated = buildGeneratedOutput();
    if (generated) parts.push(generated);
    if (userSuffix) parts.push(userSuffix);
    syncingOutput = true;
    document.getElementById('output').value = normalizeOutput(parts.join(' '));
    syncingOutput = false;
  }

  // #18: shared reset extracted from clearAll and handleReload
  function resetSelections() {
    checked = {};
    selectedGroups = [];
    userSuffix = '';
    document.getElementById('output').value = '';
  }

  function clearAll() {
    resetSelections();
    render();
  }

  function handleReload() {
    resetSelections();
    document.getElementById('panels').innerHTML = '<div class="empty">Loading\u2026</div>';
    vscode.postMessage({ command: 'refresh' });
  }

  function createLocalConfig() {
    vscode.postMessage({ command: 'createLocalConfig' });
  }

  function editConfig() {
    vscode.postMessage({ command: 'editConfig' });
  }

  function sendToChat() {
    const text = document.getElementById('output').value.trim();
    if (text) vscode.postMessage({ command: 'sendToChat', text });
  }

  function sendToTerminal() {
    const text = document.getElementById('output').value.trim();
    if (text) vscode.postMessage({ command: 'sendToTerminal', text });
  }

  function copyPrompt() {
    const text = document.getElementById('output').value.trim();
    if (text) vscode.postMessage({ command: 'copyToClipboard', text });
  }

  function esc(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // Always notify the host synchronously at end of script. In some webviews, DOMContentLoaded /
  // load already fired before these listeners were registered, or never fire \u2014 then nothing loads.
  (function scheduleWebviewReady() {
    let done = false;  // #11: closure variable instead of window.__ccReadyDone
    function send() {
      if (done) return;
      done = true;
      try {
        vscode.postMessage({ command: 'ready' });
      } catch (_) {}
    }
    send();
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', send);
      window.addEventListener('load', send);
    }
  })();
</script>
</body>
</html>`}};function _o(e){let r=new He(e.extensionUri,e);e.subscriptions.push(v.window.registerWebviewViewProvider("promptBuilderView",r,{webviewOptions:{retainContextWhenHidden:!0}})),e.subscriptions.push(v.commands.registerCommand("promptBuilder.openPanel",()=>{v.commands.executeCommand("promptBuilderView.focus")})),e.subscriptions.push(v.workspace.onDidChangeWorkspaceFolders(()=>{r._setupConfigWatcher(),r._isWebviewReady&&r._loadItems()}))}function Co(){}module.exports={activate:_o,deactivate:Co};

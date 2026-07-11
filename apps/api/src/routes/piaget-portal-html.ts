// 한국삐아제 ERP 구축 협업 포털 — 정적 HTML (로그인 / 본체)
// piaget.goldencheck.kr 로 서빙. API 엔드포인트는 /piaget/api/* 네임스페이스.

export const LOGIN_HTML = `<!doctype html>
<html lang="ko"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
<title>로그인 · 한국삐아제 ERP 구축 협업 포털</title>
<style>
:root{--bg:#0d1016;--panel:#161a22;--border:#2a3140;--text:#e7ebf3;--muted:#8a93a6;--accent:#4f8cff;--err:#ff5c5c}
*{box-sizing:border-box}
body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:radial-gradient(900px 400px at 50% -10%,rgba(160,107,255,.12),transparent 60%),var(--bg);color:var(--text);font-family:-apple-system,"Apple SD Gothic Neo","Segoe UI",system-ui,sans-serif}
.card{width:100%;max-width:360px;background:var(--panel);border:1px solid var(--border);border-radius:14px;padding:28px 24px;margin:16px}
.logo{font-size:26px;text-align:center}h1{font-size:17px;text-align:center;margin:8px 0 2px}
.sub{font-size:12px;color:var(--muted);text-align:center;margin-bottom:20px}
label{display:block;font-size:12px;color:var(--muted);margin:12px 0 5px}
input{width:100%;padding:11px 12px;border-radius:9px;border:1px solid var(--border);background:#0e1015;color:var(--text);font-size:14px;font-family:inherit}
input:focus{outline:none;border-color:var(--accent)}
button{width:100%;margin-top:18px;padding:12px;border-radius:9px;border:none;background:var(--accent);color:#fff;font-size:14px;font-weight:700;cursor:pointer}
.err{color:var(--err);font-size:12.5px;margin-top:12px;min-height:16px;text-align:center}
.foot{font-size:11px;color:#6b7488;text-align:center;margin-top:16px}
</style></head><body>
<form class="card" id="f">
<div class="logo">🤝</div><h1>한국삐아제 ERP 구축 협업 포털</h1>
<div class="sub">로그인 후 이용하실 수 있습니다.</div>
<label>아이디</label><input id="u" autocomplete="username" autofocus />
<label>비밀번호</label><input id="p" type="password" autocomplete="current-password" />
<button type="submit">로그인</button><div class="err" id="e"></div>
<div class="foot">piaget.goldencheck.kr · 초대된 담당자 전용</div>
</form>
<script>
const $=(s)=>document.querySelector(s);
$('#f').addEventListener('submit', async (ev)=>{ev.preventDefault();$('#e').textContent='';
 const r=await fetch('/piaget/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:$('#u').value.trim(),password:$('#p').value})}).then(r=>r.json());
 if(r.ok){location.reload();}else{$('#e').textContent=r.error||'로그인 실패';}});
</script></body></html>`;

export const PORTAL_HTML = `<!doctype html>
<html lang="ko"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
<title>한국삐아제 ERP 구축 협업 포털</title>
<style>
:root{--bg:#0d1016;--panel:#161a22;--panel2:#1b2029;--border:#2a3140;--text:#e7ebf3;--muted:#8a93a6;--accent:#4f8cff;--ok:#2ecc71;--warn:#f5a623;--hub:#a06bff;--mono:ui-monospace,Menlo,monospace}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font-family:-apple-system,"Apple SD Gothic Neo","Segoe UI",system-ui,sans-serif;line-height:1.55}
.wrap{max-width:1080px;margin:0 auto;padding:22px 18px 60px}h1{font-size:20px;margin:0}
.sub{color:var(--muted);font-size:13px;margin:3px 0 16px}
.tabs{display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap}
.tab{font-size:13px;font-weight:700;padding:8px 16px;border-radius:9px;border:1px solid var(--border);background:#222836;color:var(--muted);cursor:pointer}
.tab.active{background:var(--accent);border-color:var(--accent);color:#fff}
.panel{background:var(--panel);border:1px solid var(--border);border-radius:12px;padding:16px;margin-bottom:14px}
.rmapintro{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:16px}
.rmapintro .pill{font-size:12px;color:var(--muted);background:#222836;border:1px solid var(--border);border-radius:20px;padding:5px 13px}
.rmapintro .pill b{color:var(--text)}
.tl{position:relative}
.tl .ph{position:relative;display:grid;grid-template-columns:66px 1fr;gap:14px;padding-bottom:16px}
.tl .ph:before{content:"";position:absolute;left:32px;top:40px;bottom:-4px;width:2px;background:var(--border);z-index:0}
.tl .ph:last-child:before{display:none}
.tl .ph.done:before{background:var(--ok)}
.tl .num{width:66px;height:66px;border-radius:15px;display:flex;flex-direction:column;align-items:center;justify-content:center;border:2px solid var(--border);background:var(--panel2);z-index:1}
.tl .num .p{font-size:16px;font-weight:800}.tl .num .w{font-size:9.5px;color:var(--muted);font-weight:700;margin-top:2px}
.tl .ph.done .num{border-color:var(--ok);color:var(--ok)}
.tl .ph.cur .num{border-color:var(--accent);background:linear-gradient(135deg,rgba(79,140,255,.28),rgba(160,107,255,.28));color:#fff;box-shadow:0 0 0 4px rgba(79,140,255,.13)}
.tl .body{background:var(--panel2);border:1px solid var(--border);border-radius:12px;padding:13px 15px}
.tl .ph.cur .body{border-color:var(--accent);box-shadow:0 0 0 1px rgba(79,140,255,.25)}
.tl .htop{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:7px}
.tl .nm{font-size:15px;font-weight:800}
.tl .st{font-size:10.5px;font-weight:800;border-radius:20px;padding:2px 10px}
.st.sdone{background:rgba(46,204,113,.16);color:#5be59a}.st.scur{background:rgba(79,140,255,.2);color:#8fb6ff}.st.snext{background:#262c38;color:var(--muted)}
.tl .who{margin-left:auto;font-size:10.5px;font-weight:700;color:#c5a6ff;background:rgba(160,107,255,.14);border-radius:6px;padding:2px 9px}
.tl .plain{font-size:12.5px;color:#cbd3e2;margin-bottom:10px}
.tl .acts{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px}
.tl .act{font-size:11px;color:#b8c0d0;background:#1a1f29;border:1px solid var(--border);border-radius:7px;padding:3px 9px 3px 22px;cursor:pointer;user-select:none;position:relative}
.tl .act:before{content:"?";position:absolute;left:7px;top:50%;transform:translateY(-50%);width:12px;height:12px;line-height:12px;text-align:center;font-size:9px;font-weight:800;border-radius:50%;background:#2f3a4d;color:#8fb6ff}
.tl .act:hover{border-color:var(--accent);color:#fff}
.tl .act.on{background:rgba(79,140,255,.18);border-color:var(--accent);color:#fff}
.tl .act.on:before{content:"−";background:var(--accent);color:#fff}
.tl .actdetail{font-size:12px;line-height:1.6;color:#cdd5e4;background:#12161e;border:1px solid var(--border);border-left:3px solid var(--accent);border-radius:8px;padding:10px 13px;margin:0 0 10px}
.tl .actdetail b{color:#fff}
.tl .foot{display:flex;flex-wrap:wrap;gap:7px 16px;align-items:center;font-size:11px;color:var(--muted);border-top:1px dashed var(--border);padding-top:9px}
.tl .foot .lb{color:#7f8a9e;margin-right:3px}.tl .out{color:#c5a6ff}.tl .gate{color:#f0b95e}
.tl .prog{display:flex;align-items:center;gap:8px;margin-left:auto;min-width:150px}
.tl .prog .bar{flex:1;height:6px;background:#0e1320;border-radius:4px;overflow:hidden}
.tl .prog .bar i{display:block;height:100%;background:linear-gradient(90deg,#4f8cff,#a06bff)}
@media(max-width:640px){.tl .ph{grid-template-columns:52px 1fr;gap:10px}.tl .ph:before{left:25px}.tl .num{width:52px;height:52px}.tl .who{margin-left:0}}
.dom{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px}
.chip{font-size:12px;padding:4px 11px;border-radius:20px;border:1px solid var(--border);background:#222836;color:#cfd6e4;cursor:pointer}
.chip.active{background:var(--hub);border-color:var(--hub);color:#fff}
.q{border:1px solid var(--border);border-radius:10px;padding:13px;margin-bottom:11px;background:var(--panel2)}
.q .meta{font-size:11px;color:var(--muted);margin-bottom:4px}.q .qt{font-size:13.5px;font-weight:600;margin-bottom:9px}
.q .doc{font-size:10px;font-weight:700;color:#c5a6ff;background:rgba(160,107,255,.14);border-radius:5px;padding:1px 7px}
.q .prev{border-top:1px solid var(--border);margin-top:9px;padding-top:8px}
.q .prev .a{font-size:12px;color:#cfd6e4;padding:4px 0;border-bottom:1px dashed var(--border)}
.q .prev .a small{color:var(--muted)}
.frow{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}
input,textarea{background:#0e1015;border:1px solid var(--border);border-radius:8px;color:var(--text);font-family:inherit;font-size:13px;padding:8px 10px}
textarea{width:100%;min-height:60px;resize:vertical}input.sm{width:120px}
button{font-family:inherit;cursor:pointer;border-radius:8px;border:1px solid var(--border);background:#232833;color:var(--text);font-size:13px;font-weight:600;padding:8px 14px}
button.primary{background:var(--accent);border-color:var(--accent);color:#fff}.cnt{font-size:11px;color:var(--muted)}
.docbtns{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px}
pre{background:#0c0e13;border:1px solid var(--border);border-radius:8px;padding:14px;overflow:auto;max-height:520px;font-family:var(--mono);font-size:12px;color:#d7dce6;white-space:pre-wrap}
</style></head><body>
<div class="wrap">
<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
<div><h1>🤝 한국삐아제 ERP 구축 협업 포털</h1>
<div class="sub">전체 구축 로드맵 확인 · 단계별 질문에 답하기 · 응답이 서버에 저장되어 <b>기획서·CRD·PRD·SRD</b>로 자동 완성됩니다.</div></div>
<div id="userbar" style="flex:none;font-size:12px;color:var(--muted);white-space:nowrap"></div></div>
<div class="tabs">
<button class="tab active" data-tab="road">🗺 구축 로드맵</button>
<button class="tab" data-tab="q">💬 질문·응답</button>
<button class="tab" id="doctab" data-tab="doc" style="display:none">📄 문서(자동 조립)</button></div>
<div id="tab-road"><div class="panel"><div class="rmapintro" id="roadintro"></div><div class="tl" id="road"></div></div>
<div class="panel"><div class="sub" style="margin:0">각 단계는 <b>완료 게이트(고객 승인)</b>를 통과해야 다음으로 넘어갑니다. 지금은 <b>P1 Discovery</b> 단계 — <b>질문·응답</b> 탭에서 현업 내용을 채워 주시면 현황분석이 완성됩니다.<br><span style="color:#8fb6ff">💡 각 단계의 활동 항목(ⓐ 표시)을 클릭하면 그 항목이 무엇인지 쉬운 설명이 열립니다.</span> <span style="color:#7f8a9e">· 참여주체: 고객사 중심 / 수행사 중심 / 공동</span></div></div></div>
<div id="tab-q" style="display:none"><div class="panel"><div class="dom" id="domains"></div><div id="qlist"></div></div></div>
<div id="tab-doc" style="display:none"><div class="panel"><div class="docbtns" id="docbtns"></div><pre id="docview">문서를 선택하세요.</pre></div></div>
</div>
<script>
const $=(s)=>document.querySelector(s);let STATE={phases:[],questions:[],docs:[],answers:[]};let curDomain='전체';
async function load(){const res=await fetch('/piaget/api/state');if(res.status===401){location.reload();return;}STATE=await res.json();if(!STATE||!STATE.ok){location.reload();return;}render();}
async function logout(){await fetch('/piaget/api/logout',{method:'POST'});location.reload();}
function answersFor(qid){return STATE.answers.filter(a=>a.questionId===qid);}
function renderUser(){const ub=$('#userbar');if(ub&&STATE.user){ub.innerHTML='👤 <b style="color:#cfd6e4">'+STATE.user+'</b>'+(STATE.role?' <span style="opacity:.7">('+STATE.role+')</span>':'')+' · <a href="#" id="logout" style="color:#4f8cff;text-decoration:none">로그아웃</a>';const lo=$('#logout');if(lo)lo.onclick=(e)=>{e.preventDefault();logout();};}}
function renderRoad(){const per={};STATE.questions.forEach(q=>{per[q.phase]=(per[q.phase]||{t:0,a:0});per[q.phase].t++;if(answersFor(q.id).length)per[q.phase].a++;});
 let cur=STATE.phases.findIndex(p=>{const s=per[p.id];return s&&s.t>0&&s.a<s.t;});
 if(cur<0){cur=STATE.phases.findIndex(p=>!(per[p.id]&&per[p.id].t));if(cur<0)cur=STATE.phases.length-1;}
 let totQ=0,totA=0;STATE.phases.forEach(p=>{const s=per[p.id];if(s){totQ+=s.t;totA+=s.a;}});
 const cp=STATE.phases[cur]||{};
 $('#roadintro').innerHTML='<span class="pill">전체 <b>7단계</b> · 약 <b>6~9개월</b></span><span class="pill">현재 <b>'+esc(cp.id+' '+cp.name)+'</b> 진행 중</span><span class="pill">Discovery 응답 <b>'+totA+'/'+totQ+'</b></span>';
 $('#road').innerHTML=STATE.phases.map((p,i)=>{const s=per[p.id]||{t:0,a:0};const pct=s.t?Math.round(s.a/s.t*100):0;
  const cls=i<cur?'done':(i===cur?'cur':'next');const stl=i<cur?'완료':(i===cur?'진행 중':'예정');const stc=i<cur?'sdone':(i===cur?'scur':'snext');
  const acts=(p.activities||[]).map((a,ai)=>'<span class="act" data-p="'+esc(p.id)+'" data-i="'+ai+'">'+esc(a.t)+'</span>').join('');
  const prog=s.t?'<span class="prog"><span class="lb">응답</span><span class="bar"><i style="width:'+pct+'%"></i></span><span>'+s.a+'/'+s.t+'</span></span>':'';
  return '<div class="ph '+cls+'"><div class="num"><span class="p">'+esc(p.id)+'</span><span class="w">'+esc(p.weeks)+'</span></div>'
   +'<div class="body"><div class="htop"><span class="nm">'+esc(p.name)+'</span><span class="st '+stc+'">'+stl+'</span><span class="who">'+esc(p.who||'')+'</span></div>'
   +'<div class="plain">'+esc(p.plain||'')+'</div><div class="acts">'+acts+'</div><div class="actdetail" id="ad-'+esc(p.id)+'" style="display:none"></div>'
   +'<div class="foot"><span><span class="lb">산출물</span><span class="out">'+esc((p.outputs||[]).join(' · '))+'</span></span><span><span class="lb">완료 게이트</span><span class="gate">'+esc(p.gate||'')+'</span></span>'+prog+'</div></div></div>';}).join('');
 bindActs();}
function bindActs(){document.querySelectorAll('#road .act').forEach(function(ch){ch.onclick=function(){
  var pid=ch.getAttribute('data-p'),idx=+ch.getAttribute('data-i');
  var ph=STATE.phases.find(function(p){return p.id===pid;});var det=(ph&&ph.activities&&ph.activities[idx])||{};
  var box=document.getElementById('ad-'+pid);var wasOn=ch.classList.contains('on');
  ch.parentNode.querySelectorAll('.act').forEach(function(s){s.classList.remove('on');});
  if(wasOn){box.style.display='none';box.innerHTML='';return;}
  ch.classList.add('on');box.innerHTML='<b>'+esc(det.t||'')+'</b> — '+esc(det.d||'');box.style.display='';
};});}
function renderDomains(){const doms=['전체',...new Set(STATE.questions.map(q=>q.domain))];$('#domains').innerHTML=doms.map(d=>'<span class="chip '+(d===curDomain?'active':'')+'" data-d="'+d+'">'+d+'</span>').join('');document.querySelectorAll('#domains .chip').forEach(c=>c.onclick=()=>{curDomain=c.dataset.d;renderDomains();renderQ();});}
function esc(s){return String(s).replace(/[&<>]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[m]));}
function renderQ(){const qs=STATE.questions.filter(q=>curDomain==='전체'||q.domain===curDomain);
 $('#qlist').innerHTML=qs.map(q=>{const prev=answersFor(q.id);return '<div class="q"><div class="meta">['+q.phase+'·'+q.domain+'] <span class="doc">→ '+q.doc+' · '+q.section+'</span></div><div class="qt">'+esc(q.q)+'</div><textarea id="ta-'+q.id+'" placeholder="여기에 답변을 입력하세요…"></textarea><div class="frow"><input class="sm" id="nm-'+q.id+'" placeholder="이름"/><input class="sm" id="rl-'+q.id+'" placeholder="역할(예: 회계)"/><button class="primary" data-q="'+q.id+'">저장</button><span class="cnt">응답 '+prev.length+'건</span></div>'+(prev.length?'<div class="prev">'+prev.map(a=>'<div class="a">'+esc(a.answer)+' <small>— '+esc(a.respondent||'익명')+(a.role?'·'+esc(a.role):'')+' · '+a.ts+'</small></div>').join('')+'</div>':'')+'</div>';}).join('');
 document.querySelectorAll('#qlist button[data-q]').forEach(b=>b.onclick=()=>submit(b.dataset.q));}
async function submit(qid){const answer=$('#ta-'+qid).value.trim();if(!answer){alert('답변을 입력하세요');return;}const respondent=$('#nm-'+qid).value.trim(),role=$('#rl-'+qid).value.trim();const r=await fetch('/piaget/api/answer',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({questionId:qid,answer,respondent,role})}).then(r=>r.json());if(r.ok){await load();switchTab('q');}else alert('저장 실패: '+(r.error||''));}
function renderDocs(){$('#docbtns').innerHTML=STATE.docs.map(d=>'<button data-doc="'+d+'">📄 '+d+'</button>').join('');document.querySelectorAll('#docbtns button').forEach(b=>b.onclick=async()=>{const r=await fetch('/piaget/api/doc/'+encodeURIComponent(b.dataset.doc)).then(r=>r.json());$('#docview').textContent=r.md;});}
function applyRole(){var isAdmin=STATE.role==='admin';var dt=$('#doctab');if(dt)dt.style.display=isAdmin?'':'none';if(!isAdmin&&$('#tab-doc').style.display!=='none'){switchTab('road');}}
function render(){renderUser();renderRoad();renderDomains();renderQ();renderDocs();applyRole();}
function switchTab(t){document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===t));$('#tab-road').style.display=t==='road'?'':'none';$('#tab-q').style.display=t==='q'?'':'none';$('#tab-doc').style.display=t==='doc'?'':'none';}
document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>switchTab(b.dataset.tab));load();
</script></body></html>`;

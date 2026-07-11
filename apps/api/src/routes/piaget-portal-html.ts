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
.addbtn{margin-left:auto;background:rgba(46,204,113,.14);border-color:rgba(46,204,113,.5);color:#5be59a}
.addbtn:hover{background:rgba(46,204,113,.24)}
.tasktitle{font-size:12px;font-weight:700;color:#5be59a;margin:2px 0 10px}
.task{border:1px solid rgba(46,204,113,.35);border-left:3px solid var(--ok);border-radius:10px;padding:12px 13px;margin-bottom:11px;background:#131b17}
.task .th{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:6px}
.task .tg{font-size:10px;font-weight:800;color:#5be59a;background:rgba(46,204,113,.16);border-radius:20px;padding:2px 9px}
.task .tt{font-size:13px;font-weight:700}
.task .tacts{margin-left:auto;display:flex;gap:6px}
.task .tacts button{padding:3px 10px;font-size:11px;font-weight:700}
.task .tacts .ed{color:#8fb6ff;border-color:rgba(79,140,255,.45);background:rgba(79,140,255,.12)}
.task .tacts .de{color:#ff9a9a;border-color:rgba(192,57,43,.45);background:rgba(192,57,43,.12)}
.task .tp{font-size:12.5px;color:#cbd3e2;white-space:pre-wrap}
.task .tm{font-size:11px;color:var(--muted);margin-top:7px}
.ov{position:fixed;inset:0;background:rgba(6,8,12,.66);display:none;align-items:center;justify-content:center;z-index:50;padding:16px}
.ov.on{display:flex}
.modal{width:100%;max-width:460px;background:var(--panel);border:1px solid var(--border);border-radius:14px;padding:20px;max-height:90vh;overflow:auto}
.modal h3{margin:0 0 4px;font-size:16px}
.modal .ms{font-size:12px;color:var(--muted);margin-bottom:6px;line-height:1.55}
.modal label{display:block;font-size:12px;color:var(--muted);margin:13px 0 6px}
.modal input{width:100%}
.mdoms{display:flex;flex-wrap:wrap;gap:6px}
.mact{display:flex;gap:8px;justify-content:flex-end;margin-top:18px}
.merr{color:#ff6b6b;font-size:12px;min-height:15px;margin-top:8px}
.modal.wide{max-width:min(780px,94vw)}
.modal select{width:100%;padding:10px 12px;border-radius:9px;border:1px solid var(--border);background:#0e1015;color:var(--text);font-size:14px;font-family:inherit}
.domlabel{font-size:13px}.domlabel b{color:#8fb6ff}
.flow{display:flex;align-items:stretch;overflow-x:auto;padding:8px 2px 12px}
.fbox{position:relative;flex:0 0 150px;min-height:100px;border:1px solid var(--border);border-radius:10px;background:#0e1015;display:flex}
.fbox textarea{border:none;background:transparent;width:100%;min-height:auto;resize:none;padding:20px 6px 6px;font-size:12px}
.fbox textarea:focus{outline:none}
.fnum{position:absolute;top:4px;left:8px;font-size:10px;font-weight:800;color:#7f8a9e}
.fdel{position:absolute;top:3px;right:3px;width:19px;height:19px;padding:0;border-radius:50%;background:#2a3140;border:none;color:#aeb6c6;font-size:14px;line-height:1;display:flex;align-items:center;justify-content:center}
.fdel:hover{background:#c0392b;color:#fff}
.fconn{flex:0 0 42px;display:flex;align-items:center;justify-content:center;position:relative}
.fconn:before{content:"";position:absolute;left:2px;right:2px;top:50%;height:1px;background:var(--border)}
.fconn:after{content:"▸";position:absolute;right:1px;top:50%;transform:translateY(-50%);color:var(--muted);font-size:13px}
.fadd{position:relative;z-index:1;width:23px;height:23px;padding:0;border-radius:6px;background:#232833;border:1px solid var(--border);color:#5be59a;font-weight:800;font-size:15px;line-height:1}
.fadd:hover{background:rgba(46,204,113,.2);border-color:var(--ok)}
.rflow{display:flex;align-items:center;flex-wrap:wrap;gap:4px;margin-top:2px}
.rbox{font-size:11.5px;color:#cbd3e2;background:#0e1015;border:1px solid var(--border);border-radius:7px;padding:5px 9px}
.rarrow{color:var(--muted);font-size:12px}
</style></head><body>
<div class="wrap">
<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
<div><h1>🤝 한국삐아제 ERP 구축 협업 포털</h1>
<div class="sub">전체 구축 로드맵 확인 · 단계별 질문에 답하기 · 응답이 서버에 저장되어 <b>기획서·CRD·PRD·SRD</b>로 자동 완성됩니다.</div></div>
<div id="userbar" style="flex:none;font-size:12px;color:var(--muted);white-space:nowrap"></div></div>
<div class="tabs">
<button class="tab active" data-tab="road">🗺 구축 로드맵</button>
<button class="tab" data-tab="q">📝 업무 등록</button>
<button class="tab" id="doctab" data-tab="doc" style="display:none">📄 문서(자동 조립)</button>
<button class="addbtn" id="addtaskbtn">＋ 업무 추가</button></div>
<div id="tab-road"><div class="panel"><div class="rmapintro" id="roadintro"></div><div class="tl" id="road"></div></div>
<div class="panel"><div class="sub" style="margin:0">각 단계는 <b>완료 게이트(고객 승인)</b>를 통과해야 다음으로 넘어갑니다. 지금은 <b>P1 Discovery</b> 단계 — <b>업무 등록</b> 탭에서 현업 내용을 채워 주시면 현황분석이 완성됩니다.<br><span style="color:#8fb6ff">💡 각 단계의 활동 항목(ⓐ 표시)을 클릭하면 그 항목이 무엇인지 쉬운 설명이 열립니다.</span> <span style="color:#7f8a9e">· 참여주체: 고객사 중심 / 수행사 중심 / 공동</span></div></div></div>
<div id="tab-q" style="display:none"><div class="panel"><div class="dom" id="domains"></div><div id="tasklist"></div><div id="qlist"></div></div></div>
<div id="tab-doc" style="display:none"><div class="panel"><div class="docbtns" id="docbtns"></div><pre id="docview">문서를 선택하세요.</pre></div></div>
</div>
<div class="ov" id="addov"><div class="modal wide">
<h3 id="modal-title">＋ 업무 추가</h3>
<div id="phaseA">
<div class="ms">등록할 <b>업무 영역</b>을 선택하고 <b>확인</b>을 누르세요. (총 10개 영역, 없으면 <b>기타</b> 선택)</div>
<label>업무 영역</label>
<select id="t-domain"><option value="">— 영역 선택 —</option></select>
<div class="merr" id="t-err1"></div>
<div class="mact"><button id="t-cancel1">취소</button><button class="primary" id="t-next">확인 →</button></div>
</div>
<div id="phaseB" style="display:none">
<div class="ms domlabel">영역: <b id="t-domlabel"></b> · <a href="#" id="t-changedom" style="color:#4f8cff;text-decoration:none">영역 변경</a></div>
<label>업무명</label><input id="t-title" placeholder="예: 재고 실사 프로세스" />
<label>담당자 이름</label><input id="t-resp" placeholder="이름" />
<label style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">업무 프로세스 <span style="color:#7f8a9e;font-weight:400">— 박스마다 한 단계, 화살표의 <b style="color:#5be59a">+</b> 로 추가 / <b>×</b> 로 삭제</span><button type="button" id="t-fillsample" style="margin-left:auto;padding:4px 10px;font-size:11px;background:rgba(160,107,255,.16);border-color:rgba(160,107,255,.5);color:#c5a6ff">예시로 채우기</button></label>
<div style="font-size:11px;color:#7f8a9e;margin:-4px 0 8px">회색 글씨는 이 영역의 <b>예시</b>입니다 — 실제 내용으로 입력하세요.</div>
<div class="flow" id="t-flow"></div>
<div class="merr" id="t-err2"></div>
<div class="mact"><button id="t-back">← 이전</button><button id="t-cancel2">취소</button><button class="primary" id="t-save">저장</button></div>
</div>
</div></div>
<script>
const $=(s)=>document.querySelector(s);let STATE={phases:[],questions:[],docs:[],answers:[],tasks:[]};let curDomain='전체';let selDomain='';
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
function renderDomains(){const doms=['전체',...new Set(STATE.questions.map(q=>q.domain)),'기타'];$('#domains').innerHTML=doms.map(d=>'<span class="chip '+(d===curDomain?'active':'')+'" data-d="'+esc(d)+'">'+esc(d)+'</span>').join('');document.querySelectorAll('#domains .chip').forEach(c=>c.onclick=()=>{curDomain=c.dataset.d;renderDomains();renderTasks();renderQ();});}
function taskFlow(t){var st=(t.steps&&t.steps.length)?t.steps:(t.process?[t.process]:[]);return '<div class="rflow">'+st.map((s,i)=>'<span class="rbox">'+esc(s)+'</span>'+(i<st.length-1?'<span class="rarrow">▸</span>':'')).join('')+'</div>';}
function renderTasks(){var el=$('#tasklist');if(!el)return;var ts=(STATE.tasks||[]).filter(t=>curDomain==='전체'||t.domain===curDomain);
 if(!ts.length){el.innerHTML='<div style="color:var(--muted);font-size:13px;padding:10px 2px">아직 등록된 업무가 없습니다. 우측 상단 <b style="color:#5be59a">＋ 업무 추가</b>로 업무 프로세스를 등록하세요.</div>';return;}
 el.innerHTML='<div class="tasktitle">➕ 추가된 업무 '+ts.length+'건</div>'+ts.map(t=>'<div class="task"><div class="th"><span class="tg">'+esc(t.domain)+'</span>'+(t.title?'<span class="tt">'+esc(t.title)+'</span>':'')+'<span class="tacts"><button class="ed" data-edit="'+esc(t.id)+'">수정</button><button class="de" data-del="'+esc(t.id)+'">삭제</button></span></div>'+taskFlow(t)+'<div class="tm">— '+esc(t.respondent||'익명')+' · '+esc(t.ts)+'</div></div>').join('');
 el.querySelectorAll('[data-edit]').forEach(function(b){b.onclick=function(){openEditTask(b.getAttribute('data-edit'));};});
 el.querySelectorAll('[data-del]').forEach(function(b){b.onclick=function(){delTask(b.getAttribute('data-del'));};});}
var SAMPLES={
 '회계':['은행/가상계좌 입금 내역 확인','주문 건과 금액 대사·매칭','이카운트 전표 입력·마감'],
 '발주·영업':['지사/기관 발주 접수','재고·공급가 확인','출고 지시·발주 확정'],
 'CS·반품':['반품/문의 접수','사유 확인·승인 판단','환불/교환 처리·고객 안내'],
 '물류':['출고 대상 집계','송장 발급·택배사 전송','출고 완료·배송 추적'],
 '지사(외부)':['지사 로그인·발주 등록','본사 발주 내용 확인','공급가 적용·출고 요청'],
 '지구별닷컴':['공급사 상품 사입/위탁 등록','주문 접수·공급사 발주','송장 회신·매입 정산'],
 '권한·계정':['계정 생성/변경 요청 접수','역할·권한 부여','접근 범위 확인·승인'],
 '데이터':['거래처/품목 코드 수집','기준정보(MDM) 매핑','중복·오류 정리·표준화'],
 '전략':['현안·목표 정의','우선순위 선정','성공기준(KPI) 합의'],
 '기타':['업무 시작(요청 접수)','처리·검토·확인','완료·결과 공유']
};
function allDomains(){return [...new Set(STATE.questions.map(q=>q.domain)),'기타'];}
var flowSteps=['','',''];var curSample=[];var editingId=null;
function syncFlow(){var el=$('#t-flow');if(!el)return;el.querySelectorAll('textarea[data-step]').forEach(function(t){flowSteps[+t.getAttribute('data-step')]=t.value;});}
function renderFlow(){var el=$('#t-flow');var h='';flowSteps.forEach(function(s,i){var ph=curSample[i]||('업무 '+(i+1));h+='<div class="fbox"><span class="fnum">'+(i+1)+'</span>'+(flowSteps.length>1?'<button class="fdel" data-del="'+i+'" title="이 단계 삭제">×</button>':'')+'<textarea data-step="'+i+'" placeholder="'+esc(ph)+'">'+esc(s)+'</textarea></div>';h+='<div class="fconn"><button class="fadd" data-add="'+(i+1)+'" title="여기에 단계 추가">+</button></div>';});el.innerHTML=h;
 el.querySelectorAll('textarea[data-step]').forEach(function(t){t.oninput=function(){flowSteps[+t.getAttribute('data-step')]=t.value;};});
 el.querySelectorAll('[data-add]').forEach(function(b){b.onclick=function(){syncFlow();flowSteps.splice(+b.getAttribute('data-add'),0,'');renderFlow();};});
 el.querySelectorAll('[data-del]').forEach(function(b){b.onclick=function(){if(flowSteps.length<=1)return;syncFlow();flowSteps.splice(+b.getAttribute('data-del'),1);renderFlow();};});}
function fillSample(){if(!curSample.length)return;flowSteps=curSample.slice();renderFlow();}
function fillDomainSelect(v){var sel=$('#t-domain');sel.innerHTML='<option value="">— 영역 선택 —</option>'+allDomains().map(d=>'<option value="'+esc(d)+'">'+esc(d)+'</option>').join('');if(v)sel.value=v;}
function openAddTask(){editingId=null;$('#modal-title').textContent='＋ 업무 추가';fillDomainSelect((curDomain&&curDomain!=='전체')?curDomain:'');$('#t-err1').textContent='';$('#t-err2').textContent='';$('#t-title').value='';$('#t-resp').value='';$('#phaseB').style.display='none';$('#phaseA').style.display='';$('#addov').classList.add('on');}
function openEditTask(id){var t=(STATE.tasks||[]).find(x=>String(x.id)===String(id));if(!t)return;editingId=id;$('#modal-title').textContent='✎ 업무 수정';selDomain=t.domain;curSample=SAMPLES[t.domain]||[];flowSteps=(t.steps&&t.steps.length)?t.steps.slice():['','',''];fillDomainSelect(t.domain);$('#t-domlabel').textContent=t.domain;$('#t-title').value=t.title||'';$('#t-resp').value=t.respondent||'';$('#t-err1').textContent='';$('#t-err2').textContent='';$('#phaseA').style.display='none';$('#phaseB').style.display='';renderFlow();$('#addov').classList.add('on');}
async function delTask(id){if(!confirm('이 업무를 삭제할까요?'))return;var r=await fetch('/piaget/api/task/'+id+'/delete',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'}).then(r=>r.json());if(r.ok){await load();switchTab('q');}else alert('삭제 실패: '+(r.error||''));}
function gotoPhaseB(){var d=$('#t-domain').value;if(!d){$('#t-err1').textContent='업무 영역을 선택하세요.';return;}selDomain=d;$('#t-domlabel').textContent=d;curSample=SAMPLES[d]||[];flowSteps=['','',''];$('#t-err2').textContent='';$('#phaseA').style.display='none';$('#phaseB').style.display='';renderFlow();}
function backPhaseA(){$('#phaseB').style.display='none';$('#phaseA').style.display='';}
function closeAddTask(){$('#addov').classList.remove('on');}
async function submitTask(){syncFlow();var title=$('#t-title').value.trim(),resp=$('#t-resp').value.trim();var steps=flowSteps.map(s=>s.trim()).filter(Boolean);if(!title){$('#t-err2').textContent='업무명을 입력하세요.';return;}if(!resp){$('#t-err2').textContent='담당자 이름을 입력하세요.';return;}if(!steps.length){$('#t-err2').textContent='최소 한 단계 이상 프로세스를 입력하세요.';return;}
 var url=editingId?('/piaget/api/task/'+editingId):'/piaget/api/task';
 var r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({domain:selDomain,title:title,respondent:resp,steps:steps})}).then(r=>r.json());
 if(r.ok){editingId=null;closeAddTask();curDomain=selDomain;await load();switchTab('q');}else $('#t-err2').textContent='저장 실패: '+(r.error||'');}
function esc(s){return String(s).replace(/[&<>]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[m]));}
function renderQ(){var el=$('#qlist');if(el)el.innerHTML='';}
async function submit(qid){const answer=$('#ta-'+qid).value.trim();if(!answer){alert('답변을 입력하세요');return;}const respondent=$('#nm-'+qid).value.trim(),role=$('#rl-'+qid).value.trim();const r=await fetch('/piaget/api/answer',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({questionId:qid,answer,respondent,role})}).then(r=>r.json());if(r.ok){await load();switchTab('q');}else alert('저장 실패: '+(r.error||''));}
function renderDocs(){$('#docbtns').innerHTML=STATE.docs.map(d=>'<button data-doc="'+d+'">📄 '+d+'</button>').join('');document.querySelectorAll('#docbtns button').forEach(b=>b.onclick=async()=>{const r=await fetch('/piaget/api/doc/'+encodeURIComponent(b.dataset.doc)).then(r=>r.json());$('#docview').textContent=r.md;});}
function applyRole(){var isAdmin=STATE.role==='admin';var dt=$('#doctab');if(dt)dt.style.display=isAdmin?'':'none';if(!isAdmin&&$('#tab-doc').style.display!=='none'){switchTab('road');}}
function render(){renderUser();renderRoad();renderDomains();renderTasks();renderQ();renderDocs();applyRole();}
function switchTab(t){document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===t));$('#tab-road').style.display=t==='road'?'':'none';$('#tab-q').style.display=t==='q'?'':'none';$('#tab-doc').style.display=t==='doc'?'':'none';}
document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>switchTab(b.dataset.tab));
$('#addtaskbtn').onclick=openAddTask;$('#t-next').onclick=gotoPhaseB;$('#t-back').onclick=backPhaseA;$('#t-changedom').onclick=(e)=>{e.preventDefault();backPhaseA();};$('#t-fillsample').onclick=fillSample;$('#t-cancel1').onclick=closeAddTask;$('#t-cancel2').onclick=closeAddTask;$('#t-save').onclick=submitTask;$('#addov').onclick=(e)=>{if(e.target.id==='addov')closeAddTask();};
load();
</script></body></html>`;

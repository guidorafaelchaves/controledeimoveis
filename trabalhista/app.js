(() => {
"use strict";
const STORE="controle_trabalhista_private_v1";
const GOV={
  esocial:"https://login.esocial.gov.br/login.aspx",
  dae:"https://www.gov.br/pt-br/servicos/emitir-dae-para-pagamento-do-empregador-domestico",
  inss:"https://www.gov.br/inss/pt-br/direitos-e-deveres/inscricao-e-contribuicao/contribuicao-dos-segurados-facultativo-e-contribuinte-individual",
  fgts:"https://fgtsdigital.sistema.gov.br/portal/login",
  receita:"https://cav.receita.fazenda.gov.br/autenticacao/login",
  manual:"https://www.gov.br/esocial/pt-br/empregador-domestico/manual-do-empregador-domestico"
};
const regimeOptions=[
  ["indefinido","A confirmar"],
  ["domestico","Empregado doméstico (pessoa física)"],
  ["empresa","Empregado CLT de empresa"],
  ["rural","Trabalhador rural (verificar enquadramento)"],
  ["autonomo","Contribuinte individual / autônomo (verificar)"],
  ["outro","Outro / em análise"]
];
const types=["INSS","DAE eSocial","DARF previdenciário","GPS","FGTS","Salário","13º salário","Férias","Vale-transporte","Outro"];
const previdTypes=new Set(["INSS","DAE eSocial","DARF previdenciário","GPS"]);
const blank=()=>({schema:1,people:[
  {id:"luciano",name:"Luciano",role:"",regime:"indefinido",admission:"",salary:null,status:"ativo",notes:""},
  {id:"rosiete",name:"Rosiete",role:"",regime:"indefinido",admission:"",salary:null,status:"ativo",notes:""},
  {id:"givaldo",name:"Givaldo",role:"",regime:"indefinido",admission:"",salary:null,status:"ativo",notes:""}
],records:[],tasks:[],audit:[],createdAt:new Date().toISOString(),lastBackup:null});
let loadError=false;
function load(){
  try{
    const v=localStorage.getItem(STORE);
    if(!v)return blank();
    const d=JSON.parse(v);
    if(!d||!Array.isArray(d.people)||!Array.isArray(d.records)||!Array.isArray(d.tasks))throw Error("Formato inválido");
    if(!Array.isArray(d.audit))d.audit=[];
    return d;
  }catch(err){loadError=true;return blank()}
}
let db=load();
const pad=n=>String(n).padStart(2,"0");
function today(){const d=new Date();return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate())}
function thisMonth(){return today().slice(0,7)}
let competence=thisMonth(),page="painel",allRecords=false,filterPerson="",filterType="";
const $=s=>document.querySelector(s);
function esc(v){return String(v===null||v===undefined?"":v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function money(v){return new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(Number(v)||0)}
function shortDate(s){if(!s)return "Não informado";let a=String(s).split("-");return a.length===3?a[2]+"/"+a[1]+"/"+a[0]:esc(s)}
function mon(s){if(!s)return "";let a=s.split("-");return a[1]+"/"+a[0]}
function txt(s){return esc(s).replace(/\n/g,"<br>")}
function regName(x){return (regimeOptions.find(r=>r[0]===x)||regimeOptions[0])[1]}
function id(){return typeof crypto!=="undefined"&&crypto.randomUUID?crypto.randomUUID():"ct-"+Date.now()+"-"+Math.random().toString(36).slice(2)}
function personName(k){return (db.people.find(p=>p.id===k)||{}).name||"Pessoa não encontrada"}
function commit(action,entity,details){
 db.audit.unshift({at:new Date().toISOString(),action:action,id:entity,details:details||""});
 db.audit=db.audit.slice(0,150);
 try{localStorage.setItem(STORE,JSON.stringify(db))}catch(err){message("Não foi possível salvar neste navegador. Exporte um backup e verifique o armazenamento.",true)}
}
function message(s,bad){const x=$("#notice");x.textContent=s;x.style.background=bad?"#ffeded":"#f0f8ee";x.style.borderColor=bad?"#f3c2c2":"#c8e5c2";x.style.color=bad?"#a12834":"#27572a";x.scrollIntoView({block:"nearest",behavior:"smooth"})}
function clearMessage(){$("#notice").textContent=""}
function payStatus(r){
 if(r.voided)return ["Anulado","gray"];
 if(r.status==="pago")return ["Pagamento registrado","green"];
 if(r.due&&r.due<today())return ["Vencido / verificar","red"];
 if(r.due&&r.due<=plusDays(15))return ["Vence em breve","amber"];
 if(r.status==="emitido")return ["Guia emitida","blue"];
 return ["Pendente","amber"]
}
function plusDays(n){let d=new Date(today()+"T12:00:00");d.setDate(d.getDate()+n);return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate())}
function pill(text,color){return '<span class="pill '+(color||"gray")+'">'+esc(text)+'</span>'}
function aliveRecords(){return db.records.filter(r=>!r.voided)}
function recFor(p,m){return aliveRecords().filter(r=>r.competence===m&&previdTypes.has(r.type)&&Array.isArray(r.people)&&r.people.includes(p))}
function inssSituation(pid,m){
 const xs=recFor(pid,m);
 if(!xs.length)return {label:"Sem comprovação",color:"gray",count:0};
 if(xs.some(r=>r.status!=="pago"&&r.due&&r.due<today()))return {label:"Lançamento vencido",color:"red",count:xs.length};
 if(xs.some(r=>r.status!=="pago"))return {label:"Pagamento pendente",color:"amber",count:xs.length};
 return {label:"Pagamento registrado",color:"green",count:xs.length};
}
function cardTitle(title,subtitle,right){return '<div class="card-header"><div><h2>'+title+'</h2><p>'+subtitle+'</p></div>'+(right||"")+'</div>'}
function countPay(){return aliveRecords().filter(r=>r.status==="pago").length}
function render(){
 const title={painel:"Visão geral",inss:"INSS por competência",lancamentos:"Guias e pagamentos",pessoas:"Trabalhadores",pendencias:"Outras obrigações",backup:"Dados e backup"};
 const sub={painel:"Uma visão clara do que precisa ser conferido, pago e comprovado.",inss:"Conferência mensal individual, inclusive quando uma única guia cobre mais de uma pessoa.",lancamentos:"Histórico de guias, vencimentos, referências e comprovantes.",pessoas:"Cadastros mínimos para saber qual obrigação se aplica a cada vínculo.",pendencias:"Férias, 13º, admissões e outros compromissos a acompanhar.",backup:"Proteção, exportação e restauração dos seus dados locais."};
 $("#page-title").textContent=title[page];$("#page-subtitle").textContent=sub[page];$("#competencia").value=competence;
 document.querySelectorAll(".nav-btn").forEach(b=>b.classList.toggle("active",b.dataset.page===page));
 $("#view").innerHTML=({painel:renderHome,inss:renderInss,lancamentos:renderRecords,pessoas:renderPeople,pendencias:renderTasks,backup:renderBackup})[page]();
}
function buildPerson(p){
 const sit=inssSituation(p.id,competence);
 return '<div class="person"><div class="person-top"><div class="avatar">'+esc((p.name||"?").slice(0,1).toUpperCase())+'</div><div><strong>'+esc(p.name)+'</strong><small>'+esc(p.role||"Função não informada")+'</small></div></div><div class="tiny">'+esc(regName(p.regime))+'</div><div class="person-detail"><span>INSS · '+esc(mon(competence))+'</span>'+pill(sit.label,sit.color)+'</div><div class="card-actions" style="margin-top:12px"><button class="btn btn-sm btn-soft" data-act="new-inss" data-id="'+esc(p.id)+'">Registrar guia</button><button class="btn btn-sm btn-ghost" data-act="edit-person" data-id="'+esc(p.id)+'">Editar</button></div></div>';
}
function metric(label,value,info,kind){return '<div class="metric"><div class="kicker">'+label+'</div><strong class="'+(kind||"")+'">'+value+'</strong><p>'+info+'</p></div>'}
function renderHome(){
 const active=db.people.filter(p=>p.status!=="inativo");
 const open=aliveRecords().filter(r=>r.status!=="pago");
 const overdue=open.filter(r=>r.due&&r.due<today());
 const noProof=active.filter(p=>recFor(p.id,competence).length===0);
 const soon=open.filter(r=>r.due&&r.due>=today()&&r.due<=plusDays(15));
 const dueAmount=open.filter(r=>r.due&&r.due<=plusDays(15)).reduce((a,r)=>a+(Number(r.amount)||0),0);
 const recent=[...aliveRecords()].sort((a,b)=>String(b.createdAt||"").localeCompare(String(a.createdAt||""))).slice(0,6);
 let s='<div class="banner warn"><div class="symbol">ⓘ</div><div><strong>Primeiro passo: confirmar o enquadramento dos três trabalhadores.</strong><p>O sistema não presume vínculo, alíquota ou guia. Uma contribuição só aparecerá como paga depois que você registrar a data e a referência do comprovante.</p></div></div>';
 s+='<div class="metrics">'+metric("Trabalhadores ativos",String(active.length),"Cadastros acompanhados nesta versão")+
 metric("INSS sem registro",String(noProof.length),"Na competência "+mon(competence))+
 metric("Lançamentos vencidos",String(overdue.length),"Datas informadas por você",overdue.length?"red-text":"")+
 metric("A pagar nos próximos 15 dias",money(dueAmount),soon.length+" lançamento(s), contando cada guia uma só vez")+'</div>';
 s+='<div class="card">'+cardTitle("Pessoas acompanhadas","A situação mensal nunca é dada como regular automaticamente.",'<button class="btn btn-sm btn-ghost" data-page="pessoas">Ver cadastros →</button>')+'<div class="people-grid">'+active.map(buildPerson).join("")+'</div></div>';
 s+='<div class="grid"><section><div class="card">'+cardTitle("Últimos lançamentos","Pagamento comprovado, pendência ou simples guia emitida.",'<button class="btn btn-sm btn-ghost" data-page="lancamentos">Histórico →</button>')+(recent.length?recordTable(recent):'<div class="empty"><strong>Nenhum lançamento ainda</strong>Cadastre a guia e sua competência sem inventar pagamentos retroativos.<div style="margin-top:11px"><button class="btn btn-sm btn-primary" data-act="new-record">+ Primeiro lançamento</button></div></div>')+'</div></section>';
 s+='<section><div class="card">'+cardTitle("Checklist de atenção","Prioridades para evitar equívocos")+
 '<div class="stack">'+(noProof.length?'<div class="simple-row"><div><h3>Conferir INSS de '+noProof.length+' pessoa(s)</h3><p>'+noProof.map(p=>esc(p.name)).join(", ")+' · '+mon(competence)+'</p></div>'+pill("Sem registro","amber")+'</div>':"")+
 (overdue.length?'<div class="simple-row"><div><h3>Revisar '+overdue.length+' vencimento(s)</h3><p>Vencidos conforme as datas cadastradas.</p></div>'+pill("Atenção","red")+'</div>':"")+
 (db.people.some(p=>p.regime==="indefinido")?'<div class="simple-row"><div><h3>Classificar os vínculos</h3><p>Definir doméstico, CLT, rural, autônomo ou outro.</p></div>'+pill("Necessário","amber")+'</div>':"")+
 '<div class="simple-row"><div><h3>Guardar comprovantes</h3><p>O histórico registra referências, não anexa arquivos bancários.</p></div>'+pill("Rotina","blue")+'</div></div></div>'+
 '<div class="card">'+cardTitle("Acessos oficiais","Emita e confira as guias no ambiente competente.")+governmentLinks()+'</div></section></div>';
 return s;
}
function governmentLinks(){return '<div class="guide-links"><a href="'+GOV.esocial+'" target="_blank" rel="noopener noreferrer">eSocial ↗</a><a href="'+GOV.dae+'" target="_blank" rel="noopener noreferrer">DAE doméstico ↗</a><a href="'+GOV.receita+'" target="_blank" rel="noopener noreferrer">Receita / DCTFWeb ↗</a><a href="'+GOV.fgts+'" target="_blank" rel="noopener noreferrer">FGTS Digital ↗</a><a href="'+GOV.inss+'" target="_blank" rel="noopener noreferrer">Orientações INSS ↗</a></div>'}
function renderInss(){
 const active=db.people.filter(p=>p.status!=="inativo");
 let s='<div class="banner"><div class="symbol">▤</div><div><strong>Conferência por competência '+esc(mon(competence))+'</strong><p>“Pagamento registrado” indica que existe um lançamento previdenciário marcado como pago e com referência de comprovante. Não é certidão de regularidade e não garante a inexistência de outras obrigações.</p></div></div>';
 s+='<section class="card">'+cardTitle("Situação dos trabalhadores","Uma guia consolidada pode ser vinculada a várias pessoas, sem multiplicar o valor financeiro.")+'<div class="inss-grid">'+active.map(p=>{
 const sit=inssSituation(p.id,competence),rs=recFor(p.id,competence);
 return '<div class="inss-item"><h3>'+esc(p.name)+'</h3><div class="smallline">'+esc(regName(p.regime))+'</div><div>'+pill(sit.label,sit.color)+'</div><div class="statusline"><span class="tiny">'+rs.length+' lançamento(s) associado(s)</span><button class="btn btn-sm btn-soft" data-act="new-inss" data-id="'+esc(p.id)+'">+ Guia</button></div></div>';
 }).join("")+'</div></section>';
 s+='<section class="card">'+cardTitle("Histórico de 12 competências","Cada célula mostra somente a situação documentada no seu próprio controle.")+'<div class="table-scroll"><table><thead><tr><th>Trabalhador</th>'+monthsBack(competence,12).map(m=>'<th>'+esc(mon(m))+'</th>').join("")+'</tr></thead><tbody>'+active.map(p=>'<tr><td class="td-strong">'+esc(p.name)+'</td>'+monthsBack(competence,12).map(m=>{let z=inssSituation(p.id,m);return '<td>'+pill(z.count?z.label:"Sem registro",z.color)+'</td>'}).join("")+'</tr>').join("")+'</tbody></table></div></section>';
 s+='<section class="card">'+cardTitle("Qual guia devo registrar?","Depende do vínculo; o sistema não escolhe por você.")+guideInfo()+governmentLinks()+'</section>';
 return s;
}
function monthsBack(anchor,n){const [y,m]=anchor.split("-").map(Number);let res=[];for(let i=0;i<n;i++){const d=new Date(y,m-1-i,1);res.push(d.getFullYear()+"-"+pad(d.getMonth()+1))}return res}
function guideInfo(){return '<div class="guide-grid"><div class="guide-block"><b>Empregado doméstico</b><p>O DAE do eSocial pode abranger todos os empregados domésticos do mesmo empregador. Inclui componentes previdenciários e trabalhistas.</p>'+pill("Prazo mensal em geral: dia 20*","blue")+'</div><div class="guide-block"><b>Empregado CLT de empresa</b><p>Contribuições previdenciárias declaradas via eSocial / DCTFWeb, usualmente recolhidas em DARF. FGTS tem tratamento próprio.</p>'+pill("Verificar guia e vencimento","gray")+'</div><div class="guide-block"><b>Contribuinte individual por conta própria</b><p>GPS pode ser responsabilidade do próprio contribuinte, com regras específicas. A situação muda conforme quem contrata e a modalidade.</p>'+pill("GPS em geral: dia 15*","blue")+'</div><div class="guide-block"><b>Trabalhador rural ou outro vínculo</b><p>Exige exame do tipo de contratante e enquadramento. Não presumir GPS, DAE, DARF ou percentual.</p>'+pill("Consultar regime aplicável","amber")+'</div></div><p class="tiny" style="margin-top:12px">*As datas acima são referências gerais, não vencimentos calculados. Fins de semana, feriados bancários e regras específicas podem alterá-las. Informe a data constante da guia oficial.</p>'}
function recordTable(list){
 return '<div class="table-scroll"><table><thead><tr><th>Guia / evento</th><th>Trabalhadores</th><th>Competência</th><th>Valor</th><th>Vencimento</th><th>Status</th><th>Ação</th></tr></thead><tbody>'+list.map(r=>{
 const z=payStatus(r);
 return '<tr><td><span class="td-strong">'+esc(r.type)+'</span><span class="td-sub">'+esc(r.reference||"Sem referência")+'</span></td><td>'+(r.people||[]).map(k=>'<span class="name-tag">'+esc(personName(k))+'</span>').join("")+'</td><td>'+esc(mon(r.competence))+'</td><td class="td-strong">'+money(r.amount)+'</td><td>'+shortDate(r.due)+'</td><td>'+pill(z[0],z[1])+(r.paidAt?'<span class="td-sub">Pago em '+shortDate(r.paidAt)+'</span>':"")+'</td><td><button class="btn btn-sm btn-ghost" data-act="edit-record" data-id="'+esc(r.id)+'">Detalhes</button></td></tr>';
 }).join("")+'</tbody></table></div>'
}
function renderRecords(){
 let rs=db.records.filter(r=>(allRecords||r.competence===competence)&&(filterPerson===""||(r.people||[]).includes(filterPerson))&&(filterType===""||r.type===filterType));
 rs.sort((a,b)=>String(b.competence||"").localeCompare(String(a.competence||""))||String(b.createdAt||"").localeCompare(String(a.createdAt||"")));
 const subtotal=rs.filter(r=>!r.voided).reduce((a,r)=>a+(Number(r.amount)||0),0);
 return '<div class="card">'+cardTitle("Lançamentos e comprovantes","Valores de guias compartilhadas são contabilizados uma só vez.",'<button class="btn btn-sm btn-primary" data-act="new-record">+ Registrar</button>')+
 '<div class="filters"><label class="checkchip"><input id="all-months" type="checkbox" '+(allRecords?"checked":"")+'> Todos os meses</label><select id="filter-worker" aria-label="Filtrar trabalhador"><option value="">Todos os trabalhadores</option>'+db.people.map(p=>'<option value="'+esc(p.id)+'" '+(filterPerson===p.id?"selected":"")+'>'+esc(p.name)+'</option>').join("")+'</select><select id="filter-type" aria-label="Filtrar tipo"><option value="">Todos os tipos</option>'+types.map(t=>'<option value="'+esc(t)+'" '+(filterType===t?"selected":"")+'>'+esc(t)+'</option>').join("")+'</select></div>'+
 '<p class="tiny">'+rs.length+' lançamento(s) · soma nominal não anulada: <b>'+money(subtotal)+'</b> · a soma não representa necessariamente dívida.</p>'+
 (rs.length?recordTable(rs):'<div class="empty"><strong>Nenhum lançamento nos filtros escolhidos</strong>Use “+ Registrar” e associe o comprovante ao mês correto.</div>')+'</div>'+
 '<div class="card">'+cardTitle("Como registrar sem enganos","Distinguir a emissão da guia do efetivo pagamento.")+
 '<div class="guide-grid"><div class="guide-block"><b>1 · Competência</b><p>Selecione o mês a que a obrigação pertence; não confunda com o mês em que foi paga.</p></div><div class="guide-block"><b>2 · Uma guia, um valor</b><p>Se o mesmo DAE cobre várias pessoas, marque todas no mesmo lançamento. Não duplique a despesa.</p></div><div class="guide-block"><b>3 · Vencimento real</b><p>Copie a data da guia oficial. Não use datas sugeridas como confirmação legal.</p></div><div class="guide-block"><b>4 · Quitação verificável</b><p>Só marque pago com data e identificação/localização de comprovante.</p></div></div></div>';
}
function renderPeople(){
 return '<div class="card">'+cardTitle("Cadastros essenciais","A categoria de cada pessoa determina quais obrigações devem ser verificadas.",'<button class="btn btn-sm btn-primary" data-act="new-person">+ Pessoa</button>')+
 '<div class="people-grid">'+db.people.map(p=>'<div class="person"><div class="person-top"><div class="avatar">'+esc(p.name.slice(0,1).toUpperCase())+'</div><div><strong>'+esc(p.name)+'</strong><small>'+esc(p.role||"Função não cadastrada")+'</small></div></div><div class="stack"><div class="stat-line"><span>Enquadramento</span>'+pill(regName(p.regime),p.regime==="indefinido"?"amber":"blue")+'</div><div class="stat-line"><span>Admissão</span><b>'+shortDate(p.admission)+'</b></div><div class="stat-line"><span>Remuneração ref.</span><b>'+(p.salary!==null&&p.salary!==undefined&&p.salary!==""?money(p.salary):"Não informada")+'</b></div><div class="stat-line"><span>Situação</span>'+pill(p.status==="inativo"?"Inativo":"Ativo",p.status==="inativo"?"gray":"green")+'</div></div><p class="tiny">'+esc(p.notes||"Nenhuma anotação.")+'</p><button class="btn btn-sm btn-soft" data-act="edit-person" data-id="'+esc(p.id)+'">Editar cadastro</button></div>').join("")+'</div></div><div class="banner warn"><div class="symbol">!</div><div><strong>Categoria não equivale a diagnóstico jurídico do vínculo</strong><p>Selecione o enquadramento após conferir a relação real de trabalho e o cadastro oficial. Dados de salário são referenciais e não geram cálculo automático de encargos.</p></div></div>';
}
function renderTasks(){
 const pending=db.tasks.filter(t=>!t.done);
 const completed=db.tasks.filter(t=>t.done);
 const sorter=(a,b)=>String(a.due||"9999").localeCompare(String(b.due||"9999"));
 return '<div class="card">'+cardTitle("Agenda de obrigações","Reúna lembretes sem transformar o sistema em RH.",'<button class="btn btn-sm btn-primary" data-act="new-task">+ Pendência</button>')+
 '<div class="taglist" style="margin-bottom:15px">'+["Férias","13º salário","Admissão / contrato","Folha / eSocial","Vale-transporte","Exames / documentos","Revisão jurídica","Outros"].map(t=>'<span class="summary-chip">'+t+'</span>').join("")+'</div>'+
 (pending.length?'<div class="stack">'+[...pending].sort(sorter).map(t=>taskLine(t)).join("")+'</div>':'<div class="empty"><strong>Nenhuma tarefa pendente cadastrada</strong>Isso não significa ausência de obrigações legais. Lance aqui o que precisa acompanhar.</div>')+'</div>'+
 '<div class="card">'+cardTitle("Tarefas concluídas","Conclusões exigem uma referência para possibilitar conferência posterior.")+(completed.length?'<div class="stack">'+[...completed].sort(sorter).map(taskLine).join("")+'</div>':'<p class="tiny">Ainda não há tarefas concluídas.</p>')+'</div>';
}
function taskLine(t){
 const who=t.personId?personName(t.personId):"Geral";
 return '<div class="simple-row"><div><h3>'+esc(t.title)+'</h3><p>'+esc(t.category||"Outros")+' · '+esc(who)+' · Vencimento: '+shortDate(t.due)+'</p>'+(t.notes?'<p style="margin-top:4px">'+esc(t.notes)+'</p>':"")+(t.done?'<p style="margin-top:4px">Concluída em '+shortDate(t.doneAt)+' · '+esc(t.proof||"")+'</p>':"")+'</div><div class="row-meta">'+pill(t.done?"Concluída":t.due&&t.due<today()?"Vencida":"Pendente",t.done?"green":t.due&&t.due<today()?"red":"amber")+(t.done?"":'<button class="btn btn-sm btn-primary" data-act="done-task" data-id="'+esc(t.id)+'">Concluir</button>')+'<button class="btn btn-sm btn-ghost" data-act="edit-task" data-id="'+esc(t.id)+'">Editar</button></div></div>'
}
function renderBackup(){
 const notClassified=db.people.filter(p=>p.regime==="indefinido").length;
 return '<div class="banner warn"><div class="symbol">♢</div><div><strong>Importante: GitHub Pages publica o programa, não guarda os registros.</strong><p>As informações ficam no armazenamento deste navegador, sem sincronização entre dispositivos. Limpar dados do site ou trocar de navegador pode apagá-las. Faça backup criptografado com frequência; a senha do backup não pode ser recuperada por este sistema.</p></div></div>'+
 '<div class="grid"><section><div class="card">'+cardTitle("Sua central de backup","Criptografia AES-GCM, com senha escolhida por você.")+
 '<div class="stack"><div class="stat-line"><span>Trabalhadores cadastrados</span><b>'+db.people.length+'</b></div><div class="stat-line"><span>Lançamentos (inclusive anulados)</span><b>'+db.records.length+'</b></div><div class="stat-line"><span>Pendências / concluídas</span><b>'+db.tasks.length+'</b></div><div class="stat-line"><span>Último backup gerado</span><b>'+(db.lastBackup?new Date(db.lastBackup).toLocaleString("pt-BR"):"Nunca")+'</b></div></div>'+
 '<div class="backup-actions" style="margin-top:18px"><button class="btn btn-primary" data-act="backup-encrypted">↓ Backup criptografado</button><button class="btn btn-ghost" data-act="backup-plain">↓ JSON legível</button><label class="btn btn-ghost" for="file-import">↑ Restaurar arquivo<input type="file" id="file-import" accept=".json,application/json"></label></div>'+
 '<div class="callout">Para preservar a privacidade, prefira o arquivo criptografado. O JSON legível revela remunerações, datas, nomes e observações a quem o acessar.</div></div></section>'+
 '<section><div class="card">'+cardTitle("Conferência do cadastro","Pontos importantes da configuração")+
 '<div class="stat-line"><span>Vínculos sem classificação</span>'+pill(String(notClassified),notClassified?"amber":"green")+'</div>'+
 '<div class="stat-line"><span>Pagamentos registrados</span><b>'+countPay()+'</b></div>'+
 '<div class="stat-line"><span>Histórico de alterações</span><b>'+db.audit.length+' eventos</b></div>'+
 '<p class="tiny" style="margin-top:12px">O histórico registra criação, edição, anulação e restauração. Não representa uma trilha inviolável: quem controla o navegador pode alterar os próprios dados.</p></div></section></div>'+
 '<div class="card">'+cardTitle("Atividade recente","Um resumo das alterações feitas no controle.")+
 (db.audit.length?'<div class="table-scroll"><table><thead><tr><th>Quando</th><th>Ação</th><th>Referência</th><th>Detalhe</th></tr></thead><tbody>'+db.audit.slice(0,25).map(a=>'<tr><td>'+new Date(a.at).toLocaleString("pt-BR")+'</td><td>'+esc(a.action)+'</td><td>'+esc(a.id)+'</td><td>'+esc(a.details)+'</td></tr>').join("")+'</tbody></table></div>':'<p class="tiny">Nenhuma alteração registrada ainda.</p>')+'</div>';
}
function modal(title,body){$("#modal-title").textContent=title;$("#modal-body").innerHTML=body;$("#modal").hidden=false;document.body.style.overflow="hidden"}
function closeModal(){$("#modal").hidden=true;$("#modal-body").innerHTML="";document.body.style.overflow=""}
function opt(list,value){return list.map(x=>'<option value="'+esc(x[0])+'" '+(value===x[0]?"selected":"")+'>'+esc(x[1])+'</option>').join("")}
function field(label,name,value,type,extra){return '<label class="field">'+label+'<input name="'+name+'" type="'+(type||"text")+'" value="'+esc(value||"")+'" '+(extra||"")+'></label>'}
function openPerson(pid){
 const p=pid?db.people.find(q=>q.id===pid):null;
 modal(p?"Editar trabalhador":"Novo trabalhador",'<form id="form-person" class="form-grid">'+field("Nome","name",p&&p.name,"text","required maxlength=90")+
 field("Função (opcional)","role",p&&p.role,"text","maxlength=100")+
 '<label class="field full">Natureza do vínculo<select name="regime">'+opt(regimeOptions,p&&p.regime||"indefinido")+'</select></label>'+
 field("Data de admissão (se confirmada)","admission",p&&p.admission,"date")+
 field("Remuneração de referência (opcional)","salary",p&&p.salary===null?"":p&&p.salary,"number",'step="0.01" min="0"')+
 '<label class="field">Situação<select name="status"><option value="ativo" '+(!p||p.status!=="inativo"?"selected":"")+'>Ativo</option><option value="inativo" '+(p&&p.status==="inativo"?"selected":"")+'>Inativo</option></select></label>'+
 '<label class="field full">Notas<textarea name="notes" maxlength="1200" placeholder="Detalhes para conferência, sem CPF ou dados excessivos.">'+esc(p&&p.notes||"")+'</textarea></label>'+
 '<div class="callout full">A classificação é informativa; não muda o vínculo jurídico nem emite guias. As alíquotas não são calculadas automaticamente.</div>'+
 '<div class="form-actions full"><button type="button" class="btn btn-ghost" data-act="close-modal">Cancelar</button><button class="btn btn-primary" type="submit">Salvar cadastro</button></div></form>');
 $("#form-person").addEventListener("submit",ev=>{
 ev.preventDefault();const f=new FormData(ev.target),name=String(f.get("name")||"").trim();if(!name)return;
 const v={id:p?p.id:id(),name:name,role:String(f.get("role")||""),regime:String(f.get("regime")||"indefinido"),admission:String(f.get("admission")||""),salary:f.get("salary")===""?null:Number(f.get("salary")),status:String(f.get("status")||"ativo"),notes:String(f.get("notes")||"")};
 if(p)Object.assign(p,v);else db.people.push(v);
 commit(p?"Editou trabalhador":"Cadastrou trabalhador",v.id,name);
 closeModal();render();message("Cadastro salvo apenas neste navegador.");
 });
}
function defaultGuide(pid){
 let p=db.people.find(q=>q.id===pid);return p&&p.regime==="domestico"?"DAE eSocial":p&&p.regime==="empresa"?"DARF previdenciário":p&&p.regime==="autonomo"?"GPS":"INSS"
}
function openRecord(rid,pid){
 const r=rid?db.records.find(q=>q.id===rid):null;
 const selected=r&&Array.isArray(r.people)?r.people:pid?[pid]:[];
 const preType=r?r.type:pid?defaultGuide(pid):"INSS";
 const peopleChips=db.people.map(p=>'<label class="checkchip"><input type="checkbox" name="people" value="'+esc(p.id)+'" '+(selected.includes(p.id)?"checked":"")+'>'+esc(p.name)+'</label>').join("");
 modal(r?"Editar lançamento":"Registrar pagamento / guia",'<form id="form-record" class="form-grid">'+
 '<label class="field">Tipo de lançamento<select name="type">'+opt(types.map(t=>[t,t]),preType)+'</select></label>'+
 '<label class="field">Competência (mês/ano)<input name="competence" type="month" value="'+esc(r?r.competence:competence)+'" required></label>'+
 '<div class="field full"><span>Trabalhadores cobertos por este documento</span><div class="checkboxes">'+peopleChips+'</div><small class="helper">Marque vários quando uma única guia consolida suas contribuições; registre o valor apenas uma vez.</small></div>'+
 field("Valor total da guia / pagamento (R$)","amount",r&&r.amount!==undefined?r.amount:"","number",'step="0.01" min="0" required')+
 field("Vencimento impresso na guia","due",r&&r.due||"","date")+
 '<label class="field">Situação<select name="status">'+opt([["pendente","Pendente / a conferir"],["emitido","Guia emitida (não paga)"],["pago","Pago, com comprovante"]],r?r.status:"pendente")+'</select></label>'+
 field("Data do efetivo pagamento","paidAt",r&&r.paidAt||"","date")+
 field("Número / identificação da guia","reference",r&&r.reference||"","text",'maxlength="200"')+
 field("Referência do comprovante (obrigatório se pago)","proof",r&&r.proof||"","text",'maxlength="250" placeholder="Ex.: recibo bancário 12345; arquivo pasta X"')+
 '<label class="field full">Observações<textarea name="notes" maxlength="1500">'+esc(r&&r.notes||"")+'</textarea></label>'+
 '<div class="callout full">“Pago” exige data e referência do comprovante. O programa não se comunica com o eSocial, o banco ou a Receita Federal.</div>'+
 '<div class="form-actions full">'+(r&&!r.voided?'<button type="button" class="btn btn-danger" data-act="void-record" data-id="'+esc(r.id)+'">Anular lançamento</button>':"")+
 '<button type="button" class="btn btn-ghost" data-act="close-modal">Cancelar</button><button type="submit" class="btn btn-primary">Salvar lançamento</button></div></form>');
 if(r&&r.voided){$("#form-record").querySelectorAll("input,select,textarea,button[type=submit]").forEach(x=>x.disabled=true);$("#form-record").insertAdjacentHTML("beforeend",'<p class="warning-text">Lançamento anulado em '+shortDate((r.voidedAt||"").slice(0,10))+' · motivo: '+esc(r.voidReason||"")+'</p>')}
 $("#form-record").addEventListener("submit",ev=>{
 ev.preventDefault();if(r&&r.voided)return;
 let f=new FormData(ev.target),ps=f.getAll("people").map(String),status=String(f.get("status"));
 if(!ps.length){alert("Selecione ao menos uma pessoa coberta pelo documento.");return}
 const paidAt=String(f.get("paidAt")||""),proof=String(f.get("proof")||"").trim();
 if(status==="pago"&&(!paidAt||!proof)){alert("Para confirmar pagamento, informe a data e a referência do comprovante.");return}
 const amount=Number(f.get("amount"));if(!Number.isFinite(amount)||amount<0){alert("Informe um valor válido.");return}
 const v={id:r?r.id:id(),people:ps,type:String(f.get("type")),competence:String(f.get("competence")),amount:amount,due:String(f.get("due")||""),status:status,paidAt:status==="pago"?paidAt:"",proof:status==="pago"?proof:"",reference:String(f.get("reference")||""),notes:String(f.get("notes")||""),createdAt:r?r.createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
 if(r)Object.assign(r,v);else db.records.push(v);
 commit(r?"Editou lançamento":"Criou lançamento",v.id,v.type+" "+v.competence+" / "+v.status);
 closeModal();render();message(status==="pago"?"Pagamento registrado com referência de comprovante.":"Lançamento salvo. Ainda não consta como pago.");
 });
}
function openTask(tid){
 const t=tid?db.tasks.find(x=>x.id===tid):null;
 modal(t?"Editar pendência":"Nova pendência",'<form id="form-task" class="form-grid">'+field("Título da obrigação","title",t&&t.title,"text",'required maxlength="150"')+
 '<label class="field">Categoria<select name="category">'+opt(["Férias","13º salário","Admissão / contrato","Folha / eSocial","Vale-transporte","Exames / documentos","Revisão jurídica","Outros"].map(k=>[k,k]),t&&t.category||"Outros")+'</select></label>'+
 '<label class="field">Responsável / trabalhador<select name="personId"><option value="">Geral</option>'+db.people.map(p=>'<option value="'+esc(p.id)+'" '+(t&&t.personId===p.id?"selected":"")+'>'+esc(p.name)+'</option>').join("")+'</select></label>'+
 field("Data de conferência / prazo","due",t&&t.due,"date")+
 '<label class="field full">Notas<textarea name="notes" maxlength="1000">'+esc(t&&t.notes||"")+'</textarea></label>'+
 '<div class="form-actions full"><button type="button" class="btn btn-ghost" data-act="close-modal">Cancelar</button><button type="submit" class="btn btn-primary">Salvar pendência</button></div></form>');
 $("#form-task").addEventListener("submit",ev=>{
 ev.preventDefault();let f=new FormData(ev.target),v={id:t?t.id:id(),title:String(f.get("title")||"").trim(),category:String(f.get("category")||""),personId:String(f.get("personId")||""),due:String(f.get("due")||""),notes:String(f.get("notes")||""),done:t?t.done:false,doneAt:t?t.doneAt:"",proof:t?t.proof:""};
 if(!v.title)return;
 if(t)Object.assign(t,v);else db.tasks.push(v);
 commit(t?"Editou pendência":"Criou pendência",v.id,v.title);closeModal();render();message("Pendência salva.");
 });
}
function voidRecord(rid){
 const r=db.records.find(q=>q.id===rid);if(!r||r.voided)return;
 const why=prompt("Informe o motivo da anulação (o histórico será preservado):");
 if(!why||!why.trim())return;
 r.voided=true;r.voidReason=why.trim();r.voidedAt=new Date().toISOString();
 commit("Anulou lançamento",r.id,why.trim());closeModal();render();message("Lançamento anulado e preservado no histórico.");
}
function doneTask(tid){
 let t=db.tasks.find(q=>q.id===tid);if(!t||t.done)return;
 const proof=prompt("Onde está o documento ou comprovante da conclusão? Informe a referência:");
 if(!proof||!proof.trim())return;
 t.done=true;t.doneAt=today();t.proof=proof.trim();
 commit("Concluiu pendência",t.id,t.title);render();message("Conclusão registrada com referência.");
}
function saveFile(data,name,mime){
 const url=URL.createObjectURL(new Blob([data],{type:mime||"application/json"}));
 const a=document.createElement("a");a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1200);
}
function bytesB64(b){let s="";for(let i=0;i<b.length;i+=8192)s+=String.fromCharCode(...b.subarray(i,i+8192));return btoa(s)}
function b64Bytes(s){return Uint8Array.from(atob(s),c=>c.charCodeAt(0))}
async function deriveKey(pass,salt){
 const base=await crypto.subtle.importKey("raw",new TextEncoder().encode(pass),{name:"PBKDF2"},false,["deriveKey"]);
 return crypto.subtle.deriveKey({name:"PBKDF2",salt:salt,iterations:220000,hash:"SHA-256"},base,{name:"AES-GCM",length:256},false,["encrypt","decrypt"]);
}
async function exportEncrypted(){
 if(!crypto.subtle){alert("Este navegador não oferece criptografia segura. Use HTTPS no GitHub Pages.");return}
 const pass=prompt("Defina uma senha FORTE para este backup (mínimo 10 caracteres). Guarde-a fora do sistema:");
 if(pass===null)return;if(pass.length<10){alert("Use ao menos 10 caracteres para a senha.");return}
 const conf=prompt("Repita a senha do backup:");if(conf!==pass){alert("As senhas não coincidem. Nada foi exportado.");return}
 try{
 const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12));
 const now=new Date().toISOString(),snapshot=Object.assign({},db,{lastBackup:now});
 const key=await deriveKey(pass,salt),encrypted=await crypto.subtle.encrypt({name:"AES-GCM",iv:iv},key,new TextEncoder().encode(JSON.stringify(snapshot)));
 const wrapper={format:"controle-trabalhista-criptografado-v1",createdAt:now,kdf:"PBKDF2-SHA256-220000",algorithm:"AES-256-GCM",salt:bytesB64(salt),iv:bytesB64(iv),payload:bytesB64(new Uint8Array(encrypted))};
 saveFile(JSON.stringify(wrapper,null,2),"controle-trabalhista-backup-"+today()+".json");
 db.lastBackup=now;commit("Exportou backup","backup","Arquivo criptografado gerado");render();message("Backup criptografado gerado. Guarde o arquivo e a senha em locais seguros.");
 }catch(e){alert("Erro ao gerar backup criptografado: "+e.message)}
}
function exportPlain(){
 if(!confirm("O JSON legível NÃO é criptografado e revela os dados registrados. Deseja realmente exportar?"))return;
 const now=new Date().toISOString(),snapshot=Object.assign({},db,{lastBackup:now});
 saveFile(JSON.stringify(snapshot,null,2),"controle-trabalhista-json-"+today()+".json");
 db.lastBackup=now;commit("Exportou backup","backup","JSON legível gerado");render();message("JSON legível gerado. Evite compartilhá-lo.");
}
async function importBackup(file){
 if(!file)return;
 try{
 const raw=await file.text();if(raw.length>12000000)throw Error("Arquivo excessivamente grande");
 let d=JSON.parse(raw);
 if(d.format==="controle-trabalhista-criptografado-v1"){
 if(!crypto.subtle)throw Error("Navegador sem suporte a criptografia");
 const pass=prompt("Senha do backup criptografado:");if(pass===null)return;
 const key=await deriveKey(pass,b64Bytes(d.salt));
 const dec=await crypto.subtle.decrypt({name:"AES-GCM",iv:b64Bytes(d.iv)},key,b64Bytes(d.payload));
 d=JSON.parse(new TextDecoder().decode(dec));
 }
 if(!d||d.schema!==1||!Array.isArray(d.people)||!Array.isArray(d.records)||!Array.isArray(d.tasks))throw Error("Este arquivo não é um backup compatível");
 if(!confirm("Restaurar este backup substituirá todos os dados atuais NESTE navegador. Recomenda-se exportar o estado atual antes. Continuar?"))return;
 db=d;if(!Array.isArray(db.audit))db.audit=[];
 commit("Restaurou backup","backup","Restauração confirmada pelo usuário");
 page="painel";render();message("Backup restaurado com sucesso neste navegador.");
 }catch(e){alert("Não foi possível restaurar: "+e.message)}
}
document.addEventListener("click",ev=>{
 const b=ev.target.closest("[data-page],[data-act]");if(!b)return;
 if(b.dataset.page){page=b.dataset.page;clearMessage();render();return}
 const a=b.dataset.act,x=b.dataset.id;
 if(a==="close-modal")closeModal();
 if(a==="new-record")openRecord();
 if(a==="new-inss")openRecord(null,x);
 if(a==="edit-record")openRecord(x);
 if(a==="void-record")voidRecord(x);
 if(a==="new-person")openPerson();
 if(a==="edit-person")openPerson(x);
 if(a==="new-task")openTask();
 if(a==="edit-task")openTask(x);
 if(a==="done-task")doneTask(x);
 if(a==="backup-encrypted")exportEncrypted();
 if(a==="backup-plain")exportPlain();
});
document.addEventListener("change",ev=>{
 const q=ev.target;
 if(q.id==="competencia"){competence=q.value||thisMonth();clearMessage();render()}
 if(q.id==="all-months"){allRecords=q.checked;render()}
 if(q.id==="filter-worker"){filterPerson=q.value;render()}
 if(q.id==="filter-type"){filterType=q.value;render()}
 if(q.id==="file-import"){importBackup(q.files&&q.files[0]);q.value=""}
});
document.addEventListener("keydown",ev=>{if(ev.key==="Escape"&&!$("#modal").hidden)closeModal()});
$("#btn-export-top").addEventListener("click",exportEncrypted);
$("#btn-new-record").addEventListener("click",()=>openRecord());
render();
if(loadError)message("Não foi possível ler o armazenamento anterior. NÃO salve novos registros antes de conferir ou restaurar seu backup.",true);
})();
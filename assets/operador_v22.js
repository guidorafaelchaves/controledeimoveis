/* Controle de Imóveis v22: painel para operadores e recuperação de locações antigas.
 * Dados pessoais, PDFs e transações permanecem no navegador, nunca neste arquivo público. */
(function(){
"use strict";
const esc22=x=>String(x==null?"":x).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const arr22=x=>Array.isArray(x)?x:[];
const real22=x=>Number(x||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const date22=x=>/^\d{4}-\d\d-\d\d$/.test(String(x||""))?x.substring(8)+"/"+x.substring(5,7)+"/"+x.substring(0,4):"—";
const norm22=x=>String(x||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]/g," ").trim();
const active22=()=>arr22(state.properties).find(p=>p.id===state.selectedId);
const format22="controle_imoveis_locacao_v21";
function json22(s){
 if(typeof s!=="string"||s.length>7500000)return null;
 const t=s.trim().replace(/^\uFEFF/,"");
 try{return JSON.parse(t)}catch(e){}
 if(typeof parseJsonFlexible==="function")try{return parseJsonFlexible(t).data}catch(e){}
 return null;
}
function packet22(v,depth=0){
 if(depth>4||!v)return null;
 if(typeof v==="string")return packet22(json22(v),depth+1);
 if(typeof v!=="object")return null;
 if(v.format===format22&&v.lease&&v.target)return v;
 for(const k of ["sourceJson","texto_original","texto_original_importado","originalJson","richJson","data","payload","pack","raw"]){
  if(v[k]){const p=packet22(v[k],depth+1);if(p)return p}
 }
 return null;
}
function validate22(p){
 if(!p||p.format!==format22||!p.target||!p.lease)throw Error("Formato de locação não reconhecido.");
 const l=p.lease;
 if(!l.id||!l.tenant||!Number.isFinite(Number(l.amount))||Number(l.amount)<=0||
 !/^\d{4}-\d\d-\d\d$/.test(l.startDate||"")||!/^\d{4}-\d\d-\d\d$/.test(l.endDate||"")||
 l.endDate<l.startDate)throw Error("Contrato com dados obrigatórios inválidos.");
 if(!Array.isArray(p.transactions)||p.transactions.length>120||p.transactions.some(t=>
 !t.id||t.type!=="income"||t.status!=="pending"||!Number.isFinite(Number(t.amount))||
 Number(t.amount)<=0||!/^\d{4}-\d\d-\d\d$/.test(t.dueDate||"")
 ))throw Error("Há lançamentos financeiros inválidos.");
 if(l.agreementPdf&&(l.agreementPdf.mime!=="application/pdf"||!String(l.agreementPdf.base64||"").startsWith("JVBER")||
 l.agreementPdf.base64.length>5500000))throw Error("PDF inválido ou muito grande.");
}
function score22(p,t){
 const n=norm22(p.name),tn=norm22(t.name),a=norm22(p.address),ta=norm22(t.address);
 const tokens=ta.split(" ").filter(x=>x.length>3),same=tokens.filter(x=>a.split(" ").includes(x)).length;
 return (n&&n===tn?80:n&&tn&&(n.includes(tn)||tn.includes(n))?30:0)+
 (ta&&ta===a?120:tokens.length>=3&&same>=3?100:0)+
 (norm22(p.city)&&norm22(p.city)===norm22(t.city)?10:0);
}
function target22(pack,current){
 const rank=arr22(state.properties).map(p=>({id:p.id,score:score22(p,pack.target)})).sort((a,b)=>b.score-a.score);
 const here=rank.find(x=>x.id===current?.id);
 return here&&here.score>=30?here.id:rank[0]?.score>=30?rank[0].id:"__new__";
}
function recover22(p){
 const pack=packet22(p);
 return pack&&!arr22(p.financeV20?.leases).some(l=>l.id===pack.lease.id)?pack:null;
}
function insert22(pack,id){
 validate22(pack);
 let p=id==="__new__"?null:arr22(state.properties).find(x=>x.id===id);
 if(id!=="__new__"&&!p)throw Error("Imóvel não encontrado.");
 if(typeof exportCompleteBackup==="function")exportCompleteBackup();
 if(typeof autoSnapshot==="function")autoSnapshot("Antes da recuperação de locação v22");
 if(!p){
  p={id:"imovel-"+Date.now()+"-"+Math.random().toString(36).slice(2),name:pack.target.name||"Imóvel",
  address:pack.target.address||"",city:pack.target.city||"",type:pack.target.type||"Imóvel",
  value:0,marketValue:0,monthlyIncome:0,monthlyCost:0,sourceJson:{},finances:[],contracts:[],
  financeV20:{leases:[],transactions:[]}};
  state.properties.push(p);
 }
 if(!p.financeV20||typeof p.financeV20!=="object")p.financeV20={};
 const f=p.financeV20;
 if(!Array.isArray(f.leases))f.leases=[];
 if(!Array.isArray(f.transactions))f.transactions=[];
 const old=f.leases.find(l=>l.id===pack.lease.id);
 if(old){
  for(const [k,v] of Object.entries(pack.lease))if(old[k]===null||old[k]===undefined||old[k]==="")old[k]=v;
 }else f.leases.push({...pack.lease,importedAt:new Date().toISOString()});
 let added=0;
 for(const t of pack.transactions){
  if(f.transactions.some(x=>x.id===t.id||(x.type==="income"&&String(x.category).toLowerCase()==="aluguel"&&
  x.dueDate===t.dueDate&&Math.abs(Number(x.amount)-Number(t.amount))<0.01)))continue;
  f.transactions.push({...t,updatedAt:new Date().toISOString()});added++;
 }
 state.selectedId=p.id;
 if(typeof recordAudit==="function")recordAudit("v22_locacao_estruturada",p,{leaseId:pack.lease.id,newTransactions:added});
 save();
 if(typeof selectProperty==="function")selectProperty(p.id);
 return {p,added};
}
function review22(pack,origin){
 try{validate22(pack)}catch(e){alert("Importação cancelada: "+e.message);return}
 document.getElementById("op22-modal")?.remove();
 const pre=target22(pack,origin);
 const options='<option value="__new__"'+(pre==="__new__"?" selected":"")+'>Criar novo imóvel</option>'+
 arr22(state.properties).map(p=>'<option value="'+esc22(p.id)+'"'+(pre===p.id?" selected":"")+'>'+esc22(p.name)+'</option>').join("");
 const modal=document.createElement("div");modal.id="op22-modal";modal.className="op22-modal";
 modal.innerHTML='<div class="op22-dialog" role="dialog" aria-modal="true"><h2>Organizar contrato de locação</h2>'+
 '<p>Confira antes de integrar. Nenhum dado será publicado no GitHub.</p>'+
 '<div class="op22-kpis"><div class="op22-kpi"><small>Locatário</small><strong class="op22-name">'+esc22(pack.lease.tenant)+'</strong></div>'+
 '<div class="op22-kpi"><small>Aluguel</small><strong>'+real22(pack.lease.amount)+'</strong></div>'+
 '<div class="op22-kpi"><small>Parcelas</small><strong>'+arr22(pack.transactions).length+'</strong></div>'+
 '<div class="op22-kpi"><small>Vigência</small><strong class="op22-name">'+date22(pack.lease.startDate)+' a '+date22(pack.lease.endDate)+'</strong></div></div>'+
 '<label class="op22-label">Imóvel de destino<select id="op22-target">'+options+'</select></label>'+
 '<p class="op22-note">O backup será oferecido antes de gravar. Contratos, parcelas e pagamentos já existentes serão preservados; nenhum pagamento será baixado automaticamente. Registros antigos não serão apagados.</p>'+
 '<div class="op22-actions"><button data-op22="cancel">Cancelar</button><button class="op22-primary" data-op22="save">Integrar contrato</button></div></div>';
 document.body.appendChild(modal);
 modal.querySelector('[data-op22="save"]').addEventListener("click",()=>{
  const id=modal.querySelector("#op22-target").value;
  const chosen=id==="__new__"?"novo imóvel":arr22(state.properties).find(x=>x.id===id)?.name;
  if(!confirm('Integrar a locação em "'+chosen+'"?'))return;
  try{const out=insert22(pack,id);modal.remove();alert("Contrato organizado em "+out.p.name+
   ". "+out.added+" lançamento(s) novos pendentes. Consulte Financeiro do imóvel.");}
  catch(e){alert("Falha: "+e.message)}
 });
 modal.querySelector('[data-op22="cancel"]').addEventListener("click",()=>modal.remove());
}
function operator22(p){
 const f=p.financeV20||{},leases=arr22(f.leases),tx=arr22(f.transactions);
 const today=new Date().toISOString().substring(0,10);
 const due=tx.filter(t=>t.status!=="paid"&&t.status!=="cancelled");
 const paid=tx.filter(t=>t.status==="paid");
 const overdue=due.filter(t=>t.dueDate&&t.dueDate<today);
 const current=leases.filter(l=>(!l.startDate||l.startDate<=today)&&(!l.endDate||l.endDate>=today));
 const rent=current.reduce((a,l)=>a+Number(l.amount||0),0);
 const cards=[["Aluguel mensal contratado",real22(rent),"Previsão, não pagamento"],
 ["Parcelas pendentes",due.length,"Sem baixa automática"],
 ["Pagamentos registrados",paid.length,"Conforme baixa manual"],
 ["Parcelas vencidas",overdue.length,"Conforme vencimento"]];
 let html='<section class="op22-panel"><div class="op22-head"><div><small>PAINEL OPERACIONAL</small><h2>Locações e cobranças</h2></div>'+
 '<div class="op22-actions"><button data-op22="finance">Abrir financeiro</button><button data-op22="import">Importar locação + PDF</button></div></div>'+
 '<div class="op22-kpis">'+cards.map(c=>'<div class="op22-kpi"><small>'+c[0]+'</small><strong>'+c[1]+'</strong><span>'+c[2]+'</span></div>').join("")+'</div>';
 if(recover22(p))html+='<div class="op22-warning"><strong>Importação antiga recuperável</strong><p>O contrato está guardado como texto. É possível convertê-lo em contrato e lançamentos estruturados, sem apagar o original.</p><button data-op22="recover" class="op22-primary">Recuperar contrato</button></div>';
 if(leases.length){
  html+='<h3>Contratos registrados</h3><div class="op22-scroll"><table><thead><tr><th>Locatário</th><th>Unidade</th><th>Aluguel</th><th>Vigência</th><th>Caução</th></tr></thead><tbody>'+
  leases.map(l=>'<tr><td>'+esc22(l.tenant)+'</td><td>'+esc22(l.unit||"—")+'</td><td>'+real22(l.amount)+'</td><td>'+
  date22(l.startDate)+' a '+date22(l.endDate)+'</td><td>'+esc22(l.securityDeposit?real22(l.securityDeposit.amount):"—")+'</td></tr>').join("")+'</tbody></table></div>';
 }else if(!recover22(p))html+='<p class="op22-empty">Nenhum contrato estruturado. Utilize o importador de locações para cadastrar documentos, valores e parcelas.</p>';
 if(due.length){
  html+='<h3>Próximas parcelas pendentes</h3><div class="op22-scroll"><table><thead><tr><th>Vencimento</th><th>Descrição</th><th>Valor</th><th>Situação</th></tr></thead><tbody>'+
  due.filter(t=>t.dueDate).sort((a,b)=>a.dueDate.localeCompare(b.dueDate)).slice(0,5).map(t=>'<tr><td>'+date22(t.dueDate)+'</td><td>'+
  esc22(t.description||t.category||"Aluguel")+'</td><td>'+real22(t.amount)+'</td><td>'+(t.dueDate<today?"Vencido":"Pendente")+'</td></tr>').join("")+'</tbody></table></div>';
 }
 return html+'</section>';
}
function dossier22(p){
 const root=document.querySelector(".v19-document");
 if(!root||root.querySelector(".op22-panel"))return;
 const box=document.createElement("div");
 box.innerHTML=operator22(p);
 root.querySelector(".v19-hero")?.insertAdjacentElement("afterend",box.firstElementChild);
 const detail=document.createElement("details");detail.className="op22-detail";
 detail.innerHTML='<summary>Consultar dossiê jurídico e documental detalhado</summary><div class="op22-body"></div>';
 for(const node of [...root.children]){
  if(node.classList?.contains("v19-hero")||node.classList?.contains("op22-panel"))continue;
  detail.querySelector(".op22-body").appendChild(node);
 }
 root.appendChild(detail);
 const technical=document.createElement("details");technical.className="op22-detail";
 technical.innerHTML='<summary>Área técnica: JSON original (opcional)</summary><p>O backup integral preserva os dados técnicos.</p><button data-op22="json">Mostrar JSON</button><pre hidden></pre>';
 root.appendChild(technical);
}
function portfolio22(){
 const root=document.querySelector(".v19-document");
 if(!root||root.querySelector(".op22-portfolio"))return;
 const ps=arr22(state.properties);
 const leases=ps.reduce((n,p)=>n+arr22(p.financeV20?.leases).length,0);
 const pending=ps.reduce((n,p)=>n+arr22(p.financeV20?.transactions).filter(t=>t.status!=="paid"&&t.status!=="cancelled").length,0);
 const recover=ps.filter(recover22).length;
 const div=document.createElement("section");div.className="op22-panel op22-portfolio";
 div.innerHTML='<div class="op22-head"><div><small>VISÃO OPERACIONAL</small><h2>Administração de locações</h2></div></div>'+
 '<div class="op22-kpis">'+[["Contratos estruturados",leases],["Parcelas pendentes",pending],["Importações para recuperar",recover]].map(v=>
 '<div class="op22-kpi"><small>'+v[0]+'</small><strong>'+v[1]+'</strong></div>').join("")+'</div>';
 root.querySelector(".v19-hero")?.insertAdjacentElement("afterend",div);
}
const style=document.createElement("style");
style.textContent='.op22-panel{background:white;border:1px solid #d8e4ef;border-radius:16px;padding:19px;margin:16px 0;color:#152d48;box-shadow:0 5px 18px #0b24500c}.op22-head,.op22-actions{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}.op22-head h2{font-size:21px;margin:4px 0}.op22-head small{font-weight:800;letter-spacing:.08em;color:#52718b}.op22-actions button,.op22-detail button,.op22-warning button{background:#e8f1fe;color:#154783;border:1px solid #afcbed;padding:9px 12px;border-radius:8px;cursor:pointer}.op22-primary{background:#1d5db2!important;color:#fff!important}.op22-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:14px 0}.op22-kpi{border:1px solid #dbe7f4;background:#f3f7fc;border-radius:12px;padding:12px;overflow-wrap:anywhere}.op22-kpi small,.op22-kpi span{display:block;color:#506782;font-size:11px}.op22-kpi strong{display:block;font-size:22px;margin:7px 0;color:#143965}.op22-kpi .op22-name{font-size:14px}.op22-panel h3{font-size:14px;margin:16px 0 8px}.op22-scroll{overflow-x:auto}.op22-scroll table{width:100%;border-collapse:collapse;font-size:12px}.op22-scroll td,.op22-scroll th{padding:10px;border-bottom:1px solid #dbe6f0;text-align:left}.op22-scroll th{background:#f4f8fc}.op22-detail{border:1px solid #d8e3ef;border-radius:12px;margin:12px 0;background:#fff;color:#173651}.op22-detail>summary{cursor:pointer;padding:15px;font-weight:750;color:#20528c}.op22-body,.op22-detail>p,.op22-detail>button{margin:12px}.op22-detail pre{margin:12px;white-space:pre-wrap;word-break:break-all;max-height:550px;overflow:auto;background:#14243b;color:#e6ecf8;padding:14px}.op22-warning{padding:13px;background:#fff1d8;border:1px solid #eacb89;border-radius:11px;color:#5d4418}.op22-warning p{font-size:13px}.op22-empty{background:#f1f5fa;padding:12px;color:#526781}.op22-modal{position:fixed;inset:0;z-index:13000;background:#05162bcb;display:grid;place-items:center;padding:14px}.op22-dialog{background:#fff;color:#172e4d;padding:24px;border-radius:17px;width:min(700px,100%);max-height:90vh;overflow:auto}.op22-label{display:block;font-weight:750;margin:15px 0}.op22-label select{display:block;width:100%;padding:11px;margin-top:8px;background:#fff;border:1px solid #b3c7de;border-radius:8px;color:#142840}.op22-note{background:#fff3d9;border-radius:9px;padding:12px;font-size:13px}@media(max-width:750px){.op22-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}}';
document.head.appendChild(style);
const prevProperty=renderProperty,prevPortfolio=renderPortfolio,prevPreview=previewImport,prevConfirm=confirmImport,prevIntegrate=integrateData;
renderProperty=function(p){prevProperty(p);if(p)dossier22(p)};
renderPortfolio=function(){prevPortfolio();portfolio22()};
previewImport=function(){
 const pack=packet22(document.getElementById("jsonInput")?.value);
 if(!pack)return prevPreview();
 validate22(pack);
 pendingImport={data:pack,mode:"Locação v21 reconhecida"};
 document.getElementById("importPreview").innerHTML='<div class="preview-item"><b>Contrato de '+esc22(pack.lease.tenant)+'</b><p>'+
 esc22(pack.target.name)+' · Aluguel '+real22(pack.lease.amount)+' · '+arr22(pack.transactions).length+' parcelas.</p>'+
 '<p>Confirme para escolher o imóvel de destino.</p></div>';
 return pendingImport;
};
confirmImport=function(){
 const pack=packet22(document.getElementById("jsonInput")?.value);
 if(!pack)return prevConfirm();
 closeModal("importModal");clearImport();review22(pack,active22());
};
integrateData=function(data,opts={}){
 const pack=packet22(data)||packet22(opts.rawText);
 if(pack){review22(pack,active22());return}
 return prevIntegrate(data,opts);
};
document.addEventListener("click",e=>{
 const btn=e.target.closest?.("[data-op22]");if(!btn)return;
 const action=btn.dataset.op22;
 if(action==="finance")document.querySelector('[data-f20="property"]')?.click();
 else if(action==="import")document.querySelector('[data-ar-action="import"]')?.click();
 else if(action==="recover"){const p=active22();if(p){const pack=recover22(p);if(pack)review22(pack,p)}}
 else if(action==="json"){
  const pre=btn.parentElement.querySelector("pre");
  if(pre.hidden){pre.textContent=JSON.stringify(active22()?.sourceJson||{},null,2);pre.hidden=false;btn.textContent="Ocultar JSON";}
  else{pre.hidden=true;pre.textContent="";btn.textContent="Mostrar JSON";}
 }
});
if(active22())renderProperty(active22());else renderPortfolio();
window.controleImoveisV22={version:"22.0",packet22,validate22,score22};
})();
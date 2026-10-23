/* Controle de Imóveis v20 — módulo financeiro aditivo.
   Não substitui dossiês v19 e não envia lançamentos ao repositório. */
(function(){
"use strict";
const BRL = new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"});
const today = ()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");};
const monthNow=()=>today().slice(0,7);
const clean = value=>String(value==null?"":value);
const E = value=>clean(value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const attr=E;
const arr=v=>Array.isArray(v)?v:[];
const money=v=>BRL.format(Number(v)||0);
const fmtDate=s=>/^\d{4}-\d{2}-\d{2}$/.test(clean(s))?clean(s).slice(8,10)+"/"+clean(s).slice(5,7)+"/"+clean(s).slice(0,4):"—";
const monthLabel=s=>/^\d{4}-\d{2}$/.test(clean(s))?clean(s).slice(5,7)+"/"+clean(s).slice(0,4):"—";
const token=()=> (typeof crypto!=="undefined"&&crypto.randomUUID?crypto.randomUUID():"fin-"+Date.now()+"-"+Math.random().toString(16).slice(2));
const positive=v=>Number.isFinite(Number(v))&&Number(v)>0;
const getFin=p=>p&&p.financeV20&&typeof p.financeV20==="object"?p.financeV20:{transactions:[],leases:[]};
const entries=p=>arr(getFin(p).transactions);
const leases=p=>arr(getFin(p).leases);
const setFin=p=>{if(!p.financeV20||typeof p.financeV20!=="object")p.financeV20={transactions:[],leases:[]};if(!Array.isArray(p.financeV20.transactions))p.financeV20.transactions=[];if(!Array.isArray(p.financeV20.leases))p.financeV20.leases=[];return p.financeV20;};
const isMonth=s=>/^\d{4}-(0[1-9]|1[0-2])$/.test(clean(s));
const isDate=s=>/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(clean(s))&&!Number.isNaN(new Date(s+"T12:00:00").getTime());
const amountFromInput=v=>{let s=clean(v).trim().replace(/[R$\s]/g,"");if(!s)return NaN;if(s.includes(","))s=s.replace(/\./g,"").replace(",",".");const n=Number(s);return Number.isFinite(n)?Math.round(n*100)/100:NaN;};
const isRevenue=t=>t.type==="income";
const realized=t=>t.status==="paid";
const belongs=(t,m)=>t.competence===m;
const sum=items=>items.reduce((a,t)=>a+Number(t.amount||0),0);
let mode="dossier";
let month=monthNow();
let sort="name";
const baselineProperty=renderProperty;
const baselinePortfolio=renderPortfolio;
const baselineSelect=selectProperty;
const baselinePortfolioNav=showPortfolio;
function allEntries(){return arr(state.properties).flatMap(p=>entries(p).map(t=>({ ...t, propertyId:p.id, propertyName:p.name})))}
function facts(items,m){
 const set=items.filter(t=>belongs(t,m)), rec=set.filter(t=>isRevenue(t)&&realized(t)), out=set.filter(t=>!isRevenue(t)&&realized(t));
 const dueIn=set.filter(t=>isRevenue(t)&&!realized(t)),dueOut=set.filter(t=>!isRevenue(t)&&!realized(t));
 return {count:set.length,received:sum(rec),spent:sum(out),net:sum(rec)-sum(out),receivable:sum(dueIn),payable:sum(dueOut),expectedNet:sum(rec)+sum(dueIn)-sum(out)-sum(dueOut)};
}
function leaseInMonth(l,m){
 if(!positive(l.amount)||!isDate(l.startDate))return false;
 const start=m+"-01";
 const end=new Date(Number(m.slice(0,4)),Number(m.slice(5,7)),0);
 const last=[end.getFullYear(),String(end.getMonth()+1).padStart(2,"0"),String(end.getDate()).padStart(2,"0")].join("-");
 return l.startDate<=last&&(!l.endDate||l.endDate>=start);
}
function expectedRent(p,m){return leases(p).filter(l=>leaseInMonth(l,m)).reduce((a,l)=>a+Number(l.amount||0),0)}
function propertyFacts(p,m){const f=facts(entries(p),m);f.contractRent=expectedRent(p,m);return f}
function classFor(v){return v>0?"f20-positive":v<0?"f20-negative":"f20-neutral"}
function stat(label,value,sub,kind){
 return '<div class="f20-stat '+(kind||"")+'"><small>'+E(label)+'</small><strong>'+E(value)+'</strong><span>'+E(sub||"")+'</span></div>';
}
function tabBar(property){
 return '<div class="f20-tabs" aria-label="Seções de patrimônio">'+
 '<button data-f20="dossier" class="'+(mode==="dossier"?"is-active":"")+'">Dossiê completo</button>'+
 (property?'<button data-f20="property" class="'+(mode==="property"?"is-active":"")+'">Financeiro do imóvel</button>':
 '<button data-f20="global" class="'+(mode==="global"?"is-active":"")+'">Financeiro da carteira</button>')+
 '</div>';
}
function fmtNum(n){return Number(n||0).toLocaleString("pt-BR",{maximumFractionDigits:2})}
function renderFinanceHeader(title,subtitle,property){
 return '<div class="f20-head"><div><div class="f20-eyebrow">GESTÃO FINANCEIRA · V20</div>'+
 '<h2>'+E(title)+'</h2><p>'+E(subtitle)+'</p></div>'+
 '<div class="f20-actions"><label class="f20-period">Competência <input type="month" data-f20-month value="'+attr(month)+'"></label>'+
 '<button data-f20="new-tx" class="f20-btn f20-accent">+ Lançamento</button>'+
 (property?'<button data-f20="new-lease" class="f20-btn">+ Contrato de aluguel</button>':"")+
 '<button data-f20="export" class="f20-btn">Exportar CSV</button></div></div>';
}
function kpis(f,contracts){
 return '<div class="f20-kpis">'+
 stat("Recebido",money(f.received),"Receitas efetivamente lançadas","f20-income")+
 stat("Pago",money(f.spent),"Despesas efetivamente lançadas","f20-outcome")+
 stat("Resultado de caixa",money(f.net),"Recebido − pago",classFor(f.net))+
 stat("A receber",money(f.receivable),"Lançamentos pendentes","")+
 stat("A pagar",money(f.payable),"Lançamentos pendentes","")+
 stat("Aluguéis contratados",money(contracts),"Referência mensal; não é recebimento","")+
 '</div>';
}
function summaryBars(items,m){
 const months=[];let yy=Number(m.slice(0,4)),mm=Number(m.slice(5,7));
 for(let i=11;i>=0;i--){const d=new Date(yy,mm-1-i,1);months.push(d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0"))}
 const rows=months.map(x=>({m:x,f:facts(items,x)}));
 const maximum=Math.max(1,...rows.flatMap(r=>[r.f.received,r.f.spent]));
 return '<section class="f20-panel"><div class="f20-panel-title"><h3>Evolução dos últimos 12 meses</h3><span>Recebimentos e pagamentos registrados</span></div>'+
 '<div class="f20-chart-legend"><span class="f20-legend-in">Receitas recebidas</span><span class="f20-legend-out">Despesas pagas</span></div>'+
 '<div class="f20-chart">'+rows.map(r=>'<div class="f20-chart-row"><span>'+E(monthLabel(r.m))+'</span>'+
 '<div class="f20-chart-track"><div class="f20-bar f20-green" title="Recebido: '+attr(money(r.f.received))+'" style="width:'+(100*r.f.received/maximum).toFixed(2)+'%"></div>'+
 '<div class="f20-bar f20-orange" title="Pago: '+attr(money(r.f.spent))+'" style="width:'+(100*r.f.spent/maximum).toFixed(2)+'%"></div></div>'+
 '<strong class="'+classFor(r.f.net)+'">'+E(money(r.f.net))+'</strong></div>').join("")+'</div></section>';
}
function ledgerTable(items,showProperty){
 const list=items.filter(t=>belongs(t,month)).slice().sort((a,b)=>clean(b.date||b.dueDate).localeCompare(clean(a.date||a.dueDate)));
 return '<section class="f20-panel"><div class="f20-panel-title"><h3>Lançamentos de '+E(monthLabel(month))+'</h3><span>'+list.length+' registro(s) · competência, não extrato bancário</span></div>'+
 (list.length?'<div class="f20-scroll"><table class="f20-table"><thead><tr>'+
 (showProperty?'<th>Imóvel</th>':"")+'<th>Tipo / categoria</th><th>Descrição</th><th>Unidade</th><th>Vencimento</th><th>Baixa</th><th>Situação</th><th>Valor</th><th></th></tr></thead><tbody>'+
 list.map(t=>'<tr>'+(showProperty?'<td>'+E(t.propertyName)+'</td>':"")+
 '<td><strong>'+E(isRevenue(t)?"Receita":"Despesa")+'</strong><small>'+E(t.category)+'</small></td>'+
 '<td>'+E(t.description)+'</td><td>'+E(t.unit||"—")+'</td>'+
 '<td>'+E(fmtDate(t.dueDate))+'</td><td>'+E(fmtDate(t.date))+'</td>'+
 '<td><span class="f20-chip '+(realized(t)?"f20-done":"f20-pending")+'">'+(realized(t)?isRevenue(t)?"Recebido":"Pago":isRevenue(t)?"A receber":"A pagar")+'</span></td>'+
 '<td class="'+(isRevenue(t)?"f20-positive":"f20-negative")+'"><strong>'+E(money(t.amount))+'</strong></td>'+
 '<td><button data-f20="edit-tx" data-id="'+attr(t.id)+'" data-property="'+attr(t.propertyId||"")+'" class="f20-small">Editar</button></td></tr>').join("")+
 '</tbody></table></div>':'<div class="f20-empty">Nenhum lançamento nessa competência. Você pode registrar uma receita, conta, custo ou gasto sem alterar os documentos do imóvel.</div>')+'</section>';
}
function propertiesTable(){
 const list=arr(state.properties).map(p=>({p,f:propertyFacts(p,month)})).sort((a,b)=>sort==="net"?b.f.net-a.f.net:clean(a.p.name).localeCompare(clean(b.p.name),"pt-BR"));
 return '<section class="f20-panel"><div class="f20-panel-title"><h3>Resultado por imóvel</h3><label>Ordenar <select data-f20-sort><option value="name"'+(sort==="name"?" selected":"")+'>Nome</option><option value="net"'+(sort==="net"?" selected":"")+'>Resultado</option></select></label></div>'+
 (list.length?'<div class="f20-scroll"><table class="f20-table"><thead><tr><th>Imóvel</th><th>Recebido</th><th>Pago</th><th>Resultado</th><th>Pendências</th><th>Aluguéis contratados/mês</th><th></th></tr></thead><tbody>'+
 list.map(({p,f})=>'<tr><td><strong>'+E(p.name)+'</strong><small>'+E(p.address||p.city||"")+'</small></td>'+
 '<td>'+E(money(f.received))+'</td><td>'+E(money(f.spent))+'</td><td class="'+classFor(f.net)+'"><strong>'+E(money(f.net))+'</strong></td>'+
 '<td>'+E(money(f.receivable))+' / '+E(money(f.payable))+'</td><td>'+E(money(f.contractRent))+'</td>'+
 '<td><button class="f20-small" data-f20="open-property" data-id="'+attr(p.id)+'">Financeiro ↗</button></td></tr>').join("")+
 '</tbody></table></div>':'<div class="f20-empty">Nenhum imóvel cadastrado neste navegador.</div>')+'</section>';
}
function rentTable(p){
 const list=leases(p);return '<section class="f20-panel"><div class="f20-panel-title"><h3>Aluguéis contratados por unidade</h3><span>'+list.length+' contrato(s) cadastrados neste navegador</span></div>'+
 (list.length?'<div class="f20-scroll"><table class="f20-table"><thead><tr><th>Unidade</th><th>Identificação</th><th>Vigência</th><th>Vencimento</th><th>Mensalidade</th><th>Referência em '+E(monthLabel(month))+'</th><th></th></tr></thead><tbody>'+
 list.map(l=>'<tr><td><strong>'+E(l.unit||"Imóvel inteiro")+'</strong></td><td>'+E(l.tenant||"Não registrado")+'</td>'+
 '<td>'+E(fmtDate(l.startDate))+' a '+E(fmtDate(l.endDate))+'</td><td>Dia '+E(l.dueDay||"—")+'</td>'+
 '<td>'+E(money(l.amount))+'</td><td>'+E(leaseInMonth(l,month)?money(l.amount):"Fora do período")+'</td>'+
 '<td><button data-f20="edit-lease" data-id="'+attr(l.id)+'" class="f20-small">Editar</button></td></tr>').join("")+
 '</tbody></table></div>':'<div class="f20-empty">Nenhum contrato financeiro cadastrado. Cadastre o aluguel por unidade para acompanhar a receita contratada, sem confundi-la com recebimentos.</div>')+
 '<div class="f20-note">Os valores dos contratos são referências mensais, sem cálculo automático de proporcionalidade. Só entram em “Recebido” depois do lançamento da respectiva baixa.</div></section>';
}
function portfolioContent(){
 const all=allEntries(),f=facts(all,month),rents=arr(state.properties).reduce((a,p)=>a+expectedRent(p,month),0);
 return '<div class="f20-root">'+tabBar(false)+renderFinanceHeader("Resultados da carteira","Receitas, despesas, pendências, aluguéis e resultado consolidado por competência.",false)+
 kpis(f,rents)+'<div class="f20-grid">'+summaryBars(all,month)+propertiesTable()+'</div>'+ledgerTable(all,true)+
 '<div class="f20-footnote">Somente lançamentos confirmados como recebidos ou pagos entram no resultado de caixa. Dados financeiros legados permanecem preservados no dossiê e não são duplicados automaticamente.</div></div>';
}
function propertyContent(p){
 const all=entries(p),f=propertyFacts(p,month),legacy=arr(p.finances).length;
 return '<div class="f20-root">'+tabBar(true)+renderFinanceHeader("Resultados financeiros · "+clean(p.name),"Controle financeiro independente dos dados registrais e documentais do imóvel.",true)+
 kpis(f,f.contractRent)+'<div class="f20-grid">'+summaryBars(all,month)+rentTable(p)+'</div>'+ledgerTable(all,false)+
 (legacy?'<div class="f20-footnote">Existem '+legacy+' lançamentos na estrutura financeira anterior. Eles continuam preservados no dossiê; não são classificados como pagos sem conciliação.</div>':"")+
 '<div class="f20-footnote">Resultado de caixa = receitas marcadas como recebidas − despesas marcadas como pagas. Gastos com obras e investimentos também aparecem nas saídas de caixa, mas devem ser diferenciados na categoria.</div></div>';
}
function appendNavigation(target){
 const root=document.getElementById("content");if(!root)return;
 root.insertAdjacentHTML("afterbegin",tabBar(target));
}
renderPortfolio=function(){
 if(mode==="global"){
  document.getElementById("title").textContent="Finanças da carteira";
  document.getElementById("subtitle").textContent="Resultados econômicos dos imóveis · v20";
  document.getElementById("content").innerHTML=portfolioContent();return;
 }
 baselinePortfolio();appendNavigation(false);
};
renderProperty=function(p){
 if(!p){baselinePortfolio();return;}
 if(mode==="property"){
  document.getElementById("title").textContent=clean(p.name);
  document.getElementById("subtitle").textContent="Resultados econômicos · controle financeiro";
  document.getElementById("content").innerHTML=propertyContent(p);return;
 }
 baselineProperty(p);appendNavigation(true);
};
selectProperty=function(id){mode="dossier";baselineSelect(id);};
showPortfolio=function(){mode="dossier";baselinePortfolioNav();};
function switchMode(target,id){
 if(target==="global"){mode="global";state.selectedId=null;}
 else if(target==="property"){if(id)state.selectedId=id;if(!active()){alert("Selecione um imóvel.");return;}mode="property";}
 else mode="dossier";
 render();
}
function refresh(){render();}
function snapshot(p,action,details){
 if(typeof autoSnapshot==="function")autoSnapshot("Antes de "+action+" financeiro em "+p.name);
 if(typeof recordAudit==="function")recordAudit("finance_v20_"+action,p,details);
}
function showDialog(body){
 document.getElementById("f20-overlay")?.remove();
 const node=document.createElement("div");node.id="f20-overlay";node.className="f20-overlay";node.innerHTML='<div class="f20-dialog" role="dialog" aria-modal="true">'+body+'</div>';
 document.body.appendChild(node);
}
function closeDialog(){document.getElementById("f20-overlay")?.remove();}
function formField(label,name,type,required){
 const tag=(type||"text")==="textarea"?'<textarea name="'+name+'" rows="2"></textarea>':'<input name="'+name+'" type="'+(type||"text")+'"'+(required?" required":"")+'>';
 return '<label class="f20-field"><span>'+E(label)+'</span>'+tag+'</label>';
}
function currentPropertyId(){return clean(active()?.id)}
function transactionForm(id,propertyId){
 let p=propertyId?state.properties.find(x=>x.id===propertyId):active();if(!p){
  if(!arr(state.properties).length)return alert("Cadastre primeiro um imóvel.");
  p=state.properties[0];
 }
 const old=entries(p).find(x=>x.id===id);
 const propertyChoice=arr(state.properties).map(x=>'<option value="'+attr(x.id)+'"'+(x.id===p.id?" selected":"")+'>'+E(x.name)+'</option>').join("");
 const html='<form id="f20-transaction" class="f20-form">'+
 '<div class="f20-dialog-head"><div><h3>'+(old?"Editar lançamento":"+ Novo lançamento financeiro")+'</h3><p>Registre valores reais ou pendentes. Nenhum valor é considerado pago automaticamente.</p></div><button type="button" data-f20="close">✕</button></div>'+
 '<div class="f20-fields"><label class="f20-field"><span>Imóvel</span><select name="propertyId"'+(old?" disabled":"")+'>'+propertyChoice+'</select></label>'+
 '<label class="f20-field"><span>Tipo</span><select name="type"><option value="income">Receita</option><option value="expense">Despesa</option></select></label>'+
 formField("Categoria (ex.: aluguel, IPTU, manutenção)","category","text",true)+
 formField("Descrição","description","text",true)+
 formField("Valor (R$)","amount","text",true)+
 formField("Unidade / apartamento (opcional)","unit","text")+
 formField("Competência (mês contábil)","competence","month",true)+
 formField("Vencimento (opcional)","dueDate","date")+
 formField("Data do recebimento / pagamento (se realizado)","date","date")+
 '<label class="f20-field"><span>Situação</span><select name="status"><option value="pending">Pendente (a receber / pagar)</option><option value="paid">Realizado (recebido / pago)</option></select></label></div>'+
 '<div class="f20-form-footer">'+(old?'<button type="button" data-f20="delete-tx" data-id="'+attr(old.id)+'" data-property="'+attr(p.id)+'" class="f20-danger">Excluir</button>':"")+
 '<button type="button" data-f20="close" class="f20-btn">Cancelar</button><button type="submit" class="f20-btn f20-accent">Salvar lançamento</button></div></form>';
 showDialog(html);
 const form=document.getElementById("f20-transaction");
 form.dataset.editId=old?.id||"";
 form.dataset.originalProperty=p.id;
 for(const [key,val] of Object.entries({propertyId:p.id,type:old?.type||"income",category:old?.category||"Aluguel",description:old?.description||"",amount:old?.amount!=null?String(old.amount).replace(".",","):"",unit:old?.unit||"",competence:old?.competence||month,dueDate:old?.dueDate||"",date:old?.date||"",status:old?.status||"pending"})){
  const field=form.elements.namedItem(key);if(field)field.value=val;
 }
}
function leaseForm(id){
 const p=active();if(!p)return alert("Selecione um imóvel.");
 const old=leases(p).find(x=>x.id===id);
 const html='<form id="f20-lease" class="f20-form">'+
 '<div class="f20-dialog-head"><div><h3>'+(old?"Editar contrato financeiro":"Novo contrato de aluguel")+'</h3><p>Projeção contratada não equivale a pagamento recebido.</p></div><button type="button" data-f20="close">✕</button></div>'+
 '<div class="f20-fields">'+formField("Unidade (ex.: 202)","unit","text",true)+
 formField("Identificação do locatário (opcional)","tenant","text")+
 formField("Aluguel mensal (R$)","amount","text",true)+
 formField("Início do contrato","startDate","date",true)+
 formField("Fim do contrato (opcional)","endDate","date")+
 formField("Dia do vencimento (1 a 31)","dueDay","number",true)+
 formField("Observações (opcional)","notes","textarea")+'</div>'+
 '<div class="f20-form-footer">'+(old?'<button type="button" data-f20="delete-lease" data-id="'+attr(old.id)+'" class="f20-danger">Excluir</button>':"")+
 '<button type="button" class="f20-btn" data-f20="close">Cancelar</button><button type="submit" class="f20-btn f20-accent">Salvar contrato</button></div></form>';
 showDialog(html);const form=document.getElementById("f20-lease");form.dataset.editId=old?.id||"";
 for(const [key,val] of Object.entries({unit:old?.unit||"",tenant:old?.tenant||"",amount:old?.amount!=null?String(old.amount).replace(".",","):"",startDate:old?.startDate||today(),endDate:old?.endDate||"",dueDay:old?.dueDay||"23",notes:old?.notes||""})){
 const field=form.elements.namedItem(key);if(field)field.value=val;
 }
}
function updateTransaction(form){
 const values=Object.fromEntries(new FormData(form).entries());
 const isEdit=!!form.dataset.editId;
 const p=state.properties.find(x=>x.id===(isEdit?form.dataset.originalProperty:values.propertyId));
 if(!p)return alert("Imóvel não localizado.");
 const amount=amountFromInput(values.amount);
 if(!positive(amount)||!isMonth(values.competence))return alert("Informe valor positivo e competência válida.");
 if(values.dueDate&&!isDate(values.dueDate))return alert("Data de vencimento inválida.");
 if(values.date&&!isDate(values.date))return alert("Data de pagamento inválida.");
 const obj={id:form.dataset.editId||token(),type:values.type==="expense"?"expense":"income",category:clean(values.category).trim(),description:clean(values.description).trim(),amount,unit:clean(values.unit).trim(),competence:values.competence,dueDate:values.dueDate||"",date:values.status==="paid"?(values.date||today()):"",status:values.status==="paid"?"paid":"pending",updatedAt:new Date().toISOString()};
 if(!obj.category||!obj.description)return alert("Preencha a categoria e a descrição.");
 const db=setFin(p);const ix=db.transactions.findIndex(x=>x.id===obj.id);
 snapshot(p,isEdit?"editar lançamento":"registrar lançamento",{id:obj.id,type:obj.type,competence:obj.competence,amount:obj.amount});
 if(ix>=0)db.transactions[ix]={...db.transactions[ix],...obj};else db.transactions.push(obj);
 closeDialog();save();toast("Lançamento financeiro salvo.");
}
function updateLease(form){
 const values=Object.fromEntries(new FormData(form).entries());
 const p=active();if(!p)return;
 const amount=amountFromInput(values.amount);const due=Number(values.dueDay);
 if(!positive(amount)||!isDate(values.startDate)||(values.endDate&&!isDate(values.endDate))||(values.endDate&&values.endDate<values.startDate))return alert("Confira valor e datas do contrato.");
 if(!Number.isInteger(due)||due<1||due>31)return alert("Dia de vencimento deve estar entre 1 e 31.");
 if(!clean(values.unit).trim())return alert("Informe a unidade locada.");
 const obj={id:form.dataset.editId||token(),unit:clean(values.unit).trim(),tenant:clean(values.tenant).trim(),amount,startDate:values.startDate,endDate:values.endDate||"",dueDay:due,notes:clean(values.notes).trim(),updatedAt:new Date().toISOString()};
 const db=setFin(p),ix=db.leases.findIndex(x=>x.id===obj.id);
 snapshot(p,ix>=0?"editar contrato":"cadastrar contrato financeiro",{id:obj.id,unit:obj.unit});
 if(ix>=0)db.leases[ix]={...db.leases[ix],...obj};else db.leases.push(obj);
 closeDialog();save();toast("Contrato financeiro registrado.");
}
function removeRecord(kind,id,propertyId){
 const p=propertyId?state.properties.find(x=>x.id===propertyId):active();if(!p)return;
 const db=setFin(p);const k=kind==="tx"?"transactions":"leases";
 const x=db[k].find(y=>y.id===id);if(!x)return;
 if(!confirm("Excluir este registro financeiro? Será criado um snapshot anterior à exclusão."))return;
 snapshot(p,"excluir "+(kind==="tx"?"lançamento":"contrato"),{id});
 db[k]=db[k].filter(y=>y.id!==id);
 closeDialog();save();toast("Registro excluído. Snapshot preservado.");
}
function safeCSV(v){
 let s=clean(v).replace(/[\r\n]+/g," ");
 if(/^[\s]*[=+\-@]/.test(s))s="'"+s;
 return '"'+s.replace(/"/g,'""')+'"';
}
function csvExport(){
 const fields=["Imóvel","Tipo","Categoria","Descrição","Unidade","Competência","Vencimento","Data de baixa","Situação","Valor (R$)"];
 const list=mode==="property"?entries(active()).map(t=>({...t,propertyName:active().name})):allEntries();
 const lines=[fields.map(safeCSV).join(";")].concat(list.map(t=>[t.propertyName,isRevenue(t)?"Receita":"Despesa",t.category,t.description,t.unit,t.competence,t.dueDate,t.date,realized(t)?"Realizado":"Pendente",Number(t.amount||0).toFixed(2).replace(".",",")].map(safeCSV).join(";")));
 const blob=new Blob(["\ufeff"+lines.join("\r\n")],{type:"text/csv;charset=utf-8"});
 const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="controle_imoveis_financeiro_"+(mode==="property"?"imovel_":"carteira_")+today()+".csv";a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);
}
document.addEventListener("click",function(e){
 const el=e.target.closest?.("[data-f20]");if(!el)return;
 const cmd=el.dataset.f20;
 if(!["dossier","global","property","open-property","new-tx","new-lease","edit-tx","edit-lease","delete-tx","delete-lease","export","close"].includes(cmd))return;
 e.preventDefault();
 if(cmd==="dossier"){switchMode("dossier");}
 else if(cmd==="global"){switchMode("global");}
 else if(cmd==="property"){switchMode("property");}
 else if(cmd==="open-property"){switchMode("property",el.dataset.id);}
 else if(cmd==="new-tx"){transactionForm();}
 else if(cmd==="new-lease"){leaseForm();}
 else if(cmd==="edit-tx"){transactionForm(el.dataset.id,el.dataset.property);}
 else if(cmd==="edit-lease"){leaseForm(el.dataset.id);}
 else if(cmd==="delete-tx"){removeRecord("tx",el.dataset.id,el.dataset.property);}
 else if(cmd==="delete-lease"){removeRecord("lease",el.dataset.id);}
 else if(cmd==="export"){csvExport();}
 else if(cmd==="close"){closeDialog();}
});
document.addEventListener("change",function(e){
 if(e.target.matches("[data-f20-month]")){if(isMonth(e.target.value)){month=e.target.value;refresh();}}
 if(e.target.matches("[data-f20-sort]")){sort=e.target.value;refresh();}
});
document.addEventListener("submit",function(e){
 if(e.target.id==="f20-transaction"){e.preventDefault();updateTransaction(e.target);}
 if(e.target.id==="f20-lease"){e.preventDefault();updateLease(e.target);}
});
document.addEventListener("keydown",function(e){if(e.key==="Escape")closeDialog();});
document.addEventListener("click",function(e){if(e.target.id==="f20-overlay")closeDialog();});
const side=document.querySelector(".side-actions");
if(side&&!side.querySelector('[data-f20="global"]'))side.insertAdjacentHTML("beforeend",'<button class="f20-side" data-f20="global">▣ Finanças da carteira</button>');
try{render();}catch(e){console.error("Financeiro v20: montagem de interface não concluída; estado anterior preservado.",e);}
})();
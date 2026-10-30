/* Controle de Imóveis — importador privado de locações (v21).
   Não contém dados pessoais nem publica contratos no GitHub.
   Pacotes são importados exclusivamente no navegador do usuário. */
(function(){
"use strict";
const E=v=>String(v==null?"":v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const money=v=>Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const fmt=s=>/^\d{4}-\d{2}-\d{2}$/.test(String(s||""))?String(s).slice(8)+"/"+String(s).slice(5,7)+"/"+String(s).slice(0,4):"—";
const arr=v=>Array.isArray(v)?v:[];
const uidLocal=()=>typeof crypto!=="undefined"&&crypto.randomUUID?crypto.randomUUID():"imovel-"+Date.now()+"-"+Math.random().toString(36).slice(2);
function currentProperty(){return typeof state!=="undefined"&&arr(state.properties).find(p=>p.id===state.selectedId);}
function inject(){
 const side=document.querySelector(".side-actions");
 if(side&&!side.querySelector('[data-ar-action="import"]')){
  const b=document.createElement("button");b.className="f20-side";b.textContent="▣ Importar locação + PDF";b.dataset.arAction="import";b.title="Importação privada de contrato e lançamentos, sem enviar dados ao GitHub";side.appendChild(b);
 }
 const root=document.getElementById("content"),p=currentProperty();
 if(!root||!root.querySelector(".f20-root")||!p)return;
 const existing=root.querySelector("[data-ar-panel]");
 if(existing) return;
 const ls=arr(p.financeV20?.leases).filter(l=>l.agreementPdf||l.securityDeposit);
 if(!ls.length)return;
 const box=document.createElement("section");box.className="f20-panel";box.dataset.arPanel="1";
 box.innerHTML='<div class="f20-panel-title"><h3>Contratos e documentos da locação</h3><span>Arquivos guardados neste navegador, não no GitHub</span></div>'+
 ls.map(l=>{
 const dep=l.securityDeposit;
 const paid=arr(p.financeV20?.transactions).filter(t=>t.sourceLeaseId===l.id&&t.status==="paid").length;
 const count=arr(p.financeV20?.transactions).filter(t=>t.sourceLeaseId===l.id).length;
 return '<div style="border:1px solid #dbe3ee;border-radius:12px;padding:13px;margin:10px 0;background:#f8fafc">'+
 '<strong>'+E(l.tenant||"Locatário não informado")+'</strong> · '+E(l.unit||"Unidade")+
 '<div style="margin:8px 0;display:flex;flex-wrap:wrap;gap:12px;font-size:13px"><span>Aluguel: <b>'+E(money(l.amount))+'</b></span>'+
 '<span>Vigência: '+E(fmt(l.startDate))+' a '+E(fmt(l.endDate))+'</span>'+
 '<span>Vencimento: dia '+E(l.dueDay)+'</span>'+
 (dep?'<span>Caução: <b>'+E(money(dep.amount))+'</b> · recebida em '+E(fmt(dep.receivedAt))+' (garantia, não receita)</span>':"")+
 '</div><div style="font-size:12px;color:#526175;margin-bottom:9px">'+
 (count?E(count+" aluguéis previstos · "+paid+" baixados; sem baixa automática"):"Sem lançamentos programados")+
 (dep?'<div>Compensação da caução no encerramento, após acerto. Comprovante da caução: '+E(dep.receiptAttachmentStatus||"a conferir")+'.</div>':"")+
 '</div>'+
 (l.agreementPdf?.base64?'<button type="button" data-ar-action="pdf" data-id="'+E(l.id)+'" class="f20-btn f20-accent">Abrir contrato PDF</button>':"")+
 '</div>';
 }).join("");
 root.querySelector(".f20-root").appendChild(box);
}
function overlay(){
 if(document.getElementById("ar-private-modal"))return;
 const el=document.createElement("div");el.id="ar-private-modal";
 el.style.cssText="position:fixed;inset:0;z-index:10020;background:rgba(1,10,24,.72);display:grid;place-items:center;padding:16px;";
 const opts=arr(state.properties).map(p=>'<option value="'+E(p.id)+'">'+E(p.name)+' — '+E(p.address||p.city||"")+'</option>').join("");
 el.innerHTML='<div role="dialog" aria-modal="true" aria-label="Importar locação" style="background:#fff;color:#142235;width:min(680px,98vw);max-height:90vh;overflow:auto;border-radius:18px;padding:23px;box-shadow:0 15px 60px #0005">'+
 '<h2 style="margin:0 0 7px">Importar contrato e financeiro</h2>'+
 '<p style="font-size:13px;color:#4b5d75">Selecione o pacote JSON preparado para a locação. O PDF, a caução e os 12 lançamentos serão salvos somente neste navegador, no imóvel escolhido. Nenhum arquivo será publicado no GitHub.</p>'+
 '<form id="ar-private-form"><label style="display:block;margin:12px 0">Pacote da locação (.json)<input name="pack" type="file" accept=".json,application/json" required style="display:block;width:100%;margin-top:6px"></label>'+
 '<label style="display:block;margin:12px 0">Imóvel de destino<select name="property" style="display:block;width:100%;padding:10px;border:1px solid #ced8e7;border-radius:8px;margin-top:6px"><option value="__new__">Criar novo imóvel a partir do pacote</option>'+opts+'</select></label>'+
 '<div style="font-size:12px;color:#7a4e14;background:#fff5df;padding:11px;border-radius:8px">Será gerado um backup antes da integração. Lançamentos importados ficarão PENDENTES, mesmo que os boletos já tenham sido enviados; a caução será registrada separadamente e não como receita.</div>'+
 '<div style="display:flex;justify-content:flex-end;gap:10px;margin-top:20px;flex-wrap:wrap"><button type="button" data-ar-action="cancel" class="f20-btn">Cancelar</button><button type="submit" class="f20-btn f20-accent">Integrar ao imóvel</button></div></form></div>';
 document.body.appendChild(el);
 const preferred=arr(state.properties).find(p=>{const s=(p.name+" "+p.address).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();return s.includes("arapiraca")&&(s.includes("galpao")||s.includes("manoel martins lemos"));});
 if(preferred)el.querySelector('[name="property"]').value=preferred.id;
 el.querySelector("form").addEventListener("submit",importPacket);
}
function checkPack(pack){
 if(!pack||pack.format!=="controle_imoveis_locacao_v21"||!pack.lease||!pack.target)throw Error("Arquivo não é um pacote de locação compatível.");
 const l=pack.lease;
 if(!l.id||!l.tenant||!Number.isFinite(Number(l.amount))||Number(l.amount)<=0||!l.startDate||!l.endDate)throw Error("Dados obrigatórios da locação ausentes.");
 if(!Array.isArray(pack.transactions)||pack.transactions.length>120)throw Error("Lista de lançamentos inválida.");
 if(pack.transactions.some(t=>!t.id||t.type!=="income"||t.status!=="pending"||!Number.isFinite(Number(t.amount))||Number(t.amount)<=0))throw Error("O pacote contém lançamentos inválidos ou baixas não autorizadas.");
 if(l.agreementPdf){
  if(l.agreementPdf.mime!=="application/pdf"||typeof l.agreementPdf.base64!=="string"||l.agreementPdf.base64.length>5500000||!l.agreementPdf.base64.startsWith("JVBER"))throw Error("O PDF do pacote é inválido ou muito grande.");
 }
}
async function importPacket(event){
 event.preventDefault();const form=event.target,button=form.querySelector('[type="submit"]');
 const file=form.elements.namedItem("pack").files[0];if(!file)return;
 button.disabled=true;button.textContent="Analisando pacote...";
 try{
  if(file.size>7500000)throw Error("O pacote excede o limite de 7,5 MB.");
  const pack=JSON.parse(await file.text());checkPack(pack);
  const id=form.elements.namedItem("property").value;
  let p=id==="__new__"?null:arr(state.properties).find(x=>x.id===id);
  if(id!=="__new__"&&!p)throw Error("Imóvel selecionado não encontrado.");
  const name=p?p.name:pack.target.name;
  if(!confirm("Integrar contrato de "+pack.lease.tenant+" ao imóvel \""+name+"\"?\nSerão incluídos apenas lançamentos ainda não encontrados; pagamentos não terão baixa automática."))return;
  if(typeof exportCompleteBackup==="function")exportCompleteBackup();
  if(typeof autoSnapshot==="function")autoSnapshot("Antes da importação privada de contrato de locação");
  if(!p){
   p={id:uidLocal(),name:pack.target.name||"Imóvel importado",type:pack.target.type||"Imóvel",city:pack.target.city||"",address:pack.target.address||"",legalStatus:"Não informado",value:0,marketValue:0,monthlyGoal:0,monthlyIncome:0,monthlyCost:0,sourceJson:{},documents:[],finances:[],contracts:[],financeV20:{leases:[],transactions:[]}};
   state.properties.push(p);
  }
  if(!p.financeV20||typeof p.financeV20!=="object")p.financeV20={};
  const f=p.financeV20;if(!Array.isArray(f.leases))f.leases=[];if(!Array.isArray(f.transactions))f.transactions=[];
  const old=f.leases.find(x=>x.id===pack.lease.id);
  if(old){
   for(const [k,v] of Object.entries(pack.lease))if(old[k]===undefined||old[k]===null||old[k]==="")old[k]=v;
  }else f.leases.push({...pack.lease,importedAt:new Date().toISOString()});
  let added=0;
  for(const t of pack.transactions){
   if(f.transactions.some(x=>x.id===t.id||x.type==="income"&&String(x.category).toLowerCase()==="aluguel"&&x.dueDate===t.dueDate&&Math.abs(Number(x.amount)-Number(t.amount))<0.01))continue;
   f.transactions.push({...t,updatedAt:new Date().toISOString()});added++;
  }
  state.selectedId=p.id;
  if(typeof recordAudit==="function")recordAudit("locacao_importada_privadamente",p,{leaseId:pack.lease.id,addedTransactions:added,hasPdf:!!pack.lease.agreementPdf});
  if(typeof save==="function")save();
  document.getElementById("ar-private-modal")?.remove();
  if(typeof selectProperty==="function")selectProperty(p.id);
  const tab=document.querySelector('[data-f20="property"]');if(tab)tab.click();
  alert("Locação integrada ao imóvel \""+p.name+"\". "+added+" lançamento(s) novos pendentes. Caução e PDF registrados localmente.");
 }catch(err){alert("Não foi possível integrar o pacote: "+err.message);}
 finally{button.disabled=false;button.textContent="Integrar ao imóvel";}
}
function openPdf(id){
 const p=currentProperty();const doc=arr(p?.financeV20?.leases).find(l=>l.id===id)?.agreementPdf;
 if(!doc?.base64)return alert("Documento não disponível neste navegador.");
 try{
  const binary=atob(doc.base64),bytes=new Uint8Array(binary.length);
  for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
  const url=URL.createObjectURL(new Blob([bytes],{type:"application/pdf"}));
  const a=document.createElement("a");a.href=url;a.target="_blank";a.rel="noopener";a.download=doc.name||"contrato.pdf";document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),60000);
 }catch(err){alert("Falha ao abrir o PDF: "+err.message);}
}
document.addEventListener("click",e=>{
 const btn=e.target.closest?.("[data-ar-action]");if(!btn)return;
 e.preventDefault();
 if(btn.dataset.arAction==="import")overlay();
 if(btn.dataset.arAction==="cancel")document.getElementById("ar-private-modal")?.remove();
 if(btn.dataset.arAction==="pdf")openPdf(btn.dataset.id);
});
const content=document.getElementById("content"),side=document.querySelector(".side-actions");
if(content)new MutationObserver(inject).observe(content,{childList:true});
if(side)new MutationObserver(inject).observe(side,{childList:true});
inject();
})();
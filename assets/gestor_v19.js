
/* v19 — Dossiê dinâmico, sem esquema fixo de campos.
   Percorre integralmente os dados de cada propriedade; não modifica o armazenamento.
   Cada bloco e cada campo não vazio do JSON-fonte é apresentado na ficha. */
(function(){
"use strict";
const OMIT_INTERNAL = new Set(["sourceJson","richJson","originalJson","texto_original_importado"]);
const STRING_ALIAS = new Set(["name","type","city","legalStatus","address","notes"]);
const E = value => esc(value === null || value === undefined ? "" : String(value));
const OBJ = value => value !== null && typeof value === "object" && !Array.isArray(value);
const ARRAY = value => Array.isArray(value);
const HAS = value => value !== null && value !== undefined && (!(typeof value==="string") || value.trim().length>0);
const SIMPLE = value => !OBJ(value)&&!ARRAY(value);
const nonempty = value => HAS(value)&&(!ARRAY(value)||value.length>0)&&(!OBJ(value)||Object.keys(value).length>0);
const glyph = /\b(iptu|irpf|icd|itcmd|cnd|cadimo|cnpj|cpf|cep|uf|pdf|dae|itr|car|ccir|pje|fii|url|id|m2)\b/gi;
const dic = {"iptu":"IPTU","irpf":"IRPF","icd":"ICD","itcmd":"ITCMD","cnd":"CND","cadimo":"CADIMO","cnpj":"CNPJ","cpf":"CPF","cep":"CEP","uf":"UF","pdf":"PDF","dae":"DAE","itr":"ITR","car":"CAR","ccir":"CCIR","pje":"PJe","fii":"FII","url":"URL","id":"ID","m2":"m²"};
function human(key){
 const name=String(key||"").replace(/([a-zà-ÿ])([A-Z])/g,"$1 $2").replace(/[_-]+/g," ").replace(/\s+/g," ").trim();
 return name.replace(/^./,a=>a.toUpperCase()).replace(glyph,m=>dic[m.toLowerCase()]||m);
}
function formatValue(value,key){
 if(typeof value==="boolean")return value?"Sim":"Não";
 if(typeof value==="number"){
   if(/(?:^|[_\s])(reais|brl)(?:$|[_\s])|^valor_|^custo_|^receita_|^preco_|^montante_/i.test(String(key||"")))
      return value.toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
   return value.toLocaleString("pt-BR",{maximumFractionDigits:6});
 }
 return String(value??"");
}
function valueHTML(value,key){
 if(typeof value==="string" && /^https?:\/\/[^\s<>"]+$/i.test(value)){
   return '<a href="'+E(value)+'" target="_blank" rel="noopener noreferrer">'+E(value)+'</a>';
 }
 return E(formatValue(value,key));
}
function countLeaves(value,depth=0){
 if(depth>24)return 0;
 if(SIMPLE(value))return HAS(value)?1:0;
 if(ARRAY(value))return value.reduce((a,b)=>a+countLeaves(b,depth+1),0);
 if(OBJ(value))return Object.values(value).reduce((a,b)=>a+countLeaves(b,depth+1),0);
 return 0;
}
function compactItems(obj){
 return Object.entries(OBJ(obj)?obj:{}).filter(([,v])=>nonempty(v));
}
function split(obj){
 const plain=[],nested=[];
 for(const [key,val] of compactItems(obj)){if(SIMPLE(val))plain.push([key,val]);else nested.push([key,val]);}
 return {plain,nested};
}
function metaItem(key,val){
 return '<div class="v19-pair"><dt>'+E(human(key))+'</dt><dd>'+valueHTML(val,key)+'</dd></div>';
}
function detailsGrid(obj){
 return '<dl class="v19-fields">'+Object.entries(obj).map(([k,v])=>metaItem(k,v)).join("")+'</dl>';
}
function genericValue(name,val,level=0){
 if(level>24)return '<p class="v19-line">'+E(JSON.stringify(val))+'</p>';
 if(!nonempty(val))return "";
 if(SIMPLE(val))return '<div class="v19-fields">'+metaItem(name,val)+'</div>';
 if(ARRAY(val))return genericArray(name,val,level+1);
 return genericObject(name,val,level+1);
}
function genericArray(name,arr,level=0){
 const values=arr.filter(nonempty);
 if(!values.length)return "";
 if(values.every(SIMPLE)){
   return '<div class="v19-subset"><div class="v19-sublabel">'+E(human(name))+
     ' <span>('+values.length+')</span></div><ul class="v19-plainlist">'+
     values.map(value=>'<li>'+valueHTML(value,name)+'</li>').join("")+'</ul></div>';
 }
 // Não altera nem elimina qualquer atributo dos itens. O cabeçalho é apenas
 // um recurso de leitura; o registro integral fica logo abaixo dele.
 return '<div class="v19-subset"><div class="v19-sublabel">'+E(human(name))+
    ' <span>('+values.length+')</span></div><div class="v19-records">'+
    values.map((value,i)=>{
      if(SIMPLE(value))return '<div class="v19-record"><h4>'+E(i+1)+'</h4>'+valueHTML(value,name)+'</div>';
      if(ARRAY(value))return '<div class="v19-record"><h4>Registro '+(i+1)+'</h4>'+genericArray("Itens",value,level+1)+'</div>';
      const entries=compactItems(value);
      let headline=entries.find(([,v])=>typeof v==="string"&&v.length>=3&&v.length<=105) ||
                  entries.find(([,v])=>SIMPLE(v)&&HAS(v));
      const title=headline?String(headline[1]):"Registro "+(i+1);
      return '<article class="v19-record"><h4><span class="v19-index">'+(i+1)+'.</span> '+E(title)+'</h4>'+
       genericInner(value,level+1)+'</article>';
    }).join("")+'</div></div>';
}
function genericObject(name,obj,level=0){
 const entries=compactItems(obj);if(!entries.length)return "";
 const allNames=entries.map(([k])=>k);
 const isIndex=entries.length>=2&&entries.filter(([key,value])=>OBJ(value)&&/^(?:F\d+|\d+|DOC\d+|REF\d+|EV\d+)$/i.test(key)).length===entries.length;
 if(isIndex){
   return '<div class="v19-subset"><div class="v19-sublabel">'+E(human(name))+
      ' <span>('+entries.length+')</span></div><div class="v19-records">'+
      entries.map(([key,entry])=>'<article class="v19-record"><h4>'+E(key)+'</h4>'+genericInner(entry,level+1)+'</article>').join("")+
      '</div></div>';
 }
 return '<div class="v19-subset"><div class="v19-sublabel">'+E(human(name))+'</div>'+genericInner(obj,level+1)+'</div>';
}
function genericInner(obj,level=0){
 const {plain,nested}=split(obj);
 return (plain.length?'<dl class="v19-fields">'+plain.map(([key,value])=>metaItem(key,value)).join("")+'</dl>':"")+
   nested.map(([key,val])=>genericValue(key,val,level+1)).join("");
}
function sourceBlocks(p){
 const src=OBJ(p.sourceJson)?p.sourceJson:{};
 let groups=[];
 const scalarTop=[],nestedTop=[];
 for(const [key,value] of compactItems(src)){
   if(SIMPLE(value))scalarTop.push([key,value]);else nestedTop.push([key,value]);
 }
 // Cada chave do JSON forma sua própria seção, e não uma categoria imposta pelo aplicativo.
 if(scalarTop.length){
    groups.push('<section class="v19-chapter" id="v19-intro"><h2>Informações declaradas</h2><dl class="v19-fields">'+
     scalarTop.map(([key,value])=>metaItem(key,value)).join("")+'</dl></section>');
 }
 nestedTop.forEach(([key,value],i)=>{
   groups.push('<section class="v19-chapter" id="v19-source-'+i+'">'+
    '<h2>'+E(human(key))+'</h2>'+
    // A seção já possui título. Não repetir o mesmo título no nível abaixo.
    (ARRAY(value)?genericArrayItems(value,key,0):genericInner(value,0))+
    '</section>');
 });
 return groups.join("");
}
function genericArrayItems(arr,name,level=0){
 if(!Array.isArray(arr)||!arr.some(nonempty))return "";
 const html=genericArray(name,arr,level);
 // Não repetir o nome: o cabeçalho já é o título da seção.
 return html.replace(/^<div class="v19-subset"><div class="v19-sublabel">[\s\S]*?<\/div>/,
   '<div class="v19-subset">');
}
function findEquivalentInSource(data,fingerprints=new Set(),depth=0){
 if(depth>15)return fingerprints;
 if(ARRAY(data)){data.forEach(x=>{if(nonempty(x))fingerprints.add(JSON.stringify(x));findEquivalentInSource(x,fingerprints,depth+1)});}
 else if(OBJ(data)){for(const val of Object.values(data)){if(nonempty(val))fingerprints.add(JSON.stringify(val));findEquivalentInSource(val,fingerprints,depth+1);}}
 return fingerprints;
}
function operationalBlocks(p){
 const entries=Object.entries(p).filter(([k,v])=>!OMIT_INTERNAL.has(k)&&k!=="sourceJson"&&nonempty(v));
 const primitive=entries.filter(([,v])=>SIMPLE(v) && (typeof v!=="number"||v!==0) &&
    !["name","type","city","legalStatus","address","notes"].includes("") );
 // Retira repetição literal do título, do endereço e do resumo que já estão na faixa principal.
 const displayed=new Set([p.name,p.address,p.notes]);
 const simple=primitive.filter(([key,value])=>{
   if(["id","name","address","notes"].includes(key))return key==="id";
   return !displayed.has(value);
 });
 const sourcePrints=findEquivalentInSource(OBJ(p.sourceJson)?p.sourceJson:{});
 const rest=entries.filter(([,v])=>!SIMPLE(v)).filter(([key,value])=>{
   if(["snapshots","auditLog"].includes(key))return false;
   if(ARRAY(value))return value.some(item=>nonempty(item)&&!sourcePrints.has(JSON.stringify(item)));
   return !sourcePrints.has(JSON.stringify(value));
 });
 let html="";
 if(simple.length)html+='<section class="v19-chapter"><h2>Dados administrativos do cadastro</h2><dl class="v19-fields">'+
       simple.map(([k,v])=>metaItem(k,v)).join("")+'</dl></section>';
 for(const [key,val] of rest)html+='<section class="v19-chapter"><h2>'+E(human(key))+'</h2>'+
      (ARRAY(val)?genericArrayItems(val,key,0):genericInner(val,0))+'</section>';
 return html;
}
function presentIdentity(p){
 const identity=[p.type,p.city,p.legalStatus].filter(HAS).map(E).join(" · ");
 const description=p.sourceJson?.resumo_executivo||p.notes;
 const main='<header class="v19-hero"><div class="v19-eyebrow">Dossiê patrimonial integral</div>'+
   '<h1>'+E(p.name||"Imóvel sem nome")+'</h1>'+
   (identity?'<div class="v19-identity">'+identity+'</div>':"")+
   (p.address?'<div class="v19-address">'+E(p.address)+'</div>':"")+
   (description?'<p class="v19-resume">'+E(description)+'</p>':"")+
   '<nav class="v19-actions"><button onclick="openEditor()">Editar cadastro</button>'+
   '<button onclick="openPropertyUpdate()">Incorporar informações</button>'+
   '<button onclick="exportActiveProperty()">Exportar imóvel</button>'+
   '<button onclick="openBackupCenter()">Backup</button></nav></header>';
 return main;
}
function selfCount(p){
 const source=OBJ(p.sourceJson)?p.sourceJson:{};
 const count=countLeaves(source);
 const groups=compactItems(source).length;
 const incomplete=[]; // campos vazios permanecem no JSON-fonte, nunca excluídos
 return '<p class="v19-indexline">'+groups+' grupos do documento · '+count+
  ' informações preenchidas no JSON original · Exibição contínua, sem abas e sem filtros de campos.</p>';
}
function viewProperty(p){
 const src=OBJ(p.sourceJson)?p.sourceJson:{};
 const filled=compactItems(src).length;
 const base=presentIdentity(p)+selfCount(p);
 return '<div class="v19-document">'+base+
   (filled?sourceBlocks(p):'<section class="v19-chapter"><h2>Cadastro do imóvel</h2><p>Sem JSON-fonte anexado. Os dados administrativos aparecem abaixo.</p></section>')+
   operationalBlocks(p)+
   '<footer class="v19-tail">Os campos não preenchidos continuam preservados no JSON original e nos backups. Nenhuma informação foi eliminada do cadastro.</footer>'+
   '</div>';
}
function viewPortfolio(){
 const data=Array.isArray(state.properties)?state.properties:[];
 const rows=data.map(p=>{
    const src=OBJ(p.sourceJson)?p.sourceJson:{};
    const filled=countLeaves(src);
    return '<tr><td><strong>'+E(p.name||"Imóvel")+'</strong><small>'+E(p.address||"")+'</small></td>'+
      '<td>'+E(p.type||"—")+'</td><td>'+E(p.city||"—")+'</td>'+
      '<td>'+E(p.legalStatus||"—")+'</td><td>'+filled+'</td>'+
      '<td><button class="v19-link" onclick="selectProperty(\''+E(p.id)+'\')">Ver tudo ↗</button></td></tr>';
 }).join("");
 return '<div class="v19-document"><header class="v19-hero">'+
   '<div class="v19-eyebrow">Patrimônio imobiliário</div><h1>'+data.length+' imóveis cadastrados</h1>'+
   '<p class="v19-resume">Abra qualquer imóvel para consultar o conteúdo integral do seu dossiê, organizado diretamente a partir dos dados existentes.</p>'+
   '<nav class="v19-actions"><button onclick="openImport()">Importar imóvel ou informações</button>'+
   '<button onclick="openBackupCenter()">Backup integral</button></nav></header>'+
   (data.length?'<div class="v19-scroll"><table class="v19-table"><thead><tr><th>Imóvel</th><th>Tipo</th><th>Município</th><th>Situação</th><th>Dados</th><th></th></tr></thead><tbody>'+
     rows+'</tbody></table></div>':'<p>Seu navegador ainda não possui imóveis cadastrados.</p>')+'</div>';
}
renderProperty=function(p){
 if(!p){showPortfolio();return;}
 document.getElementById("title").textContent=p.name||"Dossiê patrimonial";
 document.getElementById("subtitle").textContent="Gestor Patrimonial v19";
 document.getElementById("content").innerHTML=viewProperty(p);
};
renderPortfolio=function(){
 document.getElementById("title").textContent="Controle de Imóveis";
 document.getElementById("subtitle").textContent="Gestor Patrimonial v19";
 document.getElementById("content").innerHTML=viewPortfolio();
};
renderSidebar=function(){
 const filter=(document.getElementById("search")?.value||"").toLowerCase().trim();
 const props=Array.isArray(state.properties)?state.properties:[];
 const show=props.filter(p=>[p.name,p.address,p.city,p.registrationNumber,p.municipalRegistration,
  p.municipalSequential,JSON.stringify(p.sourceJson?.endereco||{})].join(" ").toLowerCase().includes(filter));
 document.getElementById("propertyList").innerHTML=show.map(p=>'<div class="v19-property '+(p.id===state.selectedId?"selected":"")+
  '" role="button" tabindex="0" onclick="selectProperty(\''+E(p.id)+'\')" onkeydown="if(event.key===\'Enter\')selectProperty(\''+E(p.id)+'\')">'+
  '<strong>'+E(p.name)+'</strong><small>'+E(p.city||p.type||"")+'</small></div>').join("")||
   '<p class="v19-sidebar-empty">Nenhum imóvel corresponde à pesquisa.</p>';
};
try{
 const brand=document.querySelector(".brand h1");if(brand)brand.textContent="Controle de Imóveis v19";
 const tagline=document.querySelector(".brand p");if(tagline)tagline.textContent="Dossiês completos, sem esconder o conteúdo dos arquivos.";
 render();
}catch(e){console.error("Interface v19: não foi possível inicializar; dados preservados.",e);}
})();
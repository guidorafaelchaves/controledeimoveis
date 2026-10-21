
/* Gestor Patrimonial v18 — apresentação contínua e editorial.
   Não modifica chaves de armazenamento, formato dos imóveis, evidências ou backups. */
(function(){
"use strict";
const E=v=>esc(v===undefined||v===null?"":v);
const A=v=>Array.isArray(v)?v:[];
const O=v=>v&&typeof v==="object"&&!Array.isArray(v)?v:{};
const has=v=>v!==undefined&&v!==null&&String(v).trim()!=="";
const txt=(v,fallback="Não informado")=>has(v)?E(v):E(fallback);
const curr=v=>Number.isFinite(Number(v))&&Number(v)>0?Number(v).toLocaleString("pt-BR",{style:"currency",currency:"BRL"}):"Não apurado";
const field=(label,value,fallback)=>'<div class="v18-datum"><span>'+E(label)+'</span><strong>'+txt(value,fallback||"Não informado")+'</strong></div>';
const short=(v,n=90)=>{const s=String(v||"");return s.length>n?s.slice(0,n-1)+"…":s};
const number=(v)=>has(v)&&!isNaN(Number(v))?Number(v).toLocaleString("pt-BR",{maximumFractionDigits:2}):null;
function src(p){return O(p.sourceJson)}
function known(p){
 const raw=src(p).unidades;
 if(Array.isArray(raw))return raw;
 return A(raw?.lista_confirmada)
}
function excerpt(p){
 const s=src(p),c=O(s.caracteristicas_fisicas),d=O(s.dados_cadastrais),reg=O(s.dados_registrais);
 return {s,c,d,reg,area:c.area_terreno_m2||d.area_terreno_m2||s.area?.area_principal_adotada_m2,
         edified:c.area_construida_m2||s.edificacao?.area_registral_informada_m2,
         lot:d.lote||d.lote_numero,quad:d.quadra||d.quadra_numero,
         seq:p.municipalSequential||d.sequencial_municipal||d.sequencial,
         fiscal:p.municipalRegistration||d.inscricao_municipal||d.inscricao_principal};
}
function facts(p){
 const k=excerpt(p),u=known(p);const val=Number(p.marketValue||0);
 return '<div class="v18-facts">'+
   fact("Área do terreno",number(k.area)?number(k.area)+" m²":"A apurar",k.area?"Segundo cadastro existente":"")+
   fact("Unidades",u.length?String(u.length)+" cadastradas":"A identificar","Edificação multifamiliar")+
   fact("Matrícula",p.registrationNumber||"Pendente","Titularidade requer certidão")+
   fact("Sequencial",k.seq||"Não identificado","Consultar o cadastro municipal")+
   fact("Mercado",val>0?curr(val):"Não avaliado","Custo histórico ≠ preço atual")+
   '</div>';
}
function fact(k,v,foot){return '<div class="v18-fact"><small>'+E(k)+'</small><b>'+E(v)+'</b>'+(foot?'<em>'+E(foot)+'</em>':"")+'</div>';}
function block(id,title,detail,inner,extraClass=""){
 return '<section class="v18-section v18-all '+extraClass+'" id="v18-'+E(id)+'">'+
   '<div class="v18-section-title"><h2>'+E(title)+'</h2>'+(detail?'<small>'+E(detail)+'</small>':"")+'</div>'+
   inner+'</section>';
}
function fromV17(p,name){
 // A v17 conserva a renderização detalhada dos conjuntos de dados.
 const previous=section;
 try{section=name;return renderSection(p);}catch(error){
   console.error("Não foi possível desenhar a seção "+name,error);
   return '<p class="v18-data-note">Esta visualização não pôde ser apresentada. Os dados integrais continuam preservados no arquivo do imóvel.</p>';
 }finally{section=previous;}
}
function intro(p){
 const k=excerpt(p),s=k.s;
 const title=E(p.name||"Imóvel sem nome");
 const address=E(p.address||s.endereco?.endereco_formatado||p.city||"Endereço não informado");
 const description=s.resumo_executivo||p.notes||
   "Cadastro patrimonial com informações jurídicas, físicas, tributárias, financeiras e documentais.";
 const status=p.legalStatus?" · "+p.legalStatus:"";
 return '<div class="v18-heading"><div class="v18-eyebrow">Ficha patrimonial · '+E(p.type||"Imóvel")+E(status)+'</div>'+
   '<h1>'+title+'</h1><div class="v18-address">'+address+'</div>'+
   '<div class="v18-actions">'+
   '<button class="v18-text-action" onclick="openEditor()">Editar cadastro</button>'+
   '<button class="v18-text-action" onclick="openPropertyUpdate()">Acrescentar documento/JSON</button>'+
   '<button class="v18-text-action" onclick="exportActiveProperty()">Exportar esta ficha</button>'+
   '</div></div>'+facts(p)+'<p class="v18-summary">'+E(description)+'</p>';
}
function cadastral(p){
 const k=excerpt(p),s=k.s,r=k.reg,c=k.c,d=k.d;
 let rows=[
  field("Endereço",p.address||s.endereco?.endereco_formatado),
  field("Município",p.city||d.municipio),
  field("Loteamento",d.loteamento),
  field("Quadra / lote",[k.quad,k.lot].filter(has).join(" / ")),
  field("Área de terreno",number(k.area)?number(k.area)+" m²":"Não apurada"),
  field("Área edificada",number(k.edified)?number(k.edified)+" m²":"Não apurada"),
  field("Matrícula / transcrição",p.registrationNumber||r.matricula_principal||r.matricula),
  field("Cartório",p.registryOffice||r.cartorio),
  field("Inscrição imobiliária",k.fiscal),
  field("Sequencial municipal",k.seq),
  field("Titularidade registral",r.proprietario_registral_informado||r.proprietarios_registrais||r.proprietarios_registrais_atuais_informados),
  field("Contribuinte cadastrado",d.contribuinte_cadastrado),
  field("Situação jurídica",p.legalStatus||s.status_juridico),
  field("Uso",p.economicUse||c.uso_informado),
  field("Responsável operacional",p.manager||s.responsavel),
  field("Confrontações",s.confrontacoes?.resumo||s.descricao_fisica?.confrontacoes)
 ];
 return '<div class="v18-introgrid">'+rows.join("")+'</div>'+
   (r.situacao_registral?'<p class="v18-data-note"><b>Situação registral:</b> '+E(r.situacao_registral)+'</p>':"");
}
function units(p){
 const raw=src(p).unidades,all=known(p);
 let rows=all.map((item,i)=>{
   const x=typeof item==="string"?{identificacao:item}:O(item);
   const key=x.identificacao||x.numero||x.unidade||"Sem identificador";
   return '<tr><td><strong>'+E(key)+'</strong><div class="v18-data-note">'+txt(x.tipo||x.ocupacao,"")+'</div></td>'+
     '<td>'+txt(x.andar||x.pavimento,"—")+'</td>'+
     '<td>'+txt(x.area_m2?(number(x.area_m2)+" m²"):"","—")+'</td>'+
     '<td>'+txt(x.inscricao_municipal,"—")+'</td>'+
     '<td>'+txt(x.sequencial_municipal||x.sequencial,"—")+'</td>'+
     '<td>'+txt(x.proprietario||x.responsavel,"Não identificado")+'</td>'+
     '<td>'+txt(x.situacao_iptu||x.status_fiscal,"A consultar")+'</td>'+
     '<td><button class="v18-text-action" onclick="v17OpenUnit('+i+')">Editar</button></td></tr>';
 }).join("");
 const count=all.length;
 return '<div class="v18-inline-action"><span class="v18-data-note">'+(count?count+" unidade(s) cadastrada(s) individualmente":"Quantidade de unidades ainda não conferida no cadastro")+'</span>'+
   '<button class="v18-text-action" onclick="v17OpenUnit(-1)">+ Adicionar unidade</button></div>'+
   (count?'<div style="overflow:auto;margin-top:10px"><table class="v17-table"><thead><tr><th>Unidade</th><th>Piso</th><th>Área</th><th>Inscrição</th><th>Sequencial</th><th>Titular</th><th>IPTU</th><th></th></tr></thead><tbody>'+rows+'</tbody></table></div>':
     '<p class="v18-data-note">Registre somente unidades efetivamente identificadas. A lista é independente do cadastro-mãe do terreno e da edificação.</p>')+
   (O(raw).caracterizacao?'<p class="v18-data-note">'+E(O(raw).caracterizacao)+'</p>':"");
}
function genericLegal(p){
 const s=src(p),r=O(s.dados_registrais),inv=O(s.inventario),it=O(s.itcmd),us=O(s.usucapiao),clas=O(s.classificacao_juridica);
 let html='<div class="v18-introgrid">'+
   field("Matrícula",p.registrationNumber||r.matricula_principal||r.matricula)+
   field("Situação registral",r.situacao_registral)+
   field("Titularidade",r.proprietario_registral_informado||r.proprietarios_registrais)+
   field("Título de aquisição",r.ato_aquisitivo_atual||r.titulo_possessorio_principal)+
   field("Origem dominial",r.origem_do_dominio||r.origem_do_dominio_atual)+
   field("Ônus e gravames",r.onus_reais||r.gravames)+
   field("Inventário",inv.situacao_no_inventario||inv.situacao_no_plano_de_partilha)+
   field("Usucapião",us.numero_processo||r.processo_usucapiao)+
   '</div>';
 if(clas.natureza_do_bem_no_inventario||it.situacao_geral_do_inventario)html+=
   '<p class="v18-data-note">'+
   (clas.natureza_do_bem_no_inventario?"<b>Classificação:</b> "+E(clas.natureza_do_bem_no_inventario)+" · ":"")+
   (it.situacao_geral_do_inventario?"<b>ITCMD/ICD:</b> "+E(it.situacao_geral_do_inventario):"")+"</p>";
 if(!has(p.registrationNumber))html+='<p class="v18-inline-note">A ausência da matrícula impede confirmar a titularidade registral ou a cadeia de transmissões.</p>';
 return html;
}
function historyExtras(p){
 const s=src(p);
 const extra=[...A(s.linha_do_tempo),...A(s.averbacoes_e_registros),...A(s.registros_e_averbacoes)];
 if(!extra.length)return "";
 const orig=A(p.history).map(x=>JSON.stringify(x)),seen=new Set(orig);
 return extra.filter(x=>!seen.has(JSON.stringify(x))).map(x=>{
   const y=O(x);return '<p class="v18-data-note"><b>'+E(y.data||y.ordem||"Histórico")+
     " — "+E(y.evento||y.tipo||y.ato||"Registro")+":</b> "+
     E(y.descricao||y.efeito||y.titulo||JSON.stringify(x))+"</p>";
 }).join("");
}
function rawData(p){
 const raw={cadastro_integral:p};
 const safeJSON=E(JSON.stringify(raw,null,2));
 return '<details class="v18-raw"><summary>Exibir todos os campos originais, evidências, auditoria e JSON completo</summary>'+
   '<div class="v17-fulljson" style="background:#eef2f4;padding:10px"><pre style="white-space:pre-wrap;overflow-wrap:anywhere;font-size:11px;line-height:1.55">'+safeJSON+'</pre></div></details>';
}
function propertyView(p){
 const source=src(p),problems=O(source.dados_tributarios?.eventual_doacao_de_2022);
 const simoa=String(p.name+" "+p.address).toLowerCase().includes("simoa gomes");
 const legal=simoa||Object.keys(problems).length?fromV17(p,"juridico"):genericLegal(p);
 return '<div class="v18-property">'+intro(p)+
 block("cadastro","Cadastro e descrição","",cadastral(p))+
 block("unidades","Unidades do imóvel","Visão completa, inclusive inscrição e IPTU por unidade",units(p))+
 block("fiscal","Tributos e situação fiscal","Cobranças sem confirmação permanecem identificadas como não verificadas",fromV17(p,"fiscal"))+
 block("financeiro","Valores, receitas e despesas","Dados históricos separados de avaliação de mercado",fromV17(p,"financeiro"))+
 block("juridico","Titularidade e histórico jurídico","",legal)+
 block("pendencias","Riscos, pendências e providências","",fromV17(p,"riscos"))+
 block("documentos","Documentos e fontes","Evidências e referências reunidas na própria página",fromV17(p,"documentos"))+
 block("historico","Histórico do imóvel","",fromV17(p,"historico")+historyExtras(p))+
 block("auditoria","Auditoria e divergências","Decisões registradas e conflitos de importação",fromV17(p,"auditoria"))+
 block("integral","Arquivo integral","Todos os campos preservados, mesmo os não utilizados na interface",rawData(p))+
 '</div>';
}
function portfolioView(){
 const ps=A(state.properties),withValue=ps.filter(p=>Number(p.marketValue)>0);
 const sum=withValue.reduce((acc,p)=>acc+Number(p.marketValue),0);
 const pending=ps.filter(p=>!p.registrationNumber||!p.municipalRegistration).length;
 const head='<div class="v18-portfolio-head"><div class="v18-eyebrow">Carteira patrimonial</div>'+
   '<h1>'+ps.length+' imóveis cadastrados</h1>'+
   '<p class="v18-data-note">'+withValue.length+' com avaliação de mercado · '+pending+
   ' com matrícula ou inscrição municipal pendente · Mercado informado: '+(withValue.length?curr(sum):"Não apurado")+'</p></div>';
 const rows=ps.map(p=>'<tr><td><strong>'+E(p.name||"Imóvel")+'</strong>'+
   '<div class="v18-data-note">'+E(p.address||p.city||"")+'</div></td>'+
   '<td>'+txt(p.type||p.city)+'</td><td>'+txt(p.registrationNumber,"Pendente")+'</td>'+
   '<td>'+txt(p.municipalRegistration,"Pendente")+'</td>'+
   '<td>'+curr(p.marketValue)+'</td>'+
   '<td><button class="v18-text-action" onclick="selectProperty(\''+E(p.id)+'\')">Abrir</button></td></tr>').join("");
 return head+'<div class="v18-section"><div class="v18-inline-action"><strong style="font-size:14px">Lista de imóveis</strong>'+
   '<button class="v18-text-action" onclick="openImport()">+ Importar imóvel</button></div>'+
   (ps.length?'<div style="overflow:auto"><table class="v18-portfolio-table"><thead><tr><th>Imóvel</th><th>Tipo</th><th>Matrícula</th><th>Inscrição municipal</th><th>Valor de mercado</th><th></th></tr></thead><tbody>'+
   rows+'</tbody></table></div>':'<p class="v18-data-note">Sem imóveis cadastrados neste navegador. Importe um arquivo JSON para começar.</p>')+'</div>';
}
renderProperty=function(p){
 if(!p){showPortfolio();return}
 document.getElementById("title").textContent=p.name||"Ficha patrimonial";
 document.getElementById("subtitle").textContent="Gestor Patrimonial v18 · ficha contínua";
 document.getElementById("content").innerHTML=propertyView(p);
};
renderPortfolio=function(){
 document.getElementById("title").textContent="Controle de Imóveis";
 document.getElementById("subtitle").textContent="Gestor Patrimonial v18 · visão contínua";
 document.getElementById("content").innerHTML=portfolioView();
};
try{
 const label=document.querySelector(".brand h1");
 if(label)label.textContent="Controle de Imóveis";
 const intro=document.querySelector(".brand p");
 if(intro)intro.textContent="Documentos, tributos, titularidade e histórico em uma só ficha.";
 const bar=document.querySelector(".toolbar");
 if(bar){for(const btn of bar.querySelectorAll("button, label")){
  const t=(btn.textContent||"").trim();
  const short={"Agente IPTU/CND":"IPTU/CND","Editar dados":"Editar","Atualizar por JSON":"+ JSON","Central de backup":"Backup","Importar arquivo":"Importar arquivo"};
  if(short[t] && btn.tagName!=="LABEL")btn.textContent=short[t];
 }}
 render();
}catch(err){console.error("Falha na camada fluida v18; dados v17 preservados.",err);}
})();

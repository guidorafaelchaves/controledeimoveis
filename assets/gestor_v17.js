
/* Gestor Patrimonial v17: camada de interface e importação conservadora.
   Não altera as chaves do IndexedDB nem elimina propriedades existentes. */
(function () {
  "use strict";
  const version = "17.0";
  const escape = v => esc(v === undefined || v === null ? "" : v);
  const list = v => Array.isArray(v) ? v : [];
  const present = v => v !== undefined && v !== null && String(v).trim() !== "";
  const text = (v,fallback) => present(v) ? escape(v) : (fallback || "Não informado");
  const brl = v => typeof v === "number" && Number.isFinite(v) ? v.toLocaleString("pt-BR",{style:"currency",currency:"BRL"}) : "Não apurado";
  const clean = v => String(v || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]/g,"");
  const obj = v => v && typeof v === "object" && !Array.isArray(v) ? v : {};
  function src(p) { return obj(p.sourceJson); }
  function q(p) { const s=src(p);return {s:s,municipal:obj(s.dados_cadastrais),reg:obj(s.dados_registrais),tax:obj(s.dados_tributarios),hist:obj(s.avaliacoes)}; }
  function numberField(v){return typeof v === "number" && Number.isFinite(v) && v > 0 ? brl(v) : "Não apurado";}
  function item(label, value, fallback){
    return '<div class="v17-item"><small>'+escape(label)+'</small><strong>'+text(value,fallback || "Não informado")+'</strong></div>';
  }
  function pill(str,typ){return '<span class="v17-pill'+(typ?' '+typ:'')+'">'+escape(str)+'</span>';}
  function stat(label,value,desc){return '<div class="v17-stat"><small>'+escape(label)+'</small><strong>'+escape(value)+'</strong>'+(desc?'<em>'+escape(desc)+'</em>':'')+'</div>';}
  function safeLink(url, label){
    if(!/^https:\/\/|^http:\/\//i.test(url||""))return "";
    return '<a class="v17-link" href="'+escape(url)+'" target="_blank" rel="noopener noreferrer">'+escape(label||"Abrir fonte")+'</a>';
  }
  function line(title,description,tag){
    return '<div class="v17-entry"><h4>'+escape(title||"Registro")+'</h4><p>'+escape(description||"Sem descrição")+'</p>'+(tag?'<div class="v17-inline">'+escape(tag)+'</div>':'')+'</div>';
  }
  function dateish(v){return String(v||"").slice(0,10);}
  function arrayOrObject(o) {return Array.isArray(o)?o:Object.values(obj(o));}
  function knownUnits(p){
    const u=src(p).unidades;
    return Array.isArray(u)?u:Array.isArray(u?.lista_confirmada)?u.lista_confirmada:[];
  }
  function rightsSummary(p){
    const reg=q(p).reg;
    if(!present(p.registrationNumber))return "Matrícula ainda não identificada; a titularidade registral e a transmissão precisam ser verificadas.";
    if(!present(reg.proprietario_registral_informado))return "Matrícula cadastrada, mas o proprietário registral ainda não foi confirmado por certidão atualizada.";
    return "Há dados registrais cadastrados; confirme a vigência e a origem documental.";
  }
  function metricsProperty(p){
    const data=q(p), s=data.s, units=knownUnits(p);
    const old=Number(data.hist.total_terreno_obra_irpf_2021_reais || 0);
    const value = (Number(p.marketValue)>0) ? numberField(Number(p.marketValue)) : "Não avaliado";
    const a = Number(s.caracteristicas_fisicas?.area_terreno_m2||data.municipal.area_terreno_m2||0);
    return '<div class="v17-statgrid">'+
      stat("Área do terreno",a ? a.toLocaleString("pt-BR",{maximumFractionDigits:2})+" m²" : "Não apurada","Origem documental no cadastro")+
      stat("Unidades individualizadas",String(units.length),units.length ? "Unidades cadastradas manualmente" : "Quantidade total ainda não confirmada")+
      stat("Avaliação atual",value,"Nunca confundir com custo histórico do IRPF")+
      stat("Sequencial municipal",p.municipalSequential || data.municipal.sequencial_municipal || "Pendente","Pode haver um por unidade")+
      '</div>';
  }
  function sectionOverview(p){
    const d=q(p), s=d.s, h=d.hist, type=(s.caracteristicas_fisicas||{}), c=s.dados_tributarios?.cobranca_municipal_em_email;
    const historical = Number(h.total_terreno_obra_irpf_2021_reais||0);
    const status = !present(p.registrationNumber) ? pill("Registro pendente","warn") : pill(p.legalStatus || "Sob análise");
    return '<div class="v17-two"><div>'+
      '<div class="v17-surface"><div class="v17-header"><div><div class="v17-kicker">Resumo documental</div><h2>'+escape(p.name)+'</h2><p>'+escape(p.address||p.city)+'</p></div>'+status+'</div><p class="v17-lead">'+escape(s.resumo_executivo||p.notes||"Cadastro em levantamento; documentação pendente.")+'</p></div>'+
      '<div class="v17-surface"><h3>Identificação física e cadastral</h3><div class="v17-info-grid">'+
      item("Loteamento",d.municipal.loteamento)+item("Quadra",d.municipal.quadra)+item("Lote",d.municipal.lote)+
      item("Matrícula",p.registrationNumber)+item("Inscrição municipal",p.municipalRegistration||d.municipal.inscricao_municipal)+item("Cadastro de unidades",knownUnits(p).length ? knownUnits(p).length+" identificadas" : "A apurar")+
      '</div></div>'+
      '<div class="v17-surface"><h3>Histórico financeiro: não é avaliação atual</h3>'+
      '<div class="v17-notice">Valores da declaração de IRPF representam custo histórico informado e não preço de mercado, valor venal ou dívida atual.</div>'+
      '<div class="v17-info-grid">'+item("Terreno em 31/12/2021",h.valor_terreno_irpf_2021_reais!=null?brl(Number(h.valor_terreno_irpf_2021_reais)):"")+
      item("Construção em 31/12/2021",h.valor_obra_irpf_2021_reais!=null?brl(Number(h.valor_obra_irpf_2021_reais)):"")+
      item("Total histórico",historical?brl(historical):"Não identificado")+'</div></div></div>'+
      '<aside><div class="v17-surface"><h3>Situação jurídica</h3><p class="v17-lead">'+escape(rightsSummary(p))+'</p></div>'+
      '<div class="v17-surface"><h3>Pendências prioritárias</h3><div class="v17-stack">'+
      list(p.regularization).slice(0,5).map(x=>line(x.categoria||x.tipo||"Pendência",x.descricao||x.acao||x.notes,x.prioridade||x.status)).join("")+
      (!list(p.regularization).length?'<p class="v17-muted">Ainda sem providências cadastradas.</p>':'')+
      '</div></div>'+
      '<div class="v17-surface"><h3>IPTU / débito</h3>'+(c?'<p class="v17-lead">'+brl(Number(c.valor_alegado_reais))+' consta em comunicação recebida, mas NÃO foi associado formalmente a este imóvel.</p>':'<p class="v17-muted">Ainda não há extrato municipal verificado.</p>')+
      '<div class="v17-actions"><button class="v17-btn light" onclick="setSection(\'fiscal\')">Examinar situação fiscal</button></div></div></aside></div>';
  }
  function sectionUnits(p){
    const u=knownUnits(p);
    let rows=u.map((x,i)=>{
      const unit= typeof x==="string"?{identificacao:x}:obj(x);
      return '<tr><td><strong>'+text(unit.identificacao||unit.numero||unit.unidade)+'</strong><div class="v17-muted">'+text(unit.tipo,"")+'</div></td>'+
      '<td>'+text(unit.andar||unit.pavimento,"—")+'</td><td>'+text(unit.inscricao_municipal,"Pendente")+'</td><td>'+text(unit.sequencial_municipal||unit.sequencial,"Pendente")+'</td>'+
      '<td>'+text(unit.proprietario||unit.responsavel,"A verificar")+'</td><td>'+text(unit.situacao_iptu||unit.status_fiscal,"Não verificado")+'</td>'+
      '<td><button class="v17-btn light" onclick="v17OpenUnit('+i+')">Editar</button></td></tr>';
    }).join("");
    return '<div class="v17-surface"><div class="v17-header"><div><h2>Unidades do edifício</h2><p>Cadastre individualmente apartamentos, salas e lojas apenas quando identificados por documentos ou por você.</p></div>'+
    '<button class="v17-btn" onclick="v17OpenUnit(-1)">+ Adicionar unidade</button></div>'+
    '<div class="v17-notice">Nenhuma unidade será criada automaticamente a partir de referências públicas a endereços. O número 701/701-A não equivale a sequencial do IPTU.</div>'+
    (u.length?'<div class="v17-table-wrap"><table class="v17-table"><thead><tr><th>Unidade</th><th>Andar</th><th>Inscrição</th><th>Sequencial</th><th>Proprietário</th><th>IPTU</th><th></th></tr></thead><tbody>'+rows+'</tbody></table></div>':'<div class="empty">Nenhuma unidade individualizada. Você pode começar quando tiver o espelho cadastral municipal ou identificação de cada unidade.</div>')+
    '</div><div class="v17-surface"><h3>Fontes e ressalvas</h3>'+line("Edifício com múltiplas unidades","Informação fornecida pelo usuário; número total, divisão formal e titularidades individuais aguardam conferência.","Origem: declaração do usuário")+'</div>';
  }
  function sectionFiscal(p){
    const d=q(p),t=d.tax,c=obj(t.cobranca_municipal_em_email);
    const has=Object.keys(c).length>0;
    return '<div class="v17-surface"><h3>IPTU e cadastro municipal</h3><div class="v17-info-grid">'+
      item("Município",p.city)+item("Inscrição (prédio)",p.municipalRegistration||d.municipal.inscricao_municipal)+
      item("Sequencial (prédio)",p.municipalSequential||d.municipal.sequencial_municipal)+
      item("IPTU lançado",typeof t.iptu_lancado==="number"?brl(t.iptu_lancado):"Não consultado")+
      item("IPTU vencido",typeof t.iptu_em_atraso_comprovado==="number"?brl(t.iptu_em_atraso_comprovado):"Não confirmado")+
      item("CND imobiliária",t.cnd_imobiliaria||"Não emitida")+
      '</div></div>'+
      '<div class="v17-surface"><h3>Cobranças e alertas</h3>'+
      (has?'<div class="v17-notice"><strong>Valor mencionado em e-mail: '+brl(Number(c.valor_alegado_reais))+'</strong>. Correspondência recebida em '+escape(c.data||"data não informada")+'. A origem e o vínculo desse valor com o imóvel/unidades NÃO foram confirmados. Não emitir pagamento com base somente neste registro.</div>'+
      line("Notificação recebida","Necessário confirmar inscrição, períodos, origem, autenticidade e situação atual da cobrança.",c.vinculo_com_este_imovel||"Não comprovado")+
      safeLink(c.mensagem,"Abrir mensagem original"):'<div class="empty">Não há lançamento municipal confirmado no cadastro.</div>')+
      '</div>'+
      '<div class="v17-surface"><h3>Plano de conferência</h3><div class="v17-stack">'+
      line("1. Identificar as unidades","Solicitar à SEFIN o espelho CADIMO para 701 e 701-A e os números de inscrição e sequencial de cada unidade.","Alta")+
      line("2. Extrair os débitos","Emitir extrato de débitos individualizado por inscrição e competência; apurar pagamentos e eventuais prescrições.","Alta")+
      line("3. Vincular cobrança ao cadastro","Comparar R$ 3.650,77 ao extrato oficial antes de negociação ou DAM.","Alta")+
      '</div><div class="v17-actions" style="margin-top:12px">'+safeLink("https://garanhuns.pe.gov.br/sefin/","Abrir SEFIN Garanhuns")+'</div></div>';
  }
  function sectionLegal(p){
    const d=q(p),t=obj(d.tax.eventual_doacao_de_2022),reg=d.reg;
    return '<div class="v17-surface"><h3>Domínio e transmissão</h3><div class="v17-notice">'+escape(rightsSummary(p))+'</div>'+
      '<div class="v17-info-grid">'+item("Matrícula",p.registrationNumber)+item("Cartório",p.registryOffice)+
      item("Proprietário registral",reg.proprietario_registral_informado)+item("Origem dominial informada",reg.origem_do_dominio)+
      item("Situação registral",reg.situacao_registral)+item("Ônus",reg.onus_reais)+'</div></div>'+
      '<div class="v17-surface"><h3>Hipótese de doação ou transmissão em 2022</h3>'+
      '<div class="v17-notice">A baixa de um bem na declaração de IRPF não demonstra, isoladamente, doação, alienação ou transferência do domínio. A seção “Doações efetuadas” não apresenta lançamento nessa declaração.</div>'+
      '<div class="v17-info-grid">'+item("Classificação",t.status||"Sem prova")+item("Doador",t.doador||"Não identificado")+item("Donatário",t.donatario||"Não identificado")+
      item("Escritura",t.escritura||"Não localizada")+item("Data",t.data_doacao||"Não identificada")+item("ICD",t.icd_especifico||"Não identificado")+'</div></div>'+
      '<div class="v17-surface"><h3>Próximos documentos</h3><p class="v17-lead">Certidão de inteiro teor atualizada da matrícula, escritura de transmissão eventualmente existente, registro/averbação da edificação e individualização registral das unidades.</p></div>';
  }
  function sectionDocs(p){
    const s=src(p), docs=[...list(p.documents),...arrayOrObject(s.documentos_identificados),...arrayOrObject(s.documentos_necessarios)];
    const seen=new Set(), dedup=docs.filter(x=>{const name=typeof x==="string"?x:(x.tipo||x.documento||x.descricao||x.nome||x.title||"");const key=clean(name);if(!key || seen.has(key))return false;seen.add(key);return true;});
    return '<div class="v17-two"><div class="v17-surface"><h3>Documentos do imóvel</h3><div class="v17-stack">'+
      (dedup.length?dedup.map(d=>{const x=typeof d==="string"?{tipo:d}:obj(d);return line(x.tipo||x.documento||x.nome||x.title||"Documento",x.descricao||x.observacoes||x.notes||x.status||"Referência documental cadastrada",x.status||x.data||"");}).join(""):'<p class="v17-muted">Nenhum documento registrado.</p>')+
      '</div></div><div class="v17-surface"><h3>Fontes verificáveis e referências</h3><div class="v17-stack">'+sourcesHtml(p)+'</div></div></div>';
  }
  function sourcesHtml(p){
    const s=src(p);const ss=Object.entries(obj(s.fontes));
    const rows=ss.map(([key,v])=>{const x=obj(v);return '<div class="v17-entry"><h4>'+escape(key)+' — '+escape(x.documento||x.arquivo||x.tipo||"Fonte")+'</h4><p>'+escape(x.informacoes||x.descricao||"Sem resumo")+'</p><div class="v17-inline">'+escape(x.tipo||"")+'</div>'+ (x.url?safeLink(x.url,"Abrir referência"):x.arquivo?'<div class="v17-muted">'+escape(x.arquivo)+'</div>':"")+'</div>';});
    const updates=list(p.evidenceLog).map(x=>line(x.title||x.type,x.at||"Evidência preservada","Histórico de importação"));
    return (rows.concat(updates)).join("")||'<div class="empty">Não há fontes registradas.</div>';
  }
  function sectionHistory(p){
    const s=src(p), h=list(p.history).length?list(p.history):list(s.linha_do_tempo);
    const e=h.map(x=>line(x.evento||x.tipo||x.ato||x.data||"Evento",x.descricao||x.efeito||x.titulo||"Sem descrição",(x.data||"")+" · "+(x.status||""))).join("");
    return '<div class="v17-surface"><h3>Linha do tempo documentada</h3><div class="v17-stack">'+(e||'<p class="v17-muted">Sem histórico cadastrado.</p>')+'</div></div>';
  }
  function sectionAudit(p){
    const s=src(p), conf=list(p.conflicts), corr=list(p.corroborations), updates=list(p.updateHistory);
    return '<div class="v17-surface"><h3>Auditoria e procedência</h3><div class="v17-info-grid">'+
      item("Fontes no JSON",Object.keys(obj(s.fontes)).length)+item("Evidências incrementais",list(p.evidenceLog).length)+
      item("Conflitos em aberto",conf.filter(x=>!x.status||x.status==="open"||x.status==="review_required").length)+'</div></div>'+
      '<div class="v17-two"><div class="v17-surface"><h3>Fontes do cadastro</h3>'+sourcesHtml(p)+'</div>'+
      '<div class="v17-surface"><h3>Histórico de importação</h3><div class="v17-stack">'+
      (updates.length?updates.slice().reverse().map(x=>line(x.policy||"Atualização",(x.newFields||0)+" novos campos; "+(x.conflicts||0)+" divergências",x.at)).join(""):'<p class="v17-muted">Nenhuma atualização incremental.</p>')+
      '</div><h3 style="margin-top:16px">Divergências</h3>'+
      (conf.length?conf.map(x=>line(x.field||"Campo",String(x.currentValue||"")+" / "+String(x.incomingValue||""),x.status)).join(""):'<p class="v17-muted">Sem divergências registradas.</p>')+
      '</div></div>';
  }
  function sectionJson(p){
    const data=src(p); return '<div class="v17-surface"><h3>Dados brutos preservados</h3><p class="v17-muted">A representação original não foi descartada. Abra o bloco que deseja conferir.</p><div class="v17-fulljson">'+
      Object.entries(data).map(([k,v])=>'<details><summary>'+escape(k.replace(/_/g," "))+'</summary><pre>'+escape(JSON.stringify(v,null,2))+'</pre></details>').join("")+
      '</div></div>';
  }
  const tabs=[
    ["executivo","Visão geral"],["unidades","Unidades"],["fiscal","IPTU e fiscal"],
    ["juridico","Jurídico"],["documentos","Documentos"],["historico","Histórico"],
    ["auditoria","Auditoria"],["json","JSON completo"]
  ];
  renderSection=function(p){
    if(section==="unidades")return sectionUnits(p);
    if(section==="fiscal")return sectionFiscal(p);
    if(section==="juridico")return sectionLegal(p);
    if(section==="documentos")return sectionDocs(p);
    if(section==="historico")return sectionHistory(p);
    if(section==="auditoria")return sectionAudit(p);
    if(section==="json")return sectionJson(p);
    return sectionOverview(p);
  };
  renderProperty=function(p){
    if(!p){showPortfolio();return;}
    document.getElementById("title").textContent=p.name;
    document.getElementById("subtitle").textContent=(p.type||"Imóvel")+" · "+(p.city||"Cidade não informada")+" · Gestão patrimonial v17";
    document.getElementById("content").innerHTML=
      metricsProperty(p)+
      '<div class="v17-surface"><div class="v17-tabs">'+tabs.map(([k,l])=>'<button class="'+(section===k?"active":"")+'" onclick="setSection(\''+k+'\')">'+l+'</button>').join("")+'</div>'+
      '<div id="section">'+renderSection(p)+'</div></div>';
  };
  renderPortfolio=function(){
    document.getElementById("title").textContent="Visão geral patrimonial";
    document.getElementById("subtitle").textContent="Gestor Patrimonial v17 · dados privados permanecem no navegador";
    const ps=list(state.properties);
    const pending=ps.filter(p=>!p.registrationNumber||!p.municipalRegistration).length;
    const valid=ps.filter(p=>Number(p.marketValue)>0);
    const total=valid.reduce((n,p)=>n+Number(p.marketValue||0),0);
    document.getElementById("content").innerHTML='<div class="v17-statgrid">'+
      stat("Imóveis cadastrados",String(ps.length),"Carteira armazenada neste navegador")+
      stat("Avaliações informadas",String(valid.length),"Nunca substituir ausências por R$ 0,00")+
      stat("Valor de mercado informado",valid.length?brl(total):"Não apurado","Somente imóveis com preço de mercado cadastrado")+
      stat("Cadastros a completar",String(pending),"Sem matrícula ou inscrição municipal")+'</div>'+
      '<div class="v17-surface"><h3>Carteira patrimonial</h3>'+
      (ps.length?'<div class="v17-table-wrap"><table class="v17-table"><thead><tr><th>Imóvel</th><th>Município</th><th>Matrícula</th><th>Valor de mercado</th><th>Cadastro fiscal</th><th></th></tr></thead><tbody>'+
        ps.map(p=>'<tr><td><strong>'+escape(p.name)+'</strong><div class="v17-muted">'+escape(p.type||"Imóvel")+'</div></td>'+
        '<td>'+text(p.city)+'</td><td>'+text(p.registrationNumber,"Pendente")+'</td>'+
        '<td>'+numberField(Number(p.marketValue)||null)+'</td><td>'+ (p.municipalRegistration?pill("Informado"):pill("Pendente","warn"))+
        '</td><td><button class="v17-btn light" onclick="selectProperty(\''+escape(p.id)+'\')">Abrir ficha</button></td></tr>').join("")+
        '</tbody></table></div>':'<div class="empty">Ainda não há imóveis. Use Importar arquivo ou Importar dados.</div>')+
      '</div>';
  };
  function setupUnitObj(p){
    const s=src(p);
    if(!s.unidades || typeof s.unidades!=="object")s.unidades={lista_confirmada:[]};
    if(Array.isArray(s.unidades))s.unidades={lista_confirmada:s.unidades.slice()};
    if(!Array.isArray(s.unidades.lista_confirmada))s.unidades.lista_confirmada=[];
    return s.unidades.lista_confirmada;
  }
  window.v17CloseUnit=function(){
    const modal=document.getElementById("v17UnitModal");if(modal)modal.remove();
  };
  window.v17OpenUnit=function(index){
    const p=active();if(!p)return;
    const u=knownUnits(p);
    const unit=index>=0?obj(u[index]):{};
    const fields=[
      ["identificacao","Unidade (ex.: Sala 01)"],["tipo","Tipo (apartamento, sala, loja)"],
      ["andar","Andar ou pavimento"],["area_m2","Área privativa (m²)"],
      ["inscricao_municipal","Inscrição municipal"],["sequencial_municipal","Sequencial IPTU"],
      ["proprietario","Proprietário cadastrado"],["situacao_iptu","Situação IPTU"],
      ["ocupacao","Ocupação / uso"],["observacoes","Notas e fonte dos dados"]
    ];
    window.v17CloseUnit();
    const html='<div id="v17UnitModal" class="v17-modal-cover"><div class="v17-modal" role="dialog" aria-modal="true" aria-label="Editar unidade">'+
      '<h3>'+(index>=0?"Editar unidade":"Adicionar unidade documentada")+'</h3>'+
      '<form onsubmit="v17SaveUnit(event,'+index+')"><div class="v17-form">'+
      fields.map(([key,label])=>'<label class="v17-field">'+escape(label)+'<input name="'+escape(key)+'" value="'+escape(unit[key]||"")+'" '+(key==="identificacao"?"required":"")+'></label>').join("")+
      '</div><div class="v17-footer">'+(index>=0?'<button type="button" class="v17-btn alert" onclick="v17RemoveUnit('+index+')">Excluir</button>':"")+
      '<button type="button" class="v17-btn light" onclick="v17CloseUnit()">Cancelar</button><button type="submit" class="v17-btn">Salvar unidade</button></div></form></div></div>';
    document.body.insertAdjacentHTML("beforeend",html);
  };
  window.v17SaveUnit=function(event,index){
    event.preventDefault(); const p=active();if(!p)return;
    const unit={},form=event.target;
    for(const input of form.querySelectorAll("input[name]"))unit[input.name]=input.value.trim();
    if(!unit.identificacao){alert("Informe a identificação da unidade.");return;}
    if(!confirm("Confirma o cadastro informado para a unidade "+unit.identificacao+"?"))return;
    autoSnapshot("Antes de editar unidades de "+p.name);
    const u=setupUnitObj(p);
    if(index>=0 && index<u.length)u[index]={...obj(u[index]),...unit};else u.push(unit);
    recordAudit("unit_edit",p,{unit:unit.identificacao,action:index>=0?"update":"create"});
    save();window.v17CloseUnit();
    toast("Unidade salva. O histórico foi preservado.");
  };
  window.v17RemoveUnit=function(index){
    const p=active();if(!p)return;
    const u=setupUnitObj(p);
    if(index<0||index>=u.length)return;
    if(!confirm("Excluir esta unidade do cadastro? Um snapshot interno será preservado."))return;
    autoSnapshot("Antes de excluir unidade de "+p.name);
    const old=u.splice(index,1)[0];
    recordAudit("unit_remove",p,{removed:old});
    save();window.v17CloseUnit();
  };
  // A importação compara primeiro identificadores e endereços. Não sobrescreve
  // dados existentes nem confunde campo vazio com dado validado.
  integrateData=function(data,opts={}){
    let entries=Array.isArray(data)?data:Array.isArray(data.properties)?data.properties:
      data.v12?.properties||data.v11?.properties||(data.property?[data.property]:[data]);
    if(!Array.isArray(entries))entries=[entries];
    autoSnapshot("Antes de importação v17");
    for(const input of entries){
      const raw=obj(input), p=normalizeProperty(raw);
      const existing=state.properties.findIndex(x=>
        (present(p.id) && x.id===p.id)||
        (present(p.registrationNumber) && p.registrationNumber===x.registrationNumber && clean(p.city)===clean(x.city))||
        (clean(x.name)===clean(p.name) && clean(x.city)===clean(p.city))||
        (present(p.address) && clean(x.address)===clean(p.address) && clean(x.city)===clean(p.city))
      );
      if(opts.merge!==false && existing>=0){
        let old=state.properties[existing];
        old.sourceJson=old.sourceJson||{};
        const compare=compareUpdate(old,raw.sourceJson||raw);
        for(const f of compare.empty)setPath(old.sourceJson,f.path,f.newValue);
        for(const field of ["address","city","registrationNumber","registryOffice","municipalRegistration","municipalSequential","manager"]){
          if(!present(old[field]) && present(p[field]))old[field]=p[field];
        }
        for(const field of ["documents","tasks","risks","regularization","people","history"]){
          const current=list(old[field]), incoming=list(raw[field]);
          const seen=new Set(current.map(v=>JSON.stringify(v)));
          for(const el of incoming){const key=JSON.stringify(el);if(!seen.has(key)){current.push(el);seen.add(key);}}
          old[field]=current;
        }
        old.conflicts=list(old.conflicts);
        compare.conflicts.forEach(c=>old.conflicts.push({id:uid(),at:new Date().toISOString(),field:c.path,currentValue:c.oldValue,incomingValue:c.newValue,status:"review_required"}));
        old.evidenceLog=list(old.evidenceLog);
        old.evidenceLog.push({id:uid(),at:new Date().toISOString(),type:"v17_import",title:"Importação incremental sem substituir dados anteriores",payload:{name:p.name,source:raw.sourceJson?.metadados_da_pesquisa || null}});
        recordAudit("v17_safe_merge",old,{newFields:compare.empty.length,conflicts:compare.conflicts.length});
        state.properties[existing]=normalizeProperty(old);
        state.selectedId=old.id;
      }else{
        state.properties.push(p);
        state.selectedId=p.id;
        recordAudit("v17_import_new",p,{});
      }
    }
    save();
  };
  try {
    const brand=document.querySelector(".brand h1");
    if(brand)brand.textContent="Gestor Patrimonial v17";
    render();
  } catch(e) {
    console.error("Falha ao iniciar a camada v17; base v16 preservada.",e);
  }
})();

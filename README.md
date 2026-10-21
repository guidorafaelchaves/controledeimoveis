# Controle de Imóveis

Gestor Patrimonial Imobiliário v19 para uso no GitHub Pages.

## Página

https://guidorafaelchaves.github.io/controledeimoveis/

## Estrutura

- `index.html`: aplicação principal v17, com histórico e armazenamento local preservados.
- `assets/gestor_v17.css`: ficha mais legível e adaptável a dispositivos móveis.
- `assets/gestor_v17.js`: gestão de unidades, IPTU, situação jurídica, riscos, finanças e auditoria com fontes.
- `backup-v16-2026-10-21`: branch de recuperação preservando o site anterior.
- `arquivo/gestor_patrimonial_v14_agente_iptu_cnd.html`: cópia preservada da versão v14.
- `.nojekyll`: impede processamento desnecessário pelo Jekyll.

## Dados e privacidade

O sistema guarda a carteira localmente no navegador por meio de LocalStorage e IndexedDB. Não publique backups JSON, certidões, documentos pessoais ou chaves de API neste repositório público.

A função de agente fiscal aceita uma chave da OpenAI no navegador. A chave não deve ser incorporada ao código-fonte nem enviada ao repositório. Para uso público contínuo, recomenda-se migrar essa chamada para um backend protegido.

## Migração e preservação

A v18 não altera as chaves de armazenamento da v16/v17 (`gestorPatrimonialImoveis.v13` e `GestorPatrimonialDB`). Os imóveis permanecem no navegador original. Use **Central de backup → Baixar backup completo** antes de importar novos imóveis ou alterar unidades. Campos não confirmados são mostrados como pendentes, não como dívidas ou avaliações de valor zero. Os dados de unidades são preenchidos somente pelo usuário. A vista da dívida municipal distingue notificação por e-mail de débito identificado oficialmente.

## v18 — ficha contínua

A apresentação v18 elimina a navegação por abas de imóvel e a maior parte dos cartões. A ficha é um documento único, com cadastro, unidades individualizadas, IPTU, finanças, titularidade, riscos, documentos, cronologia, auditoria e arquivo integral no fim. Campos desconhecidos aparecem como pendentes; o JSON integral e dados privados permanecem no armazenamento original. Para reversão de apresentação, consulte `backup-v17-2026-10-21-fluid-redesign`.

## v19 — leitura dinâmica integral do JSON

A página não depende mais de campos pré-definidos para exibir imóveis. Em cada ficha, o renderizador percorre dinamicamente todas as chaves do `sourceJson`, mostra os valores preenchidos (inclusive informações aninhadas, listas, histórico, arquivos, fontes e URLs) e complementa com os dados operacionais de topo que não são duplicatas exatas. Valores `0` e `false` do JSON original continuam visíveis como zero e “Não”; campos vazios ficam ocultos apenas na visualização, nunca nos arquivos nem nos backups. O app preserva o IndexedDB e LocalStorage existentes; a v18 foi mantida em `backup-v18-2026-10-21-before-dynamic-dossier`. Não publique backups ou JSONs contendo dados pessoais neste repositório público.

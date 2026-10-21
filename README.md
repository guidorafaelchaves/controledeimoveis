# Controle de Imóveis

Gestor Patrimonial Imobiliário v17 para uso no GitHub Pages.

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

A v17 não altera as chaves de armazenamento da v16 (`gestorPatrimonialImoveis.v13` e `GestorPatrimonialDB`). Os imóveis permanecem no navegador original. Use **Central de backup → Baixar backup completo** antes de importar novos imóveis ou alterar unidades. Campos não confirmados são mostrados como pendentes, não como dívidas ou avaliações de valor zero. Os dados de unidades são preenchidos somente pelo usuário. A vista da dívida municipal distingue notificação por e-mail de débito identificado oficialmente.

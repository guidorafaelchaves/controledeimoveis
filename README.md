# Controle de Imóveis

Gestor Patrimonial Imobiliário v15 para uso no GitHub Pages.

## Página

https://guidorafaelchaves.github.io/controledeimoveis/

## Estrutura

- `index.html`: versão principal v15, com auditoria, atualizações incrementais e central de backup.
- `arquivo/gestor_patrimonial_v14_agente_iptu_cnd.html`: cópia preservada da versão v14.
- `.nojekyll`: impede processamento desnecessário pelo Jekyll.

## Dados e privacidade

O sistema guarda a carteira localmente no navegador por meio de LocalStorage e IndexedDB. Não publique backups JSON, certidões, documentos pessoais ou chaves de API neste repositório público.

A função de agente fiscal aceita uma chave da OpenAI no navegador. A chave não deve ser incorporada ao código-fonte nem enviada ao repositório. Para uso público contínuo, recomenda-se migrar essa chamada para um backend protegido.

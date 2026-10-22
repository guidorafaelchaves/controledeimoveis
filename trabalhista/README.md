# Controle Trabalhista — versão 1.0

Aplicativo estático pessoal para conferência de obrigações trabalhistas, concentrado em INSS e comprovação de pagamentos de Luciano, Rosiete e Givaldo. O aplicativo não emite guias, não transmite eventos oficiais e não substitui orientação contábil ou jurídica.

## Endereço e arquitetura
- Página: https://guidorafaelchaves.github.io/controledeimoveis/trabalhista/
- Arquivos: index.html, app.css, app.js.
- O restante do Controle de Imóveis não foi alterado.
- Registros ficam apenas no localStorage do navegador, sob chave controle_trabalhista_private_v1, não dentro do GitHub.
- Não há servidor de dados, login, sincronização ou integração bancária. A hospedagem pública dos arquivos não torna os registros visíveis ao público, mas outros scripts sob o mesmo domínio podem acessar o mesmo localStorage. Não utilizar em computador compartilhado sem controles adequados.

## Instruções práticas
1. Confirmar a categoria de cada trabalhador antes de escolher a guia aplicável.
2. Escolher competência (mês a que o pagamento se refere).
3. Registrar uma guia com valor uma única vez. Para um DAE unificado, vincular todas as pessoas abrangidas.
4. Informar o vencimento realmente impresso na guia, jamais supor a data com base no calendário do aplicativo.
5. Só selecionar "Pago" quando houver data e referência/localização do comprovante. Guardar o comprovante original em meio seguro.
6. Criar lembretes de férias, 13º, admissão, eSocial e outras situações pertinentes.
7. Usar "Dados e backup" e exportar com senha forte após cada rodada de alterações importantes. Testar a restauração em navegador de testes antes de confiar exclusivamente no arquivo.

## Interpretação dos estados
- **Sem comprovação**: não há lançamento previdenciário para a pessoa/competência, não significa dívida ou irregularidade.
- **Pagamento pendente**: existe registro em aberto.
- **Pagamento registrado**: os lançamentos previdenciários registrados no sistema estão marcados como pagos e contêm referência do comprovante; não é prova oficial de que toda obrigação foi cumprida.
- **Vencido / verificar**: um lançamento não pago passou de sua data informada manualmente.
- **Anulado**: lançamento preservado com motivo; não conta para somas/indicadores.

## Fontes oficiais consultadas em outubro de 2026
- eSocial doméstico (DAE): https://www.gov.br/pt-br/servicos/emitir-dae-para-pagamento-do-empregador-domestico
- Manual do empregador doméstico: https://www.gov.br/esocial/pt-br/empregador-domestico/manual-do-empregador-domestico
- Contribuinte individual: https://www.gov.br/inss/pt-br/direitos-e-deveres/inscricao-e-contribuicao/contribuicao-dos-segurados-facultativo-e-contribuinte-individual
- FGTS Digital: https://www.gov.br/trabalho-e-emprego/pt-br/servicos/empregador/fgtsdigital/perguntas-frequentes
- DCTFWeb: https://www.gov.br/pt-br/servicos/declarar-debitos-e-creditos-tributarios-federais

**Atenção a vencimentos:** o prazo mensal do DAE doméstico e do FGTS é em geral dia 20 do mês seguinte, com antecipação quando não útil; para GPS de contribuinte individual por conta própria é em geral dia 15, podendo haver prorrogação em dia não útil. Existem exceções. Para evitar erro, o aplicativo não calcula automaticamente vencimentos, encargos, alíquotas ou férias.

## Próximas versões candidatas
- Conferência por responsável e tipo de vínculo, após validar categorias reais.
- Exportação CSV para conferência externa.
- Histórico de anexos com criptografia local e limites de armazenamento.
- Domínio separado e armazenamento cifrado em repouso com autenticação, se houver necessidade de acesso em mais de um aparelho.

# Precificação por pedido — piloto v5

## Uso

1. Em Clientes, abra o cadastro e salve o acréscimo padrão (ex.: 40%).
2. Em Pedidos, abra um pedido pendente e toque em Precificar pedido.
3. O percentual usado anteriormente no pedido tem prioridade; em um pedido novo, a sugestão vem do cliente.
4. Informe o custo por unidade de cada produto. A venda é calculada com acréscimo sobre o custo: R$ 100 + 40% = R$ 140.
5. É possível editar a venda de um produto. O ajuste é preservado até usar “Usar percentual do pedido” ou confirmar “Aplicar percentual a todos os itens”.
6. Confira custo total, venda total e lucro bruto; salve a precificação.

O resumo usa quantidades e preços unitários. Lucro bruto não desconta combustível ou outras despesas. Valores incompletos aparecem como resumo parcial.

Preços já salvos são preservados ao reabrir. Alterar o padrão do cliente não recalcula os pedidos existentes. A edição do percentual dentro do pedido não altera o cadastro do cliente.

## Persistência

- Client.defaultMarkupPercent: preferência opcional. Null significa sem padrão, zero significa sem acréscimo.
- Order.pricingMarkupPercent: percentual de referência salvo naquele pedido.
- OrderItem.costPrice, salePrice e margin: valores individuais efetivos, incluindo ajustes manuais.
- PATCH /order/:id/pricing: recebe version, markupPercent e todos os itens, com id, costPrice e salePrice opcional.

O servidor calcula vendas automáticas, valida itens, bloqueia alterações em pedidos finalizados, verifica a versão e grava todos os preços e um evento de histórico na mesma transação.

A tela geral de preços continua disponível para pedidos pendentes sem precificação própria. Ela exclui pedidos que já têm pricingMarkupPercent; o servidor também impede sobrescrever esses pedidos pelo endpoint antigo de preços por item.

## Validação

- Testes da API para cálculo, ajuste individual, versões antigas, duplicações, itens externos e pedidos entregues.
- Teste com PostgreSQL real e rollback: cálculo, histórico, versão e independência do padrão do cliente.
- Compilação TypeScript do backend e mobile.
- Validação no aparelho depende da instalação do APK v5.

## Próximas etapas

Precificação pelo valor final ou lucro total do pedido, cadastro separado de custos do dia e impressão dos romaneios ainda são etapas posteriores.

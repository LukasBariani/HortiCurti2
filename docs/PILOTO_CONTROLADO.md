# Piloto controlado do HortiCurti

## Objetivo

Usar o sistema em operação real por 7 dias com um único distribuidor, poucos clientes conhecidos e o computador do projeto como servidor. O piloto deve confirmar que nenhum pedido ou item faltante se perde antes de contratar hospedagem e publicar uma versão definitiva.

## Escopo seguro

- Um operador: o distribuidor.
- De 3 a 5 clientes convidados.
- Uma rede Wi-Fi confiável para computador e celular.
- Sem abrir a porta 3000 no roteador e sem expor a API à internet. A API ainda não possui autenticação.
- O notebook deve permanecer ligado, conectado à energia e com internet enquanto o bot estiver atendendo.
- O número do WhatsApp do piloto permanece conectado pelo `LocalAuth`; não apagar a pasta de sessão do WhatsApp.

## Antes do primeiro dia

1. No diretório `backend`, criar um backup:

   ```bash
   mkdir -p work/backups
   docker exec horticurti_db pg_dump -U horticurti -d horticurti -Fc > work/backups/piloto-antes.dump
   ```

2. Subir o banco e aplicar migrações:

   ```bash
   docker compose up -d
   npx prisma migrate deploy
   npx prisma generate
   ```

3. Iniciar o backend:

   ```bash
   npm run dev
   ```

4. Confirmar que o terminal mostra o servidor na porta 3000 e que o WhatsApp ficou pronto.
5. Abrir o aplicativo no celular conectado à mesma rede e atualizar Pedidos, Lista do dia e Precificação.

## Teste assistido antes de pedidos reais

Fazer um pedido pequeno com dois itens e validar este roteiro:

1. O bot solicita a data completa e recusa uma data passada.
2. O pedido aparece como `Pendente` no dia correto.
3. Os dois itens aparecem na lista consolidada e na precificação.
4. Na entrega, informar uma falta parcial em um item e escolher `Levar para o próximo pedido`.
5. Confirmar que o pedido entregue mostra apenas a quantidade realmente entregue.
6. Fazer outro pedido para o mesmo cliente, em qualquer data futura.
7. Confirmar que a falta foi somada automaticamente e está sem preço preenchido.
8. Precificar novamente o item e concluir a entrega.

## Rotina diária

- Antes de receber pedidos: verificar `docker compose ps`, iniciar o backend e conferir a conexão do WhatsApp.
- Antes de comprar: comparar a Lista do dia com os pedidos individuais.
- Antes de entregar: preencher os preços e usar `Conferir e entregar` em cada pedido.
- Para faltas: informar a quantidade exata e decidir se ela segue para o próximo pedido.
- Ao final do dia: conferir pedidos pendentes, faltas registradas e o resumo de vendas.
- Criar um backup diário com data no nome do arquivo.

## Registro de ocorrências

Para cada problema, anotar horário, cliente, tela, ação realizada e resultado esperado. Não apagar o pedido com problema antes de registrar esses dados. Erros de rede, desconexões do WhatsApp, itens interpretados incorretamente e divergências de quantidade devem ser registrados separadamente.

## Critérios para aprovar o piloto

- Sete dias de operação sem perda de pedidos.
- Nenhuma falta marcada para reposição desaparece.
- Quantidades entregues e valores do resumo conferem com a apuração manual.
- O bot permanece utilizável sem reconexões frequentes.
- O distribuidor consegue concluir a rotina sem ajuda técnica na maior parte dos pedidos.

## Interrupção e recuperação

Se houver divergência que possa causar cobrança incorreta, parar o uso para novos pedidos, preservar o banco e voltar temporariamente ao controle manual. O backup anterior ao piloto está em `backend/work/backups/piloto-antes.dump`. A restauração deve ser feita somente depois de guardar também uma cópia do banco com o problema, pois restaurar substitui os dados atuais.

## Depois do piloto

Antes de expor o sistema à internet, implementar autenticação da API, restringir CORS, mover segredos para o ambiente de produção, configurar HTTPS, backups automáticos e monitoramento. Para o WhatsApp, manter uma instância persistente com armazenamento durável da sessão; uma reinicialização não pode apagar o `LocalAuth`.

# Clientes — piloto v6

- Cadastro e edição usam o mesmo formulário, em tela inteira.
- Acesse Clientes → escolha o cliente → Editar cliente.
- Campos: nome, WhatsApp e acréscimo padrão sobre o custo. Vazio remove o percentual; zero é um padrão explícito.
- Formulário com área segura, KeyboardAvoidingView e ScrollView. Android configurado para redimensionar com o teclado.
- Os valores digitados permanecem em caso de erro. Botões e campos ficam desabilitados durante a gravação.
- WhatsApp aceita formatação e é salvo apenas com dígitos. Use DDI + DDD + número para corresponder ao número consultado pelo bot.
- PATCH /clients/:id atualiza somente nome, whatsappNumber e defaultMarkupPercent. Mantém o ID e os vínculos de pedidos.
- Número duplicado retorna 409; cliente inexistente, 404; dados inválidos, 400.
- Alterar o percentual padrão não recalcula os preços dos pedidos já salvos.

Validação: 32 testes automatizados; TypeScript de mobile e backend; teste PostgreSQL de troca de telefone e preservação do vínculo, com rollback. Teclado no aparelho físico ainda precisa de validação após instalar o APK.

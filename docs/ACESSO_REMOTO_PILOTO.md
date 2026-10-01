# Acesso remoto do piloto

## Arquitetura

O PostgreSQL, a API e o bot do WhatsApp rodam no computador do projeto. O APK acessa a API diretamente pelo IP privado fixo do computador no Tailscale (`100.123.207.8`). Isso evita depender do DNS configurado em cada aparelho. O tráfego continua dentro do túnel criptografado do Tailscale.

```text
Celular do distribuidor + Tailscale
             |
             | HTTP dentro do túnel privado
             v
       Tailscale VPN
             |
             v
 API HortiCurti em 100.123.207.8:3000
        |                 |
   PostgreSQL       WhatsApp Web
```

Nenhuma porta do roteador deve ser aberta. O comando `tailscale funnel` não deve ser usado neste piloto porque ele tornaria o serviço público.

## Instalação do Tailscale

No computador, instalar o Tailscale pelo método oficial para Ubuntu e autenticar a máquina. No Android, instalar o aplicativo Tailscale e conectar o celular à mesma tailnet ou compartilhar somente a máquina do HortiCurti com a conta do distribuidor.

Depois da autenticação, confirmar que a API responde pelo IP privado:

```bash
curl http://100.123.207.8:3000/health
```

Neste piloto, o endereço configurado no APK é `http://100.123.207.8:3000`. O APK permite HTTP para esse acesso, que continua protegido pelo túnel do Tailscale. O IP evita depender do MagicDNS do aparelho.

## Serviço do backend

O arquivo `backend/deploy/systemd/hortcurti-backend.service` inicia o banco, aplica migrações e executa a versão compilada da API. Para instalá-lo como serviço do usuário:

```bash
mkdir -p ~/.config/systemd/user
cp backend/deploy/systemd/hortcurti-backend.service ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user disable hortcurti-backend
```

Verificações:

```bash
systemctl --user status hortcurti-backend
curl http://127.0.0.1:3000/health
curl http://100.123.207.8:3000/health
```

## APK do piloto

O perfil `preview` de `mobile/eas.json` gera um APK instalável diretamente. A URL privada fica em `mobile/app.json`, no campo `expo.extra.apiUrl`:

```bash
cd mobile
npx eas-cli build --platform android --profile preview
```

O APK somente consegue acessar a API enquanto o Tailscale estiver conectado no celular e o computador estiver ligado, conectado à internet e com o serviço HortiCurti ativo.

A compilação atual do piloto está disponível em:

- arquivo local: `output/apk/HortiCurti-piloto-v5.apk`
- página da compilação: `https://expo.dev/accounts/lukinhas_games/projects/horticurti/builds/4704a0ef-f896-4015-8ba7-7e8465d4ce8a`
- SHA-256: `147b4437955f05a23441dfd1381be655a678294447461f05f9b09ac37f1f76d5`

O projeto tem inicialização manual. O serviço fica desabilitado no boot e o banco usa `restart: "no"`.

Para iniciar banco, API e bot (pode executar de qualquer pasta):

```bash
systemctl --user start hortcurti-backend
```

Para parar o projeto:

```bash
systemctl --user stop hortcurti-backend
docker stop horticurti_db
```

O comando de início executa o backend já compilado. Após alterações no backend, rode `npm run build` dentro da pasta backend antes de reiniciar o serviço. Não execute `npm run dev` simultaneamente com o serviço, pois ambos disputariam a sessão do WhatsApp.

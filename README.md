# WhatsApp Web.js com AWS S3 RemoteAuth

Este projeto utiliza [whatsapp-web.js](https://github.com/pedroslopez/whatsapp-web.js) com **RemoteAuth** e **AWS S3** para gerenciar múltiplas sessões do WhatsApp de forma escalável.

## Características

- ✅ **Múltiplas sessões**: Gerencia múltiplos números de telefone na mesma instância
- ✅ **Armazenamento remoto**: Sessões salvas no AWS S3
- ✅ **Backup automático**: Backups periódicos das sessões (a cada 5 minutos)
- ✅ **Escalável**: Pronto para produção com armazenamento em nuvem
- ✅ **Identificação por telefone**: Cada sessão é identificada pelo número de telefone

## Pré-requisitos

1. **Node.js** (versão 18 ou superior)
2. **Conta AWS** com acesso ao S3
3. **Bucket S3** criado para armazenar as sessões
4. **Credenciais AWS** (Access Key ID e Secret Access Key)

## Instalação

1. Clone o repositório e instale as dependências:
```bash
npm install
```

2. Configure as variáveis de ambiente:
```bash
cp .env.example .env
```

3. Edite o arquivo `.env` com suas credenciais AWS:
```env
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=your-bucket-name
AWS_S3_REMOTE_DATA_PATH=whatsapp-sessions/
```

4. Verifique se a configuração está correta:
```bash
npm run check-config
```

Este comando verifica se todas as variáveis de ambiente necessárias estão configuradas.

## Configuração AWS S3

### 1. Criar bucket S3

No console AWS, crie um bucket S3 (ex: `whatsapp-sessions-bucket`).

### 2. Configurar permissões IAM

Crie uma política IAM com as seguintes permissões para o bucket:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:GetObject",
                "s3:DeleteObject",
                "s3:HeadObject"
            ],
            "Resource": "arn:aws:s3:::your-bucket-name/whatsapp-sessions/*"
        }
    ]
}
```

### 3. Criar usuário IAM

Crie um usuário IAM e anexe a política acima. Gere as credenciais (Access Key ID e Secret Access Key).

## Como usar

### Iniciar a aplicação

```bash
npm start
```

ou

```bash
npm run api
```

A aplicação fornece uma **API REST** e uma **interface web** disponível em `http://localhost:3000` para gerenciar conversas visualmente.

#### Interface Web

Acesse `http://localhost:3000` no seu navegador para usar a interface web que permite:
- ✅ Visualizar todas as sessões ativas
- ✅ Criar novas sessões
- ✅ Escanear QR Codes diretamente no navegador
- ✅ Enviar mensagens através da interface
- ✅ Ver status de cada sessão (Pronto, Aguardando, etc.)
- ✅ Remover sessões

#### Endpoints da API REST:

#### Endpoints disponíveis:

1. **Inicializar sessão**
```bash
POST http://localhost:3000/sessions/5511999999999/initialize
```

2. **Obter QR Code (HTML)**
```bash
GET http://localhost:3000/sessions/5511999999999/qr
```
Abre no navegador para escanear o QR Code.

3. **Verificar status**
```bash
GET http://localhost:3000/sessions/5511999999999/status
```

4. **Enviar mensagem**
```bash
POST http://localhost:3000/sessions/5511999999999/send
Content-Type: application/json

{
  "to": "5511888888888",
  "message": "Olá! Esta é uma mensagem de teste."
}
```

5. **Listar todas as sessões**
```bash
GET http://localhost:3000/sessions
```

6. **Remover sessão**
```bash
DELETE http://localhost:3000/sessions/5511999999999
```

7. **Logout (remove sessão do S3)**
```bash
POST http://localhost:3000/sessions/5511999999999/logout
```

### Usar múltiplas sessões

Você pode inicializar múltiplas sessões através da API ou interface web. Cada sessão é identificada pelo número de telefone.

### Gerenciar sessões via API

Todas as operações de gerenciamento de sessões podem ser feitas através da API REST ou interface web. Consulte a seção "Endpoints disponíveis" acima para ver todos os endpoints disponíveis.

## Estrutura de arquivos

```
whatsapp-web/
├── config/
│   └── aws.js              # Configuração AWS S3
├── services/
│   └── SessionManager.js   # Gerenciador de múltiplas sessões
├── public/
│   ├── index.html          # Interface web principal
│   ├── style.css           # Estilos da interface
│   └── app.js              # JavaScript da interface
├── api.js                   # API REST + Servidor web
├── .env                    # Variáveis de ambiente (não versionado)
├── .env.example            # Exemplo de variáveis de ambiente
├── package.json
└── README.md
```

## Eventos disponíveis

O `SessionManager` emite os seguintes eventos:

- `qr` - QR Code gerado: `{ phoneNumber, qr }`
- `authenticated` - Cliente autenticado: `{ phoneNumber }`
- `ready` - Cliente pronto: `{ phoneNumber, client }`
- `remote_session_saved` - Sessão salva no S3: `{ phoneNumber }`
- `auth_failure` - Falha na autenticação: `{ phoneNumber, error }`
- `disconnected` - Cliente desconectado: `{ phoneNumber, reason }`
- `message` - Mensagem recebida: `{ phoneNumber, message }`

## Estrutura no S3

As sessões são armazenadas no S3 com a seguinte estrutura:

```
s3://your-bucket-name/
└── whatsapp-sessions/
    ├── 5511999999999/
    │   └── [arquivos da sessão]
    ├── 5511888888888/
    │   └── [arquivos da sessão]
    └── 5511777777777/
        └── [arquivos da sessão]
```

## Notas importantes

- ⚠️ **Primeira autenticação**: Na primeira vez, será necessário escanear o QR Code
- ✅ **Sessões persistentes**: Após a primeira autenticação, a sessão é restaurada automaticamente do S3
- 🔄 **Backup automático**: As sessões são sincronizadas com o S3 a cada 5 minutos
- 🔒 **Segurança**: Mantenha suas credenciais AWS seguras e nunca as compartilhe
- 📱 **Múltiplas sessões**: Cada número de telefone tem sua própria sessão isolada

## Troubleshooting

### Erro: "Variáveis de ambiente AWS não configuradas"
- Verifique se o arquivo `.env` existe e está configurado corretamente
- Certifique-se de que as credenciais AWS estão corretas

### Erro: "Access Denied" no S3
- Verifique as permissões IAM do usuário
- Certifique-se de que o bucket existe e está acessível

### QR Code não aparece
- Verifique os logs para erros
- Certifique-se de que o número de telefone está no formato correto (apenas dígitos)

### Sessão não é restaurada
- Verifique se os arquivos existem no S3
- Verifique os logs para erros de conexão com o S3

## Debug

Para informações detalhadas sobre como debugar a aplicação, consulte o arquivo [DEBUG.md](./DEBUG.md).

### Início Rápido de Debug

```bash
# Modo debug
npm run dev

# Debug com inspector (para VS Code)
npm run dev:inspect
```

Configure no arquivo `.env`:
```env
DEBUG=true
LOG_LEVEL=debug
LOG_TIMESTAMPS=true
```

## Documentação

- [whatsapp-web.js Documentation](https://wwebjs.dev/)
- [RemoteAuth Guide](https://wwebjs.dev/guide/creating-your-bot/authentication.html#remote-stores)
- [AWS S3 Documentation](https://docs.aws.amazon.com/s3/)
- [Guia de Debug](./DEBUG.md)

## Deploy Automatizado com GitHub Actions

Este projeto inclui duas pipelines de CI/CD separadas:

1. **Build and Push Docker Image**: Gera a imagem Docker e publica no Docker Hub
2. **Deploy to VPS**: Atualiza o container no VPS com a nova imagem do Docker Hub

### Configuração dos Secrets no GitHub

Para que as pipelines funcionem, você precisa configurar os seguintes secrets no GitHub:

1. Acesse: **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

2. Adicione os seguintes secrets:

   **Para Build e Push:**
   - **`DOCKERHUB_USERNAME`**: Seu usuário do Docker Hub
   - **`DOCKERHUB_TOKEN`**: Token de acesso do Docker Hub (não use sua senha, gere um token em Account Settings → Security → New Access Token)

   **Para Deploy no VPS:**
   - **`VPS_HOST`**: Endereço IP ou domínio do seu VPS (ex: `192.168.1.100` ou `meuservidor.com`)
   - **`VPS_USER`**: Usuário SSH do VPS (ex: `root` ou `ubuntu`)
   - **`SSH_PRIVATE_KEY`**: Chave privada SSH para autenticação no VPS
   - **`VPS_DEPLOY_PATH`** (opcional): Caminho no VPS onde o projeto será deployado (padrão: `/opt/whatsapp-service`)

### Como gerar o token do Docker Hub

1. Acesse [Docker Hub](https://hub.docker.com/)
2. Vá em **Account Settings** → **Security** → **New Access Token**
3. Dê um nome ao token (ex: `github-actions`)
4. Copie o token gerado e adicione como secret `DOCKERHUB_TOKEN` no GitHub

### Como gerar a chave SSH

No seu VPS, execute:

```bash
# Gerar par de chaves (se ainda não tiver)
ssh-keygen -t ed25519 -C "github-actions"

# Copiar a chave pública para authorized_keys
cat ~/.ssh/id_ed25519.pub >> ~/.ssh/authorized_keys

# Exibir a chave privada (copie o conteúdo completo)
cat ~/.ssh/id_ed25519
```

Copie o conteúdo completo da chave privada e adicione como secret `SSH_PRIVATE_KEY` no GitHub.

### Configuração no VPS

Certifique-se de que o VPS tem:

1. **Docker instalado**:
   ```bash
   curl -fsSL https://get.docker.com -o get-docker.sh
   sh get-docker.sh
   ```

2. **Docker Compose instalado** (opcional, mas recomendado):
   ```bash
   sudo apt-get update
   sudo apt-get install docker-compose-plugin
   ```

3. **Arquivo `.env` configurado** no diretório do projeto com todas as variáveis de ambiente necessárias.

4. **Permissões adequadas** para o usuário SSH executar comandos Docker:
   ```bash
   sudo usermod -aG docker $USER
   ```

5. **Acesso ao Docker Hub** (se a imagem for privada, configure login no VPS):
   ```bash
   docker login -u SEU_USUARIO -p SEU_TOKEN
   ```

### Como funcionam as pipelines

#### 1. Build and Push Docker Image

- **Trigger**: Executa automaticamente quando há push na branch `main`, criação de tags de versão (`v*`), ou manualmente
- **Ações**:
  - Faz checkout do código
  - Faz login no Docker Hub
  - Gera tags automáticas (latest, branch name, commit SHA, versão semver)
  - Faz build da imagem Docker
  - Publica a imagem no Docker Hub
  - Usa cache para builds mais rápidos

#### 2. Deploy to VPS

- **Trigger**: Executa automaticamente após o workflow "Build and Push Docker Image" ser concluído com sucesso, ou manualmente
- **Ações**:
  - Conecta ao VPS via SSH
  - Faz pull da nova imagem do Docker Hub
  - Para e remove o container antigo
  - Atualiza o `docker-compose.yml` para usar a imagem do Docker Hub
  - Inicia um novo container com a nova imagem
  - Limpa imagens não utilizadas
  - Verifica o status do deploy

### Executar workflows manualmente

Você pode executar os workflows manualmente acessando:
- **Actions** → **Build and Push Docker Image** → **Run workflow**
- **Actions** → **Deploy to VPS** → **Run workflow** (pode especificar a tag da imagem)

### Tags das imagens Docker

As imagens são publicadas com as seguintes tags:
- `latest`: Sempre a última versão da branch principal
- `main-<sha>`: Tag com o SHA do commit (ex: `main-abc123`)
- `v1.0.0`: Tags de versão semântica (quando você cria uma tag `v1.0.0`)
- `1.0`: Versão major.minor (quando você cria uma tag `v1.0.0`)

## Licença

ISC

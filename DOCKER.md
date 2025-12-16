# Guia de Uso com Docker

Este guia explica como executar a aplicação WhatsApp Web usando Docker.

## Pré-requisitos

- Docker instalado
- Docker Compose instalado (opcional, mas recomendado)
- Credenciais AWS configuradas

## Variáveis de Ambiente

### Obrigatórias

- `AWS_ACCESS_KEY_ID` - Chave de acesso AWS
- `AWS_SECRET_ACCESS_KEY` - Chave secreta AWS
- `AWS_S3_BUCKET_NAME` - Nome do bucket S3

### Opcionais

- `AWS_REGION` - Região AWS (padrão: `us-east-1`)
- `AWS_S3_REMOTE_DATA_PATH` - Caminho no S3 (padrão: `whatsapp-sessions/`)
- `PORT` - Porta da aplicação (padrão: `3000`)
- `NODE_ENV` - Ambiente Node.js (padrão: `production`)
- `DEBUG` - Modo debug (padrão: `false`)
- `LOG_LEVEL` - Nível de log (padrão: `info`)

## Opção 1: Usando Docker Compose (Recomendado)

### 1. Criar arquivo `.env`

Crie um arquivo `.env` na raiz do projeto com as variáveis de ambiente:

```env
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=your-bucket-name
AWS_S3_REMOTE_DATA_PATH=whatsapp-sessions/
PORT=3000
NODE_ENV=production
DEBUG=false
LOG_LEVEL=info
```

### 2. Construir e iniciar o container

```bash
docker-compose up -d
```

### 3. Ver logs

```bash
docker-compose logs -f
```

### 4. Parar o container

```bash
docker-compose down
```

## Opção 2: Usando Docker diretamente

### 1. Construir a imagem

```bash
docker build -t whatsapp-web-app .
```

### 2. Executar o container

```bash
docker run -d \
  --name whatsapp-web-app \
  -p 3000:3000 \
  -e AWS_ACCESS_KEY_ID=your_access_key_id \
  -e AWS_SECRET_ACCESS_KEY=your_secret_access_key \
  -e AWS_REGION=us-east-1 \
  -e AWS_S3_BUCKET_NAME=your-bucket-name \
  -e AWS_S3_REMOTE_DATA_PATH=whatsapp-sessions/ \
  -e PORT=3000 \
  -e DEBUG=false \
  -e LOG_LEVEL=info \
  --shm-size=2gb \
  whatsapp-web-app
```

### 3. Usando arquivo `.env`

Você também pode usar um arquivo `.env`:

```bash
docker run -d \
  --name whatsapp-web-app \
  -p 3000:3000 \
  --env-file .env \
  --shm-size=2gb \
  whatsapp-web-app
```

### 4. Ver logs

```bash
docker logs -f whatsapp-web-app
```

### 5. Parar e remover o container

```bash
docker stop whatsapp-web-app
docker rm whatsapp-web-app
```

## Persistência de Dados

Por padrão, as sessões são armazenadas no AWS S3. Se você quiser manter uma cópia local também, pode montar o volume `auth`:

```bash
docker run -d \
  --name whatsapp-web-app \
  -p 3000:3000 \
  -v $(pwd)/auth:/app/auth \
  --env-file .env \
  --shm-size=2gb \
  whatsapp-web-app
```

## Troubleshooting

### Erro: "Shared memory too small"

Se você encontrar erros relacionados à memória compartilhada, aumente o `shm-size`:

```bash
docker run -d \
  --name whatsapp-web-app \
  -p 3000:3000 \
  --shm-size=2gb \
  --env-file .env \
  whatsapp-web-app
```

### Erro: "Chrome/Chromium not found"

O Dockerfile já inclui todas as dependências necessárias para o Puppeteer. Se ainda assim encontrar problemas, verifique se a imagem foi construída corretamente.

### Verificar se o container está rodando

```bash
docker ps
```

### Acessar o shell do container

```bash
docker exec -it whatsapp-web-app /bin/bash
```

## Recursos do Container

O `docker-compose.yml` já configura limites de recursos:
- Memória máxima: 2GB
- Memória reservada: 512MB
- Shared memory: 2GB

Ajuste esses valores conforme necessário no arquivo `docker-compose.yml`.

## Desenvolvimento

Para desenvolvimento com hot-reload, você pode montar o código como volume:

```yaml
# Adicione ao docker-compose.yml
volumes:
  - ./auth:/app/auth
  - ./:/app  # Apenas para desenvolvimento
```

**Nota:** Para produção, não monte o código como volume para manter a imagem otimizada.


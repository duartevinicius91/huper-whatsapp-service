# Guia de Debug

Este documento descreve como configurar e usar as ferramentas de debug do projeto.

## Configuração de Debug

### Variáveis de Ambiente

Adicione as seguintes variáveis ao arquivo `.env`:

```env
# Ativar modo debug
DEBUG=true

# Nível de log (debug, info, warn, error)
LOG_LEVEL=debug

# Mostrar timestamps nos logs
LOG_TIMESTAMPS=true

# Ambiente (development, production)
NODE_ENV=development
```

### Níveis de Log

- `debug`: Mostra todos os logs, incluindo informações detalhadas
- `info`: Mostra informações gerais (padrão)
- `warn`: Mostra apenas avisos e erros
- `error`: Mostra apenas erros

## Modos de Execução

### 1. Modo Normal (Produção)

```bash
npm start
```

### 2. Modo Debug (Desenvolvimento)

```bash
npm run dev
```

Este comando ativa:
- `DEBUG=true`
- `LOG_LEVEL=debug`
- `NODE_ENV=development`

### 3. Modo Debug com Inspector (Node.js Debugger)

```bash
npm run dev:inspect
```

Permite conectar um debugger na porta 9229.

### 4. Modo Debug com Breakpoint Inicial

```bash
npm run dev:break
```

Pausa a execução no início, aguardando o debugger se conectar.

## Debug no VS Code

### Configuração

O projeto inclui configurações de debug para VS Code em `.vscode/launch.json`:

1. **Debug API Server**: Inicia o servidor em modo debug
2. **Debug API Server (Production Mode)**: Inicia em modo produção com debug
3. **Attach to Process**: Conecta a um processo Node.js já em execução

### Como usar

1. Abra o projeto no VS Code
2. Vá para a aba "Run and Debug" (Ctrl+Shift+D)
3. Selecione uma das configurações
4. Pressione F5 para iniciar

### Breakpoints

- Coloque breakpoints clicando na margem esquerda do editor
- O debugger pausará a execução nos breakpoints
- Use as ferramentas de debug para inspecionar variáveis

## Logs Detalhados

Quando o modo debug está ativado, você verá:

### Logs HTTP
```
[DEBUG] GET /sessions - 200 (15ms)
[DEBUG] POST /sessions/5511999999999/send - 200 (234ms)
```

### Logs WhatsApp
```
[DEBUG] [WhatsApp:5511999999999] QR_CODE_GENERATED
[DEBUG] [WhatsApp:5511999999999] CLIENT_READY
[DEBUG] [WhatsApp:5511999999999] SESSION_SAVED
```

### Logs de Erro
```
[ERROR] [5511999999999] Erro ao enviar mensagem
Stack: Error: ...
```

## Debugging de Problemas Comuns

### 1. Cliente não está pronto

Ative o debug e verifique:
```bash
DEBUG=true LOG_LEVEL=debug npm start
```

Procure por:
- `CLIENT_READY` - Cliente está pronto
- `CLIENT_AUTHENTICATED` - Cliente autenticado
- `SESSION_SAVED` - Sessão salva no S3

### 2. Erro ao enviar mensagem

Verifique os logs para:
- Status do cliente
- Erros de conexão
- Problemas com a página do Puppeteer

### 3. QR Code não aparece

Verifique:
- `QR_CODE_GENERATED` nos logs
- Se o evento está sendo disparado
- Status da sessão via `/sessions/:phoneNumber/status`

### 4. Problemas com AWS S3

Ative debug e verifique:
- Se as credenciais estão corretas
- Se o bucket existe
- Se há erros de permissão

## Ferramentas de Debug

### Logger

O logger está disponível em `utils/logger.js`:

```javascript
const logger = require('./utils/logger');

logger.debug('Mensagem de debug', { data: 'objeto' });
logger.info('Informação');
logger.warn('Aviso');
logger.error('Erro', error);
logger.http('GET', '/sessions', 200, 15);
logger.whatsapp('EVENT_NAME', '5511999999999', { data });
```

### Inspecionar Variáveis

No VS Code, durante o debug:
- **Watch**: Adicione expressões para monitorar
- **Variables**: Veja todas as variáveis no escopo atual
- **Call Stack**: Veja a pilha de chamadas
- **Debug Console**: Execute código no contexto atual

## Dicas

1. **Use breakpoints estratégicos**: Coloque breakpoints em pontos críticos do código
2. **Monitore requisições HTTP**: Ative debug para ver todas as requisições
3. **Verifique eventos do WhatsApp**: Os eventos são logados quando debug está ativo
4. **Use o console do debugger**: Execute código para inspecionar estado

## Performance

⚠️ **Atenção**: O modo debug pode impactar a performance. Use apenas em desenvolvimento.

Para produção, desative o debug:
```env
DEBUG=false
LOG_LEVEL=info
NODE_ENV=production
```


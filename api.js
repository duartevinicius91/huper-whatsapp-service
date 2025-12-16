// Carregar variáveis de ambiente primeiro
require('dotenv').config();

const SessionManager = require('./services/SessionManager');
const logger = require('./utils/logger');
const createServer = require('./config/server');
const setupRoutes = require('./routes');
const setupSessionEvents = require('./events/sessionEvents');
const httpLogging = require('./middleware/logging');
const SessionController = require('./controllers/sessionController');
const QRController = require('./controllers/qrController');
const MessageController = require('./controllers/messageController');
const RestoreController = require('./controllers/restoreController');

// Criar servidor Express
const app = createServer();

// Middleware de logging para requisições HTTP (apenas em modo debug)
if (process.env.DEBUG === 'true' || process.env.DEBUG === '1') {
    app.use(httpLogging);
}

// Criar gerenciador de sessões
const sessionManager = new SessionManager();
// Armazenar QR Codes em memória
const qrCodes = new Map();

// Configurar event listeners do SessionManager
setupSessionEvents(sessionManager, qrCodes);

// Criar controllers
const sessionController = new SessionController(sessionManager, qrCodes);
const qrController = new QRController(sessionManager, qrCodes);
const messageController = new MessageController(sessionManager);
const restoreController = new RestoreController(sessionManager);

// Configurar rotas
setupRoutes(app, sessionController, qrController, messageController, restoreController);

// Função para restaurar sessões ao iniciar
async function startServer() {
    const PORT = process.env.PORT || 3000;
    
    app.listen(PORT, async () => {
        logger.info(`🚀 API rodando na porta ${PORT}`);
        logger.info(`📖 Documentação: http://localhost:${PORT}/`);
        logger.info(`🔧 Modo Debug: ${process.env.DEBUG === 'true' ? 'ATIVADO' : 'DESATIVADO'}`);
        logger.info(`📊 Nível de Log: ${process.env.LOG_LEVEL || 'info'}`);
        
        // Restaurar sessões do S3
        await restoreController.restoreOnStartup();
        
        if (process.env.DEBUG === 'true') {
            logger.debug('Modo debug ativado - logs detalhados serão exibidos');
            logger.info(`\n💡 Exemplo de uso:`);
            logger.info(`   1. POST http://localhost:${PORT}/sessions/5511999999999/initialize`);
            logger.info(`   2. GET  http://localhost:${PORT}/sessions/5511999999999/qr`);
            logger.info(`   3. POST http://localhost:${PORT}/sessions/5511999999999/send`);
        }
    });
}

// Iniciar servidor
startServer();


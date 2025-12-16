const express = require('express');
const path = require('path');
const setupSessionRoutes = require('./sessionRoutes');

/**
 * Configura todas as rotas da aplicação
 */
function setupRoutes(app, sessionController, qrController, messageController, restoreController) {
    // Rota raiz - redirecionar para interface web
    app.get('/', (req, res) => {
        res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
    });

    // Rota API info
    app.get('/api', (req, res) => {
        res.json({
            service: 'WhatsApp Web API com AWS S3',
            version: '1.0.0',
            endpoints: {
                'POST /sessions/:phoneNumber/initialize': 'Inicializar sessão para um número',
                'GET /sessions/:phoneNumber/qr': 'Obter QR Code da sessão',
                'GET /sessions/:phoneNumber/qr/json': 'Obter QR Code da sessão (JSON)',
                'GET /sessions/:phoneNumber/status': 'Verificar status da sessão',
                'POST /sessions/:phoneNumber/send': 'Enviar mensagem',
                'GET /sessions': 'Listar todas as sessões',
                'POST /sessions/restore': 'Restaurar todas as sessões do S3',
                'DELETE /sessions/:phoneNumber': 'Remover sessão',
                'POST /sessions/:phoneNumber/logout': 'Fazer logout e remover sessão'
            }
        });
    });

    // Rotas de sessão
    app.use('/sessions', setupSessionRoutes(sessionController, qrController, messageController, restoreController));
}

module.exports = setupRoutes;


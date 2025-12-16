const express = require('express');
const router = express.Router();

function setupSessionRoutes(sessionController, qrController, messageController, restoreController) {
    // Rotas gerais (devem vir antes das rotas com parâmetros)
    router.get('/', (req, res) => sessionController.list(req, res));
    router.post('/restore', (req, res) => restoreController.restoreAll(req, res));
    
    // Rotas de sessão com parâmetro phoneNumber
    router.post('/:phoneNumber/initialize', (req, res) => sessionController.initialize(req, res));
    router.get('/:phoneNumber/status', (req, res) => sessionController.getStatus(req, res));
    router.post('/:phoneNumber/logout', (req, res) => sessionController.logout(req, res));
    
    // Rotas de QR Code
    router.get('/:phoneNumber/qr/json', (req, res) => qrController.getQRJSON(req, res));
    router.get('/:phoneNumber/qr', (req, res) => qrController.getQRHTML(req, res));
    
    // Rota de mensagens
    router.post('/:phoneNumber/send', (req, res) => messageController.send(req, res));
    
    // Rota de remoção (deve vir por último para não conflitar com outras rotas)
    router.delete('/:phoneNumber', (req, res) => sessionController.remove(req, res));
    
    return router;
}

module.exports = setupSessionRoutes;


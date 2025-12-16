const express = require('express');
const path = require('path');

/**
 * Configura e retorna uma instância do Express
 */
function createServer() {
    const app = express();
    
    // Middleware para parsing JSON
    app.use(express.json());
    
    // Servir arquivos estáticos da pasta public
    app.use(express.static(path.join(__dirname, '..', 'public')));
    
    return app;
}

module.exports = createServer;


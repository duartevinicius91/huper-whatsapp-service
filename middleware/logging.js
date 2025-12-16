const logger = require('../utils/logger');

/**
 * Middleware de logging para requisições HTTP
 * Registra método, path, status code e duração da requisição
 */
function httpLogging(req, res, next) {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        logger.http(req.method, req.path, res.statusCode, duration);
    });
    next();
}

module.exports = httpLogging;


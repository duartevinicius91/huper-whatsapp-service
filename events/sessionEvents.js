const logger = require('../utils/logger');

/**
 * Configura os event listeners do SessionManager
 * @param {SessionManager} sessionManager - Instância do SessionManager
 * @param {Map} qrCodes - Map para armazenar QR Codes em memória
 */
function setupSessionEvents(sessionManager, qrCodes) {
    // Evento: QR Code gerado
    sessionManager.on('qr', ({ phoneNumber, qr }) => {
        const normalizedPhone = sessionManager.normalizePhoneNumber(phoneNumber);
        qrCodes.set(normalizedPhone, qr);
        logger.whatsapp('QR_CODE_GENERATED', normalizedPhone, {
            url: `http://localhost:${process.env.PORT || 3000}/sessions/${normalizedPhone}/qr`
        });
        logger.info(`[${normalizedPhone}] QR Code gerado e armazenado`);
    });

    // Evento: Cliente pronto
    sessionManager.on('ready', ({ phoneNumber }) => {
        qrCodes.delete(phoneNumber);
        logger.whatsapp('CLIENT_READY', phoneNumber);
        logger.info(`[${phoneNumber}] Cliente pronto`);
    });

    // Evento: Cliente autenticado
    sessionManager.on('authenticated', ({ phoneNumber }) => {
        logger.whatsapp('CLIENT_AUTHENTICATED', phoneNumber);
    });

    // Evento: Sessão salva remotamente
    sessionManager.on('remote_session_saved', ({ phoneNumber }) => {
        logger.whatsapp('SESSION_SAVED', phoneNumber);
    });

    // Evento: Falha na autenticação
    sessionManager.on('auth_failure', ({ phoneNumber, error }) => {
        logger.error(`[${phoneNumber}] Falha na autenticação`, error);
    });

    // Evento: Cliente desconectado
    sessionManager.on('disconnected', ({ phoneNumber, reason }) => {
        logger.warn(`[${phoneNumber}] Cliente desconectado: ${reason}`);
    });

    // Evento: Erro no cliente
    sessionManager.on('error', ({ phoneNumber, error }) => {
        logger.error(`[${phoneNumber}] Erro no cliente`, error);
    });

    // Evento: Mensagem recebida (para logging)
    sessionManager.on('message', ({ phoneNumber, message }) => {
        logger.debug(`[${phoneNumber}] Mensagem recebida`, {
            from: message.from,
            body: message.body.substring(0, 100)
        });
    });
}

module.exports = setupSessionEvents;


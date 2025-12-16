const logger = require('../utils/logger');

class SessionController {
    constructor(sessionManager, qrCodes) {
        this.sessionManager = sessionManager;
        this.qrCodes = qrCodes;
    }

    /**
     * Inicializar sessão para um número
     */
    async initialize(req, res) {
        try {
            const { phoneNumber } = req.params;
            const { forceRecreate = true } = req.body; // Por padrão, força recriação
            
            logger.debug(`Inicializando sessão para ${phoneNumber}`, { forceRecreate });
            
            // Remover sessão anterior se existir (forceRecreate = true por padrão)
            await this.sessionManager.initializeClient(phoneNumber, forceRecreate);
            
            logger.info(`Sessão inicializada para ${phoneNumber}`);
            
            res.json({
                success: true,
                phoneNumber: phoneNumber,
                message: 'Sessão inicializada. Acesse /sessions/:phoneNumber/qr para obter o QR Code',
                previousSessionRemoved: forceRecreate
            });
        } catch (error) {
            logger.error('Erro ao inicializar sessão', error);
            
            // Mensagem de erro mais detalhada
            let errorMessage = error.message;
            if (error.message.includes('AWS_S3_BUCKET_NAME') || error.message.includes('bucket name')) {
                errorMessage = 'Configuração AWS S3 incompleta. Verifique se as variáveis de ambiente estão configuradas no arquivo .env: AWS_S3_BUCKET_NAME, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY';
            }
            
            res.status(500).json({
                success: false,
                error: errorMessage,
                details: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        }
    }

    /**
     * Verificar status da sessão
     */
    async getStatus(req, res) {
        try {
            const { phoneNumber } = req.params;
            const normalizedPhone = this.sessionManager.normalizePhoneNumber(phoneNumber);
            
            // Verificar status de forma assíncrona
            const isReady = await this.sessionManager.isClientReadyAsync(normalizedPhone);
            const hasQR = this.qrCodes.has(normalizedPhone) || this.sessionManager.getQRCode(normalizedPhone) !== null;
            const hasClient = this.sessionManager.listClients().includes(normalizedPhone);
            
            res.json({
                success: true,
                phoneNumber: normalizedPhone,
                ready: isReady,
                hasQR: hasQR,
                hasClient: hasClient,
                status: isReady ? 'ready' : (hasQR ? 'waiting_qr' : (hasClient ? 'initializing' : 'not_initialized'))
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Listar todas as sessões
     */
    async list(req, res) {
        try {
            const clients = this.sessionManager.listClients();
            const sessions = await Promise.all(clients.map(async (phoneNumber) => ({
                phoneNumber: phoneNumber,
                ready: await this.sessionManager.isClientReadyAsync(phoneNumber),
                hasQR: this.qrCodes.has(phoneNumber) || this.sessionManager.getQRCode(phoneNumber) !== null
            })));
            
            res.json({
                success: true,
                count: sessions.length,
                sessions: sessions
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Remover sessão
     */
    async remove(req, res) {
        try {
            const { phoneNumber } = req.params;
            const normalizedPhone = this.sessionManager.normalizePhoneNumber(phoneNumber);
            
            await this.sessionManager.removeClient(normalizedPhone);
            
            res.json({
                success: true,
                message: `Sessão ${normalizedPhone} removida com sucesso`
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Logout (remove sessão do S3 também)
     */
    async logout(req, res) {
        try {
            const { phoneNumber } = req.params;
            const normalizedPhone = this.sessionManager.normalizePhoneNumber(phoneNumber);
            
            await this.sessionManager.logoutClient(normalizedPhone);
            
            res.json({
                success: true,
                message: `Logout realizado para ${normalizedPhone}. Sessão removida.`
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
}

module.exports = SessionController;


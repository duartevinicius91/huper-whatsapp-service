const logger = require('../utils/logger');

class MessageController {
    constructor(sessionManager) {
        this.sessionManager = sessionManager;
    }

    /**
     * Enviar mensagem
     */
    async send(req, res) {
        try {
            const { phoneNumber } = req.params;
            const { to, message } = req.body;
            
            if (!to || !message) {
                return res.status(400).json({
                    success: false,
                    error: 'Parâmetros "to" e "message" são obrigatórios'
                });
            }

            const normalizedPhone = this.sessionManager.normalizePhoneNumber(phoneNumber);
            
            // Verificar se o cliente está pronto (versão assíncrona)
            const isReady = await this.sessionManager.isClientReadyAsync(normalizedPhone);
            if (!isReady) {
                // Tentar verificar novamente após um pequeno delay
                await new Promise(resolve => setTimeout(resolve, 1000));
                const isReadyRetry = await this.sessionManager.isClientReadyAsync(normalizedPhone);
                
                if (!isReadyRetry) {
                    return res.status(503).json({
                        success: false,
                        error: 'Cliente não está pronto. Aguarde a autenticação ou verifique se a sessão foi escaneada corretamente.',
                        debug: {
                            hasClient: this.sessionManager.listClients().includes(normalizedPhone),
                            status: 'not_ready'
                        }
                    });
                }
            }

            // Verificar se o cliente está conectado
            const isConnected = await this.sessionManager.isClientConnected(normalizedPhone);
            if (!isConnected) {
                return res.status(503).json({
                    success: false,
                    error: 'Cliente não está conectado. Tente reinicializar a sessão.'
                });
            }

            // Enviar mensagem
            const client = this.sessionManager.getClient(normalizedPhone);
            const numeroFormatado = to.includes('@c.us') 
                ? to 
                : `${to.replace(/\D/g, '')}@c.us`;
            
            await client.sendMessage(numeroFormatado, message);
            
            res.json({
                success: true,
                from: normalizedPhone,
                to: to,
                message: message
            });
        } catch (error) {
            console.error('Erro ao enviar mensagem:', error);
            
            // Mensagem de erro mais amigável
            let errorMessage = error.message || 'Erro desconhecido ao enviar mensagem';
            
            if (errorMessage.includes('evaluate') || errorMessage.includes('Target closed')) {
                errorMessage = 'Cliente desconectado. Tente reinicializar a sessão ou aguarde alguns segundos.';
            }
            
            res.status(500).json({
                success: false,
                error: errorMessage
            });
        }
    }
}

module.exports = MessageController;


const logger = require('../utils/logger');

class RestoreController {
    constructor(sessionManager) {
        this.sessionManager = sessionManager;
    }

    /**
     * Restaurar todas as sessões do S3
     */
    async restoreAll(req, res) {
        try {
            logger.info('Restauração manual de sessões solicitada');
            const results = await this.sessionManager.restoreAllSessions();
            
            res.json({
                success: true,
                message: `Restauração concluída: ${results.success} sucesso, ${results.failed} falhas, ${results.removed} removidas do S3`,
                restored: results.success,
                failed: results.failed,
                removed: results.removed,
                errors: results.errors
            });
        } catch (error) {
            logger.error('Erro ao restaurar sessões', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Função para restaurar sessões ao iniciar
     */
    async restoreOnStartup() {
        try {
            logger.info('🔄 Restaurando sessões do S3...');
            const results = await this.sessionManager.restoreAllSessions();
            
            if (results.success > 0) {
                logger.info(`✅ ${results.success} sessão(ões) restaurada(s) com sucesso`);
            }
            
            if (results.failed > 0) {
                logger.warn(`⚠️ ${results.failed} sessão(ões) falharam ao restaurar`);
                results.errors.forEach(error => logger.warn(`   ${error}`));
            }
            
            if (results.removed > 0) {
                logger.info(`🗑️ ${results.removed} sessão(ões) removida(s) do S3 devido a falhas na restauração`);
            }
            
            if (results.success === 0 && results.failed === 0) {
                logger.info('ℹ️ Nenhuma sessão encontrada no S3');
            }
        } catch (error) {
            logger.error('Erro ao restaurar sessões na inicialização', error);
        }
    }
}

module.exports = RestoreController;


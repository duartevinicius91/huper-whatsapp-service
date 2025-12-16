const { Client, RemoteAuth } = require('whatsapp-web.js');
const { AwsS3Store } = require('wwebjs-aws-s3');
const awsConfig = require('../config/aws');
const EventEmitter = require('events');
const logger = require('../utils/logger');

class SessionManager extends EventEmitter {
    constructor() {
        super();
        this.clients = new Map(); // Map<phoneNumber, Client>
        this.qrCodes = new Map(); // Map<phoneNumber, qrCode>
    }

    /**
     * Normaliza o número de telefone para usar como identificador de sessão
     * @param {string} phoneNumber - Número de telefone
     * @returns {string} - Número normalizado (apenas dígitos)
     */
    normalizePhoneNumber(phoneNumber) {
        // Remove todos os caracteres não numéricos
        return phoneNumber.replace(/\D/g, '');
    }

    /**
     * Cria um cliente WhatsApp para um número de telefone específico
     * @param {string} phoneNumber - Número de telefone do usuário
     * @returns {Client} - Cliente WhatsApp
     */
    createClient(phoneNumber) {
        const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
        
        // Verificar se já existe um cliente para este número
        if (this.clients.has(normalizedPhone)) {
            logger.debug(`Cliente já existe para o número: ${normalizedPhone}`);
            return this.clients.get(normalizedPhone);
        }

        // Validar configuração AWS
        if (!awsConfig.bucketName) {
            logger.error('AWS_S3_BUCKET_NAME não configurado');
            throw new Error(
                'AWS_S3_BUCKET_NAME não configurado. ' +
                'Configure a variável de ambiente AWS_S3_BUCKET_NAME no arquivo .env'
            );
        }

        if (!awsConfig.s3Client) {
            logger.error('Credenciais AWS não configuradas');
            throw new Error(
                'Credenciais AWS não configuradas. ' +
                'Configure AWS_ACCESS_KEY_ID e AWS_SECRET_ACCESS_KEY no arquivo .env'
            );
        }

        logger.debug(`Criando cliente para ${normalizedPhone}`, {
            bucketName: awsConfig.bucketName,
            remoteDataPath: `${awsConfig.remoteDataPath}${normalizedPhone}/`
        });

        // Criar store S3 para esta sessão
        const store = new AwsS3Store({
            bucketName: awsConfig.bucketName,
            remoteDataPath: `${awsConfig.remoteDataPath}${normalizedPhone}/`,
            s3Client: awsConfig.s3Client,
            putObjectCommand: awsConfig.putObjectCommand,
            headObjectCommand: awsConfig.headObjectCommand,
            getObjectCommand: awsConfig.getObjectCommand,
            deleteObjectCommand: awsConfig.deleteObjectCommand
        });

        // Criar cliente com RemoteAuth
        const client = new Client({
            authStrategy: new RemoteAuth({
                clientId: normalizedPhone, // Usa o número como identificador
                dataPath: `./auth/${normalizedPhone}`, // Caminho local temporário
                store: store,
                backupSyncIntervalMs: 300000 // Backup a cada 5 minutos
            }),
            puppeteer: {
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu'
                ]
            }
        });

        // Configurar eventos do cliente
        this.setupClientEvents(client, normalizedPhone);

        // Armazenar cliente
        this.clients.set(normalizedPhone, client);

        return client;
    }

    /**
     * Configura os eventos de um cliente
     * @param {Client} client - Cliente WhatsApp
     * @param {string} phoneNumber - Número de telefone
     */
    setupClientEvents(client, phoneNumber) {
        // Evento: QR Code gerado
        client.on('qr', (qr) => {
            logger.whatsapp('QR_CODE_GENERATED', phoneNumber);
            this.qrCodes.set(phoneNumber, qr);
            this.emit('qr', { phoneNumber, qr });
        });

        // Evento: Cliente autenticado
        client.on('authenticated', () => {
            logger.whatsapp('CLIENT_AUTHENTICATED', phoneNumber);
            this.emit('authenticated', { phoneNumber });
        });

        // Evento: Cliente pronto
        client.on('ready', async () => {
            logger.whatsapp('CLIENT_READY', phoneNumber);
            this.qrCodes.delete(phoneNumber);
            
            // Obter informações do cliente
            try {
                const info = await client.info;
                logger.info(`[${phoneNumber}] Conectado como: ${info.pushname || info.wid.user}`, {
                    wid: info.wid,
                    pushname: info.pushname
                });
            } catch (error) {
                logger.error(`[${phoneNumber}] Erro ao obter informações`, error);
            }
            
            this.emit('ready', { phoneNumber, client });
        });

        // Evento: Sessão salva remotamente
        client.on('remote_session_saved', () => {
            logger.whatsapp('SESSION_SAVED', phoneNumber);
            this.emit('remote_session_saved', { phoneNumber });
        });

        // Evento: Falha na autenticação
        client.on('auth_failure', (msg) => {
            logger.error(`[${phoneNumber}] Falha na autenticação`, null, { message: msg });
            this.emit('auth_failure', { phoneNumber, error: msg });
        });

        // Evento: Cliente desconectado
        client.on('disconnected', (reason) => {
            logger.warn(`[${phoneNumber}] Desconectado`, null, { reason });
            this.emit('disconnected', { phoneNumber, reason });
        });

        // Evento: Erro no cliente
        client.on('error', (error) => {
            logger.error(`[${phoneNumber}] Erro no cliente`, error);
            this.emit('error', { phoneNumber, error });
        });

        // Evento: Receber mensagem
        client.on('message', async (message) => {
            if (message.fromMe) return;
            
            this.emit('message', { phoneNumber, message });
        });
    }

    /**
     * Obtém ou cria um cliente para um número de telefone
     * @param {string} phoneNumber - Número de telefone
     * @returns {Client} - Cliente WhatsApp
     */
    getClient(phoneNumber) {
        const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
        
        if (this.clients.has(normalizedPhone)) {
            return this.clients.get(normalizedPhone);
        }

        return this.createClient(phoneNumber);
    }

    /**
     * Inicializa um cliente para um número de telefone
     * Remove qualquer sessão anterior do mesmo número antes de criar uma nova
     * @param {string} phoneNumber - Número de telefone
     * @param {boolean} forceRecreate - Forçar recriação mesmo se já existir
     * @returns {Promise<Client>} - Cliente inicializado
     */
    async initializeClient(phoneNumber, forceRecreate = true) {
        const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
        
        // Se já existe um cliente e forceRecreate é true, remover primeiro
        if (forceRecreate && this.clients.has(normalizedPhone)) {
            logger.debug(`Removendo sessão anterior para ${normalizedPhone} antes de criar nova`);
            try {
                await this.removeClient(normalizedPhone);
            } catch (error) {
                logger.warn(`Erro ao remover sessão anterior: ${error.message}`);
                // Continuar mesmo se houver erro ao remover
            }
        }
        
        // Obter ou criar cliente
        const client = this.getClient(normalizedPhone);
        
        // Se o cliente já está pronto e não forçamos recriação, retornar
        if (!forceRecreate && client.info) {
            logger.debug(`Cliente ${normalizedPhone} já está pronto`);
            return client;
        }
        
        // Inicializar cliente se ainda não estiver inicializado
        if (!client.info) {
            logger.debug(`Inicializando cliente para ${normalizedPhone}`);
            await client.initialize();
        }
        
        return client;
    }

    /**
     * Obtém o QR Code de um cliente
     * @param {string} phoneNumber - Número de telefone
     * @returns {string|null} - QR Code ou null
     */
    getQRCode(phoneNumber) {
        const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
        return this.qrCodes.get(normalizedPhone) || null;
    }

    /**
     * Verifica se um cliente está pronto
     * @param {string} phoneNumber - Número de telefone
     * @returns {boolean} - true se estiver pronto
     */
    isClientReady(phoneNumber) {
        const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
        const client = this.clients.get(normalizedPhone);
        
        if (!client) {
            return false;
        }
        
        // Verificar se o cliente tem info (está autenticado)
        // O client.info pode ser uma Promise ou um objeto
        try {
            if (!client.info) {
                return false;
            }
            
            // Se info for uma Promise, considerar como não pronto ainda
            if (client.info instanceof Promise) {
                return false;
            }
            
            // Verificar se info tem propriedades básicas
            if (typeof client.info === 'object' && client.info.wid) {
                return true;
            }
        } catch (error) {
            // Se houver erro ao acessar info, considerar não pronto
            return false;
        }
        
        return false;
    }

    /**
     * Verifica se um cliente está pronto (versão assíncrona que aguarda info)
     * @param {string} phoneNumber - Número de telefone
     * @returns {Promise<boolean>} - true se estiver pronto
     */
    async isClientReadyAsync(phoneNumber) {
        const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
        const client = this.clients.get(normalizedPhone);
        
        if (!client) {
            return false;
        }
        
        try {
            // Aguardar info estar disponível (pode ser uma Promise)
            let info = client.info;
            if (info instanceof Promise) {
                info = await info;
            }
            
            if (!info) {
                return false;
            }
            
            // Verificar se info tem propriedades básicas
            if (typeof info === 'object' && info.wid) {
                return true;
            }
        } catch (error) {
            console.error(`[${normalizedPhone}] Erro ao verificar se está pronto:`, error.message);
            return false;
        }
        
        return false;
    }

    /**
     * Verifica se o cliente está conectado e funcional
     * @param {string} phoneNumber - Número de telefone
     * @returns {Promise<boolean>} - true se estiver conectado
     */
    async isClientConnected(phoneNumber) {
        const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
        const client = this.clients.get(normalizedPhone);
        
        if (!client || !client.info) {
            return false;
        }
        
        try {
            // Tentar acessar a página do Puppeteer
            // O whatsapp-web.js expõe a página através de diferentes propriedades
            let page = null;
            
            // Tentar diferentes formas de acessar a página
            if (client.pupPage) {
                page = client.pupPage;
            } else if (client.pupBrowser && client.pupBrowser.pages) {
                const pages = await client.pupBrowser.pages();
                page = pages[0];
            } else if (client.puppeteer && client.puppeteer.page) {
                page = client.puppeteer.page;
            }
            
            if (!page) {
                return false;
            }
            
            // Verificar se a página está fechada
            if (page.isClosed && page.isClosed()) {
                return false;
            }
            
            // Tentar executar um comando simples para verificar se a página está responsiva
            try {
                await page.evaluate(() => true);
                return true;
            } catch (evalError) {
                // Se não conseguir avaliar, a página pode estar desconectada
                return false;
            }
        } catch (error) {
            // Se houver qualquer erro, considerar desconectado
            return false;
        }
    }

    /**
     * Lista todos os clientes ativos
     * @returns {Array} - Lista de números de telefone com clientes ativos
     */
    listClients() {
        return Array.from(this.clients.keys());
    }

    /**
     * Remove um cliente
     * @param {string} phoneNumber - Número de telefone
     * @returns {Promise<void>}
     */
    async removeClient(phoneNumber) {
        const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
        const client = this.clients.get(normalizedPhone);
        
        if (client) {
            try {
                logger.debug(`Destruindo cliente ${normalizedPhone}`);
                await client.destroy();
            } catch (error) {
                logger.warn(`Erro ao destruir cliente ${normalizedPhone}:`, error);
                // Continuar mesmo se houver erro ao destruir
            }
            
            this.clients.delete(normalizedPhone);
            this.qrCodes.delete(normalizedPhone);
            logger.info(`[${normalizedPhone}] Cliente removido`);
        }
    }

    /**
     * Faz logout de um cliente (remove sessão)
     * @param {string} phoneNumber - Número de telefone
     * @returns {Promise<void>}
     */
    async logoutClient(phoneNumber) {
        const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
        const client = this.clients.get(normalizedPhone);
        
        if (client) {
            await client.logout();
            await this.removeClient(normalizedPhone);
            console.log(`[${normalizedPhone}] Logout realizado`);
        }
    }

    /**
     * Lista todas as sessões disponíveis no S3
     * @returns {Promise<string[]>} - Array de números de telefone com sessões disponíveis
     */
    async listAvailableSessions() {
        if (!awsConfig.s3Client || !awsConfig.bucketName) {
            logger.warn('AWS S3 não configurado. Não é possível listar sessões.');
            return [];
        }

        try {
            const ListObjectsV2Command = awsConfig.listObjectsV2Command;
            const remoteDataPath = awsConfig.remoteDataPath;
            
            // Listar objetos no bucket com o prefixo das sessões
            const command = new ListObjectsV2Command({
                Bucket: awsConfig.bucketName,
                Prefix: remoteDataPath,
                Delimiter: '/'
            });

            const response = await awsConfig.s3Client.send(command);
            
            // Extrair números de telefone dos prefixos (CommonPrefixes)
            const sessions = [];
            if (response.CommonPrefixes) {
                for (const prefix of response.CommonPrefixes) {
                    // Formato esperado: whatsapp-sessions/{phoneNumber}/
                    const prefixPath = prefix.Prefix;
                    const relativePath = prefixPath.replace(remoteDataPath, '');
                    const phoneNumber = relativePath.replace(/\/$/, ''); // Remove barra final
                    
                    // Validar se é um número (apenas dígitos)
                    if (phoneNumber && /^\d+$/.test(phoneNumber)) {
                        sessions.push(phoneNumber);
                    }
                }
            }

            logger.info(`Encontradas ${sessions.length} sessão(ões) no S3: ${sessions.join(', ')}`);
            return sessions;
        } catch (error) {
            logger.error('Erro ao listar sessões do S3', error);
            return [];
        }
    }

    /**
     * Remove uma sessão do S3 (deleta todos os objetos da sessão)
     * @param {string} phoneNumber - Número de telefone
     * @returns {Promise<boolean>} - true se removida com sucesso
     */
    async removeSessionFromS3(phoneNumber) {
        if (!awsConfig.s3Client || !awsConfig.bucketName) {
            logger.warn('AWS S3 não configurado. Não é possível remover sessão do S3.');
            return false;
        }

        const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
        const sessionPrefix = `${awsConfig.remoteDataPath}${normalizedPhone}/`;

        try {
            const { listObjectsV2Command, deleteObjectCommand } = awsConfig;
            
            // Listar todos os objetos da sessão
            const listCommand = new listObjectsV2Command({
                Bucket: awsConfig.bucketName,
                Prefix: sessionPrefix
            });

            const listResponse = await awsConfig.s3Client.send(listCommand);
            
            if (!listResponse.Contents || listResponse.Contents.length === 0) {
                logger.debug(`Nenhum objeto encontrado para sessão ${normalizedPhone} no S3`);
                return true; // Considera sucesso se não houver objetos
            }

            // Deletar todos os objetos da sessão
            const deletePromises = listResponse.Contents.map(async (object) => {
                const deleteCommand = new deleteObjectCommand({
                    Bucket: awsConfig.bucketName,
                    Key: object.Key
                });
                await awsConfig.s3Client.send(deleteCommand);
            });

            await Promise.all(deletePromises);
            
            logger.info(`✅ Sessão ${normalizedPhone} removida do S3 (${listResponse.Contents.length} objeto(s) deletado(s))`);
            return true;
        } catch (error) {
            logger.error(`Erro ao remover sessão ${normalizedPhone} do S3`, error);
            return false;
        }
    }

    /**
     * Restaura todas as sessões disponíveis no S3
     * @returns {Promise<{success: number, failed: number, removed: number, errors: Array}>}
     */
    async restoreAllSessions() {
        logger.info('Iniciando restauração de sessões do S3...');
        
        const sessions = await this.listAvailableSessions();
        
        if (sessions.length === 0) {
            logger.info('Nenhuma sessão encontrada no S3 para restaurar');
            return {
                success: 0,
                failed: 0,
                removed: 0,
                errors: []
            };
        }

        const results = {
            success: 0,
            failed: 0,
            removed: 0,
            errors: []
        };

        // Restaurar cada sessão em paralelo (limitado para não sobrecarregar)
        const restorePromises = sessions.map(async (phoneNumber) => {
            try {
                logger.debug(`Restaurando sessão para ${phoneNumber}...`);
                
                // Usar forceRecreate = false para não remover sessões existentes
                await this.initializeClient(phoneNumber, false);
                
                results.success++;
                logger.info(`✅ Sessão ${phoneNumber} restaurada com sucesso`);
            } catch (error) {
                results.failed++;
                const errorMsg = `Erro ao restaurar sessão ${phoneNumber}: ${error.message}`;
                results.errors.push(errorMsg);
                logger.error(errorMsg, error);
                
                // Remover sessão do S3 se falhar ao restaurar
                logger.warn(`🔄 Removendo sessão ${phoneNumber} do S3 devido à falha na restauração...`);
                const removed = await this.removeSessionFromS3(phoneNumber);
                if (removed) {
                    results.removed++;
                    logger.info(`🗑️ Sessão ${phoneNumber} removida do S3`);
                }
            }
        });

        // Aguardar todas as restaurações (mas limitar concorrência)
        await Promise.all(restorePromises);

        logger.info(`Restauração concluída: ${results.success} sucesso, ${results.failed} falhas, ${results.removed} removidas do S3`);
        return results;
    }
}

module.exports = SessionManager;


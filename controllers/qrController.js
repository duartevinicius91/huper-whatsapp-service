const qrcode = require('qrcode');

class QRController {
    constructor(sessionManager, qrCodes) {
        this.sessionManager = sessionManager;
        this.qrCodes = qrCodes;
    }

    /**
     * Obter QR Code da sessão (HTML)
     */
    async getQRHTML(req, res) {
        try {
            const { phoneNumber } = req.params;
            const normalizedPhone = this.sessionManager.normalizePhoneNumber(phoneNumber);
            
            // Aguardar um pouco para dar tempo do QR code ser gerado
            let qr = this.qrCodes.get(normalizedPhone) || this.sessionManager.getQRCode(normalizedPhone);
            
            // Se não tiver QR code ainda, aguardar um pouco e tentar novamente
            if (!qr) {
                // Verificar se o cliente está pronto
                if (this.sessionManager.isClientReady(normalizedPhone)) {
                    return res.send(`
                        <html>
                            <head>
                                <title>WhatsApp - ${normalizedPhone}</title>
                            </head>
                            <body style="font-family: Arial; text-align: center; padding: 50px;">
                                <h1>✅ Cliente já está autenticado!</h1>
                                <p>Número: ${normalizedPhone}</p>
                                <p>Você já está conectado ao WhatsApp Web.</p>
                            </body>
                        </html>
                    `);
                }
                
                // Aguardar até 5 segundos pelo QR code
                for (let i = 0; i < 10; i++) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                    qr = this.qrCodes.get(normalizedPhone) || this.sessionManager.getQRCode(normalizedPhone);
                    if (qr) break;
                }
            }
            
            if (!qr) {
                return res.send(`
                    <html>
                        <head>
                            <title>WhatsApp QR Code - ${normalizedPhone}</title>
                            <meta http-equiv="refresh" content="3">
                        </head>
                        <body style="font-family: Arial; text-align: center; padding: 50px;">
                            <h1>Aguardando QR Code...</h1>
                            <p>Número: ${normalizedPhone}</p>
                            <p>Por favor, aguarde enquanto o QR Code é gerado.</p>
                            <p>Esta página atualiza automaticamente a cada 3 segundos</p>
                        </body>
                    </html>
                `);
            }

            // Gerar QR Code como imagem
            const qrImage = await qrcode.toDataURL(qr);
            
            res.send(`
                <html>
                    <head>
                        <title>WhatsApp QR Code - ${normalizedPhone}</title>
                        <meta http-equiv="refresh" content="5">
                        <style>
                            body {
                                font-family: Arial, sans-serif;
                                text-align: center;
                                padding: 50px;
                                background: #f0f2f5;
                            }
                            .container {
                                background: white;
                                padding: 30px;
                                border-radius: 10px;
                                max-width: 500px;
                                margin: 0 auto;
                                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                            }
                            img {
                                max-width: 100%;
                                border: 2px solid #25d366;
                                border-radius: 10px;
                                padding: 10px;
                                background: white;
                            }
                            .instructions {
                                margin-top: 20px;
                                color: #667781;
                                line-height: 1.6;
                            }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <h1>📱 Escaneie o QR Code</h1>
                            <p><strong>Número:</strong> ${normalizedPhone}</p>
                            <img src="${qrImage}" alt="QR Code">
                            <div class="instructions">
                                <p><strong>Como escanear:</strong></p>
                                <ol style="text-align: left; display: inline-block;">
                                    <li>Abra o WhatsApp no seu celular</li>
                                    <li>Vá em <strong>Configurações</strong></li>
                                    <li>Toque em <strong>Aparelhos conectados</strong></li>
                                    <li>Toque em <strong>Conectar um aparelho</strong></li>
                                    <li>Escaneie este QR Code</li>
                                </ol>
                                <p style="margin-top: 20px; font-size: 12px; color: #999;">
                                    Esta página atualiza automaticamente a cada 5 segundos
                                </p>
                            </div>
                        </div>
                    </body>
                </html>
            `);
        } catch (error) {
            console.error('Erro ao gerar QR Code HTML:', error);
            res.status(500).send(`
                <html>
                    <body style="font-family: Arial; text-align: center; padding: 50px;">
                        <h1>Erro ao gerar QR Code</h1>
                        <p>${error.message}</p>
                    </body>
                </html>
            `);
        }
    }

    /**
     * Obter QR Code da sessão (JSON para API)
     */
    async getQRJSON(req, res) {
        try {
            const { phoneNumber } = req.params;
            const normalizedPhone = this.sessionManager.normalizePhoneNumber(phoneNumber);
            const qr = this.qrCodes.get(normalizedPhone) || this.sessionManager.getQRCode(normalizedPhone);
            
            if (!qr) {
                // Verificar se o cliente está pronto
                if (this.sessionManager.isClientReady(normalizedPhone)) {
                    return res.json({
                        success: true,
                        ready: true,
                        hasQR: false,
                        message: 'Cliente já está autenticado e pronto'
                    });
                }
                
                return res.json({
                    success: false,
                    hasQR: false,
                    error: 'QR Code não disponível. Aguarde alguns segundos ou inicialize a sessão primeiro.'
                });
            }

            // Gerar QR Code como imagem base64
            const qrImage = await qrcode.toDataURL(qr);
            
            res.json({
                success: true,
                hasQR: true,
                ready: false,
                qr: qr,
                qrImage: qrImage,
                phoneNumber: normalizedPhone
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
}

module.exports = QRController;


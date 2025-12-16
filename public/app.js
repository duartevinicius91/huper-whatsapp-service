const API_BASE_URL = window.location.origin;
let currentSession = null;
let messagePollingInterval = null;

// Inicializar quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
    loadSessions();
    setInterval(loadSessions, 5000); // Atualizar sessões a cada 5 segundos
});

// Carregar lista de sessões
async function loadSessions() {
    try {
        const response = await fetch(`${API_BASE_URL}/sessions`);
        const data = await response.json();
        
        if (data.success) {
            renderSessions(data.sessions);
        }
    } catch (error) {
        console.error('Erro ao carregar sessões:', error);
        document.getElementById('sessionsList').innerHTML = 
            '<div class="loading">Erro ao carregar sessões</div>';
    }
}

// Renderizar lista de sessões
function renderSessions(sessions) {
    const container = document.getElementById('sessionsList');
    
    if (sessions.length === 0) {
        container.innerHTML = '<div class="loading">Nenhuma sessão encontrada</div>';
        return;
    }
    
    container.innerHTML = sessions.map(session => `
        <div class="session-item ${session.phoneNumber === currentSession ? 'active' : ''}" 
             onclick="selectSession('${session.phoneNumber}')">
            <div class="session-item-header">
                <span class="session-phone">${formatPhoneNumber(session.phoneNumber)}</span>
                <span class="session-status ${getStatusClass(session)}">${getStatusText(session)}</span>
            </div>
            <div class="session-actions">
                ${!session.ready && session.hasQR ? 
                    `<button class="btn-small btn-qr" onclick="event.stopPropagation(); showQRCode('${session.phoneNumber}')">QR Code</button>` : 
                    ''
                }
                <button class="btn-small btn-remove" onclick="event.stopPropagation(); removeSession('${session.phoneNumber}')">Remover</button>
            </div>
        </div>
    `).join('');
}

// Formatar número de telefone
function formatPhoneNumber(phone) {
    // Formato: +55 (11) 99999-9999
    if (phone.length >= 10) {
        const country = phone.substring(0, 2);
        const area = phone.substring(2, 4);
        const part1 = phone.substring(4, 9);
        const part2 = phone.substring(9);
        return `+${country} (${area}) ${part1}-${part2}`;
    }
    return phone;
}

// Obter classe de status
function getStatusClass(session) {
    if (session.ready) return 'ready';
    if (session.hasQR) return 'waiting';
    return 'not-ready';
}

// Obter texto de status
function getStatusText(session) {
    if (session.ready) return 'Pronto';
    if (session.hasQR) return 'Aguardando';
    return 'Não inicializado';
}

// Selecionar sessão
async function selectSession(phoneNumber) {
    currentSession = phoneNumber;
    loadSessions(); // Atualizar para destacar a sessão selecionada
    
    // Verificar se a sessão está pronta
    try {
        const response = await fetch(`${API_BASE_URL}/sessions/${phoneNumber}/status`);
        const data = await response.json();
        
        if (data.success && data.ready) {
            showChatInterface(phoneNumber);
            startMessagePolling(phoneNumber);
        } else {
            showWelcomeMessage();
            if (data.hasQR) {
                showQRCode(phoneNumber);
            } else {
                // Inicializar sessão se não estiver inicializada
                await initializeSession(phoneNumber);
            }
        }
    } catch (error) {
        console.error('Erro ao verificar status:', error);
    }
}

// Mostrar interface de chat
function showChatInterface(phoneNumber) {
    document.getElementById('chatHeader').innerHTML = `
        <div class="chat-info">
            <div class="chat-title">${formatPhoneNumber(phoneNumber)}</div>
        </div>
    `;
    
    document.getElementById('chatMessages').innerHTML = '<div class="loading">Carregando conversas...</div>';
    document.getElementById('chatInputContainer').style.display = 'block';
    
    loadChatMessages(phoneNumber);
}

// Mostrar mensagem de boas-vindas
function showWelcomeMessage() {
    document.getElementById('chatHeader').innerHTML = `
        <div class="welcome-message">
            <h2>Bem-vindo ao Gerenciador de Conversas</h2>
            <p>Selecione uma sessão ou crie uma nova para começar</p>
        </div>
    `;
    
    document.getElementById('chatMessages').innerHTML = `
        <div class="empty-state">
            <div class="empty-icon">💬</div>
            <h3>Nenhuma conversa selecionada</h3>
            <p>Selecione uma sessão na barra lateral para ver as conversas</p>
        </div>
    `;
    
    document.getElementById('chatInputContainer').style.display = 'none';
    
    if (messagePollingInterval) {
        clearInterval(messagePollingInterval);
        messagePollingInterval = null;
    }
}

// Carregar mensagens do chat (simulado - você pode implementar um endpoint real)
function loadChatMessages(phoneNumber) {
    // Por enquanto, apenas mostra uma mensagem de exemplo
    // Você pode criar um endpoint na API para buscar histórico de mensagens
    document.getElementById('chatMessages').innerHTML = `
        <div class="message received">
            <div class="message-header">Sistema</div>
            <div>Bem-vindo! Esta sessão está pronta para enviar e receber mensagens.</div>
            <div class="message-time">${new Date().toLocaleTimeString()}</div>
        </div>
    `;
}

// Iniciar polling de mensagens (simulado)
function startMessagePolling(phoneNumber) {
    // Por enquanto, apenas um placeholder
    // Você pode implementar WebSocket ou polling para receber mensagens em tempo real
    if (messagePollingInterval) {
        clearInterval(messagePollingInterval);
    }
    
    // Exemplo de polling (descomente se tiver endpoint de mensagens)
    // messagePollingInterval = setInterval(() => {
    //     checkNewMessages(phoneNumber);
    // }, 3000);
}

// Enviar mensagem
async function sendMessage() {
    if (!currentSession) {
        alert('Selecione uma sessão primeiro');
        return;
    }
    
    const input = document.getElementById('messageInput');
    const message = input.value.trim();
    const toNumber = prompt('Digite o número de destino (apenas dígitos):');
    
    if (!message || !toNumber) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/sessions/${currentSession}/send`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                to: toNumber,
                message: message
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Adicionar mensagem enviada ao chat
            addMessageToChat(message, 'sent', toNumber);
            input.value = '';
        } else {
            alert('Erro ao enviar mensagem: ' + data.error);
        }
    } catch (error) {
        console.error('Erro ao enviar mensagem:', error);
        alert('Erro ao enviar mensagem');
    }
}

// Adicionar mensagem ao chat
function addMessageToChat(text, type, from) {
    const messagesContainer = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    
    const time = new Date().toLocaleTimeString();
    const header = type === 'sent' ? 'Você' : formatPhoneNumber(from);
    
    messageDiv.innerHTML = `
        <div class="message-header">${header}</div>
        <div>${text}</div>
        <div class="message-time">${time}</div>
    `;
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Tecla Enter para enviar
function handleKeyPress(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
}

// Mostrar modal de nova sessão
function showNewSessionModal() {
    document.getElementById('newSessionModal').style.display = 'block';
}

// Fechar modal de nova sessão
function closeNewSessionModal() {
    document.getElementById('newSessionModal').style.display = 'none';
    document.getElementById('newPhoneNumber').value = '';
}

// Criar nova sessão
async function createNewSession() {
    const phoneNumber = document.getElementById('newPhoneNumber').value.trim();
    
    if (!phoneNumber || !/^\d+$/.test(phoneNumber)) {
        alert('Digite um número de telefone válido (apenas dígitos)');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/sessions/${phoneNumber}/initialize`, {
            method: 'POST'
        });
        
        const data = await response.json();
        
        if (data.success) {
            closeNewSessionModal();
            loadSessions();
            showQRCode(phoneNumber);
        } else {
            alert('Erro ao criar sessão: ' + data.error);
        }
    } catch (error) {
        console.error('Erro ao criar sessão:', error);
        alert('Erro ao criar sessão');
    }
}

// Mostrar QR Code
async function showQRCode(phoneNumber) {
    const modal = document.getElementById('qrModal');
    const container = document.getElementById('qrCodeContainer');
    
    container.innerHTML = '<div class="loading">Carregando QR Code...</div>';
    modal.style.display = 'block';
    
    // Limpar intervalo anterior se existir
    if (qrUpdateInterval) {
        clearInterval(qrUpdateInterval);
    }
    
    // Atualizar imediatamente
    await updateQRCode(phoneNumber, container);
    
    // Atualizar a cada 2 segundos
    qrUpdateInterval = setInterval(() => {
        updateQRCode(phoneNumber, container);
    }, 2000);
    
    // Limpar intervalo quando fechar modal
    const originalOnClick = modal.onclick;
    modal.onclick = (e) => {
        if (e.target === modal) {
            if (qrUpdateInterval) {
                clearInterval(qrUpdateInterval);
                qrUpdateInterval = null;
            }
            closeQRModal();
        }
    };
}

// Atualizar QR Code
let qrUpdateInterval = null;

async function updateQRCode(phoneNumber, container) {
    try {
        // Buscar QR code como JSON
        const response = await fetch(`${API_BASE_URL}/sessions/${phoneNumber}/qr/json`);
        const data = await response.json();
        
        if (data.success && data.hasQR && data.qrImage) {
            // Mostrar QR code na modal
            container.innerHTML = `
                <img src="${data.qrImage}" alt="QR Code" style="max-width: 100%; border-radius: 8px;">
                <p style="margin-top: 15px; color: #667781;">
                    Ou <a href="${API_BASE_URL}/sessions/${phoneNumber}/qr" target="_blank">abra em nova aba</a>
                </p>
            `;
        } else if (data.ready) {
            // Cliente já está pronto
            container.innerHTML = '<div class="loading" style="color: green;">✅ Sessão autenticada com sucesso!</div>';
            if (qrUpdateInterval) {
                clearInterval(qrUpdateInterval);
                qrUpdateInterval = null;
            }
            setTimeout(() => {
                closeQRModal();
                loadSessions();
                selectSession(phoneNumber);
            }, 2000);
        } else {
            // QR code ainda não disponível
            container.innerHTML = `
                <div class="loading">Aguardando QR Code...</div>
                <p style="margin-top: 15px; color: #667781;">
                    Ou <a href="${API_BASE_URL}/sessions/${phoneNumber}/qr" target="_blank">abra em nova aba</a>
                </p>
            `;
        }
    } catch (error) {
        console.error('Erro ao atualizar QR Code:', error);
        container.innerHTML = `
            <div class="loading" style="color: red;">Erro ao carregar QR Code</div>
            <p style="margin-top: 15px;">
                <a href="${API_BASE_URL}/sessions/${phoneNumber}/qr" target="_blank">Abrir QR Code em nova aba</a>
            </p>
        `;
    }
}

// Fechar modal QR Code
function closeQRModal() {
    if (qrUpdateInterval) {
        clearInterval(qrUpdateInterval);
        qrUpdateInterval = null;
    }
    document.getElementById('qrModal').style.display = 'none';
}

// Remover sessão
async function removeSession(phoneNumber) {
    if (!confirm(`Tem certeza que deseja remover a sessão ${formatPhoneNumber(phoneNumber)}?`)) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/sessions/${phoneNumber}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            if (currentSession === phoneNumber) {
                showWelcomeMessage();
                currentSession = null;
            }
            loadSessions();
        } else {
            alert('Erro ao remover sessão: ' + data.error);
        }
    } catch (error) {
        console.error('Erro ao remover sessão:', error);
        alert('Erro ao remover sessão');
    }
}

// Inicializar sessão
async function initializeSession(phoneNumber) {
    try {
        const response = await fetch(`${API_BASE_URL}/sessions/${phoneNumber}/initialize`, {
            method: 'POST'
        });
        
        const data = await response.json();
        
        if (data.success) {
            loadSessions();
            setTimeout(() => {
                showQRCode(phoneNumber);
            }, 1000);
        }
    } catch (error) {
        console.error('Erro ao inicializar sessão:', error);
    }
}

// Fechar modais ao clicar fora
window.onclick = (event) => {
    const newSessionModal = document.getElementById('newSessionModal');
    const qrModal = document.getElementById('qrModal');
    
    if (event.target === newSessionModal) {
        closeNewSessionModal();
    }
    if (event.target === qrModal) {
        closeQRModal();
    }
}


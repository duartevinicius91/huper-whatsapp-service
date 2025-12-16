require('dotenv').config();

class Logger {
    constructor() {
        this.debugEnabled = process.env.DEBUG === 'true' || process.env.DEBUG === '1';
        this.logLevel = process.env.LOG_LEVEL || 'info';
        this.showTimestamps = process.env.LOG_TIMESTAMPS !== 'false';
        
        this.levels = {
            debug: 0,
            info: 1,
            warn: 2,
            error: 3
        };
        
        this.currentLevel = this.levels[this.logLevel] || this.levels.info;
    }

    formatMessage(level, message, data = null) {
        const timestamp = this.showTimestamps 
            ? `[${new Date().toISOString()}] ` 
            : '';
        const levelStr = level.toUpperCase().padEnd(5);
        let output = `${timestamp}[${levelStr}] ${message}`;
        
        if (data && (this.debugEnabled || level === 'error')) {
            output += '\n' + JSON.stringify(data, null, 2);
        }
        
        return output;
    }

    debug(message, data = null) {
        if (this.debugEnabled || this.currentLevel <= this.levels.debug) {
            console.log(this.formatMessage('debug', message, data));
        }
    }

    info(message, data = null) {
        if (this.currentLevel <= this.levels.info) {
            console.log(this.formatMessage('info', message, data));
        }
    }

    warn(message, data = null) {
        if (this.currentLevel <= this.levels.warn) {
            console.warn(this.formatMessage('warn', message, data));
        }
    }

    error(message, error = null, data = null) {
        if (this.currentLevel <= this.levels.error) {
            console.error(this.formatMessage('error', message, data));
            if (error) {
                if (error instanceof Error) {
                    console.error('Stack:', error.stack);
                } else {
                    console.error('Error details:', error);
                }
            }
        }
    }

    // Método para log de requisições HTTP
    http(method, path, status, duration = null) {
        if (this.debugEnabled) {
            const durationStr = duration ? ` (${duration}ms)` : '';
            this.debug(`${method} ${path} - ${status}${durationStr}`);
        }
    }

    // Método para log de eventos do WhatsApp
    whatsapp(event, phoneNumber, data = null) {
        if (this.debugEnabled) {
            this.debug(`[WhatsApp:${phoneNumber}] ${event}`, data);
        }
    }
}

module.exports = new Logger();


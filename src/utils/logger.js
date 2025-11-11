/**
 * Simple logger utility
 * 简单日志工具
 */

// Validate and set current log level with proper fallback
// 验证并设置当前日志级别，带有适当的回退机制
const CURRENT_LOG_LEVEL = (() => {
    const envLevel = process.env.LOG_LEVEL;
    if (typeof envLevel === 'string' && envLevel.length > 0) {
        const normalizedLevel = envLevel.toLowerCase();
        if (['error', 'warn', 'info', 'debug'].includes(normalizedLevel)) {
            return normalizedLevel;
        }
    }
    return 'info'; // Default log level 默认日志级别
})();

// Define log levels with numeric priorities
// 定义具有数字优先级的日志级别
const LOG_LEVELS = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3
};

/**
 * Log a message with the specified level
 * 使用指定级别记录消息
 * @param {keyof LOG_LEVELS} level - Log level 日志级别
 * @param {string} message - Message to log 要记录的消息
 * @param {...any[]} messages - Additional messages to log 额外要记录的消息
 */
function log(level, message, ...messages) {
    // Validate level parameter
    // 验证日志级别参数
    if (typeof level !== 'string' || !(level in LOG_LEVELS)) {
        throw new Error(`Invalid log level: ${level}`);
    }
    
    // Validate message parameter
    // 验证消息参数
    if (typeof message !== 'string') {
        throw new Error('Log message must be a string');
    }
    
    // Only log if the current level allows this level of logging
    // 仅当日志级别允许时才记录消息
    if (LOG_LEVELS[level] <= LOG_LEVELS[CURRENT_LOG_LEVEL]) {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] [${level.toUpperCase()}]`, message, ...messages);
    }
}

export const logger = {
    /**
     * Log an error message
     * 记录错误消息
     * @param {string} message - Message to log 要记录的消息
     * @param {...any[]} messages - Additional messages to log 额外要记录的消息
     */
    error: (message, ...messages) => log('error', message, ...messages),
    
    /**
     * Log a warning message
     * 记录警告消息
     * @param {string} message - Message to log 要记录的消息
     * @param {...any[]} messages - Additional messages to log 额外要记录的消息
     */
    warn: (message, ...messages) => log('warn', message, ...messages),
    
    /**
     * Log an info message
     * 记录信息消息
     * @param {string} message - Message to log 要记录的消息
     * @param {...any[]} messages - Additional messages to log 额外要记录的消息
     */
    info: (message, ...messages) => log('info', message, ...messages),
    
    /**
     * Log a debug message
     * 记录调试消息
     * @param {string} message - Message to log 要记录的消息
     * @param {...any[]} messages - Additional messages to log 额外要记录的消息
     */
    debug: (message, ...messages) => log('debug', message, ...messages)
};
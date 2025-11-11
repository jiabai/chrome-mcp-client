import { SiliconFlowLLM } from './siliconflow.js';

/**
 * Create LLM instance
 * 创建LLM实例
 * @param {Object} config - Configuration object 配置对象
 * @param {string} [config.modelName] - Model name 模型名称
 * @param {string} [config.openAIApiKey] - API key API密钥
 * @param {number} [config.maxRetries] - Maximum number of retries 最大重试次数
 * @param {number} [config.timeout] - Timeout in milliseconds 超时时间(毫秒)
 * @param {Object} [config.configuration] - Optional provider configuration 可选的提供商配置
 * @param {string} [config.configuration.baseURL] - Base URL for the LLM provider LLM提供商的基础URL
 * @returns {SiliconFlowLLM} LLM instance LLM实例
 */
export function createLLM(config = {}) {
    const defaultBaseURL = process.env.LLM_BASE_URL || 'https://api.siliconflow.cn/v1';

    return new SiliconFlowLLM({
        modelName: config.modelName ?? process.env.MODEL_NAME,
        openAIApiKey:
            config.openAIApiKey ?? process.env.SILICONFLOW_API_KEY ?? process.env.OPENAI_API_KEY,
        maxRetries: config.maxRetries ?? process.env.LLM_MAX_RETRIES ?? 2,
        timeout: config.timeout ?? process.env.LLM_TIMEOUT ?? 30000,
        configuration: {
            baseURL: (config.configuration && config.configuration.baseURL) || defaultBaseURL,
            ...config.configuration
        }
    });
}
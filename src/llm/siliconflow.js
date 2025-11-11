import { ChatOpenAI } from '@langchain/openai'
import { withLogFilter } from '../utils/logFilter.js'
import { runWithTimeout } from '../utils/timeout.js'

// Constants
// 常量定义

// Token重复消息的正则表达式模式
// Regular expression pattern for token duplication messages
const TOKEN_DUPLICATED_MESSAGE = /already exists in this message chunk/

// SiliconFlow API的默认基础URL
// Default base URL for SiliconFlow API
const DEFAULT_BASE_URL = 'https://api.siliconflow.cn/v1'

// 默认超时时间（毫秒）
// Default timeout in milliseconds
const DEFAULT_TIMEOUT = 30000

// 默认最大重试次数
// Default maximum number of retries
const DEFAULT_MAX_RETRIES = 2

/**
 * Resolve numeric option with fallback logic
 * 解析数字选项并使用回退逻辑
 * 
 * This function attempts to parse a value as a number, trying multiple sources
 * in order of priority until a valid number is found or the fallback is used.
 * 此函数尝试将值解析为数字，按优先级顺序尝试多个源，
 * 直到找到有效数字或使用回退值。
 * 
 * @param {number|string} primary - Primary value to parse 主要解析值
 * @param {number|string} secondary - Secondary value to parse 次要解析值
 * @param {number} fallback - Fallback value to use if both primary and secondary are invalid 如果主要和次要值都无效则使用的回退值
 * @returns {number} Resolved numeric value 解析后的数字值
 */
function resolveNumericOption(primary, secondary, fallback) {
    // Helper function to try parsing a value
    // 尝试解析值的辅助函数
    const tryParse = (value) => {
        // If value is already a finite number, return it directly
        // 如果值已经是有限数字，直接返回
        if (typeof value === 'number' && Number.isFinite(value)) {
            return value
        }
        
        // If value is a non-empty string, try to parse it as a float
        // 如果值是非空字符串，尝试将其解析为浮点数
        if (typeof value === 'string' && value.trim().length > 0) {
            const parsed = Number.parseFloat(value)
            if (Number.isFinite(parsed)) {
                return parsed
            }
        }
        
        // Return null if value cannot be parsed
        // 如果值无法解析则返回null
        return null
    }

    // Try primary value first
    // 首先尝试主要值
    const primaryParsed = tryParse(primary)
    if (primaryParsed !== null) return primaryParsed

    // Try secondary value if primary failed
    // 如果主要值失败则尝试次要值
    const secondaryParsed = tryParse(secondary)
    if (secondaryParsed !== null) return secondaryParsed

    // Use fallback value if both primary and secondary failed
    // 如果主要值和次要值都失败则使用回退值
    return fallback
}

/**
 * Resolve API key with priority order
 * 按优先级顺序解析API密钥
 * 
 * This function resolves the API key by checking multiple possible sources
 * in order of priority until a valid key is found.
 * 此函数通过按优先级顺序检查多个可能的源来解析API密钥，
 * 直到找到有效的密钥。
 * 
 * @param {Object} fields - Configuration fields 配置字段
 * @returns {string|undefined} Resolved API key or undefined if not found 解析后的API密钥，如果未找到则为undefined
 */
function resolveApiKey(fields) {
    return fields.apiKey ??
           fields.openAIApiKey ??
           fields.configuration?.apiKey ??
           process.env.SILICONFLOW_API_KEY ??
           process.env.OPENAI_API_KEY
}

/**
 * Build configuration for SiliconFlow API
 * 构建SiliconFlow API的配置
 * 
 * This function creates the configuration object for the SiliconFlow API,
 * ensuring that the API key and base URL are properly set.
 * 此函数为SiliconFlow API创建配置对象，
 * 确保API密钥和基础URL正确设置。
 * 
 * @param {Object} fields - Configuration fields 配置字段
 * @param {string} apiKey - API key to use 使用的API密钥
 * @returns {Object} Configuration object 配置对象
 */
function buildConfiguration(fields, apiKey) {
    // Create base configuration with default or provided base URL
    // 使用默认或提供的基础URL创建基础配置
    const baseConfig = {
        baseURL: process.env.LLM_BASE_URL || DEFAULT_BASE_URL,
        ...fields.configuration
    }

    // Ensure API key is set in configuration
    // 确保配置中设置了API密钥
    if (!baseConfig.apiKey) {
        baseConfig.apiKey = apiKey
    }

    return baseConfig
}

/**
 * Build final config for ChatOpenAI parent class
 * 为ChatOpenAI父类构建最终配置
 * 
 * This function prepares the configuration object that will be passed to
 * the parent ChatOpenAI class constructor.
 * 此函数准备将传递给父类ChatOpenAI构造函数的配置对象。
 * 
 * @param {Object} fields - Configuration fields 配置字段
 * @param {string} apiKey - API key to use 使用的API密钥
 * @param {Object} configuration - SiliconFlow API configuration SiliconFlow API配置
 * @param {number} timeout - Timeout value in milliseconds 超时值（毫秒）
 * @param {number} maxRetries - Maximum number of retries 最大重试次数
 * @returns {Object} Parent configuration object 父类配置对象
 */
function buildParentConfig(fields, apiKey, configuration, timeout, maxRetries) {
    // Resolve model name with priority
    // 按优先级解析模型名称
    const modelName = fields.modelName ?? fields.model ?? process.env.MODEL_NAME
    
    // Return the parent configuration
    // 返回父类配置
    return {
        ...fields,
        modelName,
        model: modelName,
        apiKey,
        openAIApiKey: apiKey,
        configuration,
        maxRetries,
        timeout
    }
}

/**
 * SiliconFlow LLM implementation using LangChain ChatOpenAI interface
 * 使用LangChain ChatOpenAI接口实现的SiliconFlow LLM
 * 
 * This class extends the ChatOpenAI class to provide a custom implementation
 * for the SiliconFlow API with additional features like timeout handling
 * and error management.
 * 此类扩展了ChatOpenAI类，为SiliconFlow API提供自定义实现，
 * 具有超时处理和错误管理等附加功能。
 * 
 * @class
 * @extends {ChatOpenAI}
 */
export class SiliconFlowLLM extends ChatOpenAI {
    /**
     * Constructor for SiliconFlowLLM
     * SiliconFlowLLM的构造函数
     * 
     * Initializes the SiliconFlowLLM instance with the provided configuration
     * and sets up the API key, timeouts, and other settings.
     * 使用提供的配置初始化SiliconFlowLLM实例，
     * 并设置API密钥、超时和其他设置。
     * 
     * @param {Object} fields - Configuration fields 配置字段
     * @param {string} [fields.modelName] - Model name 模型名称
     * @param {string} [fields.model] - Alternative model name key 替选模型名称键
     * @param {string} [fields.openAIApiKey] - API key API密钥
     * @param {Object} [fields.configuration] - Configuration object 配置对象
     * @param {number|string} [fields.timeout] - Timeout in milliseconds 超时时间（毫秒）
     * @param {number|string} [fields.maxRetries] - Maximum number of retries 最大重试次数
     */
    constructor(fields = {}) {
        // Resolve API key with priority
        // 按优先级解析API密钥
        const apiKey = resolveApiKey(fields)
        if (!apiKey) {
            throw new Error('缺少 SiliconFlow API Key，请设置 SILICONFLOW_API_KEY 或提供 openAIApiKey/apiKey。')
        }

        // Resolve timeout and retries
        // 解析超时和重试次数
        const timeout = resolveNumericOption(fields.timeout, process.env.LLM_TIMEOUT, DEFAULT_TIMEOUT)
        const maxRetries = resolveNumericOption(fields.maxRetries, process.env.LLM_MAX_RETRIES, DEFAULT_MAX_RETRIES)

        // Build configuration
        // 构建配置
        const configuration = buildConfiguration(fields, apiKey)
        
        // Build parent config
        // 构建父类配置
        const parentConfig = buildParentConfig(fields, apiKey, configuration, timeout, maxRetries)

        // Call parent constructor
        // 调用父类构造函数
        super(parentConfig)

        // Store instance properties
        // 存储实例属性
        this.apiKey = apiKey
        this.openAIApiKey = apiKey
        this.modelName = parentConfig.modelName
        this.timeout = timeout
        this.maxRetries = maxRetries
    }

    /**
     * Override the _generate method to add timeout handling and filter warning messages
     * 重写_generate方法以添加超时处理和过滤警告消息
     * 
     * This method extends the parent _generate method to add timeout handling,
     * filter duplicate token warnings, and provide better error handling for
     * SiliconFlow-specific issues.
     * 此方法扩展了父类的_generate方法，以添加超时处理、
     * 过滤重复令牌警告，并为SiliconFlow特定问题提供更好的错误处理。
     * 
     * @param {import('@langchain/core/messages').BaseMessage[]} messages - Messages to send to the LLM 发送到LLM的消息
     * @param {Object} options - Options for the LLM call LLM调用的选项
     * @param {import('@langchain/core/callbacks/manager').CallbackManagerForLLMRun} [runManager] - Callback manager 回调管理器
     * @returns {Promise<import('@langchain/core/outputs').ChatResult>} - LLM response LLM响应
     */
    async _generate(messages, options, runManager) {
        // Define the execution function
        // 定义执行函数
        const executeCall = async () => {
            // Call the parent _generate method
            // 调用父类的_generate方法
            const result = await super._generate(messages, options, runManager)
            
            // Clean up SiliconFlow-specific output fields
            // 清理SiliconFlow特定的输出字段
            if (result.llmOutput) {
                // Remove token count fields that are not needed
                // 移除不需要的令牌计数字段
                if (result.llmOutput.hasOwnProperty('completion_tokens')) {
                    delete result.llmOutput.completion_tokens
                }
                if (result.llmOutput.hasOwnProperty('total_tokens')) {
                    delete result.llmOutput.total_tokens
                }
                if (result.llmOutput.hasOwnProperty('reasoning_tokens')) {
                    delete result.llmOutput.reasoning_tokens
                }
            }
            
            return result
        }

        try {
            // Execute the call with timeout and log filtering
            // 使用超时和日志过滤执行调用
            return await withLogFilter(TOKEN_DUPLICATED_MESSAGE, () =>
                runWithTimeout(executeCall, this.timeout, {
                    timeoutMessage: 'LLM call timeout',
                    errorName: 'LLMTimeoutError',
                    onTimeout: (error) => {
                        console.error(error.message)
                    }
                })
            )
        } catch (error) {
            // Get error message
            // 获取错误消息
            const errorMessage = error instanceof Error ? error.message : String(error)

            // Handle SiliconFlow-specific token duplication error
            // 处理SiliconFlow特定的令牌重复错误
            if (TOKEN_DUPLICATED_MESSAGE.test(errorMessage)) {
                console.warn('Detected token field duplicate error, using simplified response')
                return {
                    generations: [],
                    llmOutput: {}
                }
            }
            
            // Handle network errors
            // 处理网络错误
            if (errorMessage.includes('network') || errorMessage.includes('fetch') || errorMessage.includes('ECONNREFUSED')) {
                console.error('Network error occurred:', errorMessage)
                throw new Error('网络连接错误，请检查网络连接或稍后重试')
            }
            
            // Handle rate limiting errors
            // 处理速率限制错误
            if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
                console.error('Rate limit exceeded:', errorMessage)
                throw new Error('API调用频率超限，请稍后重试')
            }
            
            // Handle authentication errors
            // 处理认证错误
            if (errorMessage.includes('unauthorized') || errorMessage.includes('401')) {
                console.error('Authentication failed:', errorMessage)
                throw new Error('API认证失败，请检查API密钥是否正确')
            }

            // Re-throw other errors
            // 重新抛出其他错误
            throw error
        }
    }
}
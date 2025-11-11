import { ChatOpenAI } from '@langchain/openai'  
import { config } from 'dotenv'  
import { MCPClient } from 'mcp-use'
import { ExtendedMCPAgent as MCPAgent } from '../src/core/index.js'

// 自定义 SiliconFlow LLM 封装，处理兼容性问题
class SiliconFlowLLM extends ChatOpenAI {
    /**
     * @param {Object} fields - 配置参数
     * @param {string} fields.model - 模型名称
     * @param {string} [fields.apiKey] - API密钥
     * @param {Object} [fields.configuration] - 配置对象
     * @param {number} [fields.timeout=30000] - 超时时间（毫秒）
     * @param {number} [fields.maxRetries=2] - 最大重试次数
     */
    constructor(fields) {
        super(fields);
        this.modelName = fields.model;
        this.timeout = fields.timeout || 30000;
        this.maxRetries = fields.maxRetries || 2;
    }
    
    /**
     * 重写调用方法，处理响应格式
     * @param {import('@langchain/core/messages').BaseMessage[]} messages - 消息数组
     * @param {Object} options - 选项参数
     * @param {import('@langchain/core/callbacks/manager').CallbackManagerForLLMRun} [runManager] - 运行管理器
     * @returns {Promise<import('@langchain/core/outputs').ChatResult>} 生成结果
     */
    async _generate(messages, options, runManager) {
        try {
            // 添加超时控制
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('LLM调用超时')), this.timeout)
            );
            
            // 保存原始的console.warn和console.error方法
            const originalWarn = console.warn;
            const originalError = console.error;
            
            // 临时覆盖console.warn和console.error以过滤特定的警告信息
            console.warn = function(...args) {
                const message = args.join(' ');
                if (!message.includes('already exists in this message chunk')) {
                    originalWarn.apply(console, args);
                }
            };
            
            console.error = function(...args) {
                const message = args.join(' ');
                if (!message.includes('already exists in this message chunk')) {
                    originalError.apply(console, args);
                }
            };
            
            const llmPromise = super._generate(messages, options, runManager);
            
            const result = await Promise.race([llmPromise, timeoutPromise]);
            
            // 恢复原始的console方法
            console.warn = originalWarn;
            console.error = originalError;
            
            // 清理重复的token字段
            if (result.llmOutput) {
                delete result.llmOutput.completion_tokens;
                delete result.llmOutput.total_tokens;
                delete result.llmOutput.reasoning_tokens;
            }
            
            return result;
        } catch (error) {
            // 恢复原始的console方法
            const originalWarn = console.warn;
            const originalError = console.error;
            
            const errorMessage = error instanceof Error ? error.message : String(error);
            
            // 如果是token字段重复错误，返回一个简化结果
            if (errorMessage.includes('already exists in this message chunk')) {
                console.log('检测到token字段重复错误，使用简化响应');
                // 简化处理，返回空结果避免类型问题
                return {
                    generations: [],
                    llmOutput: {}
                };
            }
            
            console.error('LLM调用错误:', errorMessage);
            throw error;
        }
    }
}  
  
async function main() {  
    // 加载环境变量  
    config()  
      
    // 设置环境变量以减少警告信息
    process.env.NODE_NO_WARNINGS = '1';
      
    // 配置 chrome-devtools MCP 服务器（添加Chrome启动参数和用户数据目录）
    const configuration = {  
        mcpServers: {  
            'chrome-devtools': {  
                command: 'npx',  
                args: ['-y', 'chrome-devtools-mcp@latest'],  
                env: {  
                    // 添加Chrome启动参数以提高兼容性
                    CHROME_FLAGS: '--no-first-run --no-default-browser-check --disable-background-timer-throttling --disable-renderer-backgrounding --disable-backgrounding-occluded-windows --user-data-dir=D:\\ChromeDebugProfile',
                    // 设置调试端口
                    CHROME_DEBUG_PORT: '9222'
                }  
            }  
        }  
    }  

    // 创建 MCPClient  
    const client = new MCPClient(configuration)  
      
    // 配置 SiliconFlow LLM (使用自定义封装) - 尝试更换模型
    const llm = new SiliconFlowLLM({
        model: 'deepseek-ai/DeepSeek-V3.2-Exp',  // 更换为更简单的模型
        apiKey: process.env.SILICONFLOW_API_KEY || process.env.OPENAI_API_KEY,
        configuration: {
            baseURL: 'https://api.siliconflow.cn/v1'
        },
        maxRetries: 2,
        timeout: 30000
    })  

    // 创建 Agent  
    const agent = new MCPAgent({  
        llm,
        client,  
        maxSteps: 10  // 减少步数避免无限循环
    })  
      
    try {
        console.log('正在启动Chrome浏览器...');
        // 使用更具体的指令启动Chrome
        const result = await agent.run('请使用chrome-devtools工具启动Chrome浏览器，并导航到https://chat.deepseek.com');
        console.log(`启动结果: ${result}`);
        
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('任务执行失败:', errorMessage);
        if (errorMessage.includes('already exists in this message chunk')) {
            console.log('模型响应格式问题，建议更换模型或联系API提供商');
        }
    } finally {
        // 清理资源  
        try {
            await client.closeAllSessions()  
            console.log('MCP会话已关闭');
        } catch (cleanupError) {
            const errorMessage = cleanupError instanceof Error ? cleanupError.message : String(cleanupError);
            console.error('清理资源时出错:', errorMessage);
        }
    }  
}  

// 设置最大执行时间
const MAX_EXECUTION_TIME = 2 * 60 * 1000; // 2分钟
const timeoutId = setTimeout(() => {
    console.error('执行超时，强制退出');
    process.exit(1);
}, MAX_EXECUTION_TIME);

// 主函数执行
main().then(() => {
    console.log('程序执行完成，正常退出');
    clearTimeout(timeoutId);
    // 强制退出确保所有资源释放
    setTimeout(() => {
        process.exit(0);
    }, 1000);
}).catch(error => {
    console.error('程序执行失败:', error.message);
    clearTimeout(timeoutId);
    process.exit(1);
});

// 添加进程级别的错误处理
process.on('uncaughtException', (error) => {
    console.error('未捕获的异常:', error.message);
    console.error('堆栈:', error.stack);
    clearTimeout(timeoutId);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('未处理的Promise拒绝:', reason);
    clearTimeout(timeoutId);
    process.exit(1);
});

// 重定向stderr以过滤特定的警告信息
const originalStderrWrite = process.stderr.write;
// @ts-ignore - 忽略类型检查，因为我们知道这是兼容的
process.stderr.write = function(chunk, encoding, callback) {
    const message = chunk.toString();
    if (!message.includes('already exists in this message chunk')) {
        // 处理不同的参数组合
        if (typeof encoding === 'function') {
            // (chunk, callback) 形式
            return originalStderrWrite.call(this, chunk, encoding);
        } else if (callback) {
            // (chunk, encoding, callback) 形式
            return originalStderrWrite.call(this, chunk, encoding, callback);
        } else {
            // (chunk, encoding?) 形式
            return originalStderrWrite.call(this, chunk, encoding);
        }
    }
    return true;
};
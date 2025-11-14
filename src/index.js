import { config } from 'dotenv';
import { MCPClient } from 'mcp-use';
import { ExtendedMCPAgent as MCPAgent } from './core/index.js';
import { createLLM } from './llm/index.js';
import { configureMCP } from './config/mcp.js';
import { logger } from './utils/logger.js';
import { runWithTimeout } from './utils/timeout.js';
import { withLogFilter } from './utils/logFilter.js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Constants for timeout configuration
// 超时配置常量
const TOKEN_DUPLICATED_MESSAGE = /already exists in this message chunk/;

// Default timeout for agent execution (2 minutes)
// Agent执行的默认超时时间（2分钟）
const AGENT_TIMEOUT_MS = parseInt(
    process.env.AGENT_TIMEOUT_MS || process.env.MAX_EXECUTION_TIME || '120000',
    10
);

// Validate AGENT_TIMEOUT_MS to ensure it's a positive number
// 验证AGENT_TIMEOUT_MS确保它是一个正数
if (isNaN(AGENT_TIMEOUT_MS) || AGENT_TIMEOUT_MS <= 0) {
    logger.warn(`Invalid AGENT_TIMEOUT_MS value: ${process.env.AGENT_TIMEOUT_MS}, using default of 120000ms`);
}

/**
 * Ensure API key is provided and valid
 * 确保提供了有效的API密钥
 * @returns {string} Resolved API key 解析后的API密钥
 * @throws {Error} If no API key is provided 如果未提供API密钥则抛出错误
 */
function ensureApiKey() {
    // Resolve API key with priority: SILICONFLOW_API_KEY > OPENAI_API_KEY > LLM_API_KEY
    // 按优先级解析API密钥：SILICONFLOW_API_KEY > OPENAI_API_KEY > LLM_API_KEY
    const resolvedKey =
        process.env.SILICONFLOW_API_KEY ||
        process.env.OPENAI_API_KEY ||
        process.env.LLM_API_KEY;

    if (!resolvedKey) {
        throw new Error(
            '缺少 LLM API Key，请设置 SILICONFLOW_API_KEY、OPENAI_API_KEY 或 LLM_API_KEY。'
        );
    }

    // Validate API key format (basic validation)
    // 验证API密钥格式（基本验证）
    if (typeof resolvedKey !== 'string' || resolvedKey.length < 10) {
        logger.warn('API key might be invalid (too short)');
    }

    process.env.SILICONFLOW_API_KEY = resolvedKey;
    return resolvedKey;
}

/**
 * Run agent task with timeout and log filtering
 * 在超时和日志过滤下运行Agent任务
 * @param {MCPAgent} agent - MCP Agent instance MCP Agent实例
 * @param {string} task - Task to execute 要执行的任务
 * @returns {Promise<any>} Task result 任务结果
 */
async function runAgentTask(agent, task) {
      // 设置最大步骤数，增加递归限制
      const maxSteps = parseInt(process.env.AGENT_MAX_STEPS || '50', 10);
      
      return withLogFilter(TOKEN_DUPLICATED_MESSAGE, () =>
          runWithTimeout(
              () => agent.run(task, maxSteps),
              AGENT_TIMEOUT_MS,
              {
                  timeoutMessage: 'Agent run timeout',
                  errorName: 'AgentTimeoutError',
                  onTimeout: (error) => {
                      logger.error(error.message);
                  }
              }
          )
      );
  }

/**
 * Parse command line arguments to extract task instruction
 * 解析命令行参数以提取任务指令
 * @returns {string} Task instruction 任务指令
 */
function parseArguments() {
    const args = process.argv.slice(2);
    const fileArgIndex = args.findIndex(a => a === '--file');
    let filePath = process.env.TASK_FILE || '';

    if (fileArgIndex !== -1 && args[fileArgIndex + 1]) {
        filePath = args[fileArgIndex + 1];
    } else {
        const inlineEq = args.find(a => a.startsWith('--file='));
        if (inlineEq) {
            filePath = inlineEq.split('=')[1];
        } else if (args.length === 1 && /\.(json|txt)$/i.test(args[0])) {
            filePath = args[0];
        }
    }

    if (filePath) {
        const absPath = resolve(filePath);
        const content = readFileSync(absPath, 'utf-8');
        if (/\.json$/i.test(absPath)) {
            const data = JSON.parse(content);
            if (!data || typeof data.task !== 'string' || !data.task.trim()) {
                throw new Error('任务文件无效：必须包含非空字符串字段 task');
            }
            return data.task.trim();
        }
        if (/\.txt$/i.test(absPath)) {
            const task = content.trim();
            if (!task) {
                throw new Error('任务文件为空：请在文本中填写任务指令');
            }
            return task;
        }
        throw new Error('不支持的任务文件类型：仅支持 .json 或 .txt');
    }

    const task = args.join(' ').trim();
    if (!task) {
        const scriptPath = process.argv[1];
        const isProduction = scriptPath.includes('dist');
        const scriptName = isProduction ? 'npm start' : 'npm run dev';
        console.log(`Usage: ${scriptName} -- "<task instruction>"`);
        console.log(`Or:    ${scriptName} -- --file tasks/task.json`);
        console.log(`Example: ${scriptName} -- "Please navigate to https://www.example.com"`);
        process.exit(1);
    }
    return task;
}

/**
 * Main function to initialize and run the MCP client
 * 初始化并运行MCP客户端的主函数
 * @returns {Promise<void>}
 */
async function main() {
    // Load environment variables
    // 加载环境变量
    config();
    
    // Ensure API key is provided
    // 确保提供了API密钥
    const apiKey = ensureApiKey();

    // Disable Node.js warnings
    // 禁用Node.js警告
    process.env.NODE_NO_WARNINGS = '1';

    // Configure MCP settings
    // 配置MCP设置
    const mcpConfig = configureMCP();

    let client;
    try {
        // Initialize MCP client
        // 初始化MCP客户端
        client = new MCPClient(mcpConfig);

        // Create LLM instance with configuration
        // 使用配置创建LLM实例
        const llm = createLLM({
            modelName: process.env.MODEL_NAME,
            openAIApiKey: apiKey,
            maxRetries: process.env.LLM_MAX_RETRIES || '2',
            timeout: process.env.LLM_TIMEOUT || '30000'
        });

        // Validate LLM configuration
        // 验证LLM配置
        if (!llm) {
            throw new Error('Failed to create LLM instance');
        }

        // Create MCP Agent with LLM and client
        // 使用LLM和客户端创建MCP Agent
        const agent = new MCPAgent({
            llm: /** @type {any} */ (llm),
            client,
            maxSteps: parseInt(process.env.AGENT_MAX_STEPS || '10', 10)
        });

        // Validate agent configuration
        // 验证Agent配置
        if (!agent || typeof agent.run !== 'function') {
            throw new Error('Failed to create MCPAgent instance');
        }

        // Get task instruction from command line arguments
        // 从命令行参数获取任务指令
        const task = parseArguments();
        logger.info(`Task instruction: ${task}`);

        // Run the agent task
        // 运行Agent任务
        const result = await runAgentTask(agent, task);
        logger.info(`Task result: ${result}`);
    } finally {
        // Cleanup: close all MCP sessions
        // 清理：关闭所有MCP会话
        if (client && typeof client.closeAllSessions === 'function') {
            try {
                await client.closeAllSessions();
                logger.info('MCP sessions closed');
            } catch (cleanupError) {
                logger.error('Error during cleanup:', /** @type {any[]} */ ([cleanupError]));
            }
        }
    }
}

// Set maximum execution time
// 设置最大执行时间
const MAX_EXECUTION_TIME = parseInt(process.env.MAX_EXECUTION_TIME || AGENT_TIMEOUT_MS || '120000', 10); // 2 minutes

// Validate MAX_EXECUTION_TIME to ensure it's a positive number
// 验证MAX_EXECUTION_TIME确保它是一个正数
if (isNaN(MAX_EXECUTION_TIME) || MAX_EXECUTION_TIME <= 0) {
    logger.warn(`Invalid MAX_EXECUTION_TIME value: ${process.env.MAX_EXECUTION_TIME}, using default of 120000ms`);
}

// Set timeout to force exit if execution takes too long
// 设置超时以在执行时间过长时强制退出
const timeoutId = setTimeout(() => {
    logger.error('Execution timeout, force exit');
    process.exit(1);
}, MAX_EXECUTION_TIME);

// Run the main function
// 运行主函数
main()
    .then(() => {
        logger.info('Program completed successfully');
        clearTimeout(timeoutId);
        setTimeout(() => {
            process.exit(0);
        }, 1000);
    })
    .catch(error => {
        if (error instanceof Error) {
            if (error.name === 'AgentTimeoutError') {
                logger.error('Program execution failed: agent timed out', [error.message]);
            } else if (error.name === 'LLMTimeoutError') {
                logger.error('Program execution failed: LLM timed out', [error.message]);
            } else if (error.name === 'TimeoutError') {
                logger.error('Program execution failed: operation timed out', [error.message]);
            } else {
                logger.error('Program execution failed:', /** @type {any[]} */ ([error]));
            }
        } else {
            logger.error('Program execution failed with non-error value:', [String(error)]);
        }
        clearTimeout(timeoutId);
        process.exit(1);
    });

// Handle uncaught exceptions
// 处理未捕获的异常
process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception:', /** @type {any[]} */ ([error]));
    clearTimeout(timeoutId);
    process.exit(1);
});

// Handle unhandled promise rejections
// 处理未处理的Promise拒绝
process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled promise rejection:', /** @type {any[]} */ ([reason]));
    clearTimeout(timeoutId);
    process.exit(1);
});
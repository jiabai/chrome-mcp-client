import { MCPAgent } from 'mcp-use';

/**
 * Extended MCP Agent with recursion limit support
 * 扩展的MCP Agent，支持递归限制
 */
export class ExtendedMCPAgent {
    /**
     * Create an ExtendedMCPAgent instance
     * 创建ExtendedMCPAgent实例
     * @param {Object} options - Agent configuration options Agent配置选项
     * @param {any} options.llm - Language model instance 语言模型实例
     * @param {any} options.client - MCP client instance MCP客户端实例
     * @param {number} [options.maxSteps=10] - Maximum steps for agent execution Agent执行的最大步骤数
     */
    constructor(options) {
        const { llm, client, maxSteps = 10, ...rest } = options;
        
        // Create the original MCPAgent
        // 创建原始的MCPAgent
        this.agent = new MCPAgent({
            llm,
            client,
            maxSteps,
            ...rest
        });
        
        // Store maxSteps for our custom implementation
        // 存储maxSteps用于我们的自定义实现
        this.maxSteps = maxSteps;
    }

    /**
     * Run agent task with recursion limit
     * 运行带有递归限制的Agent任务
     * @param {string} task - Task to execute 要执行的任务
     * @param {number} [maxSteps] - Maximum steps for this execution 此次执行的最大步骤数
     * @returns {Promise<any>} Task result 任务结果
     */
    async run(task, maxSteps) {
        // Use provided maxSteps or fallback to instance maxSteps
        // 使用提供的maxSteps或回退到实例的maxSteps
        const steps = maxSteps || this.maxSteps;
        
        // Run the task with the original agent
        // 使用原始agent运行任务
        // Note: The recursion limit is handled by the underlying LangGraph implementation
        // 注意：递归限制由底层的LangGraph实现处理
        return await this.agent.run(task, steps);
    }
    
    /**
     * Get agent metadata
     * 获取agent元数据
     * @returns {any} Agent metadata Agent元数据
     */
    getMetadata() {
        return this.agent.getMetadata ? this.agent.getMetadata() : {};
    }
    
    /**
     * Get agent tags
     * 获取agent标签
     * @returns {string[]} Agent tags Agent标签
     */
    getTags() {
        return this.agent.getTags ? this.agent.getTags() : [];
    }
}
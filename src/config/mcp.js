/**
 * Configure MCP (Model Coordination Protocol) settings
 * 配置MCP（模型协调协议）设置
 * 
 * This function sets up the configuration for connecting to an MCP server,
 * including browser URL, startup timeout, and connection timeout.
 * 此函数设置连接到MCP服务器的配置，
 * 包括浏览器URL、启动超时和连接超时。
 * 
 * @returns {Object} MCP configuration object MCP配置对象
 *   @property {Object} mcpServers - MCP服务器配置对象
 *     @property {Object} mcpServers.chrome-devtools - Chrome DevTools MCP服务器配置
 *       @property {string} mcpServers.chrome-devtools.command - 启动命令
 *       @property {Array<string>} mcpServers.chrome-devtools.args - 命令行参数
 *       @property {Object} mcpServers.chrome-devtools.env - 环境变量
 */
export function configureMCP() {
    // Browser URL configuration
    // 浏览器URL配置
    // Priority: CHROME_MCP_URL environment variable > default value
    // 优先级：CHROME_MCP_URL环境变量 > 默认值
    const browserUrl = process.env.CHROME_MCP_URL || 'http://127.0.0.1:9222';
    
    // Launch timeout configuration
    // 启动超时配置
    // Priority: MCP_LAUNCH_TIMEOUT environment variable > default value (60 seconds)
    // 优先级：MCP_LAUNCH_TIMEOUT环境变量 > 默认值（60秒）
    const launchTimeout = process.env.MCP_LAUNCH_TIMEOUT || '60000';
    
    // Connection timeout configuration
    // 连接超时配置
    // Priority: MCP_CONNECT_TIMEOUT environment variable > default value (30 seconds)
    // 优先级：MCP_CONNECT_TIMEOUT环境变量 > 默认值（30秒）
    const connectTimeout = process.env.MCP_CONNECT_TIMEOUT || '30000';
    
    // Validate launch timeout value
    // 验证启动超时值
    const launchTimeoutMs = parseInt(launchTimeout, 10);
    if (isNaN(launchTimeoutMs) || launchTimeoutMs <= 0) {
        console.warn(
            `Invalid MCP_LAUNCH_TIMEOUT value: ${launchTimeout}, using default of 60000ms`
        );
    }
    
    // Validate connection timeout value
    // 验证连接超时值
    const connectTimeoutMs = parseInt(connectTimeout, 10);
    if (isNaN(connectTimeoutMs) || connectTimeoutMs <= 0) {
        console.warn(
            `Invalid MCP_CONNECT_TIMEOUT value: ${connectTimeout}, using default of 30000ms`
        );
    }
    
    // Return the MCP configuration object with mcpServers structure
    // 返回包含mcpServers结构的MCP配置对象
    return {
        mcpServers: {
            'chrome-devtools': {
                command: 'npx',
                args: ['-y', 'chrome-devtools-mcp@latest', `--browserUrl=${browserUrl}`],
                env: {
                    MCP_LAUNCH_TIMEOUT: launchTimeout,
                    MCP_CONNECT_TIMEOUT: connectTimeout
                }
            }
        }
    };
}
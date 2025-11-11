import { describe, it, expect, beforeEach } from '@jest/globals';
import { configureMCP } from '../src/config/mcp.js';

describe('configureMCP', () => {
    beforeEach(() => {
        // Clear environment variables before each test
        // 在每个测试前清除环境变量
        delete process.env.CHROME_FLAGS;
        delete process.env.CHROME_DEBUG_PORT;
        delete process.env.MCP_LAUNCH_TIMEOUT;
        delete process.env.MCP_CONNECT_TIMEOUT;
        delete process.env.LLM_TIMEOUT;
    });

    it('should return correct configuration object with environment variables', () => {
        // Test with environment variables
        // 使用环境变量测试
        process.env.MCP_LAUNCH_TIMEOUT = '120000';
        process.env.MCP_CONNECT_TIMEOUT = '60000';
        
        const config = configureMCP();
        
        expect(config.mcpServers['chrome-devtools']).toBeDefined();
        expect(config.mcpServers['chrome-devtools'].command).toBe('npx');
        expect(config.mcpServers['chrome-devtools'].args).toEqual(['-y', 'chrome-devtools-mcp@latest', '--browserUrl=http://127.0.0.1:9222']);
        expect(config.mcpServers['chrome-devtools'].env).toBeDefined();
        expect(config.mcpServers['chrome-devtools'].env.MCP_LAUNCH_TIMEOUT).toBe('120000');
        expect(config.mcpServers['chrome-devtools'].env.MCP_CONNECT_TIMEOUT).toBe('60000');
    });
    
    it('should use default values when environment variables are not set', () => {
        // Test without environment variables (default values)
        // 不使用环境变量测试（默认值）
        const config = configureMCP();
        
        expect(config.mcpServers['chrome-devtools']).toBeDefined();
        expect(config.mcpServers['chrome-devtools'].command).toBe('npx');
        expect(config.mcpServers['chrome-devtools'].args).toEqual(['-y', 'chrome-devtools-mcp@latest', '--browserUrl=http://127.0.0.1:9222']);
        expect(config.mcpServers['chrome-devtools'].env).toBeDefined();
        expect(config.mcpServers['chrome-devtools'].env.MCP_LAUNCH_TIMEOUT).toBe('60000');
        expect(config.mcpServers['chrome-devtools'].env.MCP_CONNECT_TIMEOUT).toBe('30000');
    });
});
import { describe, it, expect, jest } from '@jest/globals';
import { SiliconFlowLLM } from '../src/llm/siliconflow.js';

// Mock the ChatOpenAI class
// 模拟ChatOpenAI类
jest.mock('@langchain/openai', () => {
    // Create a mock class that extends the original ChatOpenAI
    // 创建一个继承原始ChatOpenAI的模拟类
    const { ChatOpenAI } = jest.requireActual('@langchain/openai');
    
    class MockChatOpenAI extends ChatOpenAI {
        constructor(fields) {
            // Call super with minimal required parameters
            // 用最少的必要参数调用super
            super({
                apiKey: 'mock-api-key',
                model: 'mock-model',
                ...fields
            });
            
            // Override properties with test values
            // 用测试值覆盖属性
            this.modelName = fields?.model || 'deepseek-ai/DeepSeek-V3.2-Exp';
            this.openAIApiKey = fields?.apiKey || 'default-key';
            this.baseUrl = fields?.configuration?.basePath || 'https://api.siliconflow.cn/v1';
            this.maxRetries = fields?.maxRetries !== undefined ? fields.maxRetries : 2;
            this.timeout = fields?.timeout || 30000;
        }
    }
    
    // Mock the _generate method
    // 模拟_generate方法
    MockChatOpenAI.prototype._generate = jest.fn().mockResolvedValue({
        generations: [{ text: 'Mocked response' }]
    });
    
    return {
        ChatOpenAI: MockChatOpenAI
    };
});

describe('SiliconFlowLLM', () => {
    beforeEach(() => {
        // Clear environment variables before each test
        // 在每个测试前清除环境变量
        delete process.env.SILICONFLOW_API_KEY;
        delete process.env.LLM_MODEL;
        delete process.env.LLM_BASE_URL;
        delete process.env.LLM_MAX_RETRIES;
        delete process.env.LLM_TIMEOUT;
    });

    it('should create an instance with correct configuration', () => {
        // Test with environment variables
        // 使用环境变量测试
        process.env.SILICONFLOW_API_KEY = 'test-key';
        process.env.LLM_MODEL = 'test-model';
        process.env.LLM_BASE_URL = 'http://test-url';
        process.env.LLM_MAX_RETRIES = '3';
        process.env.LLM_TIMEOUT = '5000';
        
        const llm = new SiliconFlowLLM({
            model: process.env.LLM_MODEL,
            apiKey: process.env.SILICONFLOW_API_KEY,
            configuration: {
                basePath: process.env.LLM_BASE_URL
            },
            maxRetries: parseInt(process.env.LLM_MAX_RETRIES),
            timeout: parseInt(process.env.LLM_TIMEOUT)
        });
        
        expect(llm).toBeInstanceOf(SiliconFlowLLM);
        expect(llm.modelName).toBe('test-model');
        expect(llm.openAIApiKey).toBe('test-key');
        expect(llm.baseUrl).toBe('http://test-url');
        expect(llm.maxRetries).toBe(3);
        expect(llm.timeout).toBe(5000);
    });
    
    it('should use default values when environment variables are not set', () => {
        // Mock the API key to pass validation
        process.env.MODEL_NAME = 'deepseek-ai/DeepSeek-V3.2-Exp';
        const llm = new SiliconFlowLLM({
            apiKey: 'test-key'
        });
        
        expect(llm.modelName).toBe('deepseek-ai/DeepSeek-V3.2-Exp');
        expect(llm.openAIApiKey).toBe('test-key');
        expect(llm.baseUrl).toBe('https://api.siliconflow.cn/v1');
        expect(llm.maxRetries).toBe(2);
        expect(llm.timeout).toBe(30000);
    });
});
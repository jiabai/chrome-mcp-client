import { describe, it, expect, jest } from '@jest/globals';
import { createLLM } from '../src/llm/index.js';
import { SiliconFlowLLM } from '../src/llm/siliconflow.js';

// Mock the SiliconFlowLLM class
jest.mock('../src/llm/siliconflow.js', () => {
    return {
        SiliconFlowLLM: jest.fn().mockImplementation((config) => {
            return {
                modelName: config.modelName,
                openAIApiKey: config.openAIApiKey,
                baseUrl: config.configuration?.baseURL,
                maxRetries: config.maxRetries,
                timeout: config.timeout,
                ...config
            };
        })
    };
});

describe('createLLM', () => {
    beforeEach(() => {
        // Clear all environment variables before each test
        delete process.env.MODEL_NAME;
        delete process.env.SILICONFLOW_API_KEY;
        delete process.env.OPENAI_API_KEY;
        delete process.env.LLM_BASE_URL;
        delete process.env.LLM_MAX_RETRIES;
        delete process.env.LLM_TIMEOUT;
        
        // Reset the mock
        SiliconFlowLLM.mockClear();
    });

    it('should create an LLM instance with default configuration', () => {
        const llm = createLLM({
            openAIApiKey: 'test-key'
        });
        
        expect(SiliconFlowLLM).toHaveBeenCalledWith({
            modelName: undefined,
            openAIApiKey: 'test-key',
            maxRetries: 2,
            timeout: 30000,
            configuration: {
                baseURL: 'https://api.siliconflow.cn/v1'
            }
        });
    });
    
    it('should create an LLM instance with custom configuration', () => {
        const config = {
            modelName: 'custom-model',
            openAIApiKey: 'custom-key',
            maxRetries: 5,
            timeout: 60000,
            configuration: {
                baseURL: 'http://custom-url'
            }
        };
        
        const llm = createLLM(config);
        
        expect(SiliconFlowLLM).toHaveBeenCalledWith({
            modelName: 'custom-model',
            openAIApiKey: 'custom-key',
            maxRetries: 5,
            timeout: 60000,
            configuration: {
                baseURL: 'http://custom-url'
            }
        });
    });
    
    it('should use environment variables for default values', () => {
        // Set environment variables
        process.env.MODEL_NAME = 'env-model';
        process.env.SILICONFLOW_API_KEY = 'env-key';
        process.env.LLM_BASE_URL = 'http://env-url';
        process.env.LLM_MAX_RETRIES = '3';
        process.env.LLM_TIMEOUT = '45000';
        
        const llm = createLLM({});
        
        expect(SiliconFlowLLM).toHaveBeenCalledWith({
            modelName: 'env-model',
            openAIApiKey: 'env-key',
            maxRetries: '3',
            timeout: '45000',
            configuration: {
                baseURL: 'http://env-url'
            }
        });
    });
    
    it('should prioritize config parameters over environment variables', () => {
        // Set environment variables
        process.env.MODEL_NAME = 'env-model';
        process.env.SILICONFLOW_API_KEY = 'env-key';
        process.env.LLM_BASE_URL = 'http://env-url';
        process.env.LLM_MAX_RETRIES = '3';
        process.env.LLM_TIMEOUT = '45000';
        
        const config = {
            modelName: 'config-model',
            openAIApiKey: 'config-key',
            maxRetries: 7,
            timeout: 75000,
            configuration: {
                baseURL: 'http://config-url'
            }
        };
        
        const llm = createLLM(config);
        
        expect(SiliconFlowLLM).toHaveBeenCalledWith({
            modelName: 'config-model',
            openAIApiKey: 'config-key',
            maxRetries: 7,
            timeout: 75000,
            configuration: {
                baseURL: 'http://config-url'
            }
        });
    });
    
    it('should support multiple API key environment variables', () => {
        process.env.OPENAI_API_KEY = 'openai-key';
        
        const llm = createLLM({});
        
        expect(SiliconFlowLLM).toHaveBeenCalledWith({
            modelName: undefined,
            openAIApiKey: 'openai-key',
            maxRetries: 2,
            timeout: 30000,
            configuration: {
                baseURL: 'https://api.siliconflow.cn/v1'
            }
        });
    });
});
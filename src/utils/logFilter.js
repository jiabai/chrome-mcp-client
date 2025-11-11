/**
 * Temporarily silence specific warning/error logs while executing an operation.
 * 在执行操作期间临时屏蔽指定的警告/错误日志。
 *
 * @param {RegExp | ((message: string) => boolean)} predicate - Filter predicate 过滤条件
 * @param {() => Promise<any>} operation - Operation to execute 执行的操作
 * @returns {Promise<any>} Operation result 操作结果
 */
export async function withLogFilter(predicate, operation) {
    // Validate parameters
    // 验证参数
    if (!(predicate instanceof RegExp || typeof predicate === 'function')) {
        throw new TypeError('Predicate must be a RegExp or function');
    }
    
    if (typeof operation !== 'function') {
        throw new TypeError('Operation must be a function');
    }

    // Store original console methods and stderr.write function
    // 存储原始的console方法和stderr.write函数
    const originalWarn = console.warn;
    const originalError = console.error;
    
    // Store the original stderr.write function with proper typing
    // 存储原始的stderr.write函数并保持正确的类型
    const originalStderrWrite = process.stderr.write.bind(process.stderr);

    // Determine if a message should be filtered based on the predicate
    // 根据谓词确定是否应过滤消息
    const shouldFilter = (message) => {
        if (typeof predicate === 'function') {
            return predicate(message);
        }
        return predicate.test(message);
    };

    // Override console.warn to filter messages
    // 覆盖console.warn以过滤消息
    console.warn = function(...args) {
        const message = args.join(' ');
        if (!shouldFilter(message)) {
            originalWarn.apply(console, args);
        }
    };

    // Override console.error to filter messages
    // 覆盖console.error以过滤消息
    console.error = function(...args) {
        const message = args.join(' ');
        if (!shouldFilter(message)) {
            originalError.apply(console, args);
        }
    };

    // Override stderr.write with proper handling of different parameter combinations
    // 覆盖stderr.write并正确处理不同的参数组合
    process.stderr.write = function(chunk, encoding, callback) {
        // Normalize parameters
        // 规范化参数
        let actualCallback = callback;
        let actualEncoding = encoding;
        
        // Handle different parameter combinations
        // 处理不同的参数组合
        if (typeof encoding === 'function') {
            actualCallback = encoding;
            actualEncoding = 'utf8';
        } else if (typeof chunk === 'function') {
            actualCallback = chunk;
            chunk = '';
            actualEncoding = 'utf8';
        }
        
        const message = chunk.toString();
        if (!shouldFilter(message)) {
            // Call original function with normalized parameters
            // 使用规范化参数调用原始函数
            if (actualCallback) {
                return originalStderrWrite(chunk, actualEncoding, actualCallback);
            }
            return originalStderrWrite(chunk, actualEncoding);
        }
        // If filtered, call callback if provided
        // 如果被过滤掉，则在提供时调用回调
        if (actualCallback) {
            actualCallback(null);
        }
        return true;
    };

    try {
        // Execute the operation with log filtering enabled
        // 执行启用了日志过滤的操作
        return await operation();
    } finally {
        // Restore original functions
        // 恢复原始函数
        console.warn = originalWarn;
        console.error = originalError;
        process.stderr.write = originalStderrWrite;
    }
}
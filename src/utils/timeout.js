/**
 * Execute an asynchronous operation with a timeout guard.
 * 在指定超时时间内执行异步操作，超时则抛出异常。
 *
 * @template T
 * @param {(() => Promise<T>) | Promise<T>} operation - Operation to execute 异步操作
 * @param {number} timeoutMs - Timeout in milliseconds 超时时间（毫秒）
 * @param {Object} [options] - Optional configuration 可选配置
 * @param {string} [options.timeoutMessage] - Timeout error message 超时错误信息
 * @param {string} [options.errorName] - Timeout error name 超时错误名称
 * @param {(error: Error) => void} [options.onTimeout] - Callback when timeout occurs 超时回调
 * @returns {Promise<T>} Result of the operation 操作结果
 */
export function runWithTimeout(operation, timeoutMs, options = {}) {
    // Validate parameters
    // 验证参数
    if (typeof operation !== 'function' && !(operation instanceof Promise)) {
        throw new TypeError('Operation must be a function or Promise');
    }
    
    if (typeof timeoutMs !== 'number') {
        throw new TypeError('Timeout must be a number');
    }
    
    if (!Number.isFinite(timeoutMs)) {
        throw new RangeError('Timeout must be a finite number');
    }
    
    // Validate options object
    // 验证选项对象
    if (typeof options !== 'object' || options === null) {
        throw new TypeError('Options must be an object');
    }
    
    const {
        timeoutMessage = 'Operation timed out',
        errorName = 'TimeoutError',
        onTimeout
    } = options;
    
    // Validate option types
    // 验证选项类型
    if (typeof timeoutMessage !== 'string') {
        throw new TypeError('Timeout message must be a string');
    }
    
    if (typeof errorName !== 'string') {
        throw new TypeError('Error name must be a string');
    }
    
    if (onTimeout && typeof onTimeout !== 'function') {
        throw new TypeError('onTimeout must be a function');
    }

    // If timeout is not positive, execute operation without timeout
    // 如果超时时间不是正数，则不带超时地执行操作
    if (timeoutMs <= 0) {
        return invokeOperation(operation);
    }

    return new Promise((resolve, reject) => {
        let settled = false;
        let timerId = null;

        // Function to clear the timeout timer
        // 清除超时计时器的函数
        const clearTimer = () => {
            if (timerId !== null) {
                clearTimeout(timerId);
                timerId = null;
            }
        };

        // Handle successful completion of the operation
        // 处理操作成功完成
        const handleResolution = (value) => {
            if (settled) {
                return;
            }
            settled = true;
            clearTimer();
            resolve(value);
        };

        // Handle rejection/failure of the operation
        // 处理操作被拒绝/失败
        const handleRejection = (error) => {
            if (settled) {
                return;
            }
            settled = true;
            clearTimer();
            reject(error);
        };

        // Set up the timeout mechanism
        // 设置超时机制
        timerId = setTimeout(() => {
            if (settled) {
                return;
            }
            settled = true;
            const timeoutError = new Error(timeoutMessage);
            timeoutError.name = errorName;
            
            // Execute timeout callback if provided
            // 如果提供了超时回调，则执行它
            if (typeof onTimeout === 'function') {
                try {
                    onTimeout(timeoutError);
                } catch (callbackError) {
                    console.error('Timeout callback failed:', callbackError);
                }
            }
            reject(timeoutError);
        }, timeoutMs);

        // Handle the operation execution
        // 处理操作执行
        invokeOperation(operation)
            .then(handleResolution)
            .catch(handleRejection);
    });
}

/**
 * Invoke the operation regardless of whether it is a promise or a factory function.
 * 兼容传入 Promise 或返回 Promise 的函数。
 *
 * @template T
 * @param {(() => Promise<T>) | Promise<T>} operation - Operation to execute 异步操作
 * @returns {Promise<T>} Result of the operation 操作结果
 */
function invokeOperation(operation) {
    // Validate operation parameter
    // 验证操作参数
    if (typeof operation !== 'function' && !(operation instanceof Promise)) {
        return Promise.reject(new TypeError('Operation must be a function or Promise'));
    }
    
    try {
        // Execute the operation based on its type
        // 根据操作类型执行操作
        if (typeof operation === 'function') {
            return Promise.resolve(operation());
        }
        return Promise.resolve(operation);
    } catch (error) {
        return Promise.reject(error);
    }
}
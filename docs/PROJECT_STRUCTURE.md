# 项目工程化结构设计

## 目录结构

```
chrome-mcp-use/
├── src/                    # 源代码目录
│   ├── core/              # 核心模块
│   │   ├── agent.js       # Agent相关逻辑
│   │   ├── client.js      # Client相关逻辑
│   │   └── index.js       # 核心模块入口
│   ├── config/            # 配置相关
│   │   ├── environment.js # 环境变量配置
│   │   └── mcp.js         # MCP配置
│   ├── llm/               # LLM相关实现
│   │   ├── index.js       # LLM模块入口
│   │   └── siliconflow.js # SiliconFlow LLM实现
│   ├── utils/             # 工具函数
│   │   ├── logger.js      # 日志工具
│   │   └── index.js       # 工具模块入口
│   └── index.js           # 项目主入口
├── tests/                 # 测试目录
│   ├── unit/              # 单元测试
│   ├── integration/       # 集成测试
│   └── fixtures/          # 测试数据
├── docs/                  # 文档目录
├── scripts/               # 脚本目录
├── dist/                  # 构建输出目录
├── .github/               # GitHub相关配置
│   └── workflows/         # CI/CD工作流
├── .vscode/               # VSCode配置
├── .env.example           # 环境变量示例
├── .gitignore             # Git忽略文件
├── package.json           # 项目配置
├── README.md              # 项目说明
├── SECURITY.md            # 安全策略
└── tsconfig.json          # TypeScript配置
```

## 各目录详细说明

### src/ - 源代码目录
存放项目的所有源代码，按照功能模块进行组织。

### src/core/ - 核心模块
包含项目的核心逻辑，如Agent和Client的实现。

### src/config/ - 配置相关
处理项目的各种配置，包括环境变量和MCP配置。

### src/llm/ - LLM相关实现
包含各种LLM的实现，当前主要是SiliconFlow的自定义实现。

### src/utils/ - 工具函数
通用的工具函数，如日志记录等。

### tests/ - 测试目录
包含所有测试代码，分为单元测试和集成测试。

### docs/ - 文档目录
项目相关文档。

### scripts/ - 脚本目录
项目构建、部署等脚本。

### dist/ - 构建输出目录
存放构建后的代码。

### .github/workflows/ - CI/CD工作流
GitHub Actions的配置文件。
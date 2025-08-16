# OpenAI 点菜助手设置指南

## 环境配置

1. 在项目根目录创建 `.env.local` 文件
2. 添加你的 OpenAI API Key：

```
OPENAI_API_KEY=your_openai_api_key_here
```

## 获取 OpenAI API Key

1. 访问 [OpenAI Platform](https://platform.openai.com/)
2. 登录或注册账号
3. 转到 [API Keys](https://platform.openai.com/api-keys) 页面
4. 点击 "Create new secret key"
5. 复制生成的 API Key 并粘贴到 `.env.local` 文件中

## 启动应用

```bash
npm run dev
```

## 功能说明

现在 AI 助手具备以下能力：

### 🤖 智能推荐功能
- 基于自然语言理解用户需求
- 支持多种筛选条件：预算、口味、辣度、饮食限制等
- 自动调用 OpenAI Function Calling 进行菜品推荐

### 💬 自然对话
- 用户可以用自然语言表达需求，如：
  - "我想要点一些不辣的菜，预算在50元以内"
  - "推荐几道适合晚餐的菜，要有荤有素"
  - "我不能吃牛肉，有什么好推荐的吗？"

### 🔧 Function Calling 参数
系统会自动识别并提取以下信息：
- `budget_range`: 预算范围 (low/medium/high)
- `cuisine_preference`: 菜系偏好 (热菜、小炒、主食等)
- `spicy_tolerance`: 辣度承受能力 (0-2)
- `dietary_restrictions`: 饮食限制
- `preferred_ingredients`: 偏好食材
- `nutrition_focus`: 营养关注点
- `meal_purpose`: 用餐目的

## 注意事项

- 确保 OpenAI API Key 有足够的额度
- 建议使用 GPT-4 模型以获得更好的推荐效果
- API 调用可能产生费用，请合理使用 
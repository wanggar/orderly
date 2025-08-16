// 测试 OpenAI 集成的简单脚本
const fetch = require('node-fetch');

async function testChatAPI() {
  try {
    console.log('🧪 测试 Chat API...');
    
    const response = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: "我想要一些不辣的菜，预算在30元以内",
        conversationHistory: []
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    console.log('✅ API 调用成功!');
    console.log('📝 响应类型:', data.type);
    console.log('💬 AI 回复:', data.content);
    
    if (data.menuItems && data.menuItems.length > 0) {
      console.log('🍽️ 推荐菜品数量:', data.menuItems.length);
      console.log('📋 推荐菜品:');
      data.menuItems.forEach((item, index) => {
        console.log(`  ${index + 1}. ${item.name} - ¥${item.price} (${item.category})`);
      });
    }
    
    if (data.functionCall) {
      console.log('🔧 Function Call 参数:', JSON.stringify(data.functionCall.parameters, null, 2));
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('💡 提示: 请确保开发服务器正在运行 (npm run dev)');
    }
  }
}

// 测试多个场景
async function runTests() {
  const testCases = [
    "我想要一些不辣的菜，预算在30元以内",
    "推荐几道适合晚餐的菜，要有荤有素",
    "我不能吃牛肉，有什么清淡的菜推荐？",
    "想要点一些汉堡和饮品",
    "有什么高蛋白的健康餐推荐吗？"
  ];

  for (let i = 0; i < testCases.length; i++) {
    console.log(`\n🎯 测试案例 ${i + 1}: "${testCases[i]}"`);
    console.log('=' + '='.repeat(50));
    
    try {
      const response = await fetch('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: testCases[i],
          conversationHistory: []
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ 成功:', data.type);
        console.log('💬 回复:', data.content?.slice(0, 100) + '...');
        console.log('🍽️ 推荐菜品:', data.menuItems?.length || 0, '道');
      } else {
        console.log('❌ 失败:', response.status);
      }
    } catch (error) {
      console.log('❌ 错误:', error.message);
      break; // 如果服务器没运行，停止测试
    }

    // 避免过快请求
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

// 检查是否传入了 --all 参数来运行所有测试
if (process.argv.includes('--all')) {
  runTests();
} else {
  testChatAPI();
} 
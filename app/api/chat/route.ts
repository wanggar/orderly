import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import menuData from '@/data/menu.json';
import { MenuItem } from '@/types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Define the tool schema for menu recommendation
const recommendMenuTool = {
  type: "function" as const,
  function: {
    name: "recommend_menu",
    description: "基于用户的需求和偏好推荐合适的菜品",
    parameters: {
      type: "object",
      properties: {
        budget_range: {
          type: "string",
          enum: ["10-30", "30-50", "50-100"],
          description: "预算范围：10-30元、30-50元、50-100元"
        },
        cuisine_preference: {
          type: "array",
          items: {
            type: "string",
            enum: ["热菜", "小炒", "蒸菜", "汤品", "主食", "汉堡", "饮品", "小食", "甜品", "配菜", "牛排", "沙拉", "披萨", "意面", "加价升级"]
          },
          description: "菜系偏好"
        },
        spicy_tolerance: {
          type: "number",
          minimum: 0,
          maximum: 2,
          description: "辣度承受能力：0(不辣), 1(微辣), 2(中辣)"
        },
        dietary_restrictions: {
          type: "array",
          items: {
            type: "string"
          },
          description: "饮食限制或忌口食材"
        },
        meal_purpose: {
          type: "string",
          enum: ["正餐", "小食", "下午茶", "夜宵", "聚餐", "工作餐", "健康餐"],
          description: "用餐目的"
        },
        preferred_ingredients: {
          type: "array",
          items: {
            type: "string"
          },
          description: "偏好的食材"
        },
        nutrition_focus: {
          type: "string",
          enum: ["high_protein", "low_calorie", "balanced", "no_preference"],
          description: "营养关注点"
        },
        number_of_recommendations: {
          type: "number",
          minimum: 1,
          maximum: 10,
          default: 6,
          description: "推荐菜品数量"
        }
      },
      required: ["number_of_recommendations"]
    }
  }
};

// AI-powered menu recommendation logic
async function recommendMenu(params: any): Promise<MenuItem[]> {
  const allMenuItems: MenuItem[] = menuData.map(item => ({
    id: item.id.toString(),
    name: item.name,
    description: item.description || '',
    price: typeof item.price === 'string' ? parseFloat(item.price) : item.price,
    category: item.category || '',
    spicyLevel: item.spicyLevel || 0,
    ingredients: item.ingredients || [],
    nutrition: item.nutrition
  }));

  // Create a comprehensive menu context for AI analysis
  const menuContext = allMenuItems.map(item => ({
    id: item.id,
    name: item.name,
    description: item.description,
    price: item.price,
    category: item.category,
    spicyLevel: item.spicyLevel === 0 ? '不辣' : item.spicyLevel === 1 ? '微辣' : '中辣',
    ingredients: item.ingredients.join(', '),
    nutrition: item.nutrition ? `热量${item.nutrition.calories}卡, 蛋白质${item.nutrition.protein}g, 脂肪${item.nutrition.fat}g, 碳水${item.nutrition.carbs}g` : '营养信息暂无'
  }));

  // Build user requirements context
  const userRequirements = {
    budget: params.budget_range || '不限',
    cuisinePreferences: params.cuisine_preference?.join(', ') || '无特殊偏好',
    spicyTolerance: params.spicy_tolerance === 0 ? '不能吃辣' : params.spicy_tolerance === 1 ? '能吃微辣' : '能吃中辣',
    dietaryRestrictions: params.dietary_restrictions?.join(', ') || '无忌口',
    preferredIngredients: params.preferred_ingredients?.join(', ') || '无特殊偏好',
    nutritionFocus: params.nutrition_focus === 'high_protein' ? '高蛋白' : 
                   params.nutrition_focus === 'low_calorie' ? '低卡路里' : 
                   params.nutrition_focus === 'balanced' ? '营养均衡' : '无特殊要求',
    mealPurpose: params.meal_purpose || '正餐',
    recommendationCount: params.number_of_recommendations || 6
  };

  try {
    const aiRecommendationPrompt = `你是一位专业的餐厅推荐师，需要根据用户需求从菜单中智能推荐合适的菜品。

用户需求：
- 预算范围：${userRequirements.budget}
- 菜系偏好：${userRequirements.cuisinePreferences}  
- 辣度承受：${userRequirements.spicyTolerance}
- 饮食忌口：${userRequirements.dietaryRestrictions}
- 偏好食材：${userRequirements.preferredIngredients}
- 营养关注：${userRequirements.nutritionFocus}
- 用餐目的：${userRequirements.mealPurpose}
- 推荐数量：${userRequirements.recommendationCount}道

可选菜单（JSON格式）：
${JSON.stringify(menuContext, null, 2)}

请根据用户需求，从菜单中智能推荐最合适的菜品。推荐时请考虑：
1. 营养搭配均衡（主食、菜品、汤品等）
2. 口味层次丰富（不要都是同一种口味）
3. 价格合理搭配（有贵有便宜，性价比高）
4. 严格遵守用户的饮食限制和偏好
5. 推荐理由要具体且有说服力

请只返回推荐的菜品ID数组，格式为：["id1", "id2", "id3", ...]
不要包含任何其他文字说明，只返回纯JSON数组。`;

    const aiResponse = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: '你是一位专业的餐厅推荐师，精通营养搭配和菜品推荐。你必须严格按照用户要求返回菜品ID的JSON数组，不能返回菜单中不存在的ID。'
        },
        {
          role: 'user',
          content: aiRecommendationPrompt
        }
      ],
      temperature: 0.7,
      max_tokens: 500
    });

    let recommendedIds: string[] = [];
    try {
      const responseContent = aiResponse.choices[0].message.content?.trim() || '[]';
      recommendedIds = JSON.parse(responseContent);
    } catch (parseError) {
      console.warn('AI推荐响应解析失败，使用默认推荐:', parseError);
      // 如果AI响应解析失败，返回一些经典搭配作为后备
      recommendedIds = ['hongshaorou-quail-eggs', 'tomato-egg-stirfry', 'rice', 'tomato-egg-soup'];
    }

    // 验证推荐的ID是否有效，并获取对应的菜品
    const validRecommendations = recommendedIds
      .map(id => allMenuItems.find(item => item.id === id))
      .filter((item): item is MenuItem => item !== undefined)
      .slice(0, params.number_of_recommendations || 6);

    // 如果AI推荐的有效菜品不足，补充一些经典菜品
    if (validRecommendations.length < (params.number_of_recommendations || 6)) {
      const classicItems = allMenuItems
        .filter(item => !validRecommendations.find(rec => rec.id === item.id))
        .sort((a, b) => {
          // 优先推荐评价高的经典菜品（这里用价格作为人气指标）
          const scoreA = (a.nutrition?.protein || 0) / Math.sqrt(a.price);
          const scoreB = (b.nutrition?.protein || 0) / Math.sqrt(b.price);
          return scoreB - scoreA;
        })
        .slice(0, (params.number_of_recommendations || 6) - validRecommendations.length);
      
      validRecommendations.push(...classicItems);
    }

    return validRecommendations;

  } catch (error) {
    console.error('AI推荐失败，使用默认推荐:', error);
    // AI推荐失败时的后备策略：返回一些经典菜品组合
    const fallbackIds = ['hongshaorou-quail-eggs', 'gongbao-chicken', 'tomato-egg-stirfry', 'rice', 'tomato-egg-soup', 'steamed-egg'];
    return fallbackIds
      .map(id => allMenuItems.find(item => item.id === id))
      .filter((item): item is MenuItem => item !== undefined)
      .slice(0, params.number_of_recommendations || 6);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { message, conversationHistory } = await request.json();

    const messages = [
      {
        role: 'system' as const,
        content: `你是这个餐厅的AI点餐助手，专门为客户推荐合适的菜品。你的行为规范：

1. 服务态度：保持热心友好，具备丰富的饮食文化知识
2. 自我介绍：当客户问你是谁时，回答"我是这个餐厅的点餐助手"
3. 对话流程：
   - 如果是新客户（对话历史很少），首先询问客户想要吃中餐还是西餐
   - 接着询问客户的预算范围
   - 然后主动推荐菜品，不要一直询问客户的想法
4. 推荐策略：
   - 当客户需要推荐菜品时，你必须调用recommend_menu函数来展示菜品卡片
   - 你只能推荐菜单中现有的菜品，绝不能推荐菜单中不存在的菜品
   - 如果客户的需求无法用现有菜品满足，你必须诚实告知"很抱歉，我们的菜单暂时没有符合您需求的菜品"
   - 绝不能凭想象推荐不存在的菜品
5. 问答服务：当客户需要你解答问题时，提供详细、专业的回答
6. 基于上下文：利用完整的对话历史来给出个性化的回答

重要规则：
- 推荐菜品时必须调用recommend_menu函数，不能只在文字中描述菜品
- 只能推荐菜单中实际存在的菜品
- 如果没有合适的菜品，要诚实告知客户
回复时要热情友好，体现餐厅专业服务水平，使用中文。`
      },
      ...conversationHistory,
      {
        role: 'user' as const,
        content: message
      }
    ];

    // 检查用户消息是否包含推荐请求关键词
    const isRecommendationRequest = /推荐|建议|什么菜|吃什么|来点|要点|想要|适合|菜品|菜单|点菜|中餐|西餐|热菜|小炒|汤品|主食|饮品|需要|健身|高蛋白|低卡|营养|清淡|有什么|给我/.test(message.toLowerCase());
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages,
      tools: [recommendMenuTool],
      tool_choice: isRecommendationRequest ? { type: "function", function: { name: "recommend_menu" } } : 'auto',
      temperature: 0.7,
      max_tokens: 1000
    });

    const responseMessage = completion.choices[0].message;

    // Check if tool was called
    if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
      const toolCall = responseMessage.tool_calls[0];
      
      if (toolCall.type === 'function' && toolCall.function.name === 'recommend_menu') {
        const functionArgs = JSON.parse(toolCall.function.arguments);
        const recommendations = await recommendMenu(functionArgs);
        
        // 如果没有找到匹配的菜品，返回明确的无法满足需求的回复
        if (recommendations.length === 0) {
          return NextResponse.json({
            type: 'conversation',
            content: '很抱歉，根据您的需求我们的菜单暂时没有合适的菜品推荐。请您换个要求试试，比如调整预算范围、辣度要求或者菜系偏好，我会尽力为您找到满意的菜品！'
          });
        }
        
        // Generate a natural response with the recommendations
        const followUpCompletion = await openai.chat.completions.create({
          model: 'gpt-4',
          messages: [
            ...messages,
            {
              role: 'assistant' as const,
              content: responseMessage.content,
              tool_calls: responseMessage.tool_calls
            },
            {
              role: 'tool' as const,
              tool_call_id: toolCall.id,
              content: JSON.stringify(recommendations)
            }
          ],
          temperature: 0.7,
          max_tokens: 500
        });

        return NextResponse.json({
          type: 'recommendation',
          content: followUpCompletion.choices[0].message.content,
          menuItems: recommendations,
          functionCall: {
            name: toolCall.type === 'function' ? toolCall.function.name : 'unknown',
            parameters: functionArgs
          }
        });
      }
    }

    // Regular conversation response
    return NextResponse.json({
      type: 'conversation',
      content: responseMessage.content
    });

  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 
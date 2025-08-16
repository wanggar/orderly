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
          enum: ["low", "medium", "high"],
          description: "预算范围：low(20元以下), medium(20-50元), high(50元以上)"
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

// Menu recommendation logic
function recommendMenu(params: any): MenuItem[] {
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

  let filteredItems = [...allMenuItems];

  // Filter by budget
  if (params.budget_range) {
    switch (params.budget_range) {
      case 'low':
        filteredItems = filteredItems.filter(item => item.price < 20);
        break;
      case 'medium':
        filteredItems = filteredItems.filter(item => item.price >= 20 && item.price <= 50);
        break;
      case 'high':
        filteredItems = filteredItems.filter(item => item.price > 50);
        break;
    }
  }

  // Filter by cuisine preference
  if (params.cuisine_preference?.length > 0) {
    filteredItems = filteredItems.filter(item => 
      params.cuisine_preference.includes(item.category)
    );
  }

  // Filter by spicy tolerance
  if (typeof params.spicy_tolerance === 'number') {
    filteredItems = filteredItems.filter(item => 
      (item.spicyLevel || 0) <= params.spicy_tolerance
    );
  }

  // Filter by dietary restrictions
  if (params.dietary_restrictions?.length > 0) {
    filteredItems = filteredItems.filter(item => {
      const itemIngredients = item.ingredients.join(' ').toLowerCase();
      return !params.dietary_restrictions.some((restriction: string) => 
        itemIngredients.includes(restriction.toLowerCase())
      );
    });
  }

  // Filter by preferred ingredients
  if (params.preferred_ingredients?.length > 0) {
    filteredItems = filteredItems.filter(item => {
      const itemIngredients = item.ingredients.join(' ').toLowerCase();
      return params.preferred_ingredients.some((ingredient: string) => 
        itemIngredients.includes(ingredient.toLowerCase())
      );
    });
  }

  // Nutrition-based filtering
  if (params.nutrition_focus) {
    switch (params.nutrition_focus) {
      case 'high_protein':
        filteredItems = filteredItems.filter(item => 
          item.nutrition && item.nutrition.protein >= 20
        );
        break;
      case 'low_calorie':
        filteredItems = filteredItems.filter(item => 
          item.nutrition && item.nutrition.calories <= 300
        );
        break;
    }
  }

  // Sort by relevance (price-performance ratio for now)
  filteredItems.sort((a, b) => {
    const aRatio = (a.nutrition?.protein || 0) / a.price;
    const bRatio = (b.nutrition?.protein || 0) / b.price;
    return bRatio - aRatio;
  });

  // Return requested number of recommendations
  return filteredItems.slice(0, params.number_of_recommendations || 6);
}

export async function POST(request: NextRequest) {
  try {
    const { message, conversationHistory } = await request.json();

    const messages = [
      {
        role: 'system' as const,
        content: `你是一个智能点餐助手，专门为用户推荐合适的菜品。你需要：
1. 理解用户的自然语言需求（口味偏好、预算、忌口、用餐场景等）
2. 调用recommend_menu函数来获取推荐结果
3. 用友好、自然的语言介绍推荐的菜品

当需要推荐菜品时，请调用recommend_menu函数。如果用户的需求不够明确，可以询问更多细节。
回复时要热情友好，使用中文。`
      },
      ...conversationHistory,
      {
        role: 'user' as const,
        content: message
      }
    ];

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages,
      tools: [recommendMenuTool],
      tool_choice: 'auto',
      temperature: 0.7,
      max_tokens: 1000
    });

    const responseMessage = completion.choices[0].message;

    // Check if tool was called
    if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
      const toolCall = responseMessage.tool_calls[0];
      
      if (toolCall.type === 'function' && toolCall.function.name === 'recommend_menu') {
        const functionArgs = JSON.parse(toolCall.function.arguments);
        const recommendations = recommendMenu(functionArgs);
        
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
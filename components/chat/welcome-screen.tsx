'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Utensils, Users, MessageCircle, Clock } from "lucide-react";

interface WelcomeScreenProps {
  onStartChat: () => void;
}

export function WelcomeScreen({ onStartChat }: WelcomeScreenProps) {
  const features = [
    {
      icon: <Utensils className="w-6 h-6 text-[#FF6B2D]" />,
      title: "智能推荐",
      description: "根据你的口味和预算推荐最合适的菜品"
    },
    {
      icon: <Users className="w-6 h-6 text-[#FF6B2D]" />,
      title: "多人聚餐",
      description: "支持多人点菜，自动整合所有人的偏好"
    },
    {
      icon: <MessageCircle className="w-6 h-6 text-[#FF6B2D]" />,
      title: "自然对话",
      description: "像和朋友聊天一样轻松完成点菜"
    },
    {
      icon: <Clock className="w-6 h-6 text-[#FF6B2D]" />,
      title: "快速高效",
      description: "几个问题就能生成完整菜单，节省时间"
    }
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <div className="text-center mb-8">
        <div className="text-6xl mb-4">🍽️</div>
        <h1 className="text-3xl font-bold text-[#333333] mb-2">AI 点菜助手</h1>
        <p className="text-gray-600 text-lg">让点菜变得简单有趣</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 max-w-2xl">
        {features.map((feature, index) => (
          <Card key={index} className="border-none shadow-sm bg-white/50">
            <CardContent className="p-4 text-center">
              <div className="flex justify-center mb-2">
                {feature.icon}
              </div>
              <h3 className="font-medium text-[#333333] mb-1">{feature.title}</h3>
              <p className="text-sm text-gray-600">{feature.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      
      <Button
        onClick={onStartChat}
        className="bg-[#FF6B2D] hover:bg-[#FF6B2D]/90 text-white font-medium px-8 py-3 text-lg"
      >
        开始点菜 🚀
      </Button>
      
      <p className="text-sm text-gray-500 mt-4">
        开始为您推荐美味的菜品～
      </p>
    </div>
  );
}
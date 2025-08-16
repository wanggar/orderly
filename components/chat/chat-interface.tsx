'use client';

import { useState, useRef, useEffect } from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MessageBubble } from './message-bubble';
import { OptionsSelector } from './options-selector';
import { DishCard } from './dish-card';
import { TypingIndicator } from './typing-indicator';
import { WelcomeScreen } from './welcome-screen';
import { ShoppingCartBar } from '../cart/shopping-cart-bar';
import { CartDialog } from '../cart/cart-dialog';
import { DishDetailsPanel } from '../side-panel/dish-details-panel';
import { Message, ChatState, MenuItem } from '@/types';
import { Send, Mic } from 'lucide-react';
import menuData from '@/data/menu.json';
import { sendChatMessage, convertMessagesToHistory } from '@/lib/chat-api';

type RawMenuItem = {
  id: string | number;
  name: string;
  description?: string;
  price: number | string;
  image?: string;
  category?: string;
  spicyLevel?: number;
  ingredients?: string[];
  recommendations?: string;
  reviews?: { id: string; rating: number; comment: string; author: string }[];
  nutrition?: { calories: number; carbs: number; protein: number; fat: number };
};

// Normalize JSON data to MenuItem[] (ensure required fields)
const allMenuItems: MenuItem[] = (menuData as RawMenuItem[]).map((item) => ({
  id: String(item.id),
  name: item.name,
  description: item.description ?? '',
  price: Number(item.price),
  image: item.image,
  category: item.category ?? '其他',
  spicyLevel: item.spicyLevel,
  ingredients: Array.isArray(item.ingredients) ? item.ingredients : [],
  recommendations: item.recommendations,
  reviews: item.reviews,
  nutrition: item.nutrition,
}));

export function ChatInterface() {
  const [chatState, setChatState] = useState<ChatState>({
    messages: [],
    currentStep: 'welcome',
    userProfile: {},
    cart: [],
    selectedDish: null,
    sidePanelOpen: false,
  });

  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [cartDialogOpen, setCartDialogOpen] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const startChat = () => {
    setShowWelcome(false);
    addMessage({
      id: '1',
      type: 'ai',
      content: '你好！我是你的AI点菜助手 🍽️ 我可以根据您的口味偏好、预算和饮食需求为您推荐合适的菜品。请告诉我您今天想吃什么样的菜，或者有什么特殊要求吗？'
    });
    setChatState(prev => ({ ...prev, currentStep: 'chat' }));
  };

  // Auto scroll to bottom
  useEffect(() => {
    if (messagesEndRef.current && scrollAreaRef.current) {
      // Use scrollTop instead of scrollIntoView to prevent layout shifts
      const scrollContainer = scrollAreaRef.current.querySelector('[data-slot="scroll-area-viewport"]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [chatState.messages]);

  const addMessage = (message: Omit<Message, 'timestamp'>) => {
    setChatState(prev => ({
      ...prev,
      messages: [...prev.messages, { ...message, timestamp: new Date() }]
    }));
  };

  const handlePeopleCountSelection = (count: string) => {
    addMessage({
      id: Date.now().toString(),
      type: 'user',
      content: `我选择：${count}`
    });

    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      addMessage({
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: '好的！现在想了解一下你的预算，这样我能为你推荐最合适的菜品 💰',
        options: ['100元以下', '100-200元', '200-500元', '500元以上'],
        component: 'options-selector'
      });
      setChatState(prev => ({ ...prev, currentStep: 'budget' }));
    }, 1500);
  };

  const handleBudgetSelection = (budget: string) => {
    addMessage({
      id: Date.now().toString(),
      type: 'user',
      content: `我选择：${budget}`
    });

    // Update user profile with budget
    setChatState(prev => ({ 
      ...prev, 
      userProfile: { ...prev.userProfile, budget }
    }));

    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      addMessage({
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: '太好了！那你更喜欢中餐还是西餐呢？🍜🍝',
        options: ['中餐', '西餐'],
        component: 'options-selector'
      });
      setChatState(prev => ({ ...prev, currentStep: 'cuisine-preference' }));
    }, 1500);
  };

  const handleCuisineSelection = (cuisine: string) => {
    addMessage({
      id: Date.now().toString(),
      type: 'user',
      content: `我选择：${cuisine}`
    });

    // Update user profile with cuisine preference
    const cuisineType = cuisine === '中餐' ? 'chinese' : 'western';
    setChatState(prev => ({ 
      ...prev, 
      userProfile: { ...prev.userProfile, cuisineType }
    }));

    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      addMessage({
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: '太棒了！根据你的喜好，我为你推荐了几道菜，快来看看吧 👇',
        menuItems: allMenuItems.slice(0, 6),
        component: 'menu-recommendations'
      });
      setChatState(prev => ({ ...prev, currentStep: 'recommendations' }));
    }, 1500);
  };

  // Generic option selection handler that routes to the appropriate function
  const handleOptionSelection = (option: string) => {
    switch (chatState.currentStep) {
      case 'welcome':
        handlePeopleCountSelection(option);
        break;
      case 'budget':
        handleBudgetSelection(option);
        break;
      case 'cuisine-preference':
        handleCuisineSelection(option);
        break;
      default:
        handlePeopleCountSelection(option);
    }
  };

  const handlePreferencesInput = () => {
    if (!inputValue.trim()) return;

    addMessage({
      id: Date.now().toString(),
      type: 'user',
      content: inputValue
    });

    setInputValue('');

    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      addMessage({
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: '太棒了！根据你的喜好，我为你推荐了几道菜，快来看看吧 👇',
        menuItems: allMenuItems.slice(0, 6),
        component: 'menu-recommendations'
      });
      setChatState(prev => ({ ...prev, currentStep: 'recommendations' }));
    }, 1500);
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;
    
    if (chatState.currentStep === 'preferences') {
      handlePreferencesInput();
      return;
    }

    const userMessage = inputValue;
    addMessage({
      id: Date.now().toString(),
      type: 'user',
      content: userMessage
    });

    setInputValue('');
    setIsTyping(true);

    try {
      // Convert current messages to conversation history
      const conversationHistory = convertMessagesToHistory(chatState.messages);
      
      // Send message to OpenAI API
      const response = await sendChatMessage(userMessage, conversationHistory);
      
      setIsTyping(false);
      
      // Add AI response
      addMessage({
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: response.content,
        menuItems: response.menuItems,
        component: response.menuItems && response.menuItems.length > 0 ? 'menu-recommendations' : undefined
      });
      
      // Update chat state if recommendations were provided
      if (response.type === 'recommendation' && response.menuItems && response.menuItems.length > 0) {
        setChatState(prev => ({ ...prev, currentStep: 'recommendations' }));
      }
      
    } catch (error) {
      setIsTyping(false);
      addMessage({
        id: (Date.now() + 2).toString(),
        type: 'ai',
        content: '抱歉，我现在遇到了一些技术问题。请稍后再试，或者告诉我您的具体需求，我会尽力帮助您！'
      });
    }
  };

  const getAIResponse = (userInput: string): string => {
    const input = userInput.toLowerCase();
    
    if (input.includes('辣')) {
      return '根据你选的菜品，宫保鸡丁是中辣的，其他都比较清淡哦！如果不能吃辣，建议选番茄牛腩汤和清蒸鲈鱼 😊';
    }
    if (input.includes('女生') || input.includes('适合')) {
      return '番茄牛腩汤特别适合女生，营养丰富还暖胃！清蒸鲈鱼也很棒，清淡健康 💕';
    }
    if (input.includes('油腻')) {
      return '清蒸鲈鱼最清爽，完全不油腻！番茄牛腩汤也很清淡。宫保鸡丁会稍微油一些，但很香～';
    }
    if (input.includes('推荐') || input.includes('建议')) {
      return '根据你的选择，我建议这样搭配：宫保鸡丁（主菜）+ 番茄牛腩汤（汤品）+ 清蒸鲈鱼（清淡），营养均衡又美味！';
    }
    
    return '我理解你的意思！还有什么想了解的可以继续问我哦～ 或者你可以点击菜品卡片查看更多详情 😊';
  };

  const handleAddToCart = (dish: MenuItem) => {
    setChatState(prev => {
      const existingItem = prev.cart.find(item => item.id === dish.id);
      const newCart = existingItem
        ? prev.cart.map(item => 
            item.id === dish.id 
              ? { ...item, quantity: item.quantity + 1 }
              : item
          )
        : [...prev.cart, { ...dish, quantity: 1 }];
      
      return { ...prev, cart: newCart };
    });

    addMessage({
      id: Date.now().toString(),
      type: 'system',
      content: `${dish.name} 已添加到购物车`
    });
  };

  const handleViewDetails = (dish: MenuItem) => {
    setChatState(prev => ({
      ...prev,
      selectedDish: dish,
      sidePanelOpen: true
    }));
  };

  const handleAskQuestion = (question: string) => {
    // Keep the side panel open when asking questions
    
    addMessage({
      id: Date.now().toString(),
      type: 'user',
      content: question
    });

    setTimeout(() => {
      addMessage({
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: getAIResponse(question)
      });
    }, 500);
  };

  const handleUpdateQuantity = (itemId: string, quantity: number) => {
    setChatState(prev => ({
      ...prev,
      cart: quantity === 0 
        ? prev.cart.filter(item => item.id !== itemId)
        : prev.cart.map(item => 
            item.id === itemId ? { ...item, quantity } : item
          )
    }));
  };

  const handleRemoveItem = (itemId: string) => {
    setChatState(prev => ({
      ...prev,
      cart: prev.cart.filter(item => item.id !== itemId)
    }));
  };

  const handleClearCart = () => {
    setChatState(prev => ({ ...prev, cart: [] }));
  };

  const handleCheckout = () => {
    addMessage({
      id: Date.now().toString(),
      type: 'ai',
      content: '太棒了！你的菜单已经准备好了，马上就可以下单了 🎉 祝你用餐愉快！'
    });
  };

  const handleOpenCart = () => {
    setCartDialogOpen(true);
  };

  // 获取菜品在购物车中的数量
  const getDishQuantity = (dishId: string): number => {
    const cartItem = chatState.cart.find(item => item.id === dishId);
    return cartItem ? cartItem.quantity : 0;
  };

  return (
    <div className="flex h-screen bg-[#FFFBF5]">
      {/* Main Chat Area */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Header */}
        <div className="bg-white border-b border-[#DDDDDD] px-4 py-3 flex-shrink-0">
          <h1 className="text-lg font-semibold text-[#333333]">AI 点菜助手</h1>
        </div>

        {/* Chat Messages - Now properly constrained */}
        <div className="flex-1 min-h-0 flex flex-col">
          <ScrollArea className="flex-1 px-4 py-4 h-full overflow-hidden" ref={scrollAreaRef}>
            <div className="max-w-2xl mx-auto space-y-4">
              {showWelcome ? (
                <WelcomeScreen onStartChat={startChat} />
              ) : (
                <>
                  {chatState.messages.map((message) => (
                    <div key={message.id} className="animate-fade-in">
                      <MessageBubble message={message} isUser={message.type === 'user'} />
                      
                      {/* Render interactive components */}
                      {message.component === 'options-selector' && message.options && (
                        <OptionsSelector
                          options={message.options}
                          onSelect={handleOptionSelection}
                        />
                      )}
                      
                      {message.component === 'menu-recommendations' && message.menuItems && (
                        <div className="grid grid-cols-2 gap-3 mb-4">
                          {message.menuItems.map(dish => (
                            <DishCard
                              key={dish.id}
                              dish={dish}
                              quantity={getDishQuantity(dish.id)}
                              onAddToCart={handleAddToCart}
                              onUpdateQuantity={handleUpdateQuantity}
                              onViewDetails={handleViewDetails}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {isTyping && <TypingIndicator />}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>
          </ScrollArea>

          {/* Shopping Cart Bar - Fixed position */}
          <div className="flex-shrink-0">
            <ShoppingCartBar
              items={chatState.cart}
              onUpdateQuantity={handleUpdateQuantity}
              onRemoveItem={handleRemoveItem}
              onClearCart={handleClearCart}
              onCheckout={handleCheckout}
              onOpenCart={handleOpenCart}
            />
          </div>

          {/* Input Area - Fixed at bottom */}
          {!showWelcome && (
            <div className="bg-white border-t border-[#DDDDDD] p-4 flex-shrink-0">
              <div className="max-w-2xl mx-auto flex gap-2">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="输入你的问题或偏好..."
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  className="flex-1"
                />
                <Button
                  onClick={handleSendMessage}
                  className="bg-[#FF6B2D] hover:bg-[#FF6B2D]/90"
                  size="icon"
                >
                  <Send className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="icon">
                  <Mic className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Dish Details Side Panel */}
      <DishDetailsPanel
        dish={chatState.selectedDish}
        isOpen={chatState.sidePanelOpen}
        onClose={() => setChatState(prev => ({ ...prev, sidePanelOpen: false, selectedDish: null }))}
        onAddToCart={handleAddToCart}
        onUpdateQuantity={handleUpdateQuantity}
        onAskQuestion={handleAskQuestion}
        onViewDetails={handleViewDetails}
        quantity={chatState.selectedDish ? getDishQuantity(chatState.selectedDish.id) : 0}
      />

      {/* Cart Dialog */}
      <CartDialog
        isOpen={cartDialogOpen}
        onClose={() => setCartDialogOpen(false)}
        items={chatState.cart}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onClearCart={handleClearCart}
        onCheckout={handleCheckout}
      />
    </div>
  );
}
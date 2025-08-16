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
      content: '你好！我是这个餐厅的点餐助手 🍽️ 很高兴为您服务！请问您今天想要吃中餐还是西餐呢？',
      options: ['中餐', '西餐'],
      component: 'options-selector'
    });
    setChatState(prev => ({ ...prev, currentStep: 'cuisine-preference' }));
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



  const handleBudgetSelection = async (budget: string) => {
    addMessage({
      id: Date.now().toString(),
      type: 'user',
      content: `我选择：${budget}元`
    });

    // Update user profile with budget
    setChatState(prev => ({ 
      ...prev, 
      userProfile: { ...prev.userProfile, budget }
    }));

    setIsTyping(true);

    try {
      // 让AI基于中餐/西餐偏好和预算主动推荐菜品
      const currentProfile = chatState.userProfile;
      const cuisineText = currentProfile.cuisineType === 'chinese' ? '中餐' : '西餐';
      const requestMessage = `我想要${cuisineText}，预算是${budget}元，请为我推荐一些菜品`;
      
      // Convert current messages to conversation history
      const conversationHistory = convertMessagesToHistory(chatState.messages);
      
      // Send message to OpenAI API
      const response = await sendChatMessage(requestMessage, conversationHistory);
      
      setIsTyping(false);
      
      // Add AI response with recommendations
      addMessage({
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: response.content,
        menuItems: response.menuItems,
        component: response.menuItems && response.menuItems.length > 0 ? 'menu-recommendations' : undefined
      });
      
      setChatState(prev => ({ ...prev, currentStep: 'recommendations' }));
      
    } catch (error) {
      setIsTyping(false);
      console.error('API调用失败:', error);
      
      // 如果API调用失败，给出一个通用回复，引导用户重新尝试
      addMessage({
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: `好的，您选择了${budget}元的预算！现在请告诉我您想要什么类型的菜品，比如"我想要一些下饭的热菜"或"来点不辣的主食"，我会为您推荐合适的菜品！`,
      });
      setChatState(prev => ({ ...prev, currentStep: 'recommendations' }));
    }
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
        content: '好的！现在想了解一下您的预算范围，这样我能为您推荐最合适的菜品 💰',
        options: ['10-30', '30-50', '50-100'],
        component: 'options-selector'
      });
      setChatState(prev => ({ ...prev, currentStep: 'budget' }));
    }, 1500);
  };

  // Generic option selection handler that routes to the appropriate function
  const handleOptionSelection = (option: string) => {
    switch (chatState.currentStep) {
      case 'cuisine-preference':
        handleCuisineSelection(option);
        break;
      case 'budget':
        handleBudgetSelection(option);
        break;
      default:
        // Default handling for any other cases
        break;
    }
  };

  const handlePreferencesInput = async () => {
    if (!inputValue.trim()) return;

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
      
      setChatState(prev => ({ ...prev, currentStep: 'recommendations' }));
      
    } catch (error) {
      setIsTyping(false);
      console.error('API调用失败，使用默认回复:', error);
      
      // 如果API调用失败，给出一个通用回复，让用户重新尝试或使用其他方式
      addMessage({
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: '抱歉，我现在有点忙不过来。不过没关系，请告诉我您想要什么类型的菜品，比如"我想要一些不辣的热菜"，我会为您推荐合适的菜品！',
      });
    }
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
    
    if (input.includes('你是谁') || input.includes('介绍') || input.includes('什么')) {
      return '我是这个餐厅的点餐助手！我对各种菜系都很了解，可以根据您的口味偏好、预算和饮食需求为您推荐最合适的菜品 🍽️';
    }
    if (input.includes('辣')) {
      return '从饮食文化角度来说，辣味菜品能促进食欲和新陈代谢。根据您选的菜品，我可以告诉您具体的辣度情况，如果不能吃辣，我会推荐清淡的菜品 😊';
    }
    if (input.includes('女生') || input.includes('适合')) {
      return '我了解不同人群的饮食偏好！女性朋友通常喜欢营养均衡、口感清淡的菜品。我可以为您推荐一些养颜美容、暖胃健脾的菜品 💕';
    }
    if (input.includes('油腻')) {
      return '我很理解您对清淡饮食的需求！在我们的菜单中，蒸菜、汤品类都比较清爽不油腻。我可以为您详细介绍每道菜的烹饪方式和口感特点～';
    }
    if (input.includes('推荐') || input.includes('建议')) {
      return '作为专业的点餐助手，我会根据营养搭配、口味层次和您的具体需求来为您推荐菜品组合。让我为您精心搭配一份营养均衡又美味的套餐！';
    }
    
    return '我很乐意为您解答任何关于菜品的问题！作为餐厅的专业点餐助手，我对每道菜的食材、口味、营养价值都很了解。还有什么想咨询的吗？ 😊';
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
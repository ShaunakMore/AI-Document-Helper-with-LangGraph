import React, { useState, useRef, useEffect } from 'react';
import { Send, FileText, Save, Sparkles, MessageCircle, Bot, User, RefreshCw } from 'lucide-react';

const DrafterApp = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [documentContent, setDocumentContent] = useState('');
  const [sessionId] = useState(() => Math.random().toString(36).substr(2, 9));
  const messagesEndRef = useRef(null);

  // Function to fetch current document content
  const fetchCurrentDocument = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/document/${sessionId}`);
      const data = await response.json();
      if (data.success) {
        const newContent = data.document_content || '';
        console.log('Fetched document content:', newContent);
        setDocumentContent(newContent);
      }
    } catch (error) {
      console.error('Error fetching document:', error);
    }
  };

  // Fetch document content on component mount and periodically
  useEffect(() => {
    fetchCurrentDocument();
    
    // Poll for document updates every 2 seconds
    const interval = setInterval(fetchCurrentDocument, 2000);
    
    return () => clearInterval(interval);
  }, [sessionId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const sendMessage = async (message) => {
    if (!message.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: message,
      timestamp: new Date().toLocaleTimeString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message,
          session_id: sessionId
        }),
      });

      const data = await response.json();

      if (data.success) {
        const aiMessage = {
          id: Date.now() + 1,
          type: 'ai',
          content: data.response,
          timestamp: new Date().toLocaleTimeString(),
          toolsUsed: data.tools_used || []
        };

        setMessages(prev => [...prev, aiMessage]);
        
        // Update document content immediately if provided
        if (data.document_content !== undefined) {
          console.log('Updating document content from response:', data.document_content);
          setDocumentContent(data.document_content);
        }
        
        // Also fetch the latest document content to ensure sync
        setTimeout(() => {
          fetchCurrentDocument();
        }, 1000);
        
      } else {
        throw new Error(data.error || 'Failed to send message');
      }
    } catch (error) {
      const errorMessage = {
        id: Date.now() + 1,
        type: 'error',
        content: `Error: ${error.message}`,
        timestamp: new Date().toLocaleTimeString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  const quickActions = [
    { text: "Write a short story about a robot", icon: FileText },
    { text: "Create a to-do list for today", icon: FileText },
    { text: "Write a paragraph about artificial intelligence", icon: Sparkles },
    { text: "Save this document as 'my_document'", icon: Save },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Drafter
                </h1>
                <p className="text-sm text-gray-500">AI-Powered Document Editor</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span>Ready</span>
              </div>
              <div className="text-xs text-gray-400">
                Session: {sessionId}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Chat Section */}
          <div className="lg:col-span-2">
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-4">
                <div className="flex items-center space-x-2">
                  <MessageCircle className="w-5 h-5 text-white" />
                  <h2 className="text-lg font-semibold text-white">Conversation</h2>
                </div>
              </div>

              <div className="h-96 overflow-y-auto p-6 space-y-4">
                {messages.length === 0 && (
                  <div className="text-center py-12">
                    <Bot className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 mb-6">Start a conversation with Drafter to create and edit documents</p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {quickActions.map((action, index) => {
                        const Icon = action.icon;
                        return (
                          <button
                            key={index}
                            onClick={() => sendMessage(action.text)}
                            className="inline-flex items-center space-x-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-sm transition-colors duration-200"
                          >
                            <Icon className="w-4 h-4" />
                            <span>{action.text}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {messages.map((message) => (
                  <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${
                      message.type === 'user' 
                        ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white' 
                        : message.type === 'error'
                        ? 'bg-red-50 text-red-700 border border-red-200'
                        : 'bg-gray-50 text-gray-800 border border-gray-200'
                    }`}>
                      <div className="flex items-start space-x-2">
                        {message.type === 'user' ? (
                          <User className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        ) : (
                          <Bot className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        )}
                        <div className="flex-1">
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                          {message.toolsUsed && message.toolsUsed.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {message.toolsUsed.map((tool, index) => (
                                <span key={index} className="inline-flex items-center px-2 py-1 bg-white/20 rounded-md text-xs">
                                  🔧 {tool}
                                </span>
                              ))}
                            </div>
                          )}
                          <p className="text-xs opacity-70 mt-1">{message.timestamp}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3">
                      <div className="flex items-center space-x-2">
                        <Bot className="w-4 h-4 text-gray-500" />
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="p-6 border-t border-gray-200">
                <div className="flex space-x-3">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type your message here..."
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    disabled={isLoading}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmit(e);
                      }
                    }}
                  />
                  <button
                    onClick={handleSubmit}
                    disabled={isLoading || !input.trim()}
                    className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl hover:from-indigo-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    <Send className="w-4 h-4" />
                    <span>Send</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Document Preview */}
          <div className="lg:col-span-1">
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 overflow-hidden sticky top-24">
              <div className="bg-gradient-to-r from-purple-500 to-pink-600 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <FileText className="w-5 h-5 text-white" />
                    <h2 className="text-lg font-semibold text-white">Document Preview</h2>
                  </div>
                  <button
                    onClick={fetchCurrentDocument}
                    className="p-1 hover:bg-white/20 rounded-lg transition-colors duration-200"
                    title="Refresh document"
                  >
                    <RefreshCw className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>
              
              <div className="p-6">
                {documentContent ? (
                  <div className="prose prose-sm max-w-none">
                    <div className="whitespace-pre-wrap text-sm text-gray-700 bg-gray-50 p-4 rounded-lg border max-h-96 overflow-y-auto">
                      {documentContent}
                    </div>
                    <div className="mt-2 text-xs text-gray-500 text-center">
                      {documentContent.length} characters
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 text-sm">No document content yet</p>
                    <p className="text-gray-400 text-xs mt-2">Start editing to see your document here</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DrafterApp;
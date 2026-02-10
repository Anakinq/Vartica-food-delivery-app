import React, { useEffect, useState, useRef, useCallback } from 'react';
import { X, Send, Paperclip, Image, File, Download, Phone, RefreshCw } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { databaseService } from '../../services';
import { notificationService } from '../../services/notification.service';
import { ChatMessage, Order } from '../../lib/supabase/types';
import { supabase } from '../../lib/supabase/client';

// Import the new VoiceCallModal
import { VoiceCallModal } from './VoiceCallModal';

interface ChatModalProps {
  orderId: string;
  orderNumber: string;
  recipientName: string;
  recipientId?: string; // Optional: pass recipient ID directly
  onClose: () => void;
}

export const ChatModal: React.FC<ChatModalProps> = ({
  orderId,
  orderNumber,
  recipientName,
  recipientId,
  onClose
}) => {
  const { user } = useAuth();
  const { error: showError, success } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showVoiceCallModal, setShowVoiceCallModal] = useState(false);
  const [orderData, setOrderData] = useState<Order | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch order data to get recipient info
  useEffect(() => {
    const fetchOrderData = async () => {
      const { data } = await supabase
        .from('orders')
        .select('user_id, delivery_agent_id, seller_id')
        .eq('id', orderId)
        .single();

      if (data) {
        setOrderData(data as unknown as Order);
      }
    };

    fetchOrderData();
  }, [orderId]);

  useEffect(() => {
    fetchMessages();

    const subscription = databaseService.subscribe<ChatMessage>(
      'chat_messages',
      (payload) => {
        // Handle INSERT events for new messages
        if (payload.eventType === 'INSERT') {
          const newMsg = payload.new as ChatMessage;
          // Only add if it's for this order
          if (newMsg.order_id === orderId) {
            setMessages((prev) => [...prev, newMsg]);
            // Mark as read if not own message
            if (newMsg.sender_id !== user?.id) {
              markAsRead([newMsg]);
            }
          }
        }
        // Handle UPDATE events (for read receipts)
        if (payload.eventType === 'UPDATE') {
          const updatedMsg = payload.new as ChatMessage;
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === updatedMsg.id ? updatedMsg : msg
            )
          );
        }
      },
      { order_id: orderId }
    );

    return () => subscription.unsubscribe();
  }, [orderId, user?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const { data } = await databaseService.select<ChatMessage>({
        table: 'chat_messages',
        match: { order_id: orderId },
        order: { column: 'created_at', ascending: true },
      });

      if (data) {
        setMessages(data);
        markAsRead(data);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [orderId]);

  const markAsRead = async (msgs: ChatMessage[]) => {
    const unreadMessages = msgs.filter((m) => !m.is_read && m.sender_id !== user?.id);

    for (const msg of unreadMessages) {
      await databaseService.update<ChatMessage>({
        table: 'chat_messages',
        data: { is_read: true },
        match: { id: msg.id },
      });
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !selectedFile) || !user) return;

    setSending(true);

    try {
      // Upload file if selected
      let fileUrl = null;
      if (selectedFile) {
        setUploading(true);

        // Upload file to Supabase storage
        const fileName = `${Date.now()}-${selectedFile.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('chat-attachments')
          .upload(fileName, selectedFile);

        if (uploadError) {
          console.error('File upload error:', uploadError);
          showError('Failed to upload file');
          return;
        }

        // Get public URL
        const { data: publicUrlData } = supabase.storage
          .from('chat-attachments')
          .getPublicUrl(fileName);

        fileUrl = publicUrlData.publicUrl;
      }

      const messageData: Partial<ChatMessage> = {
        order_id: orderId,
        sender_id: user.id,
        message: newMessage.trim(),
        is_read: false,
      };

      // Add file information if file was uploaded
      if (fileUrl && selectedFile) {
        messageData.file_url = fileUrl;
        messageData.file_name = selectedFile.name;
        messageData.file_size = selectedFile.size;
        messageData.file_type = selectedFile.type;
      }

      const { error } = await databaseService.insert<ChatMessage>({
        table: 'chat_messages',
        data: messageData as ChatMessage,
      });

      if (error) {
        showError('Failed to send message');
        return;
      }

      // Send notification to recipient
      try {
        // Determine recipient ID (not the sender)
        let targetRecipientId = recipientId;

        if (!targetRecipientId && orderData) {
          // If customer sent, notify delivery agent
          if (user.id === orderData.user_id) {
            targetRecipientId = orderData.delivery_agent_id || undefined;
          } else {
            // If delivery agent sent, notify customer
            targetRecipientId = orderData.user_id;
          }
        }

        if (targetRecipientId) {
          await notificationService.sendMessageNotification(
            orderNumber,
            targetRecipientId,
            newMessage.trim() || 'Sent a file'
          );
        }
      } catch (notifyError) {
        console.error('Failed to send notification:', notifyError);
        // Don't fail the message send if notification fails
      }

      setNewMessage('');
      setSelectedFile(null);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
      setUploading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-2 sm:p-4">
        <div className="bg-white w-full max-w-lg max-h-[90vh] sm:max-h-[85vh] rounded-2xl flex flex-col shadow-2xl">
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-gray-900">Chat - Order #{orderNumber}</h2>
              <button
                onClick={fetchMessages}
                disabled={isRefreshing}
                className={`p-1 hover:bg-gray-100 rounded-full text-gray-500 ${isRefreshing ? 'animate-spin' : ''}`}
                title="Refresh messages"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-sm text-gray-600 hidden sm:block">With {recipientName}</p>
              <button
                onClick={() => setShowVoiceCallModal(true)}
                className="p-2 hover:bg-gray-100 rounded-full text-green-600"
                title="Voice call"
              >
                <Phone className="h-5 w-5" />
              </button>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No messages yet. Start the conversation!
              </div>
            ) : (
              messages.map((msg) => {
                const isOwn = msg.sender_id === user?.id;
                return (
                  <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[70%] px-4 py-2 rounded-lg ${isOwn
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-900 border border-gray-200'
                        }`}
                    >
                      {msg.message && (
                        <p className="text-sm">{msg.message}</p>
                      )}
                      {msg.file_url && (
                        <div className="mt-2">
                          <div className="flex items-center gap-2 p-2 bg-gray-100 rounded-lg">
                            <div className="flex items-center gap-2">
                              {msg.file_type?.startsWith('image/') ? (
                                <Image className="h-5 w-5 text-blue-600" />
                              ) : (
                                <File className="h-5 w-5 text-blue-600" />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm truncate">{msg.file_name}</p>
                                <p className="text-xs opacity-75">{(msg.file_size! / 1024).toFixed(1)} KB</p>
                              </div>
                            </div>
                            <a
                              href={msg.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 text-blue-600 hover:text-blue-800"
                            >
                              <Download className="h-4 w-4" />
                            </a>
                          </div>
                        </div>
                      )}
                      <p
                        className={`text-xs mt-1 ${isOwn ? 'text-blue-100' : 'text-gray-500'
                          }`}
                      >
                        {new Date(msg.created_at || '').toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200 bg-white">
            <div className="flex space-x-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={sending}
              />
              <button
                type="submit"
                disabled={sending || !newMessage.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Voice Call Modal */}
      {showVoiceCallModal && (
        <VoiceCallModal
          orderId={orderId}
          orderNumber={orderNumber}
          recipientName={recipientName}
          onClose={() => setShowVoiceCallModal(false)}
        />
      )}
    </>
  );
};

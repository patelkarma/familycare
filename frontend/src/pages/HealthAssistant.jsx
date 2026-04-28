import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Sparkles, User as UserIcon, Bot, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { familyApi } from '../api/family.api';
import { chatApi } from '../api/chat.api';

const SUGGESTIONS = [
  'Can mom take Crocin with her BP medicine?',
  'Why might her sugar levels spike at night?',
  'What side effects should I watch for?',
  'Is 138/88 BP a concern for an elderly diabetic?',
];

const HealthAssistant = () => {
  const { t } = useTranslation();
  const [memberId, setMemberId] = useState('');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const scrollRef = useRef(null);

  const { data: membersResponse } = useQuery({
    queryKey: ['familyMembers'],
    queryFn: familyApi.getMembers,
  });
  // Backend wraps list responses in { success, data, message } — unwrap.
  const members = membersResponse?.data || [];

  useEffect(() => {
    if (!memberId && members.length) setMemberId(members[0].id);
  }, [members, memberId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const ask = useMutation({
    mutationFn: chatApi.ask,
    onSuccess: (data) => {
      setMessages((prev) => [...prev, { role: 'assistant', content: data.answer }]);
    },
    onError: (err) => {
      const detail = err?.response?.data?.message || err.message || 'Could not reach AI';
      toast.error(detail);
      setMessages((prev) => [...prev, { role: 'assistant', content: `Sorry — ${detail}` }]);
    },
  });

  const send = (text) => {
    const message = (text ?? input).trim();
    if (!message || ask.isPending) return;
    const history = messages.slice(-10);
    const next = [...messages, { role: 'user', content: message }];
    setMessages(next);
    setInput('');
    ask.mutate({ familyMemberId: memberId || undefined, message, history });
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center shadow-md">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('assistant.title')}</h1>
            <p className="text-sm text-gray-500">
              Ask questions about your family's medicines, vitals, and reports.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Member selector */}
      {members.length > 0 && (
        <div className="mb-4 flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-gray-500">Context:</span>
          {members.map((m) => (
            <button
              key={m.id}
              onClick={() => setMemberId(m.id)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all ${
                memberId === m.id
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-primary'
              }`}
            >
              {m.name}
            </button>
          ))}
        </div>
      )}

      {/* Conversation */}
      <div
        ref={scrollRef}
        className="bg-white rounded-2xl border border-gray-100 shadow-sm h-[520px] overflow-y-auto p-4 sm:p-6 space-y-4"
      >
        {messages.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="h-full flex flex-col items-center justify-center text-center"
          >
            <div className="w-14 h-14 rounded-full bg-primary-light flex items-center justify-center mb-3">
              <Bot className="w-7 h-7 text-primary-dark" />
            </div>
            <p className="text-gray-700 font-medium mb-1">Hi! How can I help today?</p>
            <p className="text-sm text-gray-500 max-w-md">
              Pick a family member above for personalised answers grounded in their
              medicines and vitals.
            </p>
            <div className="grid sm:grid-cols-2 gap-2 mt-6 w-full max-w-xl">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-left text-sm bg-gray-50 hover:bg-primary-light hover:text-primary-dark border border-gray-100 rounded-xl px-3 py-2.5 transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((m, idx) => (
            <motion.div
              key={idx}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
              className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {m.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-primary-light flex-shrink-0 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-primary-dark" />
                </div>
              )}
              <div
                className={`rounded-2xl px-4 py-2.5 max-w-[80%] text-sm leading-relaxed whitespace-pre-wrap ${
                  m.role === 'user'
                    ? 'bg-primary text-white rounded-br-sm'
                    : 'bg-gray-50 text-gray-800 rounded-bl-sm'
                }`}
              >
                {m.content}
              </div>
              {m.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-gray-100 flex-shrink-0 flex items-center justify-center">
                  <UserIcon className="w-4 h-4 text-gray-500" />
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {ask.isPending && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-3 justify-start"
          >
            <div className="w-8 h-8 rounded-full bg-primary-light flex-shrink-0 flex items-center justify-center">
              <Bot className="w-4 h-4 text-primary-dark" />
            </div>
            <div className="bg-gray-50 rounded-2xl rounded-bl-sm px-4 py-3">
              <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
            </div>
          </motion.div>
        )}
      </div>

      {/* Input */}
      <div className="mt-3 flex items-end gap-2">
        <textarea
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={t('assistant.askPlaceholder')}
          className="flex-1 resize-none border border-gray-200 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary text-sm bg-white"
          disabled={ask.isPending}
        />
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => send()}
          disabled={ask.isPending || !input.trim()}
          className="bg-primary hover:bg-primary-dark text-white rounded-2xl px-4 py-3 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Send className="w-4 h-4" />
        </motion.button>
      </div>
      <p className="text-[11px] text-gray-400 mt-2 text-center">
        Educational information only — not a substitute for medical advice.
      </p>
    </div>
  );
};

export default HealthAssistant;

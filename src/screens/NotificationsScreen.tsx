import React, { useState, useEffect } from 'react';
import { ArrowLeft, Bell, MessageCircle, Radio, Trash2, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../i18n';
import { Intent } from '../types';
import { localizePlaceName } from '../data/panIndiaLocations';
import { CATEGORIES, getCategoryName } from '../data/categories';

interface NotificationItem {
  id: string;
  type: 'new_post' | 'new_response' | 'account_approved';
  title: string;
  body: string;
  area?: string;
  category?: string;
  description?: string;
  postId?: string;
  conversationId?: string;
  senderId?: string;
  senderName?: string;
  post?: Intent;
  createdAt: string;
  isRead?: boolean;
}

function formatLocalizedNotification(
  item: NotificationItem,
  language: string
): { title: string; body: string } {
  const lang = (language || 'GU').toUpperCase();

  if (item.type === 'account_approved') {
    const approvedText =
      lang === 'GU'
        ? '🎉 અભિનંદન! તમારું LocoHelp એકાઉન્ટ વેરિફાઈ (Approve) થઈ ગયું છે!'
        : lang === 'HI'
        ? '🎉 बधाई हो! आपका LocoHelp अकाउंट वेरिफाई (Approve) हो गया है!'
        : '🎉 Congratulations! Your LocoHelp account has been verified and approved!';
    return { title: approvedText, body: approvedText };
  }

  if (item.type === 'new_response') {
    let sender = item.senderName || '';
    if (!sender && item.title) {
      const m = item.title.match(/(?:New Message from|Reply from)\s+(.+)$/i);
      if (m && m[1]) sender = m[1].trim();
    }
    if (sender) {
      const title =
        lang === 'GU'
          ? `💬 ${sender} તરફથી નવો મેસેજ`
          : lang === 'HI'
          ? `💬 ${sender} से नया संदेश`
          : `💬 New Message from ${sender}`;
      return { title, body: item.body || '' };
    }
    if (item.title && item.title.includes('New Response on your Post')) {
      return {
        title:
          lang === 'GU'
            ? '💬 તમારી પોસ્ટ પર નવો જવાબ!'
            : lang === 'HI'
            ? '💬 आपकी पोस्ट पर नया जवाब!'
            : '💬 New Response on your Post!',
        body: item.body || ''
      };
    }
    return { title: item.title, body: item.body };
  }

  if (item.type === 'new_post') {
    let rawArea = item.area || (item.post as any)?.area || (item.post as any)?.city || '';
    if (!rawArea && item.title) {
      const m = item.title.match(/New Request in\s+(.+?)!*$/i);
      if (m && m[1]) rawArea = m[1].trim();
    }
    const locArea = localizePlaceName(rawArea || 'Local Area', lang) || rawArea || 'Local Area';
    const title =
      lang === 'GU'
        ? `🔔 ${locArea} માં નવી જરૂરિયાત પોસ્ટ!`
        : lang === 'HI'
        ? `🔔 ${locArea} में नई आवश्यकता पोस्ट!`
        : `🔔 New Request in ${locArea}!`;

    const rawCat = item.category || item.post?.category || '';
    const rawDesc =
      item.description ||
      item.post?.description ||
      (item.post as any)?.title ||
      (item.body ? item.body.replace(/^[^:]+:\s*/, '') : '');
    const matchedCatObj = rawCat
      ? CATEGORIES.find(
          (c) =>
            c.id.toLowerCase() === String(rawCat).toLowerCase() ||
            c.nameEn.toLowerCase() === String(rawCat).toLowerCase()
        )
      : undefined;
    const locCat = matchedCatObj ? getCategoryName(matchedCatObj, lang as any) : rawCat;
    const body = locCat && rawDesc ? `${locCat}: ${rawDesc}` : item.body || rawDesc;

    return { title, body };
  }

  return { title: item.title, body: item.body };
}

export default function NotificationsScreen({
  onBack,
  onOpenChat
}: {
  onBack: () => void;
  onOpenChat?: (intent: Intent) => void;
}) {
  const { t, language } = useLanguage();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const loadNotifications = () => {
    try {
      const raw = localStorage.getItem('locohelp_notifications');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setNotifications(parsed);
          return;
        }
      }
    } catch {}
    setNotifications([]);
  };

  useEffect(() => {
    loadNotifications();
    // Mark all as read when viewing Notifications screen
    try {
      const raw = localStorage.getItem('locohelp_notifications');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.some((n: any) => n && !n.isRead)) {
          const marked = parsed.map((n: any) => ({ ...n, isRead: true }));
          localStorage.setItem('locohelp_notifications', JSON.stringify(marked));
          window.dispatchEvent(new CustomEvent('locohelp_notifications_updated'));
        }
      }
    } catch {}

    window.addEventListener('locohelp_notifications_updated', loadNotifications);
    return () => window.removeEventListener('locohelp_notifications_updated', loadNotifications);
  }, []);

  const handleClearAll = () => {
    try {
      localStorage.removeItem('locohelp_notifications');
      setNotifications([]);
      window.dispatchEvent(new CustomEvent('locohelp_notifications_updated'));
    } catch {}
  };

  const handleNotificationClick = (item: NotificationItem) => {
    if (onOpenChat && item.postId) {
      if (item.post) {
        onOpenChat({
          ...item.post,
          conversationId: item.conversationId,
          selectedReplierId: item.senderId,
          selectedReplierName: item.senderName
        } as any);
        return;
      }
      onOpenChat({
        id: item.postId,
        description: item.body,
        category: 'General',
        distance: 0.5,
        createdAt: item.createdAt,
        conversationId: item.conversationId,
        selectedReplierId: item.senderId,
        selectedReplierName: item.senderName
      } as any);
      return;
    }
    onBack();
  };

  return (
    <div className="flex flex-col h-full bg-[#F4F1EA] dark:bg-slate-900">
      <div className="flex items-center justify-between px-4 py-4 pt-10 sm:pt-4 border-b border-[#DFDBCF] dark:border-slate-800 sticky top-0 bg-[#FCFAF5] dark:bg-slate-850 shadow-sm z-10">
        <div className="flex items-center">
          <button
            onClick={onBack}
            className="p-2 -ml-2 mr-2 hover:bg-[#EAE6DC] dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-6 h-6 text-slate-700 dark:text-slate-200" />
          </button>
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">{t('notif.title')}</h2>
        </div>

        {notifications.length > 0 && (
          <button
            onClick={handleClearAll}
            className="px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 text-rose-600 dark:text-rose-300 text-xs font-extrabold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{language === 'EN' ? 'Clear All' : language === 'GU' ? 'બધું સાફ કરો' : 'सभी हटाएं'}</span>
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center text-center">
          <Bell className="w-10 h-10 text-slate-400 mb-2" />
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
            {language === 'EN'
              ? 'No new notifications right now.'
              : language === 'GU'
              ? 'અત્યારે કોઈ નવું નોટિફિકેશન નથી.'
              : 'अभी कोई नया नोटिफिकेशन नहीं है।'}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs">
            {language === 'EN'
              ? 'When someone creates a new post in your area or replies to your chat, it will appear here instantly.'
              : language === 'GU'
              ? 'જ્યારે કોઈ નવી પોસ્ટ મૂકે અથવા તમારી ચેટનો જવાબ આપે, ત્યારે તે અહીં તરત જ દેખાશે.'
              : 'जब कोई नई पोस्ट करेगा या आपकी चैट पर जवाब देगा, तो उसका नोटिफिकेशन यहाँ तुरंत दिखेगा।'}
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {notifications.map((item) => {
            const localized = formatLocalizedNotification(item, language);
            return (
              <div
                key={item.id}
                onClick={() => handleNotificationClick(item)}
                className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 shadow-xs flex items-start gap-3 cursor-pointer transition-all"
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    item.type === 'new_response' || item.type === 'account_approved'
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400'
                      : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400'
                  }`}
                >
                  {item.type === 'account_approved' ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : item.type === 'new_response' ? (
                    <MessageCircle className="w-5 h-5" />
                  ) : (
                    <Radio className="w-5 h-5" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4
                      className={`text-xs font-black text-slate-900 dark:text-white ${
                        localized.body && localized.body !== localized.title ? 'truncate' : 'leading-snug'
                      }`}
                    >
                      {localized.title}
                    </h4>
                    <span className="text-[10px] text-slate-400 font-semibold shrink-0">
                      {item.createdAt
                        ? (() => {
                            const d = new Date(item.createdAt);
                            if (Number.isNaN(d.getTime())) return '';
                            const dd = String(d.getDate()).padStart(2, '0');
                            const mm = String(d.getMonth() + 1).padStart(2, '0');
                            const yyyy = d.getFullYear();
                            const tm = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                            return `${dd}/${mm}/${yyyy} • ${tm}`;
                          })()
                        : ''}
                    </span>
                  </div>
                  {localized.body && localized.body !== localized.title && (
                    <p className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-0.5 line-clamp-2">
                      {localized.body}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


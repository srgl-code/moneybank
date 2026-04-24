import React, { useState, useEffect, useRef } from 'react';
import { timeShort } from '../../utils/format';

export const NotificationCenter = ({ notifications = [] }) => {
  const [isOpen, setIsOpen] = useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 rounded-full transition-colors ${isOpen ? 'bg-surface-container-high' : 'hover:bg-surface-container-high'}`}
        aria-label="Notificações"
      >
        <span className="text-xl">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-error animate-pulse" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-surface-container border border-outline-variant/30 rounded-2xl shadow-elevated overflow-hidden z-50 animate-scale-in origin-top-right">
          <div className="p-3 border-b border-outline-variant/30 flex justify-between items-center bg-surface-container-high/30">
            <h4 className="font-label font-bold text-sm text-on-surface">Notificações</h4>
            {unreadCount > 0 && <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full font-bold">{unreadCount} novas</span>}
          </div>
          <div className="max-h-80 overflow-y-auto hide-scrollbar">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-sm text-on-surface-variant font-label flex flex-col items-center gap-2">
                <span className="text-2xl opacity-50">📭</span>
                Sem notificações.
              </div>
            ) : (
              notifications.map((notif, i) => (
                <div key={notif.id || i} className={`p-3 border-b border-outline-variant/10 hover:bg-surface-container-high/50 transition-colors flex gap-3 items-start ${notif.read ? 'opacity-60' : ''}`}>
                  <div className="text-lg shrink-0 mt-0.5 bg-surface p-1.5 rounded-lg border border-outline-variant/20">
                    {notif.type === 'credit' ? '💰' : notif.type === 'debit' ? '💳' : notif.type === 'success' ? '✅' : 'ℹ️'}
                  </div>
                  <div>
                    <p className="text-xs text-on-surface leading-relaxed mb-1">{notif.message}</p>
                    <span className="text-[10px] text-on-surface-variant font-label uppercase tracking-wider">{timeShort(notif.time || new Date())}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

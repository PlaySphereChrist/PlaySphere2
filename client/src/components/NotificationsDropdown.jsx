import React, { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../store/AuthContext';

export default function NotificationsDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef(null);
  const { user } = useAuth();

  const fetchUnreadCount = React.useCallback(async () => {
    if (!user) return;
    try {
      const data = await api.get('/notifications/unread-count');
      setUnreadCount(data.unread_count);
    } catch (err) {
      console.error('Failed to fetch unread count:', err);
    }
  }, [user]);

  const fetchNotifications = React.useCallback(async () => {
    if (!user) return;
    try {
      const data = await api.get('/notifications?limit=10');
      setNotifications(data.notifications);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchUnreadCount();
    const interval = window.setInterval(fetchUnreadCount, 60000); // Poll every minute
    return () => window.clearInterval(interval);
  }, [user, fetchUnreadCount]);


  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleDropdown = () => {
    if (!isOpen) {
      fetchNotifications();
    }
    setIsOpen(!isOpen);
  };

  const markAsRead = async (id, e) => {
    e.stopPropagation();
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  return (
    <div className="relative ml-3" ref={dropdownRef}>
      <div>
        <button
          onClick={toggleDropdown}
          className="relative flex rounded-full bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 p-1 text-gray-400 hover:text-gray-500"
        >
          <span className="sr-only">View notifications</span>
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
          </svg>
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-red-600 rounded-full">
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {isOpen && (
        <div className="absolute right-0 z-10 mt-2 w-80 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          <div className="px-4 py-2 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-md">
            <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
            {unreadCount > 0 && (
              <button onClick={markAllAsRead} className="text-xs text-indigo-600 hover:text-indigo-800">
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-4 text-sm text-gray-500 text-center">No notifications</p>
            ) : (
              notifications.map((notif) => (
                <div key={notif.id} className={`px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition ${!notif.is_read ? 'bg-indigo-50/30' : ''}`}>
                  <div className="flex justify-between items-start mb-1">
                    <p className={`text-sm font-medium ${!notif.is_read ? 'text-gray-900' : 'text-gray-700'}`}>{notif.title}</p>
                    {!notif.is_read && (
                      <button onClick={(e) => markAsRead(notif.id, e)} className="ml-2 text-indigo-600 hover:text-indigo-800" title="Mark as read">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 whitespace-pre-wrap">{notif.body}</p>
                  <p className="text-xs text-gray-400 mt-1">{new Date(notif.created_at).toLocaleString()}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

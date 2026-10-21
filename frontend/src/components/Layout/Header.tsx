import ActivityNotifications from '../Admin/ActivityNotifications';
import AccountNotifications from '../common/AccountNotifications';
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { NavLink, useNavigate } from 'react-router-dom';
import axios from 'axios';
import io, { Socket } from 'socket.io-client';
import { API_BASE_URL } from '../../config/apiConfig';
import {
  HomeIcon,
  UserCircleIcon,
  ChatBubbleLeftIcon,
  BellIcon,
  Cog6ToothIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';


// Only create socket if backend is available
let socket: Socket | null = null;
const BACKEND_AVAILABLE = true; // Set to true when backend is running

if (BACKEND_AVAILABLE) {
  socket = io(API_BASE_URL, {
    autoConnect: false,
    reconnection: true,
    timeout: 5000,
  });
}

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Debug user avatar
  useEffect(() => {
    if (user) {
      console.log('👤 Header user data:', {
        name: user.name,
        avatar: user.avatar,
        role: user.role,
      });
    }
  }, [user]);

  // Fetch unread message count
  useEffect(() => {
    if (!BACKEND_AVAILABLE || !user) return;

    const fetchUnreadCount = async () => {
      try {
        const response = await axios.get('/api/chat/unread-count');
        setUnreadCount(response.data.unreadCount);
      } catch (error) {
        // Silently fail if backend is not available
      }
    };

    fetchUnreadCount();

    // Poll every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);

    return () => clearInterval(interval);
  }, [user]);

  // Socket.IO for real-time unread count updates
  useEffect(() => {
    if (!BACKEND_AVAILABLE || !socket || !user) return;

    socket.auth = { token: user.token };
    socket.connect();

    // Listen for new messages to increment unread count
    socket.on('chatMessage', (message: any) => {
      if (message.receiverId === user.id && !message.isRead) {
        setUnreadCount(prev => prev + 1);
      }
    });

    // Listen for chat-read event to refresh unread count
    const handleChatRead = async () => {
      try {
        const response = await axios.get('/api/chat/unread-count');
        setUnreadCount(response.data.unreadCount);
      } catch (error) {
        // Silently fail
      }
    };

    window.addEventListener('chat-read', handleChatRead);

    return () => {
      socket?.off('chatMessage');
      socket?.off('connect');
      socket?.off('disconnect');
      socket?.disconnect();
      window.removeEventListener('chat-read', handleChatRead);
    };
  }, [user]);

  const getNavItems = () => {
    if (!user) return [];

    switch (user.role) {
      case 'user':
        return [
          { id: 'home', label: 'Home', icon: HomeIcon, to: '/' },
          { id: 'user-dashboard', label: 'Dashboard', icon: HomeIcon, to: '/user-dashboard' },
          { id: 'services', label: 'Services', icon: UserCircleIcon, to: '/services' },
          { id: 'chat', label: 'Chat', icon: ChatBubbleLeftIcon, to: '/chat' },
          { id: 'cleaning-tips', label: 'Cleaning Tips', icon: UserCircleIcon, to: '/cleaning-tips' },
        ];
      case 'worker':
        return [
          { id: 'home', label: 'Home', icon: HomeIcon, to: '/' },
          { id: 'worker-dashboard', label: 'Dashboard', icon: HomeIcon, to: '/worker-dashboard' },
          { id: 'jobs', label: 'Jobs', icon: HomeIcon, to: '/jobs' },
          { id: 'earnings', label: 'Earnings', icon: UserCircleIcon, to: '/earnings' },
          { id: 'chat', label: 'Chat', icon: ChatBubbleLeftIcon, to: '/chat' },
        ];
      case 'admin':
      case 'superadmin':
        return [
          { id: 'home', label: 'Home', icon: HomeIcon, to: '/' },
          { id: 'admin-dashboard', label: 'Dashboard', icon: HomeIcon, to: '/admin-dashboard' },
          { id: 'analytics', label: 'Analytics', icon: HomeIcon, to: '/analytics' },
          { id: 'management', label: 'Management', icon: Cog6ToothIcon, to: '/management' },
          { id: 'services-management', label: 'Services', icon: Cog6ToothIcon, to: '/services-management' },
          { id: 'chat', label: 'Chat', icon: ChatBubbleLeftIcon, to: '/chat' },
        ];
      default:
        return [];
    }
  };

  return (
    <header className="site-header bg-white/95 shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center justify-between gap-3 h-16">
          {/* Logo */}
          <div className="min-w-0 flex items-center">
            <div className="flex min-w-0 items-center">
              <div className="shrink-0 w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">BC</span>
              </div>
              <div className="ml-2.5 min-w-0">
                <h1 className="truncate text-base font-bold tracking-tight text-gray-900">Smart Cleaning Service</h1>
                <p className="text-[10px] text-gray-400 capitalize">{user?.role} Panel</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="hidden xl:flex min-w-0 items-center gap-1">
            {getNavItems().map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.id}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    `flex shrink-0 items-center whitespace-nowrap px-2.5 py-2 rounded-lg text-xs font-medium transition-colors ${isActive
                      ? 'text-blue-600 bg-blue-50'
                      : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
                    }`
                  }
                >
                  <Icon className="h-4 w-4 mr-1.5" />
                  {item.label}
                  {item.id === 'chat' && unreadCount > 0 && <span className="ml-1.5 rounded-full bg-blue-600 px-1.5 py-0.5 text-[9px] text-white">{unreadCount > 99 ? '99+' : unreadCount}</span>}
                </NavLink>
              );
            })}
          </nav>

          {/* Right side */}
          <div className="flex shrink-0 items-center gap-2">
            {user && ['admin','superadmin'].includes(user.role) ? <ActivityNotifications key={user.id} userId={user.id} /> : user && ['worker', 'user'].includes(user.role) ? <AccountNotifications key={user.id} audience={user.role === 'user' ? 'customer' : 'worker'} /> : (<button aria-label="Chat notifications"
              onClick={() => navigate('/chat')}
              className="relative p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <BellIcon className="h-6 w-6" />
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>)}

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex min-w-0 items-center gap-2 rounded-xl p-1 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <img
                  src={
                    user?.avatar ||
                    'https://ui-avatars.com/api/?name=' + encodeURIComponent(user?.name || 'User') + '&background=2563eb&color=fff'
                  }
                  alt={user?.name}
                  className="h-8 w-8 rounded-full border-2 border-gray-200 hover:border-blue-500 transition-colors object-cover"
                  onError={(e) => {
                    console.error('❌ Header avatar load error:', user?.avatar);
                    e.currentTarget.src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user?.name || 'User') + '&background=2563eb&color=fff';
                  }}
                  onLoad={() => {
                    console.log('✅ Header avatar loaded:', user?.avatar);
                  }}
                />
                <div className="hidden xl:block max-w-[130px] text-left">
                  <p className="truncate text-xs font-semibold text-gray-700">{user?.name}</p>
                  <p className="truncate text-[10px] text-gray-400">{user?.email}</p>
                </div>
                <ChevronDownIcon className="h-4 w-4 text-gray-500" />
              </button>

              {/* Dropdown Menu */}
              {showProfileMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowProfileMenu(false)}
                  />
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-20 border border-gray-200">
                    <button
                      onClick={() => {
                        navigate('/profile');
                        setShowProfileMenu(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      <UserCircleIcon className="h-4 w-4 inline mr-2" />
                      My Profile
                    </button>
                    {user?.role === 'worker' && <button onClick={() => { navigate('/settings'); setShowProfileMenu(false); }} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"><Cog6ToothIcon className="h-4 w-4 inline mr-2" />Settings</button>}<hr className="my-1" />
                    <button
                      onClick={() => {
                        logout();
                        setShowProfileMenu(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      Logout
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
        <nav aria-label="Mobile navigation" className="flex xl:hidden min-w-0 overflow-x-auto gap-1 pb-3">{getNavItems().map(item => <NavLink key={item.id} to={item.to} end={item.to === '/'} className={({isActive}) => 'whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium ' + (isActive ? 'bg-blue-600 text-white' : 'text-slate-600 bg-blue-50')}>{item.label}</NavLink>)}</nav>
      </div>
    </header>
  );
}





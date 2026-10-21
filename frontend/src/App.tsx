import ManagementWorkspace from './components/Admin/ManagementWorkspace';
import { ManagementPage, AnalyticsPage, WorkerJobsPage, PerformancePage, NotFoundPage } from './components/common/OperationalPages';
import React from 'react';
import { scrollToSection } from './utils/scrollToSection';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginForm from './components/Auth/LoginForm';
import RegistrationForm from './components/Auth/RegistrationForm';
import Header from './components/Layout/Header';
import PublicHeader from './components/Layout/PublicHeader';
import ModernLandingPage from './components/Home/ModernLandingPage';
import { ContactPage, HowItWorksPage, ReviewsPage } from './components/Home/MarketingPages';
import UserDashboard from './components/User/UserDashboard';
import UserProfile from './components/User/UserProfile';
import AdminAccountProfile from './components/Admin/AdminAccountProfile';
import ServiceCatalog from './components/Services/ServiceCatalog';
import ChatInterface from './components/Chat/ChatInterface';
const WorkerDashboard = React.lazy(() => import('./components/Worker/WorkerDashboard'));
import WorkerProfile from './components/Worker/WorkerProfile';
import WorkerSettings from './components/Worker/WorkerSettings';
const AdminDashboard = React.lazy(() => import('./components/Admin/AdminDashboard'));
import CleaningTips from './components/Educational/CleaningTips';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import WhatsAppButton from './components/common/WhatsAppButton';

function AppContent() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  React.useEffect(() => {
    if (isLoading) return;
    const legacy: Record<string, string> = { '#contact': '/contact', '#services': '/services', '#testimonials': '/reviews', '#reviews': '/reviews', '#how-it-works': '/how-it-works' };
    if (['/', '/home'].includes(location.pathname) && legacy[location.hash]) { navigate(legacy[location.hash], { replace: true }); return; }
    if (!location.hash) { window.scrollTo({ top: 0, behavior: 'instant' }); return; }
    const frame = requestAnimationFrame(() => {
      scrollToSection(location.hash.slice(1));
    });
    return () => cancelAnimationFrame(frame);
  }, [location.pathname, location.hash, location.key, isLoading, navigate]);



  React.useEffect(() => {
    if (user && !isLoading) {
      // After login, stay on home page or current page
      // Only redirect from login/register pages to home
      if (location.pathname === '/login' || location.pathname === '/register') {
        navigate('/');
      }
    }
  }, [user, isLoading, navigate, location.pathname]);


  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <Routes>
          <Route path="/" element={
            <>
              <PublicHeader />
              <ModernLandingPage />
            </>
          } />
          <Route path="/services" element={<><PublicHeader /><ServiceCatalog /></>} />
          <Route path="/contact" element={<><PublicHeader /><ContactPage /></>} />
          <Route path="/reviews" element={<><PublicHeader /><ReviewsPage /></>} />
          <Route path="/how-it-works" element={<><PublicHeader /><HowItWorksPage /></>} />
          <Route path="/login" element={<LoginForm onSwitchPage={() => navigate('/register')} />} />
          <Route path="/register" element={<RegistrationForm onSwitchPage={() => navigate('/login')} />} />
          <Route path="*" element={<><PublicHeader /><NotFoundPage /></>} />
        </Routes>
        {location.pathname !== '/chat' && <WhatsAppButton />}
      </>
    );
  }

  return (
    <div key={`${user.id}:${user.role}`} className="min-h-screen bg-gray-50">
      <Header /> {/* Remove currentPage and onNavigate props */}

      <main className={location.pathname === '/chat' ? 'max-w-7xl mx-auto min-h-0 px-3 py-3 sm:px-6 lg:px-8' : ['/', '/home', '/services', '/contact', '/reviews', '/how-it-works'].includes(location.pathname) ? '' : 'workspace-page max-w-7xl mx-auto py-2 px-4 sm:px-6 lg:px-8'}>
        <Routes>
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/reviews" element={<ReviewsPage />} />
          <Route path="/how-it-works" element={<HowItWorksPage />} />
          <Route path="/services" element={<ServiceCatalog />} />
          {/* User Routes */}
          {user.role === 'user' && (
            <>
              <Route path="/" element={<ModernLandingPage />} />
              <Route path="/home" element={<ModernLandingPage />} />
              <Route path="/user-dashboard" element={<UserDashboard />} />

              <Route path="/bookings" element={<UserDashboard />} />
              <Route path="/chat" element={<ChatInterface />} />
              <Route path="/profile" element={<UserProfile />} />
              <Route path="/cleaning-tips" element={<CleaningTips />} />
              <Route path="*" element={<NotFoundPage />} />
            </>
          )}

          {/* Worker Routes */}
          {user.role === 'worker' && (
            <>
              <Route path="/" element={<ModernLandingPage />} />
              <Route path="/home" element={<ModernLandingPage />} />
              <Route path="/worker-dashboard" element={<WorkerDashboard />} />
              <Route path="/jobs" element={<WorkerJobsPage />} />
              <Route path="/performance" element={<Navigate to="/earnings" replace />} />
<Route path="/earnings" element={<PerformancePage />} />
<Route path="/settings" element={<WorkerSettings />} />
              <Route path="/chat" element={<ChatInterface />} />
              <Route path="/profile" element={<WorkerProfile />} />
              <Route path="*" element={<NotFoundPage />} /> {/* Default to home page */}
            </>
          )}

          {/* Admin Routes */}
          {(user.role === 'admin' || user.role === 'superadmin') && (
            <>
              <Route path="/" element={<ModernLandingPage />} />
              <Route path="/home" element={<ModernLandingPage />} />
              <Route path="/admin-dashboard" element={<AdminDashboard />} />
              <Route path="/management" element={<ManagementWorkspace />} />
              <Route path="/bookings-management" element={<ManagementPage type="bookings" />} />
              <Route path="/workers-management" element={<ManagementPage type="workers" />} />
              <Route path="/services-management" element={<ManagementPage type="services" />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/chat" element={<ChatInterface />} />
              <Route path="/profile" element={<AdminAccountProfile />} />
              <Route path="*" element={<NotFoundPage />} /> {/* Default to home page */}
            </>
          )}

          {/* Fallback for authenticated users if no role-specific route matches */}
          <Route path="*" element={<NotFoundPage />} /> {/* Fallback to home page */}
        </Routes>
      </main>

      {/* Quick Access - Cleaning Tips for all users */}
      {user && user.role === 'user' && location.pathname !== '/cleaning-tips' && location.pathname !== '/chat' && (
        <div className="fixed bottom-6 right-6">
          <button
            onClick={() => navigate('/cleaning-tips')}
            className="bg-blue-600 text-white px-4 py-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <span className="text-sm font-medium">Cleaning Tips</span>
          </button>
        </div>
      )}
      <WhatsAppButton />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <React.Suspense fallback={<div role="status" className="p-12 text-center text-blue-700">Loading workspace…</div>}><AppContent /></React.Suspense>
      <Toaster />
    </AuthProvider>
  );
}

export default App;




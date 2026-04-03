import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import MobileNav from './MobileNav';
import LoadingSpinner from '../shared/LoadingSpinner';

const caregiverOnlyPaths = ['/dashboard', '/family', '/medicines'];

const AppLayout = () => {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-page">
        <LoadingSpinner size="lg" text="Loading FamilyCare..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Role-based route protection
  if (user?.role === 'MEMBER' && caregiverOnlyPaths.includes(location.pathname)) {
    return <Navigate to="/my-medicines" replace />;
  }
  if (user?.role === 'FAMILY_HEAD' && location.pathname === '/my-medicines') {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-surface-page">
      <Sidebar />
      <TopBar />

      {/* Main content */}
      <main className="lg:ml-60 pt-16 lg:pt-0 pb-20 lg:pb-0 min-h-screen">
        <div className="p-4 lg:p-8 max-w-6xl mx-auto">
          <Outlet />
        </div>
      </main>

      <MobileNav />
    </div>
  );
};

export default AppLayout;

import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components';
import { LocationTracker } from './components/LocationTracker';
import {
  DashboardPage,
  UserListPage,
  SettingsPage,
  GPSTrackingPage,
  PanicButtonPage,
  LoginPage,
  AdminPage,
  ItineraryPage,
  NotificationPage,
} from './pages';
import { useAppStore } from './stores/appStore';
import { Loader2 } from 'lucide-react';
import './App.css';
import { pushService } from './utils/push';

function App() {
  const { initApp, isAuthenticated, isLoading } = useAppStore();

  useEffect(() => {
    initApp();
  }, [initApp]);

  // Ensure push subscription is active when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      pushService.subscribe().catch(console.error);
    }
  }, [isAuthenticated]);

  // Check if we have a token but are not yet authenticated
  // This prevents flashing to login page during initialization
  const hasToken = !!localStorage.getItem('token');

  // Show loading while checking auth or initializing
  // We show loader if:
  // 1. isLoading is true (appStore is working)
  // 2. We have a token but isAuthenticated is false (waiting for initApp)
  if (isLoading || (hasToken && !isAuthenticated)) {
    return (
      <div className="loading-screen">
        <Loader2 size={48} className="spin" />
        <p>Memuat aplikasi...</p>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <LocationTracker />
      <Routes>
        {!isAuthenticated ? (
          <>
            <Route path="/login" element={<LoginPage />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </>
        ) : (
          <>
            <Route
              path="/"
              element={
                <Layout>
                  <DashboardPage />
                </Layout>
              }
            />
            <Route
              path="/users"
              element={
                <Layout>
                  <UserListPage />
                </Layout>
              }
            />
            <Route
              path="/tracking"
              element={
                <Layout>
                  <GPSTrackingPage />
                </Layout>
              }
            />
            <Route
              path="/panic"
              element={
                <Layout>
                  <PanicButtonPage />
                </Layout>
              }
            />
            <Route
              path="/settings"
              element={
                <Layout>
                  <SettingsPage />
                </Layout>
              }
            />
            <Route
              path="/admin"
              element={
                <Layout>
                  <AdminPage />
                </Layout>
              }
            />
            <Route
              path="/itinerary"
              element={
                <Layout>
                  <ItineraryPage />
                </Layout>
              }
            />
            <Route
              path="/notifications"
              element={
                <Layout>
                  <NotificationPage />
                </Layout>
              }
            />
            <Route path="/login" element={<Navigate to="/" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        )}
      </Routes>
    </BrowserRouter>
  );
}

export default App;

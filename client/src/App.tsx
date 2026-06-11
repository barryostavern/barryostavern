import { Routes, Route } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import AdminLayout from './components/admin/AdminLayout';
import Loading from './components/Loading';
import { useApiAuth } from './hooks/useApiAuth';
import HomePage from './pages/public/HomePage';
import SubmitPage from './pages/public/SubmitPage';
import ThankYouPage from './pages/public/ThankYouPage';
import LoginPage from './pages/admin/LoginPage';
import OverviewPage from './pages/admin/OverviewPage';
import SubmissionsPage from './pages/admin/SubmissionsPage';
import EventsPage from './pages/admin/EventsPage';
import AnnouncementPage from './pages/admin/AnnouncementPage';
import ChristmasPage from './pages/admin/ChristmasPage';
import HoursPage from './pages/admin/HoursPage';
import MediaPage from './pages/admin/MediaPage';

function App() {
  const { isLoading } = useAuth0();

  useApiAuth();

  if (isLoading) {
    return <Loading />;
  }

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route
        path="/submit"
        element={
          <Layout>
            <SubmitPage />
          </Layout>
        }
      />
      <Route
        path="/thank-you"
        element={
          <Layout>
            <ThankYouPage />
          </Layout>
        }
      />
      <Route path="/admin/login" element={<LoginPage />} />
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<OverviewPage />} />
        <Route path="submissions" element={<SubmissionsPage />} />
        <Route path="events" element={<EventsPage />} />
        <Route path="announcement" element={<AnnouncementPage />} />
        <Route path="christmas" element={<ChristmasPage />} />
        <Route path="hours" element={<HoursPage />} />
        <Route path="media" element={<MediaPage />} />
      </Route>
    </Routes>
  );
}

export default App;

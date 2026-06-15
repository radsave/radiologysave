import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './hooks/useAuth';

// Patient pages
import LandingPage from './pages/patient/LandingPage';
import HomePage from './pages/patient/HomePage';
import SearchPage from './pages/patient/SearchPage';
import BookingPage from './pages/patient/BookingPage';
import BookingReceivedPage from './pages/patient/BookingReceivedPage';
import PaymentPage from './pages/patient/PaymentPage';
import ReferralUploadPage from './pages/patient/ReferralUploadPage';
import BookingSuccessPage from './pages/patient/BookingSuccessPage';
import AccountPage from './pages/patient/AccountPage';
import LoginPage from './pages/patient/LoginPage';
import RegisterPage from './pages/patient/RegisterPage';

// Admin pages
import AdminLayout from './components/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminCenters from './pages/admin/AdminCenters';
import AdminCenterForm from './pages/admin/AdminCenterForm';
import AdminAppointments from './pages/admin/AdminAppointments';
import AdminUsers from './pages/admin/AdminUsers';
import AdminLogin from './pages/admin/AdminLogin';

// Shared layout
import PatientLayout from './components/shared/PatientLayout';

function RequireAdmin({ children }) {
  const { user, token } = useAuthStore();
  if (!token) return <Navigate to="/admin/login" replace />;
  if (!['admin', 'super_admin'].includes(user?.role)) return <Navigate to="/" replace />;
  return children;
}

function RequireAuth({ children }) {
  const { token } = useAuthStore();
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* RadiologySave landing page — self-contained navbar/footer per HANDOFF.md */}
        <Route path="/" element={<LandingPage />} />

        {/* Secure referral upload (own layout, reached from email link) */}
        <Route path="/upload-referral/:token" element={<ReferralUploadPage />} />

        {/* Patient routes (Radiology Save layout) */}
        <Route element={<PatientLayout />}>
          <Route path="/classic" element={<HomePage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/booking" element={<BookingPage />} />
          <Route path="/booking/received" element={<BookingReceivedPage />} />
          <Route path="/pay/:id" element={<PaymentPage />} />
          <Route path="/booking/success" element={<BookingSuccessPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/account" element={<RequireAuth><AccountPage /></RequireAuth>} />
        </Route>

        {/* Admin routes */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<RequireAdmin><AdminLayout /></RequireAdmin>}>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="centers" element={<AdminCenters />} />
          <Route path="centers/new" element={<AdminCenterForm />} />
          <Route path="centers/:id/edit" element={<AdminCenterForm />} />
          <Route path="appointments" element={<AdminAppointments />} />
          <Route path="users" element={<AdminUsers />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

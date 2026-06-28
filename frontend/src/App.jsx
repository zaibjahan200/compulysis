// frontend/src/App.jsx
import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './hooks/useAuth';
import MainLayout from './components/layout/MainLayout';

const Login = lazy(() => import('./pages/Login'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const PatientManagement = lazy(() => import('./pages/PatientManagement'));
const Assessment = lazy(() => import('./pages/Assessment'));
const ModelLab = lazy(() => import('./pages/ModelLab'));
const DataExplorer = lazy(() => import('./pages/DataExplorer'));
const Reports = lazy(() => import('./pages/Reports'));

const MODEL_LAB_ENABLED = false;

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" />;
};

function AppRoutes() {
  if (!MODEL_LAB_ENABLED) {
    console.warn('[Compulysis] Model Lab is temporarily disabled from the UI. Re-enable by uncommenting the /model-lab route in App.jsx and the Model Laboratory entry in MainLayout.jsx and Dashboard.jsx.');
  }

  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary-500 mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Loading...</p>
          </div>
        </div>
      }
    >
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/patients" element={<PatientManagement />} />
                  <Route path="/assessment/:patientId?" element={<Assessment />} />
                  {/* Temporarily hidden: uncomment the next line to restore Model Lab access.
                  <Route path="/model-lab" element={<ModelLab />} />
                  */}
                  <Route
                    path="/model-lab"
                    element={<Navigate to="/" replace />}
                  />
                  <Route path="/data-explorer" element={<DataExplorer />} />
                  <Route path="/reports" element={<Reports />} />
                </Routes>
              </MainLayout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </Suspense>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

export default App;

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import OfferEditor from './pages/OfferEditor';
import PolicyAgreement from './pages/PolicyAgreement';
import RelievingExperienceEditor from './pages/RelievingExperienceEditor';
import ProbationConfirmationEditor from './pages/ProbationConfirmationEditor';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';

import SalaryHikeEditor from './pages/SalaryHikeEditor';

import { EditableProvider } from './context/EditableContext';

function App() {
  return (
    <ErrorBoundary>
      <EditableProvider>
        <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/editor"
          element={
            <ProtectedRoute>
              <Layout>
                <OfferEditor />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/policy"
          element={
            <ProtectedRoute>
              <Layout>
                <PolicyAgreement />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/relieving-letter"
          element={
            <ProtectedRoute>
              <Layout>
                <RelievingExperienceEditor />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/probation-letter"
          element={
            <ProtectedRoute>
              <Layout>
                <ProbationConfirmationEditor />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/salary-hike"
          element={
            <ProtectedRoute>
              <Layout>
                <SalaryHikeEditor />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
    </EditableProvider>
    </ErrorBoundary>
  );
}

export default App;

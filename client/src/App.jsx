import { useState } from 'react'

import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import VerifyEmail from "./pages/VerifyEmail";
import Profile from "./pages/Profile";
import StudentDashboard from "./pages/StudentDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import ManageQuestions from "./pages/ManageQuestions";
import ViewStudents from "./pages/ViewStudents";
import AdminRankings from "./pages/AdminRankings";
import TestTemplates from "./pages/TestTemplates";
import NotFound from "./pages/NotFound.jsx";
import PaymentSuccess from "./pages/PaymentSuccess";


function App() {

  return (
    <>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />

        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/manage-questions" element={<ManageQuestions />} />
        <Route path="/dashboard" element={<StudentDashboard />} />
        <Route path="/payment/success" element={<PaymentSuccess />} />
        <Route path="*" element={<NotFound />} />
        <Route path="/admin/view-students" element={<ViewStudents />} />
        <Route path="/admin/rankings" element={<AdminRankings />} />
        <Route path="/admin/test-templates" element={<TestTemplates />} />
      </Routes>
    </>
  )
}

export default App

import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import AdminRules from "./pages/AdminRules";
import LawyerReview from "./pages/LawyerReview";
import Login from "./pages/Login";
import Report from "./pages/Report";
import Upload from "./pages/Upload";

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/upload" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/upload" element={<Upload />} />
        <Route path="/report/:id" element={<Report />} />
        <Route path="/review/:id" element={<LawyerReview />} />
        <Route path="/admin/rules" element={<AdminRules />} />
        <Route path="*" element={<Navigate to="/upload" replace />} />
      </Routes>
    </Layout>
  );
}

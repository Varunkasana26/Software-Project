import { Link, Navigate, Route, Routes } from "react-router-dom";
import Login from "./pages/Login";
import Upload from "./pages/Upload";
import Report from "./pages/Report";
import LawyerReview from "./pages/LawyerReview";
import AdminRules from "./pages/AdminRules";

export default function App() {
  return (
    <>
      <nav>
        <Link to="/login">Login</Link>
        <Link to="/upload">Upload</Link>
        <Link to="/report/demo">Demo report</Link>
        <Link to="/review">Lawyer review</Link>
        <Link to="/admin/rules">Admin rules</Link>
      </nav>
      <Routes>
        <Route path="/" element={<Navigate to="/upload" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/upload" element={<Upload />} />
        <Route path="/report/:id" element={<Report />} />
        <Route path="/review" element={<LawyerReview />} />
        <Route path="/admin/rules" element={<AdminRules />} />
      </Routes>
    </>
  );
}

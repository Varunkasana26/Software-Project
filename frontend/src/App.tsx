import { Navigate, Route, Routes } from "react-router-dom";
import { Guard } from "./components/Auth";
import Layout from "./components/Layout";
import AdminRules from "./pages/AdminRules";
import Documents from "./pages/Documents";
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
        <Route path="/upload" element={<Guard><Upload /></Guard>} />
        <Route path="/documents" element={<Guard><Documents /></Guard>} />
        <Route path="/report/:id" element={<Guard><Report /></Guard>} />
        <Route path="/review" element={<Guard roles={["LAWYER"]}><Documents /></Guard>} />
        <Route path="/review/:id" element={<Guard roles={["LAWYER"]}><LawyerReview /></Guard>} />
        <Route path="/admin/rules" element={<Guard roles={["ADMIN"]}><AdminRules /></Guard>} />
        <Route path="*" element={<Navigate to="/upload" replace />} />
      </Routes>
    </Layout>
  );
}

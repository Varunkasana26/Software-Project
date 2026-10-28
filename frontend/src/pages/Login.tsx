import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../api/client";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    await login(email); // mock: backend has no auth endpoint yet, password is not sent anywhere
    navigate("/upload");
  }

  return (
    <form onSubmit={onSubmit}>
      <h1>Login</h1>
      <p>Mock login: the backend has no auth endpoint yet.</p>
      <label htmlFor="email">Email</label>
      <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      <label htmlFor="password">Password</label>
      <input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      <p><button type="submit">Log in</button></p>
    </form>
  );
}

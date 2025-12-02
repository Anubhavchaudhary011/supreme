import React, { useState } from "react";
import {
  FaGoogle,
  FaPhoneAlt,
  FaMicrosoft,
  FaEnvelope,
  FaLock,
} from "react-icons/fa";
import { IoEyeOffOutline, IoEyeOutline } from "react-icons/io5";
import { useNavigate } from "react-router-dom";

import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const ClientSignIn = () => {
  const [showPassword, setShowPassword] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false); // ✅ loading state

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(
        "https://supreme-419p.onrender.com/api/client/admin/login", // ✅ FIXED URL (removed /api)
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        }
      );

      const data = await response.json();
      console.log("LOGIN RESPONSE:", data);

      if (!response.ok) {
        toast.error(data.message || "Invalid credentials", { theme: "dark" });
        setLoading(false);
        return;
      }

      // ✅ Save token + user info (backend returns `admin`)
      localStorage.setItem("client_token", data.token);
      localStorage.setItem("client_user", JSON.stringify(data.admin)); // ✅ FIXED

      toast.success("✅ Login successful!", { theme: "dark" });

      setTimeout(() => {
        navigate("/client-dashboard"); // ✅ redirect
      }, 800);
    } catch (err) {
      console.error("LOGIN ERROR:", err);
      toast.error("Server error. Try again later.", { theme: "dark" });
    }

    setLoading(false); // ✅ End Loading
  };

  return (
    <>
      <ToastContainer />

      <nav className="fixed top-0 w-full z-50 bg-white shadow-md transition-all duration-300 ease-in-out px-6 md:px-10">
        <div className="flex justify-between items-center py-4 max-w-screen-xl mx-auto">
          <img src="cpLogo.jpg" alt="Logo" className="h-14 cursor-pointer" />

          <h2 className="absolute left-1/2 transform -translate-x-1/2 text-xl md:text-2xl font-bold text-[#E4002B]">
            Client Login Page
          </h2>
        </div>
      </nav>

      <div className="min-h-screen flex justify-center items-center bg-white px-4 pt-28 pb-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold">Welcome !</h1>
            <p className="text-gray-600 mt-2">
              Login is quick and easy. <br />
              Let's get started on something great.
            </p>
          </div>

          {/* FORM */}
          <form className="space-y-5" onSubmit={handleLogin}>
            {/* Email */}
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <div className="relative">
                <FaEnvelope className="absolute left-3 top-3 text-gray-400" />
                <input
                  type="email"
                  placeholder="Example@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-[#E4002B]"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium mb-1">Password</label>
              <div className="relative">
                <FaLock className="absolute left-3 top-3 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-[#E4002B]"
                  required
                />
                <div
                  className="absolute right-3 top-3 text-gray-500 cursor-pointer"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <IoEyeOffOutline /> : <IoEyeOutline />}
                </div>
              </div>

              <p className="text-right text-sm text-blue-500 mt-1 cursor-pointer hover:underline">
                forgot the password?
              </p>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#E4002B] text-white py-2 rounded-lg font-medium hover:bg-[#C3002B] transition disabled:opacity-60"
            >
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>
        </div>
      </div>
    </>
  );
};

export default ClientSignIn;

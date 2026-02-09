import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">AI</span>
            </div>
            <span className="font-semibold text-lg text-gray-900">
              ResumeMatch
            </span>
          </Link>

          {user && (
            <div className="flex items-center space-x-6">
              <Link
                to="/analyze"
                className="text-gray-600 hover:text-indigo-600 font-medium transition-colors"
              >
                Analyze
              </Link>
              <Link
                to="/history"
                className="text-gray-600 hover:text-indigo-600 font-medium transition-colors"
              >
                History
              </Link>
              <div className="flex items-center space-x-3">
                <span className="text-sm text-gray-500">{user.email}</span>
                <button
                  onClick={handleLogout}
                  className="text-sm text-red-500 hover:text-red-700 font-medium transition-colors cursor-pointer"
                >
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

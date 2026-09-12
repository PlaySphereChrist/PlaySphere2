import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';

export default function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between items-center">
            <div className="flex">
              <div className="flex flex-shrink-0 items-center">
                <span className="text-xl font-bold text-indigo-600">PlaySphere</span>
              </div>
              <div className="hidden sm:-my-px sm:ml-6 sm:flex sm:space-x-8">
                <NavLink 
                  to="/profile"
                  className={({ isActive }) => 
                    `inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium ${
                      isActive 
                        ? 'border-indigo-500 text-gray-900' 
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    }`
                  }
                >
                  My Account
                </NavLink>
                <NavLink 
                  to="/player-profile"
                  className={({ isActive }) => 
                    `inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium ${
                      isActive 
                        ? 'border-indigo-500 text-gray-900' 
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    }`
                  }
                >
                  Player Profile
                </NavLink>
                <NavLink 
                  to="/sports"
                  className={({ isActive }) => 
                    `inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium ${
                      isActive 
                        ? 'border-indigo-500 text-gray-900' 
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    }`
                  }
                >
                  Sports
                </NavLink>
              </div>
            </div>
            
            <div className="flex items-center">
              <span className="text-sm text-gray-700 mr-4 hidden sm:block">{user?.email}</span>
              <button
                onClick={logout}
                className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
              >
                Sign out
              </button>
            </div>
          </div>
          
          {/* Mobile menu */}
          <div className="sm:hidden flex space-x-4 py-3 border-t border-gray-200">
            <NavLink 
              to="/profile"
              className={({ isActive }) => 
                `block px-3 py-2 rounded-md text-base font-medium ${
                  isActive ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700 hover:bg-gray-50'
                }`
              }
            >
              My Account
            </NavLink>
            <NavLink 
              to="/player-profile"
              className={({ isActive }) => 
                `block px-3 py-2 rounded-md text-base font-medium ${
                  isActive ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700 hover:bg-gray-50'
                }`
              }
            >
              Player Profile
            </NavLink>
            <NavLink 
              to="/sports"
              className={({ isActive }) => 
                `block px-3 py-2 rounded-md text-base font-medium ${
                  isActive ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700 hover:bg-gray-50'
                }`
              }
            >
              Sports
            </NavLink>
          </div>
        </div>
      </nav>

      <main className="py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

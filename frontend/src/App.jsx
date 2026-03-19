import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';

// Auth pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import PendingApproval from './pages/auth/PendingApproval';
import Banned from './pages/Banned';

// Layout
import AppLayout from './components/AppLayout';

// User pages
import Tasks from './pages/user/Tasks';
import MyTasks from './pages/user/MyTasks';
import TaskSubmit from './pages/user/TaskSubmit';
import Wallet from './pages/user/Wallet';
import Info from './pages/user/Info';
import Settings from './pages/user/Settings';

// Admin pages
import AdminDashboard from './pages/admin/Dashboard';
import AdminUsers from './pages/admin/Users';
import AdminTasks from './pages/admin/Tasks';
import AdminCreateTask from './pages/admin/CreateTask';
import AdminSubmissions from './pages/admin/Submissions';
import AdminWithdrawals from './pages/admin/Withdrawals';
import AdminReports from './pages/admin/Reports';

function PrivateRoute({ children, adminOnly = false }) {
    const { user, loading } = useAuth();
    if (loading) return <div className="loading-page"><div className="spinner" /></div>;
    if (!user) return <Navigate to="/login" replace />;
    
    // Banned users go to banned page
    if (user.status === 'banned') return <Navigate to="/banned" replace />;
    
    // Non-approved users go to pending page
    if (user.role !== 'admin' && user.status !== 'approved') return <Navigate to="/pending" replace />;
    
    if (adminOnly && user.role !== 'admin') return <Navigate to="/tasks" replace />;
    return children;
}

function PublicRoute({ children }) {
    const { user, loading } = useAuth();
    if (loading) return <div className="loading-page"><div className="spinner" /></div>;
    if (user) {
        if (user.status === 'banned') return <Navigate to="/banned" replace />;
        if (user.role === 'admin') return <Navigate to="/admin" replace />;
        if (user.status !== 'approved') return <Navigate to="/pending" replace />;
        return <Navigate to="/tasks" replace />;
    }
    return children;
}

function AppRoutes() {
    return (
        <Routes>
            <Route path="/" element={<Navigate to="/tasks" replace />} />

            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
            <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
            <Route path="/pending" element={<PendingApproval />} />
            <Route path="/banned" element={<Banned />} />

            <Route element={<AppLayout />}>
                {/* User routes */}
                <Route path="/tasks" element={<PrivateRoute><Tasks /></PrivateRoute>} />
                <Route path="/my-tasks" element={<PrivateRoute><MyTasks /></PrivateRoute>} />
                <Route path="/my-tasks/:taskId" element={<PrivateRoute><TaskSubmit /></PrivateRoute>} />
                <Route path="/wallet" element={<PrivateRoute><Wallet /></PrivateRoute>} />
                <Route path="/info" element={<PrivateRoute><Info /></PrivateRoute>} />
                <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />

                {/* Admin routes */}
                <Route path="/admin" element={<PrivateRoute adminOnly><AdminDashboard /></PrivateRoute>} />
                <Route path="/admin/users" element={<PrivateRoute adminOnly><AdminUsers /></PrivateRoute>} />
                <Route path="/admin/tasks" element={<PrivateRoute adminOnly><AdminTasks /></PrivateRoute>} />
                <Route path="/admin/tasks/new" element={<PrivateRoute adminOnly><AdminCreateTask /></PrivateRoute>} />
                <Route path="/admin/submissions" element={<PrivateRoute adminOnly><AdminSubmissions /></PrivateRoute>} />
                <Route path="/admin/withdrawals" element={<PrivateRoute adminOnly><AdminWithdrawals /></PrivateRoute>} />
                <Route path="/admin/reports" element={<PrivateRoute adminOnly><AdminReports /></PrivateRoute>} />
            </Route>
        </Routes>
    );
}

export default function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <AppRoutes />
                <Toaster
                    position="top-right"
                    toastOptions={{
                        style: {
                            background: '#111827',
                            color: '#f0f6ff',
                            border: '1px solid #1e2d45',
                            borderRadius: '10px',
                            fontSize: '14px'
                        }
                    }}
                />
            </BrowserRouter>
        </AuthProvider>
    );
}

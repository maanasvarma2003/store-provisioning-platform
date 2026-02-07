import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import StoreList from './components/StoreList';
import AuditLogs from './components/AuditLogs';
import { Store, ShieldAlert } from 'lucide-react';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 1,
            refetchOnWindowFocus: false,
        },
    },
});

function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <BrowserRouter>
                <AppContent />
            </BrowserRouter>
        </QueryClientProvider>
    );
}

function AppContent() {
    const location = useLocation();

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col">
            <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <Link to="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
                            <div className="bg-primary-600 p-2 rounded-lg shadow-lg shadow-primary-500/30">
                                <Store className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                                    Store Provisioning Platform
                                </h1>
                                <p className="text-sm text-gray-500 font-medium">
                                    Enterprise Multi-tenant System
                                </p>
                            </div>
                        </Link>

                        <nav className="flex items-center bg-gray-100 p-1 rounded-lg">
                            <Link
                                to="/"
                                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${location.pathname === '/'
                                    ? 'bg-white text-primary-700 shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                                    }`}
                            >
                                <Store className="w-4 h-4" />
                                Stores
                            </Link>
                            <Link
                                to="/audit-logs"
                                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${location.pathname === '/audit-logs'
                                    ? 'bg-white text-primary-700 shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                                    }`}
                            >
                                <ShieldAlert className="w-4 h-4" />
                                Audit Logs
                            </Link>
                        </nav>
                    </div>
                </div>
            </header>

            <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
                <Routes>
                    <Route path="/" element={<StoreList />} />
                    <Route path="/audit-logs" element={<AuditLogs />} />
                    <Route path="/stores" element={<Navigate to="/" replace />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </main>

            {/* Footer */}
            <footer className="mt-auto border-t border-gray-200 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="text-center text-sm text-gray-500">
                        <p>Store Provisioning Platform v1.0.0</p>
                        <p className="mt-1">
                            Powered by Kubernetes, Helm, and React
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
}

export default App;

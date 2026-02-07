import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { initApiConfig } from './api/client';
import './index.css';

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(
    <React.StrictMode>
        <div className="min-h-screen flex items-center justify-center bg-slate-100">
            <p className="text-gray-600">Loading...</p>
        </div>
    </React.StrictMode>
);

initApiConfig().then(() => {
    root.render(
        <React.StrictMode>
            <App />
        </React.StrictMode>
    );
});

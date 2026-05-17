import React from 'react';
// Aplicar tema guardado antes del primer render para evitar flash
const savedTheme = localStorage.getItem('prode-theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<React.StrictMode><App /></React.StrictMode>);

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Aplicar tema guardado antes del primer render para evitar flash
const savedTheme = localStorage.getItem('prode-theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
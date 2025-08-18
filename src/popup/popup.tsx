import React from 'react';
import ReactDOM from 'react-dom/client';
import PopupApp from './components/PopupApp';
import '../shared/styles.css';

// Create root and render the popup app
const root = ReactDOM.createRoot(document.getElementById('popup-root')!);
root.render(<PopupApp />);

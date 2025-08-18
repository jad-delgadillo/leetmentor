import React from 'react';
import ReactDOM from 'react-dom/client';
import InterviewApp from './components/InterviewApp';
import '../shared/styles.css';

// Create root and render the interview app
const root = ReactDOM.createRoot(document.getElementById('interview-root')!);
root.render(<InterviewApp />);

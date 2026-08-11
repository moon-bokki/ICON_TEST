import React from 'react';
import { createRoot } from 'react-dom/client';
import IconTester from './IconTester';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <IconTester />
  </React.StrictMode>
);

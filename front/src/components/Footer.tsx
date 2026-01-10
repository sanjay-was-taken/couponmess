import React from 'react';
import { useTheme } from '../context/ThemeContext'; // 1. Import Theme Hook

export default function Footer() {
  const { colors } = useTheme(); // 2. Get dynamic colors

  return (
    <footer 
      className="text-center py-3 mt-auto"
      style={{ 
        backgroundColor: colors.ui.background, // Dynamic background
        color: colors.text.secondary,          // Dynamic text color
        borderTop: `1px solid ${colors.ui.border}` // Subtle separator
      }}
    >
      <div className="container">
        <small>© {new Date().getFullYear()} IIIT Kottayam</small>
      </div>
    </footer>
  );
}
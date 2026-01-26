'use client';

import React, { useEffect, useState } from 'react';
import styles from './Toast.module.css';
import { Toast as ToastType } from '../../contexts/ToastContext';

interface ToastProps extends ToastType {
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ id, message, type, duration = 5000, onClose }) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onClose();
    }, 300); // Match animation duration
  };

  const classNames = [styles.toast, styles[type], isExiting && styles.exiting].filter(Boolean).join(' ');

  return (
    <div className={classNames}>
      <div className={styles.message}>{message}</div>
      <button className={styles.closeButton} onClick={handleClose} aria-label="Close">
        ×
      </button>
    </div>
  );
};

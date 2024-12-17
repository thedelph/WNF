import { useNavigate } from 'react-router-dom';

interface DialogOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'info' | 'warning' | 'error';
}

export const showDialog = async ({
  title,
  message,
  confirmText = 'OK',
  cancelText = 'Cancel',
  type = 'info'
}: DialogOptions): Promise<boolean> => {
  return new Promise((resolve) => {
    if (confirm(`${title}\n\n${message}`)) {
      resolve(true);
    } else {
      resolve(false);
    }
  });
};

// Re-export useNavigate for convenience
export { useNavigate };

import Toast from 'react-native-toast-message';

export function showToast(
  type: 'success' | 'error' | 'info',
  title: string,
  message?: string,
) {
  Toast.show({
    type,
    text1: title,
    text2: message,
    position: 'top',
    visibilityTime: type === 'error' ? 4000 : 3000,
    autoHide: true,
    topOffset: 56,
  });
}

export const toast = {
  success: (title: string, message?: string) => showToast('success', title, message),
  error: (title: string, message?: string) => showToast('error', title, message),
  info: (title: string, message?: string) => showToast('info', title, message),
};

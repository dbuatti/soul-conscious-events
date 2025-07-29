import { toast } from "sonner";
import { playSuccessSound, playErrorSound } from './audio'; // Import the new sound functions

export const showSuccess = (message: string) => {
  toast.success(message);
  playSuccessSound(); // Play success sound
};

export const showError = (message: string) => {
  toast.error(message);
  playErrorSound(); // Play error sound
};

export const showLoading = (message: string) => {
  return toast.loading(message);
};

export const dismissToast = (toastId: string) => {
  toast.dismiss(toastId);
};
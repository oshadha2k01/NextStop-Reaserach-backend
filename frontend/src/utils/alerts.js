import Swal from 'sweetalert2';

// Success Alert
export const showSuccessAlert = (title, text) => {
  return Swal.fire({
    icon: 'success',
    title: title,
    text: text,
    confirmButtonColor: '#1E40AF',
    confirmButtonText: 'OK',
    timer: 3000,
    timerProgressBar: true,
  });
};

// Error Alert
export const showErrorAlert = (title, text) => {
  return Swal.fire({
    icon: 'error',
    title: title,
    text: text,
    confirmButtonColor: '#EF4444',
    confirmButtonText: 'OK',
  });
};

// Warning Alert
export const showWarningAlert = (title, text) => {
  return Swal.fire({
    icon: 'warning',
    title: title,
    text: text,
    confirmButtonColor: '#F59E0B',
    confirmButtonText: 'OK',
  });
};

// Info Alert
export const showInfoAlert = (title, text) => {
  return Swal.fire({
    icon: 'info',
    title: title,
    text: text,
    confirmButtonColor: '#0891B2',
    confirmButtonText: 'OK',
  });
};

// Confirmation Alert
export const showConfirmAlert = (title, text) => {
  return Swal.fire({
    icon: 'question',
    title: title,
    text: text,
    showCancelButton: true,
    confirmButtonColor: '#1E40AF',
    cancelButtonColor: '#6B7280',
    confirmButtonText: 'Yes',
    cancelButtonText: 'Cancel',
  });
};

// Loading Alert
export const showLoadingAlert = (title = 'Please wait...') => {
  return Swal.fire({
    title: title,
    allowOutsideClick: false,
    allowEscapeKey: false,
    didOpen: () => {
      Swal.showLoading();
    },
  });
};

// Toast Notification
export const showToast = (icon, title) => {
  const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    didOpen: (toast) => {
      toast.addEventListener('mouseenter', Swal.stopTimer);
      toast.addEventListener('mouseleave', Swal.resumeTimer);
    },
  });

  return Toast.fire({
    icon: icon,
    title: title,
  });
};

// Universal password validation for all forms
function validatePassword(password) {
  const errors = [];
  
  if (!password || password.length < 8) {
    errors.push("Password must be at least 8 characters long");
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }
  
  if (!/\d/.test(password)) {
    errors.push("Password must contain at least one number");
  }
  
  // Require at least one non-alphanumeric character (any special character)
  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push("Password must contain at least one special character");
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors
  };
}

// Show password validation errors
function showPasswordErrors(errors) {
  // Remove existing error messages
  const existingErrors = document.querySelectorAll('.password-error');
  existingErrors.forEach(error => error.remove());
  
  // Create error message
  const errorDiv = document.createElement('div');
  errorDiv.className = 'password-error text-danger small mt-1';
  errorDiv.innerHTML = errors.join('<br>');
  
  // Insert after password field
  const passwordField = document.querySelector('#password, #newPassword');
  if (passwordField) {
    passwordField.parentNode.insertBefore(errorDiv, passwordField.nextSibling);
  }
}

// Clear password validation errors
function clearPasswordErrors() {
  const existingErrors = document.querySelectorAll('.password-error');
  existingErrors.forEach(error => error.remove());
}

const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { User } = require("../models/userSchema");
const { pushNotification } = require('./adminService');

class AuthService {
  async registerUser(userData) {
    // Sanitize: accept only whitelisted fields
    const { email, password, role, firstName, lastName } = userData || {};

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw new Error("Email already registered");
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const signupToken = crypto.randomBytes(24).toString("hex");

    const newUserData = {
      email: email.toLowerCase(),
      password: hashedPassword,
      role,
      isActive: true,
      isLocked: false,
      signupToken,
      signupTokenCreatedAt: new Date(),
      signupTokenRevealed: false,
      profileInfo: {
        firstName,
        lastName,
        city: "",
        bio: "",
        phone: "",
        facebook: "",
        instagram: "",
      },
    };
    if (role === "tourguide") {
      newUserData.guideInfo = {
        professionalTitle: "",
        languages: [],
        specializations: [],
        certifications: [],
      };
    }

    const user = new User(newUserData);
    await user.save();

    const userResponse = user.toObject();
    delete userResponse.password;

    return {
      success: true,
      message: "User registered successfully. Signup token created.",
      user: userResponse,
    };
  }

  async loginUser(loginData) {
    const { email, password } = loginData || {};

    // Find user by email (ignore isActive check here to allow reactivation prompt)
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      throw new Error("Invalid email or password");
    }

    // Block locked accounts from logging in at all (priority over deactivated)
    if (user.isLocked) {
      throw new Error("Your account has been banned. Contact support.");
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new Error("Invalid email or password");
    }

    //  Require reactivation (Inactive account - non-admins only)
    if (!user.isActive && user.role !== 'admin') {
      return {
        requiresReactivation: true,
        message: "Your account is deactivated. Please reactivate to continue.",
        userId: user._id,
      };
    }

    user.lastLogin = new Date();
    await user.save();

    const userResponse = user.toObject();
    delete userResponse.password;

    return {
      success: true,
      message: "Login successful",
      user: userResponse,
      needsTokenView: !user.signupTokenRevealed && user.signupToken
    };
  }

  async getUserProfile(userId) {
    const user = await User.findById(userId).select("-password");
    if (!user) throw new Error("User not found");
    if (!user.isActive) throw new Error("Account is deactivated");

    return { success: true, user };
  }

  // Get settings
  async getSettings(userId) {
    const user = await User.findById(userId).select("-password");
    if (!user) throw new Error("User not found");

    return {
      email: user.email,
      accountType: user.role,
      phone: user.profileInfo.phone,
      isActive: user.isActive,
    };
  }

  // Update or set password
  async updatePassword(userId, { currentPassword, newPassword }) {
    const user = await User.findById(userId);
    if (!user) throw new Error("User not found");

    // Validate new password strength
    const passwordValidation = this.validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      throw new Error(passwordValidation.message);
    }

    // Set password if not set (new user-Google auth)
    if (!user.password) {
      user.password = await bcrypt.hash(newPassword, 10);
      await user.save();
      return { success: true, message: "Password set successfully" };
    }

    // Normal update flow
    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) throw new Error("Current password is incorrect");

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    // Notify user
    await pushNotification(userId, {
      type: 'account',
      message: 'Your password was changed.',
      meta: {}
    });

    return { success: true, message: "Password updated successfully" };
  }

  // Password validation helper
  validatePassword(password) {
    if (!password || password.length < 8) {
      return { isValid: false, message: "Password must be at least 8 characters long" };
    }

    if (!/[A-Z]/.test(password)) {
      return { isValid: false, message: "Password must contain at least one uppercase letter" };
    }

    if (!/[a-z]/.test(password)) {
      return { isValid: false, message: "Password must contain at least one lowercase letter" };
    }

    if (!/\d/.test(password)) {
      return { isValid: false, message: "Password must contain at least one number" };
    }

    // Require at least one non-alphanumeric character (any special character)
    if (!/[^A-Za-z0-9]/.test(password)) {
      return { isValid: false, message: "Password must contain at least one special character" };
    }

    return { isValid: true };
  }

  // Deactivate account
  async deactivateAccount(userId) {
    const user = await User.findById(userId);
    if (!user) throw new Error("User not found");
    // Prevent admins from deactivating themselves
    if (user.role === 'admin') {
      throw new Error('Admins cannot deactivate their own accounts. Contact another admin to ban if necessary.');
    }
    user.isActive = false;
    await user.save();

    await pushNotification(userId, {
      type: 'account',
      message: 'Your account was deactivated.',
      meta: {}
    });
  }

  // Reactivate account (session-based, no password required)
  async reactivateAccount(userId) {
    const user = await User.findById(userId);
    if (!user) throw new Error("User not found");

    if (user.isActive) {
      throw new Error("Account is already active");
    }

    user.isActive = true;
    await user.save();

    await pushNotification(userId, {
      type: 'account',
      message: 'Your account has been reactivated',
      meta: {}
    });
  }

  // Reactivate account (public, email + password)
  async reactivateAccountPublic(email, password) {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) throw new Error("User not found");

    if (user.isActive) {
      throw new Error("Account is already active");
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new Error("Incorrect password");
    }

    user.isActive = true;
    await user.save();

    await pushNotification(user._id, {
      type: 'account',
      message: 'Your account was reactivated.',
      meta: {}
    });
  }

  // Get signup token once (for display)
  async getSignupTokenOnce(userId) {
    const user = await User.findById(userId);
    if (!user) throw new Error("User not found");

    if (user.signupTokenRevealed) {
      return { alreadyRevealed: true, token: null };
    }

    return { alreadyRevealed: false, token: user.signupToken };
  }

  // Mark signup token as revealed
  async markSignupTokenRevealed(userId) {
    const user = await User.findById(userId);
    if (!user) throw new Error("User not found");

    user.signupTokenRevealed = true;
    await user.save();
  }

  // Reset password using signup token (as per requirements)
  async resetPassword(token, newPassword, email) {
    if (!email || !token) {
      throw new Error("Invalid or expired reset token");
    }

    const normalizedEmail = String(email).toLowerCase();

    const user = await User.findOne({ signupToken: token, email: normalizedEmail });
    
    if (!user) {
      throw new Error("Invalid or expired reset token");
    }

    // Validate new password strength
    const passwordValidation = this.validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      throw new Error(passwordValidation.message);
    }

    // Hash the new password and save
    user.password = await bcrypt.hash(newPassword, 10);
    
    // Invalidate the token after reset by clearing it
    user.signupToken = null;
    user.signupTokenRevealed = true;
    
    await user.save();
    
    return { success: true, message: "Password reset successfully" };
  }

  // Set password for Google OAuth users (no current password required)
  async setPassword(userId, newPassword) {
    const user = await User.findById(userId);
    if (!user) throw new Error("User not found");

    // Validate new password strength
    const passwordValidation = this.validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      throw new Error(passwordValidation.message);
    }

    user.password = await bcrypt.hash(newPassword, 10);
    
    // Generate signup token for Google OAuth users if they don't have one
    if (!user.signupToken) {
      user.signupToken = crypto.randomBytes(24).toString("hex");
      user.signupTokenCreatedAt = new Date();
      user.signupTokenRevealed = false;
    }
    
    await user.save();
    
    return { success: true, message: "Password set successfully" };
  }
}

module.exports = new AuthService();

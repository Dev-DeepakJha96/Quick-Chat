const { z } = require('zod');

// shared helpers (DRY principle)
const emailSchema = z
  .string()
  .trim()
  .email('Invalid email address')
  .transform((e) => e.toLowerCase());

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[!@#$%^&*]/, 'Password must contain at least one special character');

const tokenSchema = z.string().min(10, 'Invalid token').max(500, 'Invalid token');

// =====================
// REGISTER
// =====================
const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),

  email: emailSchema,

  password: passwordSchema,
});

// =====================
// LOGIN (backward compatible: still simple password check)
// =====================
const loginSchema = z.object({
  email: emailSchema,

  password: z.string().min(1, 'Password is required'),
});

// =====================
// FORGOT PASSWORD
// =====================
const forgotPasswordSchema = z.object({
  email: emailSchema,
});

// =====================
// RESET PASSWORD
// =====================
const resetPasswordSchema = z.object({
  token: tokenSchema,

  newPassword: passwordSchema,
});

// =====================
// VERIFY EMAIL
// =====================
const verifyEmailSchema = z.object({
  token: tokenSchema,
});

module.exports = {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
};

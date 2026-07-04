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
  username: z
    .string()
    .trim()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username cannot exceed 30 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),

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

// =====================
// UPDATE PROFILE
// =====================
const updateMeSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username cannot exceed 30 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
    .optional(),
  email: emailSchema.optional(),
  avatarColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Avatar color must be a valid hex color')
    .optional(),
});

const changePasswordSchema = z
  .object({
    currentPassword: passwordSchema,
    newPassword: passwordSchema,
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'New password must be different from current password',
    path: ['newPassword'],
  });

module.exports = {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  updateMeSchema,
  changePasswordSchema,
};

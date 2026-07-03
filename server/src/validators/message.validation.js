const { z } = require("zod");

const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, {
    message: "Invalid Object ID format",
  });

/**
 * Message validation schemas
 */
const messageValidation = {
  /**
   * Send message validation
   */
  sendMessage: z.object({
    conversationId: objectIdSchema,
    text: z
      .string({
        required_error: "Message text is required",
      })
      .min(1, "Message cannot be empty")
      .max(5000, "Message cannot exceed 5000 characters"),
  }),

  /**
   * Get messages query validation
   */
  getMessages: z.object({
    limit: z.coerce
      .number()
      .int()
      .min(1, "Limit must be at least 1")
      .max(100, "Limit cannot exceed 100")
      .default(50),

    before: z
      .string()
      .datetime({
        message: "Invalid date format. Use ISO format",
      })
      .optional(),
  }),

  /**
   * Delete message validation
   */
  deleteMessage: z.object({
    messageId: objectIdSchema,
  }),

  /**
   * Mark as read validation
   */
  markAsRead: z.object({
    conversationId: objectIdSchema,
  }),
};

module.exports = messageValidation;
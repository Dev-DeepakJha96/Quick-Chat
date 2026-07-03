const {z} = require('zod');

/**
 * Conversation validation schemas
 */
 const conversationValidation = {
  /**
   * Create conversation validation
   */
  createConversation: z.object({
    participantId: z
      .string({
        required_error: "Participant ID is required",
      })
      .regex(/^[0-9a-fA-F]{24}$/, {
        message: "Invalid user ID format",
      }),
  }),

  /**
   * Get conversation messages validation
   */
  getMessages: z.object({
    limit: z.coerce
      .number({
        invalid_type_error: "Limit must be a number",
      })
      .int()
      .min(1, {
        message: "Limit must be at least 1",
      })
      .max(100, {
        message: "Limit cannot exceed 100",
      })
      .default(50),

    before: z
      .string()
      .datetime({
        message:
          "Invalid date format. Use ISO format (YYYY-MM-DDTHH:mm:ss.sssZ)",
      })
      .optional(),
  }),

  /**
   * Get conversations query validation
   */
  getConversations: z.object({
    limit: z.coerce.number().int().min(1).max(100).default(50),

    skip: z.coerce.number().int().min(0).default(0),
  }),
};

module.exports = conversationValidation;
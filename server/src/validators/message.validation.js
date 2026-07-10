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
   * Send message validation (body)
   */
  sendMessage: z.object({
    conversationId: objectIdSchema,
    text: z
      .string({
        required_error: "Message text is required",
      })
      .min(1, "Message cannot be empty")
      .max(5000, "Message cannot exceed 5000 characters"),
    replyTo: objectIdSchema.nullable().optional(),
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
   * Delete message params validation
   */
  deleteMessage: z.object({
    messageId: objectIdSchema,
  }),

  /**
   * Edit message params validation
   */
  editMessageParams: z.object({
    messageId: objectIdSchema,
  }),

  /**
   * Edit message body validation
   */
  editMessageBody: z.object({
    text: z
      .string({
        required_error: "Message text is required",
      })
      .min(1, "Message cannot be empty")
      .max(5000, "Message cannot exceed 5000 characters"),
  }),

  /**
   * Add reaction params validation
   */
  addReactionParams: z.object({
    messageId: objectIdSchema,
  }),

  /**
   * Add reaction body validation
   */
  addReactionBody: z.object({
    emoji: z
      .string({
        required_error: "Emoji is required",
      })
      .min(1, "Emoji cannot be empty")
      .max(10, "Emoji cannot exceed 10 characters"),
  }),

  /**
   * Remove reaction params validation
   */
  removeReaction: z.object({
    messageId: objectIdSchema,
    emoji: z
      .string({
        required_error: "Emoji is required",
      })
      .min(1, "Emoji cannot be empty")
      .max(10, "Emoji cannot exceed 10 characters"),
  }),

  /**
   * Mark as read validation
   */
  markAsRead: z.object({
    conversationId: objectIdSchema,
  }),
};

module.exports = messageValidation;

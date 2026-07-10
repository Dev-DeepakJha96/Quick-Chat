const { connect, disconnect, clearDatabase } = require('../tests/mongodb');
const Conversation = require('../src/models/Conversation.model');
const User = require('../src/models/User');
const Message = require('../src/models/Message.model');
const ConversationService = require('../src/services/conversation.service');
const MessageService = require('../src/services/message.service');

beforeAll(async () => {
  await connect();
});

afterAll(async () => {
  await disconnect();
});

beforeEach(async () => {
  await clearDatabase();
  await User.init();
  await Conversation.init();
});

describe('WhatsApp-like Delete Chat functionality', () => {
  it('should support the complete WhatsApp-like deletion, message hiding, and revival flow', async () => {
    // 1. Create two users
    const userA = await User.create({
      username: 'usera_wa',
      email: 'usera_wa@test.com',
      password: 'Password1!',
      isEmailVerified: true,
    });
    const userB = await User.create({
      username: 'userb_wa',
      email: 'userb_wa@test.com',
      password: 'Password1!',
      isEmailVerified: true,
    });

    // 2. Start a conversation between User A and User B
    const conv = await ConversationService.getOrCreateConversation({
      user1Id: userA._id,
      user2Id: userB._id,
    });
    expect(conv).toBeDefined();
    expect(conv.participants).toHaveLength(2);

    // 3. User A sends message 1
    const msg1 = await MessageService.sendMessage({
      conversationId: conv._id,
      senderId: userA._id,
      text: 'Message 1 from A',
    });

    // 4. User B sends message 2
    const msg2 = await MessageService.sendMessage({
      conversationId: conv._id,
      senderId: userB._id,
      text: 'Message 2 from B',
    });

    // Verify both messages exist
    let messagesA = await MessageService.getMessages({
      conversationId: conv._id,
      userId: userA._id,
    });
    expect(messagesA.messages).toHaveLength(2);

    // 5. User A deletes the chat
    await ConversationService.deleteConversation({
      conversationId: conv._id,
      userId: userA._id,
    });

    // Verify conversation document has participants intact and has a deletedFor entry
    const convAfterDelete = await Conversation.findById(conv._id);
    expect(convAfterDelete.participants).toHaveLength(2);
    expect(convAfterDelete.deletedFor).toHaveLength(1);
    expect(convAfterDelete.deletedFor[0].user.toString()).toBe(userA._id.toString());

    // Verify User A no longer sees the conversation in their inbox
    const inboxA = await Conversation.getUserConversations(userA._id);
    expect(inboxA).toHaveLength(0);

    // Verify User B still sees the conversation in their inbox
    const inboxB = await Conversation.getUserConversations(userB._id);
    expect(inboxB).toHaveLength(1);
    expect(inboxB[0]._id.toString()).toBe(conv._id.toString());

    // Verify User A no longer sees old messages
    const messagesAAfterDelete = await MessageService.getMessages({
      conversationId: conv._id,
      userId: userA._id,
    });
    expect(messagesAAfterDelete.messages).toHaveLength(0);

    // Verify User B still sees all messages
    const messagesBAfterDelete = await MessageService.getMessages({
      conversationId: conv._id,
      userId: userB._id,
    });
    expect(messagesBAfterDelete.messages).toHaveLength(2);

    // 6. User B sends a new message (Message 3) - this should revive the chat for User A
    const msg3 = await MessageService.sendMessage({
      conversationId: conv._id,
      senderId: userB._id,
      text: 'Message 3 from B (reviver)',
    });

    // Verify conversation deletedFor remains (preserving deletion history)
    const convAfterRevival = await Conversation.findById(conv._id);
    expect(convAfterRevival.deletedFor).toHaveLength(1);

    // Verify User A sees the conversation again in their inbox
    const inboxAAfterRevival = await Conversation.getUserConversations(userA._id);
    expect(inboxAAfterRevival).toHaveLength(1);

    // Verify User A sees ONLY Message 3 (since Messages 1 and 2 were sent before deletion)
    const messagesAAfterRevival = await MessageService.getMessages({
      conversationId: conv._id,
      userId: userA._id,
    });
    expect(messagesAAfterRevival.messages).toHaveLength(1);
    expect(messagesAAfterRevival.messages[0]._id.toString()).toBe(msg3._id.toString());

    // Verify User B sees all 3 messages
    const messagesBAfterRevival = await MessageService.getMessages({
      conversationId: conv._id,
      userId: userB._id,
    });
    expect(messagesBAfterRevival.messages).toHaveLength(3);
  });
});

const { connect, disconnect, clearDatabase } = require('../tests/mongodb');
const Conversation = require('../src/models/Conversation.model');
const User = require('../src/models/User');
const ConversationService = require('../src/services/conversation.service');

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

describe('Conversation Unique Index Bug Verification', () => {
  it('should allow User A to have active conversations with both User B and User C', async () => {
    // Create 3 users
    const userA = await User.create({
      username: 'usera',
      email: 'usera@test.com',
      password: 'Password1!',
      isEmailVerified: true,
    });
    const userB = await User.create({
      username: 'userb',
      email: 'userb@test.com',
      password: 'Password1!',
      isEmailVerified: true,
    });
    const userC = await User.create({
      username: 'userc',
      email: 'userc@test.com',
      password: 'Password1!',
      isEmailVerified: true,
    });

    // Create conversation 1: User A & User B
    const conv1 = await ConversationService.getOrCreateConversation({
      user1Id: userA._id,
      user2Id: userB._id,
    });
    expect(conv1).toBeDefined();

    // Create conversation 2: User A & User C
    // If the index on participants is unique, this will throw a duplicate key error!
    let conv2;
    let error = null;
    try {
      conv2 = await ConversationService.getOrCreateConversation({
        user1Id: userA._id,
        user2Id: userC._id,
      });
    } catch (err) {
      error = err;
    }

    expect(error).toBeNull();
    expect(conv2).toBeDefined();
  });

  it('should allow multiple deleted conversations containing the same participant', async () => {
    const userA = await User.create({
      username: 'usera_del',
      email: 'usera_del@test.com',
      password: 'Password1!',
      isEmailVerified: true,
    });
    const userB = await User.create({
      username: 'userb_del',
      email: 'userb_del@test.com',
      password: 'Password1!',
      isEmailVerified: true,
    });
    const userC = await User.create({
      username: 'userc_del',
      email: 'userc_del@test.com',
      password: 'Password1!',
      isEmailVerified: true,
    });

    // A & B conversation
    const convAB = await ConversationService.getOrCreateConversation({
      user1Id: userA._id,
      user2Id: userB._id,
    });

    // C & B conversation
    const convCB = await ConversationService.getOrCreateConversation({
      user1Id: userC._id,
      user2Id: userB._id,
    });

    // User A deletes conversation AB (leaves only B in participants)
    await ConversationService.deleteConversation({
      conversationId: convAB._id,
      userId: userA._id,
    });

    // User C deletes conversation CB (leaves only B in participants)
    // If the index on participants is unique, this will crash!
    let error = null;
    try {
      await ConversationService.deleteConversation({
        conversationId: convCB._id,
        userId: userC._id,
      });
    } catch (err) {
      error = err;
    }

    expect(error).toBeNull();
  });
});

const mongoose = require('mongoose');

// Load env variables
require('dotenv').config({ path: './.env' });

const config = require('./src/config/env.config');
const { signAccessToken } = require('./src/utils/jwt');
const User = require('./src/models/User');

async function test() {
  await mongoose.connect(config.database.uri);
  console.log('Connected to MongoDB:', config.database.uri);

  const user = await User.findOne({});
  if (!user) {
    console.error('No user found in database!');
    process.exit(1);
  }
  console.log('Found user:', user.username, 'ID:', user._id.toString());

  const token = signAccessToken(user._id.toString());

  const testPayloads = [
    {
      name: 'Payload with conversationId and text (no replyTo)',
      data: {
        conversationId: '60d5ec49f3e4e200155b5555',
        text: 'Hello world'
      }
    },
    {
      name: 'Payload with conversationId, text, and replyTo: null',
      data: {
        conversationId: '60d5ec49f3e4e200155b5555',
        text: 'Hello world',
        replyTo: null
      }
    },
    {
      name: 'Payload with conversationId, text, and replyTo: empty string',
      data: {
        conversationId: '60d5ec49f3e4e200155b5555',
        text: 'Hello world',
        replyTo: ''
      }
    },
    {
      name: 'Payload with chatId instead of conversationId',
      data: {
        chatId: '60d5ec49f3e4e200155b5555',
        text: 'Hello world'
      }
    },
    {
      name: 'Payload with content instead of text',
      data: {
        conversationId: '60d5ec49f3e4e200155b5555',
        content: 'Hello world'
      }
    }
  ];

  for (const payload of testPayloads) {
    console.log(`\nTesting: ${payload.name}`);
    try {
      const res = await fetch('http://localhost:5000/api/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload.data)
      });
      const data = await res.json();
      console.log('Response Status:', res.status);
      console.log('Response Body:', JSON.stringify(data, null, 2));
    } catch (err) {
      console.log('Fetch Error:', err);
    }
  }

  await mongoose.disconnect();
}

test().catch(console.error);

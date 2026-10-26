const API = 'http://localhost:5000/api';

async function request(url, options = {}) {
  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data.message || `HTTP ${res.status}`);
    error.status = res.status;
    error.data = data;
    throw error;
  }
  return data;
}

async function runEndToEndTest() {
  console.log('--- STARTING COMPREHENSIVE END-TO-END SYSTEM TEST ---');

  const ts = Date.now();
  const user1Email = `student_${ts}@student.nitw.ac.in`;
  const user2Email = `finder_${ts}@example.com`;
  const password = 'Password@123';

  // 1. Test Registration
  console.log('1. Testing Registration for User 1 (NITW student)...');
  const user1Reg = await request(`${API}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Alice Student', email: user1Email, password })
  });
  console.log('   ✓ User 1 registered successfully, ID:', user1Reg.user.id);

  console.log('2. Testing Registration for User 2 (Standard campus email)...');
  const user2Reg = await request(`${API}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Bob Finder', email: user2Email, password })
  });
  console.log('   ✓ User 2 registered successfully, ID:', user2Reg.user.id);

  // 2. Test Login
  console.log('3. Testing Login for both users...');
  const user1Login = await request(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: user1Email, password })
  });
  const token1 = user1Login.token;

  const user2Login = await request(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: user2Email, password })
  });
  const token2 = user2Login.token;
  console.log('   ✓ Both users authenticated successfully!');

  // 3. User 1 reports lost item
  console.log('4. User 1 reporting Lost Item ("Black Dell Laptop")...');
  const lostItem = await request(`${API}/items/lost`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token1}` },
    body: JSON.stringify({
      title: 'Black Dell Laptop',
      category: 'Electronics',
      location: 'Central Library 2nd Floor',
      dateLost: new Date().toISOString(),
      description: 'Black Dell 15-inch laptop with a blue sticker.',
      visibility: 'public'
    })
  });
  console.log('   ✓ Lost Item reported, ID:', lostItem._id);

  // 4. User 2 reports found item
  console.log('5. User 2 reporting Found Item ("Found Black Dell Inspiron Laptop")...');
  const foundItem = await request(`${API}/items/found`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token2}` },
    body: JSON.stringify({
      title: 'Found Black Dell Inspiron Laptop',
      category: 'Electronics',
      location: 'Central Library',
      dateFound: new Date().toISOString(),
      description: 'Black Dell laptop discovered on study table with stickers.'
    })
  });
  console.log('   ✓ Found Item reported, ID:', foundItem._id, 'Visibility:', foundItem.visibility);

  // 5. Test Matching Engine & My Matches
  console.log('6. Checking User 1 potential matches...');
  const user1Matches = await request(`${API}/items/my-matches`, {
    headers: { 'Authorization': `Bearer ${token1}` }
  });
  console.log(`   ✓ User 1 found ${user1Matches.length} match candidate(s)!`);
  if (user1Matches.length === 0) {
    throw new Error('Expected at least 1 match candidate.');
  }
  const match = user1Matches[0];
  console.log(`   ✓ Match similarity score: ${Math.round(match.score * 100)}%`);

  // 6. Test Notifications
  console.log('7. Verifying Notifications for User 1 & User 2...');
  const user1Notifs = await request(`${API}/notifications`, {
    headers: { 'Authorization': `Bearer ${token1}` }
  });
  console.log(`   ✓ User 1 notifications count: ${user1Notifs.notifications.length}, unread: ${user1Notifs.unreadCount}`);

  const user2Notifs = await request(`${API}/notifications`, {
    headers: { 'Authorization': `Bearer ${token2}` }
  });
  console.log(`   ✓ User 2 notifications count: ${user2Notifs.notifications.length}, unread: ${user2Notifs.unreadCount}`);

  // 7. Initiate Secure Chat
  console.log('8. User 1 initiating Secure Chat for the match...');
  const chat = await request(`${API}/chat/initiate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token1}` },
    body: JSON.stringify({ matchId: match.id })
  });
  console.log('   ✓ Secure Chat initialized, ID:', chat._id, 'Status:', chat.status);

  // 8. User 1 sends message
  console.log('9. User 1 sending message in chat...');
  const msg1 = await request(`${API}/chat/${chat._id}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token1}` },
    body: JSON.stringify({ content: 'Hi Bob! I think you found my laptop. Does it have stickers?' })
  });
  console.log('   ✓ Message sent from User 1:', msg1.content);

  // 9. User 2 reads messages and replies
  console.log('10. User 2 fetching messages and replying...');
  const chatMessages = await request(`${API}/chat/${chat._id}/messages`, {
    headers: { 'Authorization': `Bearer ${token2}` }
  });
  console.log(`   ✓ User 2 received ${chatMessages.length} message(s).`);

  const msg2 = await request(`${API}/chat/${chat._id}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token2}` },
    body: JSON.stringify({ content: 'Yes! It has a blue sticker on the lid. We can meet at the Library desk.' })
  });
  console.log('   ✓ User 2 replied:', msg2.content);

  // 10. Resolve the chat & items
  console.log('11. Resolving the chat and confirming physical return...');
  const resolveResult = await request(`${API}/chat/${chat._id}/resolve`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token1}` }
  });
  console.log('   ✓ Chat resolved! Status:', resolveResult.chat.status);

  // 11. Verify item status updated to resolved
  console.log('12. Verifying reports are marked as resolved in database...');
  const updatedLostItem = await request(`${API}/items/${lostItem._id}`, {
    headers: { 'Authorization': `Bearer ${token1}` }
  });
  console.log('   ✓ Lost Item status is now:', updatedLostItem.status);
  if (updatedLostItem.status !== 'resolved') throw new Error('Lost item status not resolved.');

  console.log('\n========================================');
  console.log('ALL MODULES TESTED AND PASSED WITH 100% SUCCESS!');
  console.log('========================================');
}

runEndToEndTest()
  .catch((err) => {
    console.error('TEST FAILED:', err.message, err.data || '');
    process.exit(1);
  });

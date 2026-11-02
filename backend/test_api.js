const API_URL = 'http://localhost:5000/api';

async function runTests() {
  try {
    const randomUser = `testuser_${Date.now()}@student.nitw.ac.in`;
    const password = 'password123';
    
    console.log('Testing Registration...');
    const regRes = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test User', email: randomUser, password })
    });
    const regData = await regRes.json();
    if (!regRes.ok) throw new Error(regData.message);
    const token = regData.token;
    
    const config = { 
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      } 
    };
    
    console.log('Testing Report Found Item...');
    const foundRes = await fetch(`${API_URL}/items/found`, {
      method: 'POST',
      headers: config.headers,
      body: JSON.stringify({
        title: 'Found Wallet',
        category: 'Wallet',
        location: 'Cafeteria',
        dateFound: new Date().toISOString(),
        description: 'Black leather wallet.'
      })
    });
    const foundData = await foundRes.json();
    if (!foundRes.ok) throw new Error(foundData.message);
    console.log('Found Item reported!', foundData.title, 'Visibility:', foundData.visibility);

    if (foundData.visibility !== 'private') {
      throw new Error('Found item must be private!');
    }

    console.log('Testing Malicious Visibility Change...');
    const updateRes = await fetch(`${API_URL}/items/${foundData._id}`, {
      method: 'PUT',
      headers: config.headers,
      body: JSON.stringify({ visibility: 'public' })
    });
    if (updateRes.status !== 400) {
      throw new Error('Backend failed to reject public visibility change for found item.');
    }
    console.log('Backend correctly rejected malicious visibility change.');

    console.log('Testing Fetch Public Items...');
    const publicItems = await fetch(`${API_URL}/items/lost`, { headers: config.headers });
    const itemsData = await publicItems.json();
    
    // Verify the found item is NOT in the public items
    const foundInPublic = itemsData.some(item => item._id === foundData._id);
    if (foundInPublic) {
      throw new Error('Found item appeared in public feed!');
    }
    console.log('Found item successfully hidden from public feed.');
    
    console.log('All backend tests passed successfully!');
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

runTests();

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User.model');

async function main() {
  const email = process.env.ADMIN_BOOTSTRAP_EMAIL?.trim().toLowerCase();
  if (!process.env.MONGO_URI || !email) {
    throw new Error('MONGO_URI and ADMIN_BOOTSTRAP_EMAIL are required to seed an administrator.');
  }

  await mongoose.connect(process.env.MONGO_URI);
  const user = await User.findOne({ email });
  if (!user) throw new Error('No existing user was found for ADMIN_BOOTSTRAP_EMAIL. Register the account first.');
  if (user.isBlocked) throw new Error('A blocked account cannot be promoted to administrator. Unblock it first.');

  if (user.role === 'admin') {
    console.log(`${email} is already an administrator.`);
    return;
  }
  user.role = 'admin';
  await user.save();
  console.log(`${email} has been promoted to administrator.`);
}

main()
  .catch((error) => {
    console.error(`Admin bootstrap failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });

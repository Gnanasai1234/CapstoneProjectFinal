// Script to update environment field in existing documents
const mongoose = require('mongoose');

async function updateEnvironmentField(databaseName, environment) {
  const uri = `mongodb://localhost:27017/${databaseName}`;
  
  try {
    const conn = await mongoose.createConnection(uri).asPromise();
    
    // Update users collection
    const usersResult = await conn.collection('users').updateMany(
      {},
      { $set: { environment: environment } }
    );
    console.log(`Updated ${usersResult.modifiedCount} users in ${databaseName} to environment: ${environment}`);
    
    // Update products collection
    const productsResult = await conn.collection('products').updateMany(
      {},
      { $set: { environment: environment } }
    );
    console.log(`Updated ${productsResult.modifiedCount} products in ${databaseName} to environment: ${environment}`);
    
    await conn.close();
    console.log(`✅ Environment field updated for ${databaseName}`);
  } catch (error) {
    console.error(`❌ Error updating ${databaseName}:`, error.message);
    throw error;
  }
}

// Command line usage
if (require.main === module) {
  const env = process.argv[2];
  const dbName = process.argv[3];
  
  if (!env || (env !== 'blue' && env !== 'green')) {
    console.error('Usage: node update-environment-field.js <blue|green> <database_name>');
    console.error('Example: node update-environment-field.js green mernapp_green');
    process.exit(1);
  }
  
  if (!dbName) {
    console.error('Database name is required');
    process.exit(1);
  }
  
  updateEnvironmentField(dbName, env)
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Failed:', error);
      process.exit(1);
    });
}

module.exports = { updateEnvironmentField };


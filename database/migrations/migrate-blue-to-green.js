const mongoose = require('mongoose');

class DatabaseMigrator {
  constructor(sourceEnv = 'blue', targetEnv = 'green') {
    this.sourceEnv = sourceEnv;
    this.targetEnv = targetEnv;
    this.sourceURI = `mongodb://localhost:27017/mernapp_${sourceEnv}`;
    this.targetURI = `mongodb://localhost:27017/mernapp_${targetEnv}`;
  }

  async syncDatabases() {
    console.log(`Starting database synchronization from ${this.sourceEnv} to ${this.targetEnv}...`);
    
    try {
      const sourceConn = await mongoose.createConnection(this.sourceURI).asPromise();
      const targetConn = await mongoose.createConnection(this.targetURI).asPromise();

      await this.syncCollection(sourceConn, targetConn, 'users');
      await this.syncCollection(sourceConn, targetConn, 'products');

      await sourceConn.close();
      await targetConn.close();
      console.log(`✅ Database synchronization completed: ${this.sourceEnv} → ${this.targetEnv}`);
    } catch (error) {
      console.error('❌ Database synchronization failed:', error.message);
      throw error;
    }
  }

  async syncCollection(sourceConn, targetConn, collectionName) {
    console.log(`Syncing ${collectionName} from ${this.sourceEnv} to ${this.targetEnv}...`);
    
    const sourceCollection = sourceConn.collection(collectionName);
    const targetCollection = targetConn.collection(collectionName);
    
    // Get all documents from source
    const documents = await sourceCollection.find({}).toArray();
    
    if (documents.length === 0) {
      console.log(`   No documents to sync in ${collectionName}`);
      return;
    }
    
    // Clear target collection
    await targetCollection.deleteMany({});
    console.log(`   Cleared ${collectionName} in target database`);
    
    // Update environment field for each document before inserting
    const updatedDocuments = documents.map(doc => {
      // Remove _id to let MongoDB generate new ones (or keep them for consistency)
      const updatedDoc = { ...doc };
      // Update environment field to target environment
      updatedDoc.environment = this.targetEnv;
      // Update createdAt to preserve original timestamp
      if (updatedDoc.createdAt) {
        updatedDoc.createdAt = new Date(updatedDoc.createdAt);
      }
      return updatedDoc;
    });
    
    // Insert updated documents
    if (updatedDocuments.length > 0) {
      await targetCollection.insertMany(updatedDocuments, { ordered: false });
      console.log(`   ✅ Synced ${updatedDocuments.length} documents in ${collectionName}`);
      console.log(`   Updated environment field: ${this.sourceEnv} → ${this.targetEnv}`);
    }
  }
}

if (require.main === module) {
  // Get source and target from command line args, or use defaults
  const sourceEnv = process.argv[2] || 'blue';
  const targetEnv = process.argv[3] || 'green';
  
  if (sourceEnv !== 'blue' && sourceEnv !== 'green') {
    console.error('Source environment must be "blue" or "green"');
    process.exit(1);
  }
  if (targetEnv !== 'blue' && targetEnv !== 'green') {
    console.error('Target environment must be "blue" or "green"');
    process.exit(1);
  }
  if (sourceEnv === targetEnv) {
    console.error('Source and target environments cannot be the same');
    process.exit(1);
  }
  
  const migrator = new DatabaseMigrator(sourceEnv, targetEnv);
  migrator
    .syncDatabases()
    .then(() => {
      console.log(`\n✅ Migration completed successfully`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}

module.exports = DatabaseMigrator;


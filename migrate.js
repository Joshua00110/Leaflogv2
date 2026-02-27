const admin = require('firebase-admin');
const serviceAccount = require('./path/to/serviceAccountKey.json'); // download from Firebase

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function migrate() {
  const snapshot = await db.collection('plants').get();
  const batch = db.batch();
  snapshot.docs.forEach(doc => {
    const data = doc.data();
    if (!data.status) {
      batch.update(doc.ref, { status: 'active' });
    }
  });
  await batch.commit();
  console.log('Migration complete');
}

migrate().catch(console.error);
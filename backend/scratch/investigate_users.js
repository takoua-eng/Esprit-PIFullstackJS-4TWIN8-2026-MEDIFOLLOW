const mongoose = require('mongoose');

const uri = 'mongodb+srv://Medifollow:Medifollow2025@cluster0.15l0i6q.mongodb.net/test?retryWrites=true&w=majority';

async function run() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 45000,
        family: 4
    });
    const db = mongoose.connection.db;
    
    console.log('--- Investigation starting (Mongoose) ---\n');

    // 1. Find the user named Sarra
    const sarra = await db.collection('users').findOne({ firstName: /sarra/i });
    if (sarra) {
      console.log('Found Sarra:');
      console.log(`- ID: ${sarra._id}`);
      console.log(`- Role ID: ${sarra.roleId}`);
      console.log(`- Role (direct string?): ${sarra.role}`);
      
      const roleId = sarra.roleId || sarra.role;
      const role = await db.collection('roles').findOne({ _id: roleId });
      console.log(`- Role Name: ${role ? role.name : 'Unknown'}`);
      
      // Check her health data
      const symptoms = await db.collection('symptoms').countDocuments({ patientId: sarra._id });
      const vitalparameters = await db.collection('vitalparameters').countDocuments({ patientId: sarra._id });
      const vitals = await db.collection('vitals').countDocuments({ patientId: sarra._id });
      console.log(`- Symptoms count: ${symptoms}`);
      console.log(`- VitalParameters count: ${vitalparameters}`);
      console.log(`- Vitals (legacy) count: ${vitals}`);
    } else {
      console.log('Sarra not found in Users collection.');
    }

    // 2. Find all non-patient users who have health data
    // Patient Role ID from .env: 69c44e6ce03c22d3ff723db5
    const patientRoleIdStr = '69c44e6ce03c22d3ff723db5';
    
    const nonPatientsWithData = [];
    
    // Get unique patientIds from health collections
    const symIds = await db.collection('symptoms').distinct('patientId');
    const vitParamIds = await db.collection('vitalparameters').distinct('patientId');
    const vitIds = await db.collection('vitals').distinct('patientId');
    const allHealthUserIds = [...new Set([...symIds, ...vitParamIds, ...vitIds])];
    
    console.log(`\nFound ${allHealthUserIds.length} unique user IDs in health collections.`);
    
    for (const userId of allHealthUserIds) {
      if (!userId) continue;
      const user = await db.collection('users').findOne({ _id: userId });
      if (user) {
        const roleId = user.roleId || user.role;
        if (String(roleId) !== patientRoleIdStr) {
            const role = await db.collection('roles').findOne({ _id: roleId });
            nonPatientsWithData.push({
              name: `${user.firstName} ${user.lastName}`,
              role: role ? role.name : 'Unknown',
              id: user._id
            });
        }
      } else {
          console.log(`- User ID ${userId} has health data but DOES NOT EXIST in Users collection.`);
      }
    }
    
    if (nonPatientsWithData.length > 0) {
      console.log('\nUsers with non-patient roles found in health collections:');
      nonPatientsWithData.forEach(u => {
        console.log(`- ${u.name} (Role: ${u.role}, ID: ${u.id})`);
      });
    } else {
      console.log('\nNo non-patient users found with health data (except maybe missing users).');
    }

  } catch (err) {
    console.error('Error during investigation:', err);
  } finally {
    await mongoose.connection.close();
    console.log('\n--- Investigation finished ---');
  }
}

run();

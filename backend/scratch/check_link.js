const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/mediflow').then(async () => {
  const users = await mongoose.connection.db.collection('users').find({}).toArray();
  const roles = await mongoose.connection.db.collection('roles').find({}).toArray();

  users.forEach(u => {
    const role = roles.find(r => r._id.toString() === u.role?.toString());
    console.log({
      id: u._id.toString(),
      name: u.firstName + ' ' + u.lastName,
      email: u.email,
      role: role?.name,
      doctorId: u.doctorId?.toString() || null,
      assignedDoctor: u.assignedDoctor?.toString() || null,
      assignedPatients: (u.assignedPatients || []).map(id => id.toString()),
    });
  });
  mongoose.disconnect();
}).catch(e => console.error(e.message));

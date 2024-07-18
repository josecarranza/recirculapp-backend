import Role from '../models/roles.model';

export const createRoles = async () => {
  try {
    const count = await Role.estimatedDocumentCount()
    if(count > 0) return;

    const values = await Promise.all( 
      [
        new Role({name: 'customer'}).save(),
        new Role({name: 'admin'}).save(),
        new Role({name: 'enterprise'}).save(),
        new Role({name: 'gatherer'}).save(),
        new Role({name: 'branch'}).save()
      ]
    ); 

  } catch (error) {

    console.log(error)
    
  }
}
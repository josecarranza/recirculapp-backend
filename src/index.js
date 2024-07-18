import app from './app';
import database from './database';

app.listen(process.env.PORT || 4000);

console.log('Server on port', 4000);

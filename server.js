const mongoose = require('mongoose');

const dotenv = require('dotenv');

dotenv.config({ path: './config.env' });
const app = require('./app');

const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);

mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
  })
  .then(() => {
    console.log('DB connected.................');
  });

const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log('App listening..........');
});

//handling uncaught exception / sync code error
process.on('uncaughtException', (err) => {
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});
// Handling errors outside express for async code
process.on('unhandledRejection', (err) => {
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});

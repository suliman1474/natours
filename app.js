const path = require('path');
const mongoose = require('mongoose');
const express = require('express');
const morgan = require('morgan');
const rateimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');

const tourRouter = require('./routes/tourRoutes');

const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const viewRouter = require('./routes/viewRoutes');
const bookingRouter = require('./routes/bookingRoutes');
// const DB = process.env.DATABASE.replace(
//   '<PASSWORD>',
//   process.env.DATABASE_PASSWORD
// );

// mongoose
//   .connect(DB, {
//     useNewUrlParser: true,
//     useCreateIndex: true,
//     useFindAndModify: false,
//   })
//   .then(() => {
//     console.log('DB connected.................');
//   });

const app = express();
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

//GLOBAL MIDDLEWARES
//SET SECURITY HTTP HEADERS
app.use(
  helmet.contentSecurityPolicy({
    useDefaults: true,
    directives: {
      'default-src': [
        'self',
        'https://*.mapbox.com',
        'http://127.0.0.1:3000/js/bundle.js.map'
      ],
      'script-src': [
        'self',
        'https://cdnjs.cloudflare.com',
        'https://api.mapbox.com ',
        'http://127.0.0.1:3000/js/bundle.js.map',
        'http://127.0.0.1:3000/js/bundle.js',
        'https://js.stripe.com/v3/'
      ],
      'connect-src': [
        'self',
        'ws:',
        'https:',
        'http:',
        'ws://127.0.0.1:51958/'
      ],
      'worker-src': ['self', 'blob:'],
      'frame-src': 'https://js.stripe.com'
    }
  })
);

// DEVELOPMENT LOGGING
console.log(process.env.NODE_ENV);
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// LIMIT REQUESTS RATE FROM SAME API
const limiter = rateimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests! please try again in an hour'
});
app.use('/api', limiter);

// BODY PARSER, READING DATA FROM BODY TO req.body
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());

//DATA SANITIZATION AGAINST NOSQL QUERY
app.use(mongoSanitize());

//PREVENTING PARAMETERS POLLUTION
app.use(
  hpp({
    whitelist: [
      'durations',
      'ratingsQuantity',
      'ratingsAverage',
      'maxGroupSize',
      'difficulty'
    ]
  })
);
// serving static file
app.use(express.static(path.join(__dirname, 'public')));
//DATA SANITIZATION AGAINST XSS ATTACK
app.use(xss());

// Test middleware
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();

  // console.log(req.cookies);
  next();
});
// app.use(function(req, res, next) {
//   res.setHeader(
//     'Report-To',
//     '{"group":"csp-endpoint","max_age":10886400,"endpoints":[{"url":"https://<your_server_ip>:5500/__cspreport__"}],"include_subdomains":true}'
//   );
//   res.setHeader(
//     'Content-Security-Policy-Report-Only',
//     "default-src 'self'; font-src 'self' https://fonts.googleapis.com; img-src 'self' https://images.unsplash.com; script-src 'self' https://cdnjs.cloudflare.com/ajax/libs/axios/0.21.1/axios.min.js 'sha256-INJfZVfoUd61ITRFLf63g+S/NJAfswGDl15oK0iXgYM='; style-src 'self' https://fonts.googleapis.com https://cdn.jsdelivr.net/npm/bootstrap@4.5.3/dist/css/bootstrap.min.css; frame-src 'self' https://www.youtube.com https://youtube.com; report-to csp-endpoint;"
//   );
//   next();
// });

// app.use(function(req, res, next) {
//   res.setHeader(
//     'Content-Security-Policy',
//     "default-src 'self'   https://*.mapbox.com  http://127.0.0.1:3000/js/bundle.js.map; base-uri 'self';block-all-mixed-content;font-src 'self' https: data:;frame-ancestors 'self';img-src 'self' data:;object-src 'none';connect-src 'self' ws://127.0.0.1:56559/ ws://127.0.0.1:53650/ ws://127.0.0.1:61028/ ws://127.0.0.1:54246/ ws://127.0.0.1:55895/ http://127.0.0.1:3000/js/bundle.js.map; script-src https://cdnjs.cloudflare.com https://api.mapbox.com  http://127.0.0.1:3000/js/bundle.js.map 'self' blob: ;script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests;"
//     //"default-src 'self' http://127.0.0.1:3000/js/bundle.js.map; connect-src 'self' ws://127.0.0.1:54246/ ws://127.0.0.1:55895/ http://127.0.0.1:3000/js/bundle.js.map"
//   );
//   next();
// });
// ROUTES
app.use('/', viewRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingRouter);
//ROUTE ERROR HANDLER MIDDLEWARE
app.all('*', (req, res, next) => {
  next(new AppError(`${req.originalUrl} not found!`, 404));
});

app.use(globalErrorHandler);
module.exports = app;

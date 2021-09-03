const Tour = require('./../models/tourModel');
const Booking = require('./../models/bookingModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');

exports.getOverview = catchAsync(async (req, res, next) => {
  const tours = await Tour.find();
  res.status(200).render('overview', {
    title: 'All Tours',
    tours
  });
});

exports.getTour = catchAsync(async (req, res, next) => {
  // get tour data by slug
  const tour = await Tour.findOne({ slug: req.params.slug }).populate({
    path: 'reviews',
    fields: 'reviews rating user'
  });

  if (!tour) return next(new AppError('There is no Tour with that name', 404));
  res
    .status(200)

    .render('tour', {
      title: tour.name,
      tour
    });
});

exports.getLoginForm = (req, res) => {
  console.log('get sign up form');
  res.status(200).render('login', {
    title: 'Log into you Account'
  });
};
exports.getSignUpForm = (req, res) => {
  console.log('get sign up form');
  res.status(200).render('signup', {
    title: 'Create your new account'
  });
};
exports.getAccount = (req, res) => {
  res.status(200).render('account', {
    title: 'Your account'
  });
};

exports.getMyTours = catchAsync(async (req, res, next) => {
  // 1) Find all bookings
  const bookings = await Booking.find({ user: req.user.id });

  // 2) Find tours with the returned IDs
  const tourIDs = bookings.map(el => el.tour);
  const tours = await Tour.find({ _id: { $in: tourIDs } });

  res.status(200).render('overview', {
    title: 'My Tours',
    tours
  });
});
// exports.updateUserData = catchAsync(async (req, res, next) => {
//   const updatedUser = await User.findByIdAndUpdate(
//     req.user.id,
//     {
//       name: req.body.name,
//       email: req.body.email
//     },
//     {
//       new: true,
//       runValidators: true
//     }
//   );

//   res.status(200).render('account', {
//     title: 'Your account',
//     user: updatedUser
//   });
// });

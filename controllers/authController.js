const cypto = require('crypto');
const { promisify } = require('util');
const AppError = require('./../utils/appError');
const jwt = require('jsonwebtoken');
const User = require('./../models/userModel');
const catchAsync = require('./../utils/catchAsync');
const Email = require('./../utils/email');
//const cookieParser = require('cookie-parser');

const signToken = id => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);

  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIES_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true // cannot be accesed in anyway by the browser
  };

  if (process.env.NODE_ENV === 'production') {
    cookieOptions.secure = true;
  }

  res.cookie('jwt', token, cookieOptions);
  user.password = undefined; // to not show it to user

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user
    }
  });
};
exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    passwordChangedAt: req.body.passwordChangedAt
  });

  const url = `${req.protocol}://${req.get('host')}/me`;
  console.log(url);
  await new Email(newUser, url).sendWelcome();
  ///////////token
  createSendToken(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  //check if email and password exists
  if (!email || !password)
    return next(new AppError('Please provide email and password', 400));
  // check if user exists and password is correct
  const user = await User.findOne({ email }).select('+password'); // findOne ({email: email})

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401));
  }
  // if every thing is OK
  createSendToken(user, 200, res);
});

exports.protect = catchAsync(async (req, res, next) => {
  // Getting tokens and checks if it exists

  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(new AppError('You are not logged in ', 401));
  }
  //verification token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  // console.log(decoded);
  // check if user still exists
  const CurrentUser = await User.findById(decoded.id);
  if (!CurrentUser) {
    return next(new AppError('The user no longer exist', 401));
  }
  //check if user changed password after token issued
  if (CurrentUser.ChangedPasswordAfter(decoded.iat)) {
    return next(new AppError('The password has been changed!', 401));
  }

  req.user = CurrentUser;
  res.locals.user = CurrentUser;
  next();
});

// only for rendered pages , no error
exports.isLoggedIn = async (req, res, next) => {
  // Getting tokens and checks if it exists
  if (req.cookies.jwt) {
    try {
      //verification token
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET
      );
      // console.log(decoded);
      // check if user still exists

      const CurrentUser = await User.findById(decoded.id);
      if (!CurrentUser) {
        return next();
      }
      //check if user changed password after token issued
      if (CurrentUser.ChangedPasswordAfter(decoded.iat)) {
        return next();
      }

      // the user is logged in at this point

      res.locals.user = CurrentUser;
      return next();
    } catch (err) {
      return next();
    }
  }

  next();
};

exports.logOut = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });

  res.status(200).json({ status: 'success' });
};
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    //roles is an array of parameter sent
    if (!roles.includes(req.user.role)) {
      return next(new AppError('You dont have the permission', 403));
    }

    next();
  };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  //1) GET USER BY EMAIL
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    return next(new AppError('There is no user with this email', 404));
  }

  //2) GENERATE A RANDOM STRING
  const resetToken = user.createPasswordResetToken();
  // NOW IN createPasswordResetToken WE MODIFIED IT BUT NOW WE HAVE TO SAVE IT
  // BUT THERE ARE VALIDATORS IN OUR SCHEMA THAT ARE MANDITORY SO WE ALSO HAVE TO DISABLE THAT
  await user.save({ validateBeforeSave: false });

  // IF ANY ERROR OCCUR WE DOES'NT SIMPLY WANT TO SEND IT TO GOBAL ERROR HANDLER BUT ALSO
  //MAKE THE passwordResetToken and passwordResetExpire SET TO UNDEFINE SO FOR THAT

  // 3)NOW SEND IT TO USER VIA EMAIL   // INSTALL npm i nodemailer
  try {
    const resetURL = `${req.protocol}://${req.get(
      'host'
    )}/api/v1/users/resetPassword/${resetToken}`;

    await new Email(user, resetURL).sendPasswordReset();
    res.status(200).json({
      status: 'success',
      message: 'Token send to email!'
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    await user.save({ validateBeforeSave: false });

    return next(new AppError('Error in sending email', 500));
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  //1) GET USER BASED ON THE TOKEN

  const hashedToken = cypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');
  //comparing

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() }
  });

  //2) IF TOKEN IS VALID, SET NEW PASSWORD
  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400));
  }

  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;

  await user.save();
  //3) UPDATING THE passwordChangedAt property but will do that in userModel.js as a middleware

  //  4) LOG THE USER IN OR SEND JWT TOKEN
  createSendToken(user, 200, res);
});

// exports.updatePassword = catchAsync(async (req, res, next) => {
//   // GET USER FROM COLLECTION
//   console.log('in the update passowrd');
//   const user = User.findById(req.user.id).select('+password');

//   //2) CHECK IF THE POSTED CURRENT PASSWORD IS CORRECT

//   if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
//     return next(new AppError('Your current password is wrong.', 401));
//   }
//   console.log('above');
//   //3)  UPDATE PASSWORD
//   user.password = req.body.password;
//   user.passwordConfirm = req.body.passwordConfirm;

//   await user.save();
//   console.log('just sending the token');
//   //4) SEND JWT TOKEN
//   createSendToken(user, 200, res);
// });

exports.updatePassword = catchAsync(async (req, res, next) => {
  // 1) Get user from collection
  const user = await User.findById(req.user.id).select('+password');

  // 2) Check if POSTed current password is correct
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError('Your current password is wrong.', 401));
  }

  // 3) If so, update password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();
  // User.findByIdAndUpdate will NOT work as intended!

  // 4) Log user in, send JWT
  createSendToken(user, 200, res);
});

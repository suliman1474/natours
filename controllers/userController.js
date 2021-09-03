const multer = require('multer');
const sharp = require('sharp');
const User = require('./../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const factory = require('./handlerFactory');

// const multerStorage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, 'public/img/users');
//   },
//   filename: (req, file, cb) => {
//     const ext = file.mimetype.split('/')[1];
//     cb(null, `user-${req.user.id}-${Date.now()}.${ext}`);
//   }
// });
const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Not an image! Please upload only images.', 400), false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter
});

exports.uploadUserPhoto = upload.single('photo');

exports.resizeUserPhoto = catchAsync(async (req, res, next) => {
  if (!req.file) return next();

  req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`;

  await sharp(req.file.buffer)
    .resize(500, 500)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/users/${req.file.filename}`);

  next();
});

const filterObject = (obj, ...allowedFields) => {
  const newObj = {};

  Object.keys(obj).forEach(el => {
    if (allowedFields.includes(el)) {
      newObj[el] = obj[el];
    }
  });

  return newObj;
};

exports.updateMe = catchAsync(async (req, res, next) => {
  //CREATE ERROR IF PASSWORD OR CONFIRM PASSWORD ARE INPUT BY USER
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError('use the other route for this functionality', 400)
    );
  }

  // FILTER THE BODY TO ONLY ALLOWED FIELDS
  const filteredBody = filterObject(req.body, 'name', 'email');
  // if there is some image uploaded then it will be added to phot property
  if (req.file) filteredBody.photo = req.file.filename;
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser
    }
  });
});

exports.deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, { active: false });

  res.status(201).json({
    status: 'success',
    data: null
  });
});
exports.createUser = (req, res) => {
  res.status(500).json({
    status: 'error',
    message: 'This route is not yet defined!.please try /signup'
  });
};

exports.getMe = (req, res, next) => {
  // WE'LL PUT IT ON PARAMS SO WE CAN USE IT THEN IN HANDLEFACTORY
  req.params.id = req.user.id;
  next();
};
exports.getAllUsers = factory.getAll(User);
exports.getUser = factory.getOne(User);
//  DO NOT USE IT FOR PASSWORD UPDATE B/C ALL THE SAVE MIDDLEWARE WON'T RUN FOR IT AS findByIdAndUpdate is used in updateOne
exports.updateUser = factory.updateOne(User);

exports.deleteUser = factory.deleteOne(User);

const express = require('express');
const userController = require('./../controllers/userController');
const authController = require('./../controllers/authController');

const router = express.Router();

// WE DON'T NEED PROTECT FOR THESE
router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.get('/logout', authController.logOut);

router.post('/forgotPassword', authController.forgotPassword);
router.patch('/resetPassword/:token', authController.resetPassword);

// WE NEED PROTECT MIDDLE WARE FOR ALL BELOW THIS POINT
router.use(authController.protect);
// all will have authController.protect
router.patch(
  '/updateMe',
  userController.uploadUserPhoto,
  userController.resizeUserPhoto,
  userController.updateMe
);
router.delete('/deleteMe', userController.deleteMe);
router.get('/me', userController.getMe, userController.getUser);
router.patch('/updateMyPassword', authController.updatePassword);

// FROM HERE WE ALSO WANT ONLY ADMIN TO USE THESE ROUTES SO USING THE SAME WAY
router.use(authController.restrictTo('admin'));
// so only user can get users and update and delete it
router
  .route('/')
  .get(userController.getAllUsers)
  .post(userController.createUser);

router
  .route('/:id')
  .get(userController.getUser)
  .patch(userController.updateUser)
  .delete(userController.deleteUser);

module.exports = router;

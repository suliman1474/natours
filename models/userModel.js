const crypto = require('crypto');
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please Enter your Name.']
  },
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Please provide a valid email']
  },
  photo: {
    type: String,
    default: 'default.jpg'
  },
  role: {
    type: String,
    enum: ['user', 'lead-guide', 'guide', 'admin'],
    default: 'user'
  },
  password: {
    type: String,
    required: [true, 'Please provide Password'],
    minlength: 8,
    select: false // will not be visible to users
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Please confirm your Password'],
    validate: {
      //THIS ONLY WORKS ON CREATE AND SAVE
      validator: function(el) {
        return el === this.password;
      },
      message: 'Passwrods are not same.'
    }
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  active: {
    type: Boolean,
    default: true,
    select: false
  }
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();

  this.password = await bcrypt.hash(this.password, 12);

  this.passwordConfirm = undefined;
  next();
});

userSchema.pre(/^find/, function(next) {
  this.find({ active: { $ne: false } });
  next();
});
//UPDATING THE passwordChangedAt property
userSchema.pre('save', function(next) {
  if (!this.isModified('password') || this.isNew) return next();

  this.passwordChangedAt = Date.now() - 1000;
  next();
});
userSchema.methods.correctPassword = async function(
  /// instance method ,will be availible on all document of a certain collection
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

//for checking of password change
userSchema.methods.ChangedPasswordAfter = function(JWTTimeStamp) {
  if (this.passwordChangedAt) {
    const ChangeTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );

    return JWTTimeStamp < ChangeTimestamp;
  }

  return false; //if not changed;
};

userSchema.methods.createPasswordResetToken = function() {
  // PLAIN TOKEN
  const resetToken = crypto.randomBytes(32).toString('hex');

  // ENCRYPTING PLAIN TOKEN AND MODIFY passwordResetToken and passwordResetExpire
  // WE ENCRYPT IT TO STORE IT IN OUR DB AND AVOID SECURITY THREATS
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 mint in milleseconds

  console.log({ resetToken }, this.passwordResetToken);
  // NOW RETURN THE PLAIN TOKEN TO SEND IT TO THE USER
  return resetToken;
};
const User = mongoose.model('User', userSchema);

module.exports = User;

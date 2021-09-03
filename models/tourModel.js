const mongoose = require('mongoose');
const slugify = require('slugify');
const validator = require('validator');

const tourSchema = new mongoose.Schema(
  {
    // id: mongoose.ObjectId,
    name: {
      type: String,
      required: [true, 'A tour must have a name'],
      unique: true,
      trim: true,
      minlength: [10, 'Name should be more than 10 characters'],
      maxlength: [40, 'Name should be below 40 characters']
    },
    slug: String,
    duration: {
      type: Number,
      required: [true, 'A tour must have duration']
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'A tour must have group size']
    },
    difficulty: {
      type: String,
      required: [true, 'A tour must have difficulty'],
      enum: {
        // only use for strings
        values: ['easy', 'difficult', 'medium'],
        message: 'Difficulty can only be easy,medium or difficult.'
      }
    },

    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, 'Rating must be above 1.0'],
      max: [5, 'Rating must be below 5.0'], // min and max can be use for int and dates
      set: val => Math.round(val * 10) / 10
    },
    ratingsQuantity: {
      type: Number,
      default: 0
    },
    price: {
      type: Number,
      required: [true, 'A tour must have a price']
    },
    priceDiscount: {
      type: Number,
      validate: {
        // creating own validators
        validator: function(val) {
          // this only points to current doc on NEW document creation
          return val < this.price;
        },
        message: 'Discount price ({VALUE}) should be below regular price'
      }
    },
    summary: {
      type: String,
      trim: true,
      required: [true, 'A tour must Summary']
    },

    description: {
      type: String,
      trim: true
    },
    imageCover: {
      type: String,
      required: [false, 'A tour must have an image']
    },
    images: [String],
    createAt: {
      type: Date,
      default: Date.now(),
      select: false // ALWAYS HIDES FROM THE USER OR NOT SHOWN
    },
    secretTour: {
      type: Boolean,
      default: false
    },
    startDates: [Date],
    startLocation: {
      type: {
        type: String,
        default: 'Point',
        enum: ['Point']
      },
      coordinates: [Number],
      address: String,
      description: String
    },
    locations: [
      {
        type: {
          type: String,
          default: 'Point',
          enum: ['Point']
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number
      }
    ],
    guides: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'User' // works even if user is not required above
      }
    ]
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

//creating indexes
tourSchema.index({ price: 1 });
//compound indexes . Will also work if only searched for one field
tourSchema.index({ price: 1, ratingsAverage: -1 });
tourSchema.index({ slug: 1 });
tourSchema.index({ startLocation: '2dsphere' });
//DOCUMNET MIDDLEWARE // ONLY INVOKES FOR .save() & .create();  will not work for updatedocoment
tourSchema.pre('save', function(next) {
  this.slug = slugify(this.name, { lower: true });
  next();
});

// POPULATE
tourSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'guides',
    select: '-__v -passwordChangedAt'
  });
  next();
});

// VIRTUAL POPULATE
tourSchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'tour',
  localField: '_id'
});
// QUERY MIDDLEWARE
tourSchema.pre(/^find/, function(next) {
  this.find({ secretTour: { $ne: true } });
  next();
});

tourSchema.post(/^find/, function(docs, next) {
  next();
});

// AGGREGATION MIDDLEWARE//////
// tourSchema.pre('aggregate', function(next) {
//   console.log(this.pipeline());
//   this.pipeline().unshift({ $match: { secretTour: { $ne: true } } }); //unshift  is use to push somethng to the start of an array, and shift() for end of an array
//   next();
// });
tourSchema.virtual('durationWeeks').get(function() {
  return this.duration / 7;
});

const Tour = mongoose.model('Tour', tourSchema);
module.exports = Tour;

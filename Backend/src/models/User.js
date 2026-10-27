import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
    },
    passwordHash: {
      type: String,
      select: false // Do not return passwordHash by default in queries
    },
    password: {
      type: String,
      select: false // Backward compatibility with initial seeds
    },
    name: {
      type: String,
      trim: true,
      default: 'Pocika Staff'
    },
    role: {
      type: String,
      enum: ['admin', 'staff'],
      default: 'staff',
      required: true
    },
    isActive: {
      type: Boolean,
      default: true
    },
    isSuperAdmin: {
      type: Boolean,
      default: false
    },
    lastLogin: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

// Virtual for 'plainPassword' to allow passing plain password which gets hashed into passwordHash
userSchema.virtual('plainPassword')
  .set(function (val) {
    this._plainPassword = val;
  })
  .get(function () {
    return this._plainPassword;
  });

// Pre-save hook to hash password if modified or virtual set
userSchema.pre('save', async function (next) {
  // If plainPassword virtual was provided
  if (this._plainPassword) {
    try {
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(this._plainPassword, salt);
      this.passwordHash = hash;
      this.password = hash;
    } catch (err) {
      return next(err);
    }
  }

  // Ensure passwordHash is set if password exists
  if (this.password && !this.passwordHash) {
    this.passwordHash = this.password;
  }
  if (this.passwordHash && !this.password) {
    this.password = this.passwordHash;
  }

  next();
});

// Instance method to check candidate password against passwordHash or password
userSchema.methods.comparePassword = async function (candidatePassword) {
  const hash = this.passwordHash || this.password;
  if (!hash) return false;
  return bcrypt.compare(candidatePassword, hash);
};

export const User = mongoose.model('User', userSchema);

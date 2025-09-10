import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

const User = sequelize.define('users', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notNull: { msg: 'Name is required' },
      notEmpty: { msg: 'Name cannot be empty' },
      len: {
        args: [2, 100],
        msg: 'Name must be between 2 and 100 characters'
      }
    }
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: {
      name: 'email',
      msg: 'Email already in use'
    },
    validate: {
      isEmail: { msg: 'Please provide a valid email' },
      notNull: { msg: 'Email is required' },
      notEmpty: { msg: 'Email cannot be empty' },
      len: {
        args: [6, 100],
        msg: 'Email must be between 6 and 100 characters'
      }
    }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notNull: { msg: 'Password is required' },
      notEmpty: { msg: 'Password cannot be empty' },
      len: {
        args: [6, 255],
        msg: 'Password must be at least 6 characters long'
      }
    },
    set(value) {
      const salt = bcrypt.genSaltSync(10);
      const hash = bcrypt.hashSync(value, salt);
      this.setDataValue('password', hash);
    }
  },
  role: {
    type: DataTypes.ENUM('student', 'teacher', 'admin'),
    defaultValue: 'student',
    validate: {
      isIn: {
        args: [['student', 'teacher', 'admin']],
        msg: 'Role must be either student, teacher, or admin'
      }
    }
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true,
    unique: {
      name: 'phone',
      msg: 'Phone number already in use'
    },
    validate: {
      isPhoneNumber(value) {
        if (!value) return; // Allow null/empty
        const phoneRegex = /^\+?[1-9]\d{1,3}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9}$/;
        if (!phoneRegex.test(value)) {
          throw new Error('Please provide a valid phone number with country code (e.g., +1 234 567 8900)');
        }
      }
    }
  },
  isPhoneVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false
  },
  profile_picture: {
    type: DataTypes.STRING,
    allowNull: true
  },
  is_email_verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  last_login: {
    type: DataTypes.DATE,
    allowNull: true
  },
  reset_password_token: {
    type: DataTypes.STRING,
    allowNull: true
  },
  reset_password_expire: {
    type: DataTypes.DATE,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'suspended'),
    defaultValue: 'active',
    validate: {
      isIn: {
        args: [['active', 'inactive', 'suspended']],
        msg: 'Invalid status'
      }
    }
  }
}, {
  timestamps: true,
  underscored: true,
  tableName: 'users',  
  hooks: {
    beforeCreate: (user) => {
      // Ensure email is lowercase
      if (user.email) {
        user.email = user.email.toLowerCase();
      }
    },
    beforeUpdate: (user) => {
      // Ensure email is lowercase on update
      if (user.changed('email') && user.email) {
        user.email = user.email.toLowerCase();
      }
    }
  }
});

// Instance method to check password
User.prototype.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Sign JWT and return
User.prototype.getSignedJwtToken = function() {
  return jwt.sign(
    { 
      id: this.id,
      email: this.email,
      role: this.role
    },
    process.env.JWT_SECRET,
    { 
      expiresIn: process.env.JWT_EXPIRE || '30d'
    }
  );
};

export default User;

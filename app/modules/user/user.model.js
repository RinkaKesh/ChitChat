const mongoose = require("mongoose")

const userSchema = new mongoose.Schema({
    firstname: { type: String, required: true, trim: true },
    lastname: { type: String, required: true, trim: true },
    email: { 
        type: String, required: true,unique: true, lowercase: true,
        trim: true,
         validate: {
            validator: function(email) {
                return /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(email);
            },
            message: 'Please enter a valid email'
        }
    },
      phone: { 
        type: String, required: true, 
        validate: {
            validator: function(phone) {
                return /^[+]?[\d\s\-\(\)]+$/.test(phone);
            },
            message: 'Please enter a valid phone number'
        }  
    },  
     gender: {
        type: String, 
        required: true, 
        enum: {
            values: ["male", "female", "preferred not to say"],
            message: '{VALUE} is not a valid gender option'
        }
    },    
    password: { 
        type: String, 
        required: true, 
        select: false,
        minlength: [6, 'Password must be at least 6 characters long']
    },   
    role: {
        type: String, 
        required: true, 
        enum: ['user', 'admin'], 
        default: 'user'
    },
   isActive: {
        type: Boolean,
        default: true
    },
    lastLogin: {
        type: Date
    },
    avatar:{type:String,default:""}
}, {
    timestamps: true 
});
// userSchema.index({ email: 1 });
// userSchema.index({ _id: 1, isActive: 1 });

const UserModel = mongoose.model("user", userSchema);
module.exports = UserModel;
const UserModel  = require("./user.model")
const MessageModel=require("../message/message.model")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const authConfig = require("../../../configs/auth.config")
const regConfig = require("../../../configs/reg.config")
const mongoose=require("mongoose")


exports.signup = async (req, res) => {
    try {
        const { firstname, lastname, email, phone, gender, password } = req.body;

        if (!firstname || !lastname || !email || !phone || !gender || !password) {
            return res.status(400).send({ 
                message: "All fields are required" 
            });
        }

        if (password.length < 6) {
            return res.status(400).send({ 
                message: "Password must be at least 6 characters long" 
            });
        }
     
        const existingUser = await UserModel.findOne({ email: email.toLowerCase().trim() });
        if (existingUser) {
            return res.status(400).send({ 
                message: "Email already in use" 
            });
        }
        const hashedPassword = await bcrypt.hash(password, regConfig.SALT_ROUND);

       
        const userObj = {
            firstname: firstname.trim(),
            lastname: lastname.trim(),
            email: email.toLowerCase().trim(),
            phone: phone.trim(),
            gender,
            password: hashedPassword,
        };

        const savedUser = await UserModel.create(userObj);

        const postResponse = {
            _id: savedUser._id,
            firstname: savedUser.firstname,
            lastname: savedUser.lastname,
            email: savedUser.email,
            phone: savedUser.phone,
            gender: savedUser.gender,
            role: savedUser.role,
            createdAt: savedUser.createdAt,
            updatedAt: savedUser.updatedAt,
        };

        res.status(201).send({
            message: "User Successfully Registered",
            data: postResponse,
        });
    } catch (error) {
        console.error("Signup Error:", error);
        
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(err => err.message);
            return res.status(400).send({
                message: "Validation Error",
                errors: messages
            });
        }

        if (error.code === 11000) {
            return res.status(400).send({
                message: "Email already exists"
            });
        }
        res.status(500).send({
            message: "Internal Server Error",
        });
    }
};

exports.signin = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).send({
                message: "Email and password are required"
            });
        }
        const emailFromReq = email.trim().toLowerCase();
        const passwordFromReq = password;

        const userSaved = await UserModel.findOne({ 
            email: emailFromReq,
            isActive: true 
        }).select("+password");

        if (!userSaved) {
            return res.status(401).send({
                message: "Invalid email or password"
            });
        }
        const isValidPassword = await bcrypt.compare(passwordFromReq, userSaved.password);

        if (!isValidPassword) {
            return res.status(401).send({
                message: "Invalid email or password"
            });
        }

        await UserModel.findByIdAndUpdate(userSaved._id, { 
            lastLogin: new Date() 
        });

        
        const token = jwt.sign(
            { 
                userId: userSaved._id,
                // email: userSaved.email,
                // role: userSaved.role
            },
            authConfig.secret,
            { expiresIn: "7d" }
        );

        const responseData = {
            _id: userSaved._id,
            firstname: userSaved.firstname,
            lastname: userSaved.lastname,
            email: userSaved.email,
            phone: userSaved.phone,
            gender: userSaved.gender,
            role: userSaved.role,
            createdAt: userSaved.createdAt,
            updatedAt: userSaved.updatedAt,
            lastLogin: userSaved.lastLogin,
            accessToken: token
        };

        res.status(200).send({ 
            message: "Login successful", 
            data: responseData 
        });

    } catch (err) {
        console.error("Error during signin:", err);
        res.status(500).send({ 
            message: "Internal server error" 
        });
    }
};

exports.getUsers = async (req, res) => {
    try {
        const userId = req.userId;

        if (!userId) {
            return res.status(401).send({
                message: "User not authenticated"
            });
        }
        const filteredUsers = await UserModel.find({ 
            _id: { $ne: userId },
            isActive: true 
        }).select("-password");
        const unReadMsg = {};
        const unreadCounts = await MessageModel.aggregate([
            {
                $match: {
                    receiver: new mongoose.Types.ObjectId(userId),
                    read: false
                }
            },
            {
                $group: {
                    _id: "$sender",
                    count: { $sum: 1 }
                }
            }
        ]);

        unreadCounts.forEach(item => {
            unReadMsg[item._id.toString()] = item.count;
        });

        res.status(200).send({
            users: filteredUsers,
            message: "Successfully fetched all Users",
            status: 200,
            unReadMsg
        });
    } catch (err) {
        console.error("Error while fetching users:", err);
        res.status(500).send({
            message: "Some internal server error",
            status: 500
        });
    }
};

exports.getProfile = async (req, res) => {
    try {
        const userId = req.userId;
        
        const user = await UserModel.findById(userId);
        
        if (!user) {
            return res.status(404).send({
                message: "User not found"
            });
        }

        res.status(200).send({
            data: user,
            message: "Profile fetched successfully"
        });
    } catch (error) {
        console.error("Get profile error:", error);
        res.status(500).send({
            message: "Internal server error"
        });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const userId = req.userId;
        console.log("userId from update", userId);

        const { firstname, lastname, phone, gender } = req.body;

        const updateData = {};
        if (firstname) updateData.firstname = firstname.trim();
        if (lastname) updateData.lastname = lastname.trim();
        if (phone) updateData.phone = phone.trim();
        if (gender) updateData.gender = gender;

        if (req.files && req.files.length > 0) {
            updateData.avatar = req.files[0].filename;
        }
           console.log(req.files,"from update of authController");
           
        const updatedUser = await UserModel.findByIdAndUpdate(
            userId,
            updateData,
            { new: true, runValidators: true }
        );

        if (!updatedUser) {
            return res.status(404).send({
                message: "User not found"
            });
        }

        res.status(200).send({
            data: updatedUser,
            message: "Profile updated successfully"
        });

    } catch (error) {
        console.error("Update profile error:", error);

        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(err => err.message);
            return res.status(400).send({
                message: "Validation Error",
                errors: messages
            });
        }

        res.status(500).send({
            message: "Internal server error"
        });
    }
};

const authController = require("../modules/user/auth.controller");
const authMiddleware = require("../modules/user/auth.middleware");
const fileConfig=require('../../configs/file.config')
const multer = require("multer");

const storeImage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, fileConfig.avatarUrl)
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + "_" + file.originalname)
    }
})
const upload = multer({ storage: storeImage })

module.exports = (app) => {
    app.post("/api/auth/signup", authController.signup);
    app.post("/api/auth/signin", authController.signin);

    // protected routes
    app.get("/api/users",authMiddleware.verifytoken, authController.getUsers);
    app.get("/api/auth/profile", authMiddleware.verifytoken, authController.getProfile);
    app.patch("/api/auth/profile", [authMiddleware.verifytoken,upload.single("avatar")], authController.updateProfile);

}

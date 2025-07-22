const authController = require("../modules/user/auth.controller");
const authMiddleware = require("../modules/user/auth.middleware")

module.exports = (app) => {
    app.post("/api/auth/signup", authController.signup);
    app.post("/api/auth/signin", authController.signin);

    // protected routes
    app.get("/api/users", authMiddleware.verifytoken, authController.getUsers);
    app.get("/api/auth/profile", authMiddleware.verifytoken, authController.getProfile);
    app.patch("/api/auth/profile", authMiddleware.verifytoken, authController.updateProfile);

}
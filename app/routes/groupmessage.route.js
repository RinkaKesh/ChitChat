
const groupController = require("../modules/group/group.controller");
const authMiddleware = require("../modules/user/auth.middleware")

module.exports = (app) => {
    app.post("/api/groups",authMiddleware.verifytoken,  groupController.createGroup);
    app.get("/api/groups", authMiddleware.verifytoken, groupController.getGroups);
    app.get("/api/groups/:id", authMiddleware.verifytoken, groupController.getGroups);
    app.post("/api/groups/add_member", authMiddleware.verifytoken, groupController.getGroups);
    app.post("/api/groups/remove_member", authMiddleware.verifytoken, groupController.getGroups);
}
const messageController = require("../modules/message/message.controller")
const authMiddleware = require("../modules/user/auth.middleware")


module.exports = (app) => {

    app.post("/api/messages",authMiddleware.verifytoken,  messageController.sendMessage);
    app.get("/api/messages/:id", authMiddleware.verifytoken, messageController.getMessages);
    app.patch("/api/messages/read/:id", authMiddleware.verifytoken, messageController.markReadMsg);
    app.put("/api/messages/:id", authMiddleware.verifytoken, messageController.updateMessage);
    app.delete("/api/messages/:id", authMiddleware.verifytoken, messageController.deleteMessage);
};


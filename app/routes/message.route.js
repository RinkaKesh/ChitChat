const messageController = require("../modules/message/message.controller")
const authMiddleware = require("../modules/user/auth.middleware")
const fileConfig=require('../../configs/file.config')
const multer = require("multer");

const storeImage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, fileConfig.messageUrl)
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + "_" + file.originalname)
    }
})
const upload = multer({ storage: storeImage })

module.exports = (app) => {

    app.post("/api/messages",authMiddleware.verifytoken,upload.any("file"),messageController.sendMessage);
    app.get("/api/messages/:id", authMiddleware.verifytoken, messageController.getMessages);
    app.patch("/api/messages/read/:id", authMiddleware.verifytoken, messageController.markReadMsg);
    app.put("/api/messages/:id", authMiddleware.verifytoken, messageController.updateMessage);
    app.delete("/api/messages/:id", authMiddleware.verifytoken, messageController.deleteMessage);
};


const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true,
    },
    receiver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: function() {
            return !this.groupId;
        }
    },
    content: {
        type: String,
        required: true,
    },
    file: {
        type: String
    },
    read: {
        type: Boolean,
        default: false,
    },
    createdAt: {
        type: Date,
        default: () => Date.now(),
    },
    groupId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "group",
        default: null
    }
});

messageSchema.pre('validate', function(next) {
    if (!this.receiver && !this.groupId) {
        this.invalidate('receiver', 'Either receiver or groupId must be specified');
        this.invalidate('groupId', 'Either receiver or groupId must be specified');
    }
    next();
});

const MessageModel = mongoose.model("message", messageSchema);

module.exports = MessageModel;
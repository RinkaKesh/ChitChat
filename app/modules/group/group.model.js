const mongoose = require("mongoose");

const groupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
    required: true
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "user"
  }],
  createdAt: {
    type: Date,
    default: () => Date.now()
  }
});

const GroupModel = mongoose.model("group", groupSchema);
module.exports = GroupModel;


const MessageModel = require("./message.model");
const GroupModel=require("../group/group.model");

exports.sendMessage = async (req, res) => {
  try {
    const { receiver, content, groupId } = req.body;
    const sender = req.userId;

    if (!content || (!receiver && !groupId)) {
      return res.status(400).send({
        message: "Message content and target (receiver or groupId) are required"
      });
    }

   
    if (groupId) {
      const group = await GroupModel.findById(groupId);
      if (!group) {
        return res.status(404).send({ message: "Group not found" });
      }

      if (!group.members.includes(sender)) {
        return res.status(403).send({ message: "You are not a member of this group" });
      }
    }

    const messagePayload = {
      sender,
      content,
      receiver: groupId ? null : receiver,
      groupId: groupId || null
    };

    const newMessage = await MessageModel.create(messagePayload);

    const io = req.app.get("io");
    if (io) {
      if (groupId) {
        io.to(`group-${groupId}`).emit("receiveGroupMessage", {
          groupId,
          senderId: sender,
          message: newMessage
        });
      } else {
        io.to(receiver).emit("receiveMessage", {
          senderId: sender,
          message: newMessage
        });
      }
    }

    res.status(201).send({
      message: "Message sent",
      data: newMessage
    });
  } catch (err) {
    res.status(500).send({
      message: "Failed to send message",
      error: err.message
    });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const { id } = req.params;
    const { type = "private" } = req.query; 
    const myId = req.userId;

    if (!id) {
      return res.status(400).send({ 
        message: "Target ID is required" 
      });
    }

    let messages;

    if (type === "group") {
      // Group chat messages
      messages = await MessageModel.find({ groupId: id })
        .sort({ createdAt: 1 })
        .populate("sender", "firstname lastname");

    } else {
      // Private chat messages
      messages = await MessageModel.find({
        $or: [
          { sender: myId, receiver: id },
          { sender: id, receiver: myId }
        ]
      })
      .sort({ createdAt: 1 })
      .populate("sender", "firstname lastname");

      // Mark messages from selected user as read
      await MessageModel.updateMany(
        { sender: id, receiver: myId, read: false },
        { read: true }
      );
    }

    res.status(200).send({ messages });

  } catch (error) {
    res.status(500).send({ message: error.message });
  }
};

exports.updateMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.userId;

    if (!content) {
      return res.status(400).send({ 
        message: "Content is required" 
      });
    }

    const message = await MessageModel.findOne({ _id: id, sender: userId });
    
    if (!message) {
      return res.status(404).send({ 
        message: "Message not found or unauthorized" 
      });
    }

    const updated = await MessageModel.findByIdAndUpdate(
      id,
      { content, edited: true },
      { new: true }
    );

    res.status(200).send({ 
      message: "Message updated", 
      data: updated 
    });
  } catch (err) {
    res.status(500).send({ 
      message: "Failed to update message", 
      error: err.message 
    });
  }
};

exports.deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const deleted = await MessageModel.findOneAndDelete({ 
      _id: id, 
      sender: userId 
    });

    if (!deleted) {
      return res.status(404).send({ 
        message: "Message not found or unauthorized" 
      });
    }

    res.status(200).send({ message: "Message deleted" });
  } catch (err) {
    res.status(500).send({ 
      message: "Failed to delete message", 
      error: err.message 
    });
  }
};

exports.markReadMsg = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const updated = await MessageModel.findOneAndUpdate(
      { _id: id, receiver: userId },
      { read: true },
      { new: true }
    );

    if (!updated) {
      return res.status(404).send({ 
        message: "Message not found or unauthorized" 
      });
    }

    res.status(200).send({ success: true });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
};
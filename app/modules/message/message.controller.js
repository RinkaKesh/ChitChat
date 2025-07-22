
const MessageModel = require("./message.model");

exports.sendMessage = async (req, res) => {
  try {
    const { receiver, content } = req.body;
    const sender = req.userId; 
     console.log("from msg controller",sender);
     
    if (!receiver || !content) {
      return res.status(400).send({ 
        message: "Receiver and content are required" 
      });
    }

    const newMessage = await MessageModel.create({ 
      sender, 
      receiver, 
      content 
    });

    const io = req.app.get("io");
    if (io) {
      io.to(receiver).emit("receiveMessage", { 
        senderId: sender, 
        message: newMessage 
      });
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
    const { id: selectedUserId } = req.params;
    const myId = req.userId;

    if (!selectedUserId) {
      return res.status(400).send({ 
        message: "User ID is required" 
      });
    }

    const messages = await MessageModel.find({
      $or: [
        { sender: myId, receiver: selectedUserId },
        { sender: selectedUserId, receiver: myId }
      ]
    }).sort({ createdAt: 1 });

    await MessageModel.updateMany(
      { sender: selectedUserId, receiver: myId },
      { read: true }
    );

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
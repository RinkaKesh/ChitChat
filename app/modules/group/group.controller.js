
const GroupModel = require("./group.model");

exports.createGroup = async (req, res) => {
  try {
    const { name, members = [] } = req.body; 
    const admin = req.userId;

    if (!name || !name.trim()) {
      return res.status(400).send({ message: "Group name is required" });
    }

    const allMembers = [...new Set([admin, ...members])];

    const group = await GroupModel.create({
      name: name.trim(),
      admin,
      members: allMembers
    });

    const populatedGroup = await GroupModel.findById(group._id)
      .populate("admin", "firstname lastname")
      .populate("members", "firstname lastname");

    res.status(201).send({ 
      message: "Group created successfully", 
      group: populatedGroup 
    });
  } catch (err) {
    res.status(500).send({ 
      message: "Failed to create group", 
      error: err.message 
    });
  }
};

exports.getGroups = async (req, res) => {
  try {
    const userId = req.userId;

    const groups = await GroupModel.find({ 
      members: userId 
    })
    .populate("admin", "firstname lastname")
    .populate("members", "firstname lastname")
    .sort({ createdAt: -1 }); 

    res.status(200).send({ groups });
  } catch (err) {
    res.status(500).send({ 
      message: "Failed to fetch groups", 
      error: err.message 
    });
  }
};


exports.getGroupById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const group = await GroupModel.findById(id)
      .populate("admin", "firstname lastname")
      .populate("members", "firstname lastname");

    if (!group) {
      return res.status(404).send({ message: "Group not found" });
    }

    
    if (!group.members.some(member => member._id.toString() === userId)) {
      return res.status(403).send({ message: "You are not a member of this group" });
    }

    res.status(200).send({ group });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.addMember = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId: newMemberId } = req.body;
    const adminId = req.userId;

    const group = await GroupModel.findById(id);
    if (!group) {
      return res.status(404).send({ message: "Group not found" });
    }

    if (group.admin.toString() !== adminId) {
      return res.status(403).send({ message: "Only group admin can add members" });
    }

    if (group.members.includes(newMemberId)) {
      return res.status(400).send({ message: "User is already a member" });
    }

    group.members.push(newMemberId);
    await group.save();

    const updatedGroup = await GroupModel.findById(id)
      .populate("admin", "firstname lastname")
      .populate("members", "firstname lastname");

    res.status(200).send({ 
      message: "Member added successfully", 
      group: updatedGroup 
    });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.removeMember = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId: memberToRemove } = req.body;
    const adminId = req.userId;

    const group = await GroupModel.findById(id);
    if (!group) {
      return res.status(404).send({ message: "Group not found" });
    }

    if (group.admin.toString() !== adminId) {
      return res.status(403).send({ message: "Only group admin can remove members" });
    }

    if (memberToRemove === adminId) {
      return res.status(400).send({ message: "Cannot remove group admin" });
    }

    group.members = group.members.filter(member => member.toString() !== memberToRemove);
    await group.save();

    const updatedGroup = await GroupModel.findById(id)
      .populate("admin", "firstname lastname")
      .populate("members", "firstname lastname");

    res.status(200).send({ 
      message: "Member removed successfully", 
      group: updatedGroup 
    });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};
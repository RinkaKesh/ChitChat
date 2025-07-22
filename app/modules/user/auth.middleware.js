const jwt=require("jsonwebtoken")
const  authConfig = require("../../../configs/auth.config")

const verifytoken = (req, res, next) => {
  const token = req.headers.authorization.split(" ")[1];

  if (!token) {
    return res.status(401).send({
      message: "Token is missing",
    });
  }

  jwt.verify(token, authConfig.secret, (err, decoded) => {
    if (err) {
      return res.status(401).send({
        message: "Invalid Token",
      });
    }
    req.userId = decoded.userId;
    // req.sender=decoded.userId
    console.log(decoded,req.userId);
    
    next();
  });
};

module.exports = {
  verifytoken: verifytoken,
};
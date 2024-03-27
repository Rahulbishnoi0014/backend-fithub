const jwt = require("jsonwebtoken");
const Owner = require("../models/ownerSchema");

const OwnerAuth = async (req, res, next) => {
    try {
        const token = req.cookies.jwtoken;
        const verify = jwt.verify(token, process.env.SECRET_KEY);

        const rootUser = await Owner.findOne({ _id: verify })

        if (!rootUser) {
            throw new Error("User Not Found")
        }
        req.token = token;
        req.rootUser = rootUser;
        req.userID = rootUser._id;
        next();
    } catch (error) {
        res.status(401).send("UnAuthorise")
        console.log(error);
    }
}

module.exports = OwnerAuth;
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken")
const ObjectId = require("mongodb").ObjectId;

const ownerSchema = new mongoose.Schema({
    name: String,
    email: String,
    phone: Number,
    gymname: String,
    password: String,
    newmembers: [{
        _id: ObjectId,
        userName: {
            type: String,
            lowercase: true
        },
        name: String,
        phone: Number,
        age: Number,
        address: String,
        registerdate: Date,
        feeDuration: Date,
        planeType: String,
        amount: Number,
        feeHistory: [{
            _id: ObjectId,
            registerdate: Date,
            feeDuration: Date,
            planeType: String,
            amount: Number,
            remark: String
        }],
        attendance: [{
            date: { type: Date, default: Date.now },
            isPresent: { type: Boolean, default: false }
        }],
        dite: String
    }],
    gymDetails: [{
        morningOpening: String,
        morningClosing: String,
        eveningOpening: String,
        eveningClosing: String,
        gymAddress: String,
        descreption: String
    }],

});

ownerSchema.pre("save", async function (next) {
    if (this.isModified("password")) {
        this.password = await bcrypt.hash(this.password, 12)
    }
    next()
});

ownerSchema.methods.generateAuthToken = async function () {
    try {
        const token = jwt.sign({ _id: this._id }, process.env.SECRET_KEY)
        // this.tokens = this.tokens.concat({ token: token })
        // await this.save();
        return token
    } catch (error) {
        console.log(error);
    }
}

// ownerSchema.methods.addmember = async function (userName, name, phone, address, registerdate, planeType, amount, dite, feeDuration, _id) {
//     try {
//         this.newmembers = this.newmembers.concat({ userName, name, phone, address, registerdate, planeType, amount, dite, feeDuration, _id })
//         await this.save();
//         return this.addmember
//     } catch (error) {
//         console.log(error);
//     }
// }


ownerSchema.methods.aboutgym = async function (morningOpening, morningClosing, eveningOpening, eveningClosing, gymAddress, descreption) {
    try {
        this.gymDetails = this.gymDetails.concat({ morningOpening, morningClosing, eveningOpening, eveningClosing, gymAddress, descreption })
        await this.save();
        return this.aboutgym
    } catch (error) {
        console.log(error);
    }
}
const Owner = mongoose.model("Owner", ownerSchema);
module.exports = Owner;

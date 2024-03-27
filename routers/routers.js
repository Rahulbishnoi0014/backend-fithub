const express = require("express");
const fast2sms = require('fast-two-sms')
const routers = express.Router();
const bcrypt = require("bcrypt")
// const jwt = require("jsonwebtoken")
const generateAuthToken = require("../models/ownerSchema");
const generateMemberAuthToken = require("../models/memberSchema")
const OwnerAuth = require("../middleware/ownerAuth")
const MemberAuth = require("../middleware/memberAuth")
// require("../connections/connections")
const Owner = require("../models/ownerSchema");
const Member = require("../models/memberSchema")
const ObjectId = require("mongodb").ObjectId;

routers.get("/", (req, res) => {
    res.send("Router is running")
});

routers.get("/ownerhome", OwnerAuth, (req, res) => {
    res.send(req.rootUser)
})
routers.get("/memberdetails", OwnerAuth, (req, res) => {
    res.send(req.rootUser)
})

routers.get("/onemember/:id", OwnerAuth, (req, res) => {
    const _id = req.params.id;
    const a = req.rootUser.newmembers
    // console.log(_id);
    a.forEach(q => {
        if (q._id == _id) {
            // console.log(q);
            res.send(q)
        }
    })

})

routers.post("/ownerRegister", async (req, res) => {
    const { name, email, phone, gymname, password } = req.body;
    if (!name) {
        return res.status(422).json({ error: "PLZ fill all the fields" })
    }
    try {
        const emailExist = await Owner.findOne({ email: email });
        if (emailExist) {
            return res.status(402).json({ error: "Email Already register" })
        }
        else {

            const newOwner = new Owner({ name, email, phone, gymname, password })
            await newOwner.save();
            const token = await newOwner.generateAuthToken();
            res.cookie("jwtoken", token)

            res.status(201).json(newOwner)
        }
    } catch (error) {
        console.log(error);
    }
})

routers.post("/ownerlogin", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(422).json({ error: "plz fill the login credentials" })
        }
        const findOwner = await Owner.findOne({ email })
        if (!findOwner) {
            return res.status(400).json({ error: "User Not Exist" })
        }
        else {
            const validUser = await bcrypt.compare(password, findOwner.password);

            if (validUser) {
                const token = await findOwner.generateAuthToken();
                res.cookie("jwtoken", token)
                res.status(200).json({ message: "Login Successfull" })
            }
            else {
                res.status(400).json({ error: "Credentials Not Match" })
            }
        }
    } catch (error) {
        console.log(error);
    }
});

routers.patch("/updateOwner", OwnerAuth, async (req, res) => {
    const _id = req.userID
    const { name, phone, gymname } = req.body
    if (!name || !phone || !gymname) {
        return res.status(422).json({ error: "PLZ Fill all the fields" })
    }
    else {
        const ownerUpdate = await Owner.updateOne({ _id }, { $set: { name, phone, gymname } }, { new: true });
        if (!ownerUpdate) {
            return res.status(402).send()
        }
        else {
            return res.status(200).json({ message: "Update Owner Data SuccessFully" })
        }
    }
})


routers.delete("/deleteOwner", OwnerAuth, async (req, res) => {
    const deleteowner = await Owner.findByIdAndDelete({ _id: req.userID });
    if (deleteowner) {
        return res.status(200).json({ message: "User Deleted Successfully" })
    }
    else {
        return res.status(402).json({ error: "User Not Deleted" })
    }
})





//------------------------------------------------- Member Routers --------------------------------------------------------------> 


routers.get("/memberHome", MemberAuth, (req, res) => {
    res.send(req.rootUser)
})

routers.post("/addmember", OwnerAuth, async (req, res) => {
    try {
        const _id = new ObjectId()
        const { userName, name, phone, address, registerdate, planeType, amount, dite, remark, feeDuration,
            morningOpening, morningClosing, eveningOpening, eveningClosing, gymAddress, descreption, gymname } = req.body

        // console.log(userName);

        const updateid = req.body._id
        if (!userName || !name || !phone || !address || !registerdate || !planeType || !amount) {
            return res.status(422).json({ error: "Plz fill the form" })
        }
        const newMember = await Owner.findOne({ _id: req.userID })
        if (newMember) {
            const memberExist = await Member.findOne({ userName })
            if (memberExist) {
                return res.status(402).send({ error: "UserName Already Present" })
            }
            else {
                const PortalAddMember = new Member({ userName, name, phone, address, gymname, feeHistory: { registerdate, planeType, amount, feeDuration, remark }, dite, _id, gymDetails: { updateid, morningOpening, morningClosing, eveningOpening, eveningClosing, gymAddress, descreption } })
                // const ownerAddMember = await newMember.addmember(userName, name, phone, address, registerdate, planeType, amount, dite, feeDuration, _id)
                const z = newMember.newmembers.push({ userName, name, phone, address, registerdate, planeType, amount, dite, feeDuration, _id, feeHistory: { registerdate, feeDuration, planeType, amount, remark } })
                res.status(200).json({ message: "Member Added Successfully" })
                await newMember.save();
                await PortalAddMember.save();
            }
        }
    } catch (error) {
        console.log(error);
    }
})

routers.post("/memberLogin", async (req, res) => {
    try {
        const userName = req.body.userName;
        const phone = parseInt(req.body.phone);

        if (!userName || !phone) {
            return res.status(422).json({ error: "Plz fill all the fields" })
        }

        const findMember = await Member.findOne({ userName })
        if (!findMember) {
            return res.status(400).json({ error: "Member Not Exist" })
        }
        else {
            if (findMember.phone === phone) {
                const token = await findMember.generateMemberAuthToken();
                res.cookie("jwtoken", token)
                res.status(200).json({ message: "Login Successful" })
            }
            else {
                res.status(400).json({ error: "Invalid Credentials" })
            }
        }
    } catch (error) {
        console.log(error);
    }
})



routers.post("/addHistory/:id", OwnerAuth, async (req, res) => {
    const { registerdate, feeDuration, planeType, amount, remark } = req.body;
    const memberId = req.params.id;

    try {
        const owner = await Owner.findOne({ _id: req.userID });
        const memberPortal = await Member.findOne({ _id: memberId })
        if (!owner && !memberPortal) {
            return res.status(404).json({ msg: 'Owner not found' });
        }
        const a = memberPortal.feeHistory.push({ registerdate, feeDuration, planeType, amount, remark })
        const member = owner.newmembers.find((m) => m._id.toString() === memberId);
        member.feeHistory.push({ registerdate, feeDuration, planeType, amount, remark });
        var arr = owner.newmembers;
        arr.forEach(x => {
            if (x._id == memberId) {
                x.amount = amount;
                x.registerdate = registerdate;
                x.planeType = planeType;
                x.feeDuration = feeDuration;
            }
        });
        await memberPortal.save();
        owner.markModified("newcostumer")
        owner.save((err) => {
            if (!err) res.status(200).json({ message: "Update" });
            else return res.status(404).json({ err: "Update not successful" })
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
})

routers.patch("/updatemember/:id", OwnerAuth, async (req, res) => {

    const _id = req.params.id
    const { address, dite, phone } = req.body
    console.log(address);
    try {
        if (!address) {
            return res.status(422).json({ error: "PLZ Fill all the fields" })
        }


        const memberportal = await Member.findByIdAndUpdate({ _id }, { $set: { address, dite, phone } });
        Owner.findOne({ _id: req.userID }, (err, data) => {
            if (!err) {
                var arr = data.newmembers;

                arr.forEach(x => {
                    if (x._id == _id) {
                        x.address = address;
                        x.dite = dite,
                            x.phone = phone
                    }
                });

                memberportal.save()
                data.markModified("newmembers")
                data.save((err) => {
                    if (!err) res.status(200).json({ message: "Update" });
                    else return res.status(404).json({ err: "Update not successful" })
                });
            }
        });
    } catch (error) {
        console.log(error);
    }
})

routers.patch("/updategymDetails", OwnerAuth, async (req, res, next) => {
    const { morningOpening, morningClosing, eveningOpening, eveningClosing, gymAddress, descreption } = req.body

    const gymnam = req.rootUser.gymname
    // const id = req.userID

    try {
        if (!morningOpening) {
            return res.status(422).json({ message: "Fill all the fields" });
        }
        const owner = await Owner.findOne({ _id: req.userID });
        const memberPortal = await Member.find({ gymname: gymnam })
        if (!owner && !memberPortal) {
            return res.status(404).json({ message: 'Owner not found' });
        }

        // Member Portal gym detail update ---------------------------------------------------------------------------------------
        memberPortal.forEach(x => {
            x.gymDetails.forEach(element => {
                element.morningOpening = morningOpening;
                element.morningClosing = morningClosing;
                element.eveningOpening = eveningOpening;
                element.eveningClosing = eveningClosing;
                element.gymAddress = gymAddress;
                element.descreption = descreption;
            });
            x.save();
        })
        // Owner Portal gym detail update ---------------------------------------------------------------------------------------
        const ownergymUpdate = owner.gymDetails[0]
        ownergymUpdate.morningOpening = morningOpening;
        ownergymUpdate.morningClosing = morningClosing;
        ownergymUpdate.eveningOpening = eveningOpening;
        ownergymUpdate.eveningClosing = eveningClosing;
        ownergymUpdate.gymAddress = gymAddress;
        ownergymUpdate.descreption = descreption;

        // await memberPortal.save(); 
        owner.markModified("newcostumer")
        owner.save((err) => {
            if (!err) res.status(200).json({ message: "Update" });
            else return res.status(404).json({ err: "Update not successful" })
        });
    } catch (error) {
        console.log(error);
    }

})

routers.delete("/deleteMember/:id", OwnerAuth, async (req, res) => {
    const _id = req.params.id;
    const owner_id = req.userID
    const deleteMemberOwner = await Owner.updateOne({ _id: owner_id }, { "$pull": { "newmembers": { "_id": _id } } }, { safe: true, multi: true })
    const deleteMemberPortal = await Member.findByIdAndDelete({ _id });

    if (!deleteMemberOwner && !deleteMemberPortal) {
        return res.status(400).send()
    }
    // res.status(200).json({ message: "UserDeletes" })
    res.status(200).send(req.rootUser);
    console.log("Deleted");
})


routers.post("/addgymDetails", OwnerAuth, async (req, res) => {
    const { morningOpening, morningClosing, eveningOpening, eveningClosing, gymAddress, descreption } = req.body;

    if (!morningOpening) {
        console.log("PLZ fill the form");
        return res.status(422).json({ error: "plz fill the form" })
    }

    const addDetails = await Owner.findOne({ _id: req.userID });

    if (addDetails) {
        const addExtraDetails = await addDetails.aboutgym(morningOpening, morningClosing, eveningOpening, eveningClosing, gymAddress, descreption);
        res.status(201).json({ message: "Details Added Successfully" })
    }

})


routers.get("/allgym",async(req,res)=>{
    try{
            const data=await Owner.find({},{password:0});

            // console.log(data);
            
            res.send(data.reverse());
    }
    catch(err){
        console.log(err);
        res.sendStatus(404);
    }
})


// Attendance-------------------------------------------------------------------------------

routers.get("/onestudent/:id", OwnerAuth, (req, res) => {
    const _id = req.params.id;
    const singleStudent = req.rootUser.newmembers;
    // console.log(singleStudent);
    singleStudent.forEach(q => {
        if (q._id == _id) {
            // console.log(q);
            res.send(q)
        }
    })
})




// routers.post("/markAttendance", OwnerAuth, async (req, res) => {

//     const { studentId, isChecked, date } = req.body
//     // console.log(`Attandence ${isChecked}, ID ${studentId} , Date ${date}`);

//     if (!studentId) {
//         return res.status(422).json({ error: "Fill All The Fields" });
//     }

//     try {
//         const UserPresent = await Owner.findOne({ _id: req.userID });
//         const memberPortal = await Member.findOne({ _id: studentId })
//         // console.log(memberPortal);

//         if (UserPresent) {
//             const findStudent = UserPresent.newmembers.find((m) => m._id.toString() === studentId);
//             findStudent.attendance.push({ date, isPresent: isChecked })
//             const att = memberPortal.attendance.push({ date, isPresent: isChecked });
//             UserPresent.markModified("students");
//             await UserPresent.save();
//             await memberPortal.save();
//             res.status(200).json({ Success: true })

//         } else {
//             res.status(404).json({ error: "User not found" });
//         }
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ error: "Internal Server Error" });
//     }
// })


// --------------------------------------------------------------------- 

// routers.post("/markAttendance", OwnerAuth, async (req, res) => {
//     const { studentId, isChecked, date } = req.body;

//     if (!studentId) {
//         return res.status(422).json({ error: "Fill All The Fields" });
//     }

//     try {
//         const owner = await Owner.findOne({ _id: req.userID });
//         const member = await Member.findOne({ _id: studentId });

//         if (owner && member) {

//             const findStudent = owner.newmembers.find((m) => m._id.toString() === studentId);


//             findStudent.attendance.push({ date, isPresent: isChecked });

//             member.attendance.push({ date, isPresent: isChecked });

//             owner.markModified("newmembers");

//             // Use findOneAndUpdate to get the updated document
//             const updatedOwner = await Owner.findOneAndUpdate(
//                 { _id: req.userID },
//                 { $set: { newmembers: owner.newmembers } },
//                 { new: true }
//             );

//             // Use findOneAndUpdate to get the updated document
//             const updatedMember = await Member.findOneAndUpdate(
//                 { _id: studentId },
//                 { $set: { attendance: member.attendance } },
//                 { new: true }
//             );

//             res.status(200).json({ Success: true });
//         } else {
//             res.status(404).json({ error: "User or Member not found" });
//         }
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ error: "Internal Server Error" });
//     }
// });


routers.post("/markAttendance", OwnerAuth, async (req, res) => {
    const { studentId, isChecked, date } = req.body;

    if (!studentId) {
        return res.status(422).json({ error: "Fill All The Fields" });
    }

    try {
        const owner = await Owner.findOne({ _id: req.userID });
        const member = await Member.findOne({ _id: studentId });

        if (owner && member) {
            const filter = { _id: req.userID, 'newmembers._id': studentId };
            member.attendance.push({ date, isPresent: isChecked })
            const update = {
                $push: {
                    'newmembers.$.attendance': {
                        date,
                        isPresent: isChecked
                    }
                }
            }
            const options = {
                new: true,
                runValidators: true,
            }

            const updatememberattendance = await Owner.findOneAndUpdate(filter, update, options)
            await member.save();
            if (updatememberattendance) {
                res.status(200).json({ Success: true });
            } else {
                res.status(404).json({ error: "Student not found" });
            }
        } else {
            res.status(404).json({ error: "User or Member not found" });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});



// routers.post("/markAttendance", OwnerAuth, async (req, res) => {
//     const { studentId, isChecked, date } = req.body;

//     if (!studentId) {
//         return res.status(422).json({ error: "Fill All The Fields" });
//     }

//     try {
//         const owner = await Owner.findOne({ _id: req.userID });
//         const member = await Member.findOne({ _id: studentId });

//         if (owner && member) {
//             // Find the index of the student in the owner's newmembers array
//             const indexInOwner = owner.newmembers.findIndex((m) => m._id.toString() === studentId);

//             if (indexInOwner !== -1) {
//                 // Update the attendance for the found student in the owner's portal
//                 owner.newmembers[indexInOwner].attendance.push({ date, isPresent: isChecked });
//                 owner.markModified("newmembers");
//             } else {
//                 return res.status(404).json({ error: "Student not found in owner portal" });
//             }

//             // Use findOneAndUpdate to get the updated document for the owner
//             const updatedOwner = await Owner.findOneAndUpdate(
//                 { _id: req.userID },
//                 { $set: { newmembers: owner.newmembers } },
//                 { new: true }
//             );

//             // Update the attendance for the student in the member's portal
//             member.attendance.push({ date, isPresent: isChecked });

//             // Use findOneAndUpdate to get the updated document for the member
//             const updatedMember = await Member.findOneAndUpdate(
//                 { _id: studentId },
//                 { $set: { attendance: member.attendance } },
//                 { new: true }
//             );

//             res.status(200).json({ Success: true });
//         } else {
//             res.status(404).json({ error: "User or Member not found" });
//         }
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ error: "Internal Server Error" });
//     }
// });




// Logout ---------------------------------------------------------------------------------


routers.get("/logoutuser", async (req, res) => {
    res.clearCookie("jwtoken", { path: "/" });
    // console.log("Logout");
    res.status(200).json({ message: "User Logout" })
})

module.exports = routers
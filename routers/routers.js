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

//face recog.------
const faceapi = require("face-api.js");
const { Canvas, Image } = require("canvas");
const canvas = require("canvas");
const mongoose = require("mongoose");
const member = require("../models/memberSchema");

faceapi.env.monkeyPatch({ Canvas, Image });


async function LoadModels() {
    // Load the models
    // __dirname gives the root directory of the server
    await faceapi.nets.faceRecognitionNet.loadFromDisk(__dirname + "/models");
    await faceapi.nets.faceLandmark68Net.loadFromDisk(__dirname + "/models");
    await faceapi.nets.ssdMobilenetv1.loadFromDisk(__dirname + "/models");
}
LoadModels();

const faceSchema = new mongoose.Schema({
    label: {
        type: String,
        required: true
    },
    descriptions: {
        type: Array,
        required: true,
    },
});

const FaceModel = mongoose.model("Face", faceSchema);



routers.get("/facedata", async (req, res) => {
    let faces = await FaceModel.find();

    res.send({ faces });
})

routers.post("/post-face", async (req, res) => {

    if (!req.body.File1 || !req.body.label) {
        return res.status(400).send('Missing name or image data.');
    }

    const File1 = req.body.File1;
    const label = req.body.label
    console.log("recived files")

    try {
        let result = await uploadLabeledImages([File1], label);
        res.status(200).send({ result });
    }
    catch (err) {
        res.status(500).send({ message: "Something went wrong, please try again." })

    }
})

routers.post("/check-face", async (req, res) => {

    try {
        // console.log(req.body);

        const File1 = req.body.File1;

        // const File1 = req.files.File1.tempFilePath;
        let result = await getDescriptorsFromDB(File1);
        
        if (!result) {
            res.status(201).json({ result: "false" })
            console.log(result+"no data");
          }
          else{
            console.log(result);
            res.status(200).json({ result });
      
          }
    }
    catch (err) {
        console.log("err");
        res.status(500).send({ result: "falied" });
    }



});

routers.get("/testface", async (req, res) => {
    res.status(200).send({ working: "true" });
})
//----------------

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
async function uploadLabeledImages(images, label) {
    try {
        let counter = 0;
        const descriptions = [];
        // Loop through the images
        for (let i = 0; i < images.length; i++) {

            const img = await canvas.loadImage(images[i]);

            // counter = (i / images.length) * 100;
            console.log("registration face");

            const detections = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();
            descriptions.push(detections.descriptor);

        }

        // Create a new face document with the given label and save it in DB
        const createFace = new FaceModel({
            label: label,
            descriptions: descriptions,
        });

        await createFace.save();
        return true;

    } catch (error) {
        console.log("error no face found");
        return (false);
    }
}

async function getDescriptorsFromDB(image) {
    // Get all the face data from mongodb and loop through each of them to read the data
    let faces = await FaceModel.find();
    for (i = 0; i < faces.length; i++) {
        // Change the face data descriptors from Objects to Float32Array type
        for (j = 0; j < faces[i].descriptions.length; j++) {
            faces[i].descriptions[j] = new Float32Array(Object.values(faces[i].descriptions[j]));
        }
        // Turn the DB face docs to
        faces[i] = new faceapi.LabeledFaceDescriptors(faces[i].label, faces[i].descriptions);
    }

    // Load face matcher to find the matching face
    const faceMatcher = new faceapi.FaceMatcher(faces, 0.6);

    // Read the image using canvas or other method
    const img = await canvas.loadImage(image);
    let temp = faceapi.createCanvasFromMedia(img);
    // Process the image for the model
    const displaySize = { width: img.width, height: img.height };
    faceapi.matchDimensions(temp, displaySize);

    // Find matching faces
    const detections = await faceapi.detectAllFaces(img).withFaceLandmarks().withFaceDescriptors();
    const resizedDetections = faceapi.resizeResults(detections, displaySize);
    const results = resizedDetections.map((d) => faceMatcher.findBestMatch(d.descriptor));
    return results;
}
routers.post("/addmember", OwnerAuth, async (req, res) => {
    try {
        const _id = new ObjectId()
        const { userName, name, phone, address, registerdate, planeType, amount, dite, remark, feeDuration,
            morningOpening, morningClosing, eveningOpening, eveningClosing, gymAddress, descreption, gymname, city, category } = req.body

        // console.log(userName);

        const updateid = req.body._id
        if (!userName || !name || !phone || !address || !registerdate || !planeType || !amount || !req.body.File1) {
            return res.status(422).json({ error: "Plz fill the form" })
        }
        const newMember = await Owner.findOne({ _id: req.userID })
        if (newMember) {
            const memberExist = await Member.findOne({ userName })
            if (memberExist) {
                return res.status(402).send({ error: "UserName Already Present" })
            }
            else {

                const File1 = req.body.File1;

                // let data = await getDescriptorsFromDB(File1)

                // console.log(data);

                if (true) {

                    let result = await uploadLabeledImages([File1], userName);
                    if (result)
                        console.log("face registred");
                    else
                        return res.status(201).send({ error: "NO face found" })
                }
                else {
                    return res.status(204).send({ error: "face already in DB" })

                }





                const PortalAddMember = new Member({ userName, name, phone, address, gymname, feeHistory: { registerdate, planeType, amount, feeDuration, remark }, dite, _id, gymDetails: { updateid, morningOpening, morningClosing, eveningOpening, eveningClosing, gymAddress, descreption, city, category } })
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
    const { morningOpening, morningClosing, eveningOpening, eveningClosing, gymAddress, descreption, city, category } = req.body

    console.log(city + "  " + category)
    const gymnam = req.rootUser.gymname
    // const id = req.userID

    try {
        if (!morningOpening || !city || !category) {
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
                element.city = city;
                element.category = category;
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
        ownergymUpdate.city = city;
        ownergymUpdate.category = category;

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

    const memberdata = await Member.find({ _id });
    // console.log(memberdata);
    const userName=memberdata.userName;
    
    const deleteface=await FaceModel.findOneAndDelete({ userName });

    if (!deleteMemberOwner && !deleteMemberPortal && !deleteface) {
        return res.status(400).send()
    }
    // res.status(200).json({ message: "UserDeletes" })
    res.status(200).send(req.rootUser);
    console.log("Deleted");
})


routers.post("/addgymDetails", OwnerAuth, async (req, res) => {
    const { morningOpening, morningClosing, eveningOpening, eveningClosing, gymAddress, descreption, city, category } = req.body;

    if (!morningOpening) {
        console.log("PLZ fill the form");
        return res.status(422).json({ error: "plz fill the form" })
    }

    const addDetails = await Owner.findOne({ _id: req.userID });

    if (addDetails) {
        const addExtraDetails = await addDetails.aboutgym(morningOpening, morningClosing, eveningOpening, eveningClosing, gymAddress, descreption, city, category);
        res.status(201).json({ message: "Details Added Successfully" })
    }

})


routers.get("/allgym", async (req, res) => {
    try {
        const data = await Owner.find({}, { password: 0 });

        // console.log(data);

        res.send(data.reverse());
    }
    catch (err) {
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

routers.post("/markfaceAttendance", OwnerAuth, async (req, res) => {
    const { userName, isChecked, date } = req.body;

    if (!userName || isChecked === undefined || !date) {
        return res.status(422).json({ error: "Fill All The Fields" });
    }

    try {
        const owner = await Owner.findOne({ _id: req.userID });
        const member = await Member.findOne({ userName }); // Find member by userName

        if (owner && member) {
            const filter = { _id: req.userID, 'newmembers.userName': userName }; // Modify filter based on userName
            member.attendance.push({ date, isPresent: isChecked });
            const update = {
                $push: {
                    'newmembers.$.attendance': {
                        date,
                        isPresent: isChecked
                    }
                }
            };
            const options = {
                new: true,
                runValidators: true,
            };

            const updatememberattendance = await Owner.findOneAndUpdate(filter, update, options);
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





routers.get("/logoutuser", async (req, res) => {
    res.clearCookie("jwtoken", { path: "/" });
    // console.log("Logout");
    res.status(200).json({ message: "User Logout" })
})

module.exports = routers
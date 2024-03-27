const mongoose = require("mongoose");
const DB = process.env.DATABASE;
mongoose.set("strictQuery",true);
mongoose.connect(DB,(err)=>{
    if(err){
        console.log(err);
    }
    else{
        console.log("MongoDB is Connected to Server")
    }
})
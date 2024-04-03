const dotenv = require("dotenv");
const express = require("express");

const app = express();
const cookieParser = require("cookie-parser");
app.use(cookieParser())
const cors = require('cors');

dotenv.config({ path: "./.env" });
require("./connections/connections");
const port = process.env.PORT

app.use(express.json());
app.use(cors());


const fileUpload = require("express-fileupload");
app.use(
    fileUpload({
      useTempFiles: true,
    })
  );
app.use(require("./routers/routers"))

app.listen(5001, () => {
    console.log(`Server is on port ${5001}`)
})
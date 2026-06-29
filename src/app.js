import express, { urlencoded } from "express"
import cors from "cors"

import cookieParser from "cookie-parser"  
//so that via the server, i can access and set user's cookies


const app = express()

app.use(cors(
    {
    origin: process.env.CORS_ORIGIN,
    credentials : true  
}))

app.use(express.json({limit : "16kb"}))

app.use(urlencoded({extended:true, limit: "16kb"}))

app.use(express.static("public"))

app.use(cookieParser())

export {app}

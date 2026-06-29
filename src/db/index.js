import mongoose from "mongoose"
import dns from "dns"
import { DB_NAME } from "../constants.js"

const connectDB = async() =>{
    try{
        if (!process.env.MONGO_URI) {
            throw new Error("MONGO_URI is not defined in .env");
        }

        dns.setServers(["8.8.8.8", "1.1.1.1"]);
        const connectionInstance  = await mongoose.connect(`${process.env.MONGO_URI}/${DB_NAME}`)
        console.log(`mongo db connected !! DB HOST : ${connectionInstance.connection.host}`);
    }catch(error){
        console.log("mongodb connection error", error);
        process.exit(1)
    };
    
}

export default connectDB

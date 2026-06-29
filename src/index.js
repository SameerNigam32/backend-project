  import dotenv from "dotenv"; //loads the env file first so that it becomes accesible
  import connectDB from "./db/index.js";


  dotenv.config({
    path: './.env'
  })
  connectDB()
  .then(()=>{
        app.listen(process.env.PORT||8000,()=>{
          console.log(`Server is running at port ${process.env.PORT}`)
        })
  })
  .catch((err)=>{
        console.log("MongoDB connection failed !!!!!", err);
  })
  //as connectDb is async await , it will return a promise










 /*
import { DB_NAME } from "./constants";
  import connectDB from "./db";
 import express from express

  const app =express()
  ( async ()=>{
    try {
        await mongoose.connect(`${process.env.MONGO_DBURI}/{DB_NAME}`);
        app.on("errroror",(error)=>{
            console.log("errr: ",error);
            throw error
        })

        app.listen(process.env.PORT, ()=>{
            console.log(`app is listening to port ${process.env.PORT}`);
        })


    } catch(error){
        console.log("ERROR occured: ", error);
        throw err
    }
    
  }) ()

  */


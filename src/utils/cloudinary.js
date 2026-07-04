import { v2 as cloudinary } from "cloudinary";
import fs from "fs";    //file system open read write etc


cloudinary.config({ 
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
        api_key: process.env.CLOUDINARY_API_KEY, 
        api_secret: process.env.CLOUDINARY_API_SECRET
    });


// function to upload file from local server to cloudinary
const uploadOnCloudinary = async (localFilePath) =>{

    try{
        if(!localFilePath) return null; //if path does not exist

        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type="auto"
        })
        //file uploaded  
        console.log('file has been uploaded seuccesfully on cloudinary', response.url);
        return response;
    }catch(error){
        fs.unlinkSync(localFilePath); 
        // as the local file which is saved in server temporarily failed, we remove that from the server
        return null;
    }
     
}

export {uploadOnCloudinary }














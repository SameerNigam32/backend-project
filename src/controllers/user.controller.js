import { ApiError } from "../utils/ApiErrors.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiErrors.js";
import {User} from "../models/user.model.js";//User directly interacts with mongodb 
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser = asyncHandler(async (req, res)=>{
        //take input form the user
        //validate the input
        //check if user already exists - via userame and email
        // check for images, avatar
        // upload to cloudinary, avatar
        //create user object, create entry in db
        //remove password and token field 
        //check for user creation 
        //return res

        const {fullName, email, username, password}=req.body;
        console.log("email:", email);


        if(
            [fullName, email, username, password].some((field)=> 
                field?.trim()==="")
        ){
            throw new ApiError(400, "fileds are empty");
        }

        const existingUser= User.findOne({
            $or: [{ username}, { email }]
        }
        )
        if(existingUser){
            throw new ApiError(409, "user already exists with same email or username");
        }

        

        const avatarLocalPath = req.files?.avatar[0]?.path;
        const coverImagepath = req.files?.coverImage[0]?.path;

        if(!avatarLocalPath) {
            throw new ApiError(400, "Avatar File is comoulsory field");
        }

        const avatar = uploadOnCloudinary(avatarLocalPath);
        const coverImage = uploadOnCloudinary(coverImagepath);

        if(!avatar) throw new ApiError(400, "Avatar file is compulsory mannn");


        const user = await User.create({    //db in in different continent 
            fullName,
            avatar : avatar.url,
            coverImage : coverImage?.url||"", //if DNE then empty string
            email,
            password,
            username : username.toLowerCase()
        })

        //if user created successfully then only we will get createduser
        const createdUser = await User.findById(user._id).select(
                "-password -refreshToken"          //fields that i need to exclude
        )


        if(!createdUser) throw new ApiError(500, "something went wrong while we were registering the user");


        return res.status(201).json(
            new ApiResponse(201, createdUser, "useer registered succesfully")
        )
})


export {registerUser}

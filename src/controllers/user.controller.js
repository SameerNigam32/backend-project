import { ApiError } from "../utils/ApiErrors.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {User} from "../models/user.model.js";//User directly interacts with mongodb 
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { trusted } from "mongoose";


const generateAccessAndRefreshToken = async(userId) =>{
    try{
        const user = User.findById(userId);
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken;
        //while saving complete user model wil start to validate that this and that required so to skip it
        user.save({ validateBeforeSave : false })

        return {accessToken, refreshToken};

    }catch(error){
        throw new ApiError(500, "something went wrong while generating access and refresh tokens");
    }
}



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

        const {fullname, email, username, password}=req.body;
        console.log("email:", email);


        if(
            [fullname, email, username, password].some((field)=> 
                field?.trim()==="")
        ){
            throw new ApiError(400, "fileds are empty");
        }

        const existingUser= await User.findOne({
            $or: [{ username}, { email }]
        }
        )
        if(existingUser){
            throw new ApiError(409, "user already exists with same email or username");
        }

        

        const avatarLocalPath = req.files?.avatar?.[0]?.path;
        const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

        if(!avatarLocalPath) {
            throw new ApiError(400, "Avatar File is comoulsory field");
        }

        

        const avatar = await uploadOnCloudinary(avatarLocalPath);
        const coverImage = await uploadOnCloudinary(coverImageLocalPath);

        if(!avatar) throw new ApiError(400, "Avatar file is compulsory mannn");


        const user = await User.create({    //db in in different continent 
            fullname,
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


const loginUser = asyncHandler( async (req, res) =>{
        //tak einput user req
        //check whether username or email exists
        //find user
        //check password
        // generate access and refresh toekn and give it to userr
        //send to user via cookies
        //

        const {email, username, password} = req.body;

        if(!username || !email) throw new ApiError(400, "username or email req");

        const user = await User.findOne({
            $or : [{username, email}]
        })


        if(!user) throw new ApiError(404, "user not found");

        //User is the mongodb User that is findOne and otehr methods will be used on this User, 
        //whereas our user that we have stored ,that will work with the methods that we have defined on the user models

        const isValidPassword = await user.isPasswordCorrect(password);

        if(!isValidPassword) throw new ApiError(401, "Invalid passowrd");

        const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id);

        const loggedInUser = await User.findById(user._id).select(
            "-password -refreshToken "
        ); //we will not send user's password once logged in definately

        const options = {
            httpOnly : true,
            secure : true //makes the cookies only modifieable from the server, frontend can only see it
        }

        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(200, 
                {
                    user : loggedInUser, accessToken, refreshToken //data field
                },
                "user logged in successfuly"
            )
         )


})

const logoutUser = asyncHandler ( async (req, res) =>{
 //while logging out, we dont ask username password request from the user, so how
 //verifyJWT middleware is ran before logout which automatically gives us acces to the req.user
    await User.findById(
        req.user._id,
        {
            $set : {
                refreshToken : undefined           //the fileds to be updated in mongodb
            }
        },
        {
            new : true
        }
    )

    const options = {
        httpOnly : true,
        secure : true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "user logged out "));


})



export {registerUser, loginUser, logoutUser} 

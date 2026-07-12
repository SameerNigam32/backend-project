import { ApiError } from "../utils/ApiErrors.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {User} from "../models/user.model.js";//User directly interacts with mongodb 
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshToken = async(userId) =>{
    try{
        const user = await User.findById(userId);
        if (!user) throw new ApiError(404, "user not found");

        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken;
        //while saving complete user model wil start to validate that this and that required so to skip it
        await user.save({ validateBeforeSave : false })

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

        const {fullname, email, username, password}=req.body || {};
        console.log("email:", email);


        if([fullname, email, username, password].some((field)=> !field || field.trim()==="")){
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
        //take input user req
        //check whether username or email exists
        //find user
        //check password
        // generate access and refresh toekn and give it to userr
        //send to user via cookies
        //

        const {email, username, password} = req.body || {};

        if(!(username || email)) throw new ApiError(400, "username or email req");
        if(!password) throw new ApiError(400, "password req");

        const user = await User.findOne({
            $or : [{ username }, { email }]
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
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset : {
                refreshToken : 1           //the field to be removed from mongodb
            },
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

const refreshAcessToken = asyncHandler ( async (req, res)=>{
    
    try {
        // step1 - get the refresh token via cookies for dekstop or body for mobile
        const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;
    
        //if token DNE, error
        if(! incomingRefreshToken) throw new ApiError(401, "unauthorized request");
        
        //the cookie has got the encrypted refresh token but we need raw refresh token to get the user  
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET)
        
        //step 2 - get the user from the db
        //as the payload data of refresh token we stored id of the user
        const user = await User.findById(decodedToken?._id);
    
        if(!user) throw new ApiError(401, "invalid refresh token"); //no corresponding user so obviously 
    
        //step 3 - compare the refresh tokens 
        if(incomingRefreshToken !== user?.refreshToken) 
            throw new ApiError(401,"refresh token is expired or used");
    
        //step 4 - now genrating new access and refresh token and sending it via the cookie as well as updating in the backend as well
    
        const options={
            httpOnly : true,
            secure : true
        }
    
        const {accessToken, newRefreshToken} = await generateAccessAndRefreshToken(user._id);
    
        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(
            new ApiResponse(
                200,
                {accessToken, refreshToken:newRefreshToken},
                "access token refreshed successfully"
             )
        )
    } catch (error) {
        throw new ApiError(400,error?.message || "invalid refresh token");
    }






})

const changeCurrentPassword = asyncHandler(async (req, res)=>{
    
    const {oldPassword, newPassword} = req.body || {};
    //as the user is already logged in, we can get the user from the req.user that is set by the verifyJWT middleware
    const user =  await User.findById(req.user?._id);

    const isPaswordCorrect = await user.isPasswordCorrect(oldPassword);

    if(!isPaswordCorrect) throw new ApiError(401, "old password is incorrect");

    user.password = newPassword;
    await user.save({validateBeforeSave : false}); //we dont want to validate the user model again, as we are only changing the password

    return res
    .status(200)
    .json(
        new ApiResponse(200,{},"password changed successfully")
    )
})

const getCurrentUser = asyncHandler(async (req, res)=>{
    return res
    .status(200)
    .json(
        new ApiResponse(200, req.user, "current user fetched successfully")
    )



})

export {registerUser, loginUser, logoutUser, refreshAcessToken, changeCurrentPassword, getCurrentUser} 

import { ApiError } from "../utils/ApiErrors.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {User} from "../models/user.model.js";//User directly interacts with mongodb 
import { deleteFromCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js";
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

        
        //multer middleware will add the files to the req.files object, so we can access the files from there
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

const updateAccountDetails = asyncHandler(async (req, res)=>{
     const {fullname, email} = req.body || {};

     if(!fullname && !email) throw new ApiError(400, "atleast one field is required to update");

     const user = await User.findByIdAndUpdate(
        req.user?._id,
        {   
            $set:{
                fullname : fullname
                , email
            }
        },
        {
            new: true, runValidators: true
        }
     ).select("-password");

     return res
     .status(200)
     .json(
         new ApiResponse(200, user, "account details updated successfully")
     )
})

const updateAvatar = asyncHandler(async (req,res)=>{
     const avatarLocalPath = req.file?.path
     if(!avatarLocalPath) throw new ApiError(400, "avatar file is required");
     //we will upload the avatar to cloudinary and get the url of the uploaded avatar

     const avatar = await uploadOnCloudinary(avatarLocalPath);
     if(!avatar.url) throw new ApiError(500, "something went wrong while uploading avatar");

     const currentUser = await User.findById(req.user?._id).select("avatar");
     //we need to delete the old avatar from cloudinary, so we fetch the current user and get the avatar url from it
     if(!currentUser) throw new ApiError(404, "user not found");

     const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set : {
                avatar : avatar.url
            }
        },
        {
            new : true
        }
    ).select("-password")

    if(currentUser.avatar) { 
        try {
            await deleteFromCloudinary(currentUser.avatar);
        } catch (error) {
            console.error("Old avatar delete failed:", error.message);
        }
    }

    return res
    .status(200)
    .json(
         new ApiResponse(200, user ,"avatar updated successfully")
    )
})

const updateCoverImage = asyncHandler(async (req,res)=>{
     const coverImageLocalPath = req.file?.path
     if(!coverImageLocalPath) throw new ApiError(400, "cover file is required");

     const coverImage = await uploadOnCloudinary(coverImageLocalPath);
     if(!coverImage.url) throw new ApiError(500, "something went wrong while uploading cover image");

     const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set : {
                coverImage : coverImage.url
            }
        },
        {
            new : true
        }
    ).select("-password")

    return res
    .status(200)
    .json(
         new ApiResponse(200, user ,"cover image updated successfully")
    )
})

const getChannelProfile = asyncHandler(async (req, res) => {
    //to get the channel profile of a user, we need to get the user id from the params and then fetch the user from the db and return it, user is the channel owner, and we also need to get the number of subscribers of the channel and whether the current user is subscribed to the channel or not
    const {username} = req.params || {};
    //params are the values that are passed in the url, for example /user/:username, here username is the param and we can access it via req.params.username

    if(!username?.trim()) throw new ApiError(400, "username is required");
    //trim is used to remove the whitespace from the string, if the username is empty or only contains whitespace, we throw an error

    const channel = await User.aggregate([
        {
            $match : {
                username : username.toLowerCase()

            }//here i only have one document that matches the username, so i will get only one document in the result
        },{
            //id here is the id of the user/channel the current logged in user has asked for
            $lookup :{
                from : "subscriptions",  //the model where we aee looking for the data 
                localField : "_id", //the field in the user model that we are matching with the foreign field
                foreignField : "channel", //the field in the subscription model that we are matching with the local field
                as : "subscribers" //the name of the field that will be added to the user model, which will contain the array of subscribers, it is an array of objects of subscription model, each object will contain the all the subscriber ids where the channel id matches the id of the user/channel current logged in user is looking for
            }

        },{
            $lookup:{
                from:"subscriptions",
                localField : "_id",
                foreignField : "subscriber",
                as : "subscribedTo"
            }
        },{
            $addFields : {
                subscriberCount : { 
                    $size : "$subscribers"
                },
                subscribedToCount : {
                    $size : "$subscribedTo"
                },
                isSubscribed : { //whether the current logged in user has sibscribed the channel he or she is visiting
                    $cond : {
                        if : { $in: [req.user?._id, "$subscribers.subscriber"] },
                        //works for both then adn else
                        then : true,
                        else : false 
                    }

                }
            }
        },
        {
            $project : { //giving only the required fied to the frontend
                fullname : 1,
                username : 1,
                subscriberCount : 1,
                subscribedToCount : 1,
                isSubscribed : 1,
                avatar : 1,
                coverImage : 1,
                email : 1,
                createdAt : 1 //created at is the date when the user was created, we can use it to show how long the user has been on the platform
             }
        }
    ])
   // aggregate returns an array of matched values, here we search for a single chaneel so we get a single document in the array
   if(!channel?.length) throw new ApiError(400, "channel DNE!!!" )

    return res
    .status(200)
    .json(new ApiResponse(200, channel[0], "user channel fetched succesfully"))
    
})

const getWatchHistory = asyncHandler ( async(req, res)=>{

    const user = await User.aggregate([
        {
            $match : {
                _id : new mongoose.Types.objectId(req.user?._id) // we need to convert the string id to object id, as the _id field in mongodb is of type object id 
            }
        },
        {
            $lookup : {
                from : "videos",
                localField : "watchHistory",
                foreignField : "_id",
                as : "watchHistory",//here we got the documents of all the videos that the user has watched
                pipeline : [
                    {
                        $lookup : {
                            from : "users",
                            localField : "owner",
                            foreignField : "_id",
                            as : "owner",
                            pipeline : [ //we need to get the owner of the video, so we need to lookup the user model and get the owner of the video
                                {
                                    $project : {
                                        fullname :1 ,
                                        email : 1,
                                        avatar : 1,
                                        username : 1
                                    }
                                },
                                {
                                    $add : {
                                        owner : {
                                            $fisrt : "$owner" //we need to get the first element of the owner array, as we are looking for a single user, so we will get only one document in the owner array
                                        }
                                    }
                                }
                            ] 
                        }
                    }
                ]
            } 
        }


    ])

    return res
    .status(200)
    .json(new ApiResponse(200, user[0 ].getWatchHistory, "watch history fetche succefully "))
}) 


export {registerUser, loginUser, logoutUser, refreshAcessToken, changeCurrentPassword, getCurrentUser, updateAccountDetails, updateAvatar, updateCoverImage, getUserChannelProfile, getWatchHistory} 

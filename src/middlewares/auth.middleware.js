//verifies whether true user is currently logged in or not

import jwt from "jsonwebtoken";
import { ApiError } from "../utils/ApiErrors.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
                                               //res unused


export const verifyJWT = asyncHandler (async (req, _, next) =>{

//req has cookeie access becuase of app.use(cookieParser())
//in mobile apps we generally send an authorization header and its value is Bearer <accessToken>
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ","")
    
        if(!token) throw new ApiError(401, "unauthorized request");
        
        //decode the token to get the user as raw access token has userid in its payload
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
        const user = await User.findById(decodedToken?._id).select("-password -refreshToken")    
    
        if(!user) {
            throw new ApiError(401, "invalid Access Token")
        }
    
        req.user=user; //we added new object to the req which is user
        next()          //which will be used by logout


    } catch (error) {
        throw new ApiError(401, error?.message || "invalid access token" )
    }

    
})



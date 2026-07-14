import { Router } from "express";

import {registerUser, loginUser, logoutUser, refreshAcessToken, changeCurrentPassword, getCurrentUser, updateAccountDetails, updateAvatar, updateCoverImage, getUserChannelProfile, getWatchHistory } from "../controllers/user.controller.js";

import {upload} from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";



const router=Router();


router.route("/register").post(
    upload.fields([
        {
            name:"avatar",
            maxCount : 1
        },
        {
            name : "coverImage",
            maxCount : 3
        }
    ])
    ,registerUser);

router.route('/login').post(upload.none(), loginUser)

//first verify user via verifyJWT auth middleware
router.route("/logout").post(verifyJWT,logoutUser)

router.route("refresh_token").post(refreshAcessToken);

router.route("/change_Password").post(verifyJWT, changeCurrentPassword);

router.route("/get_current_user").get(verifyJWT, getCurrentUser);

router.route("/update_account_details").patch(verifyJWT, updateAccountDetails); 
//patch is used to update the existing resource and not create a new resource (post updates the complete resource and not just the fields that are being updated)

router.route("/update_avatar").patch(verifyJWT, upload.single("avatar"), updateAvatar);
// verify user logged in ->   multer middleware to upload the avatar image -> updateAvatar controller to update the avatar field in the user model

router.route("/update_cover_image").patch(verifyJWT, upload.single("coverImage"), updateCoverImage);

router.route("/get_channel_profile/:username").get(verifyJWT, getChannelProfile);
//as params are used to get the channel profile of a user, we need to get the username from the params and then fetch the user from the db and return it, user is the channel owner, and we also need to get the number of subscribers of the channel and whether the current user is subscribed to the channel or not


router.route("/get_watch_history").get(verifyJWT, getWatchHistory);








export default router;







import { Router } from "express";
import {loginUser, logoutUser, registerUser, refreshAcessToken} from "../controllers/user.controller.js";
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










export default router;







import {Router} from "express";
import {register, login, uploadProfilePicture, updateUserProfile, getUserAndProfile, updateProfileData, getAllUserProfile, downloadProfile, getMyConnectionRequest, sentConnectionRequest, whatAreMyConnection, acceptConnectionRequest, getUserProfileAndUserBasedOnUsername} from "../controllers/user.controller.js"
import multer from "multer"

const router = Router();

const storage = multer.diskStorage({
    destination:(req, file, cb)=>{
        cb(null, 'uploads/')
    },
    filename:(req, file, cb)=>{
        cb(null, file.originalname)
    }
})

const upload = multer({storage: storage})

router.route("/update_profile_picture")
.post(upload.single('profile_picture'), uploadProfilePicture);

router.route("/register").post(register);
router.route("/login").post(login);
router.route("/user_profile").post(updateUserProfile);
router.route("/get_user_and_profile").get(getUserAndProfile);
router.route("/update_profile_data").post(updateProfileData);
router.route("/user/get_all_users").get(getAllUserProfile);
router.route("/user/download_resume").get(downloadProfile);
router.route("/user/sent_connection_request").post(sentConnectionRequest);
router.route("/user/getConnectionRequests").get(getMyConnectionRequest);
router.route("/user/user_connection_request").get(whatAreMyConnection);
router.route("/user/accept_connection_request").post(acceptConnectionRequest);
router.route("/user/get_profile_based_on_username").get(getUserProfileAndUserBasedOnUsername);

export default router;
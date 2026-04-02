import {Router} from "express";
import {activeCheck, createPost, getAllPost, deletePost, commentPost, get_comments_by_post, delete_comment_of_user, increment_likes} from "../controllers/posts.controller.js"
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

router.route("/").get(activeCheck);
router.route("/post").post(upload.single('media'), createPost);
router.route("/posts").get(getAllPost);
router.route("/delete_post").delete(deletePost);
router.route("/comment").post(commentPost);
router.route("/get_comments").get(get_comments_by_post);
router.route("/delete_comment").delete(delete_comment_of_user);
router.route("/increment_post_likes").post(increment_likes);

export default router;


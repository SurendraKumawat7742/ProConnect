import mongoose, {Schema} from "mongoose";

const userSchema = mongoose.Schema({
    name:{
        type: String,
        required: true
    },
    username:{
        type: String,
        required: true,
        unique: true,
    },
    email:{
        type: String,
        required: true,
        unique: true
    },
    active:{
        type: Boolean,
        default: true,
    },
    password:{
        type: String,
        required: true
    },
    profilePic:{
        type: String,
        default: 'default.jpg',
    },
    createdAt:{
        type: Date,
        default: Date.now,
    },
    token:{
        type: String,
        default: ''
    }

})

const User = mongoose.model("User", userSchema);
export default User;
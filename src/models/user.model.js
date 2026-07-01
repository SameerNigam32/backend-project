import mongoose,{Schema} from "mongoose";
import jwn from "jsonwebtoken";
import bcrypt from "bcrypt";


const userSchema = new Schema({

    username :{
        type : String,
        required : true,
        lowercase : true,
        unique : true,
        trim : true,
        index : true      // makes the field searchable yeah costs a bit too
    },
    
    email :{
        type : String,
        required : true,
        lowercase : true,
        unique : true,
        trim : true
    },
    fullname :{
        type : String,
        required : true,
        trim : true,
        index: true
    },
    avatar:{
        type: String,  //cloudinary url
        required : true
    },

    coverImage:{
        type:String,
    },
    
    watchHistory :[{
        type : Schema.Types.ObjectId,
        ref="Video"
    }],

    password : {
        type :String,
        required : [true,"Password IS required"] 
    },

    refreshToken : {
        type : String
    }


},
{
    timestamps : true //createdat updatedat
})


//also encryption is a long process so async required, also needs to know the context
userSchema.pre("save", async function(next){ //execute this just before save event
    if(! this.isModified("password")) return next();
    
    this.password=bcrypt.hash(this.password, 10)
    next()
})     


//making custom method to check password
userSchema.methods.isPasswordCorrect = async function(password){
    return await bcrypt.compare(password, this.password)
}



//
userSchema.methods.generateAccessToken= function(){
    return jwt.sign(
        {
            _id=this._id,
            email = this.email,
            username = this.username,
            fullname = this.fullname
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn :  process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}

userSchema.methods.generateRefreshToken = function(){
    return jwt.sign(
        {
            _id=this._id,
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn :  process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}




export const User = mongoose.model("User", userSchema)






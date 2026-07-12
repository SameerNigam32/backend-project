const asyncHandler = (requestHandler) =>{
    return  (req, res, next) =>{
        Promise.resolve(requestHandler(req,res,next)).catch((err) => next(err))
    } //requestHandler is the function which we want to execute, it can be any function which takes req,res,next as arguments
}
//as



export {asyncHandler}



// const asyncHandler = () => {}
// const asyncHandler = (func) => {() => {}} 
// == 
// const asyncHadler = (func) => () => {}
// const asyncHandler = (func) => async () => {}
// wapper function to execute

// try and catch method
// const asyncHadler = (fn) => async (req, res, next) => {
//     try {
//         await fn(req, res, next)
//     }catch(error){
//         res.status(error.code || 500).json({
//             success : false,
//             message : error.message
//         })

//     }
// }









//hence we will get a fixed format output for errors



class ApiError extends Error{
    constructor(
        statuscode,
        message = "something went wrong",
        errors= [],
        statck =""
    ){   //to overwrite we call super

        super(messaage)
        this.statuscode=statuscode
        this.data=null
        this.message=message
        this.success=false;
        this.errors =errors

        // if(stack){
        //     this.statck =statck
        // }
    }
}

export {ApiError}










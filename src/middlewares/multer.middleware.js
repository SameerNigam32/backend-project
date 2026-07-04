import multer from "multer";



const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/temp")              //location where file will be saved
  },
  filename: function (req, file, cb) {
    
    cb(null, file.originalname)
    // is same name file upploaded by user, itll overwrite so keep file.fieldname + '-' + uniqueSuffix
  }
})

export const upload = multer({
     storage
    })
















import multer from "multer"
import path from "path"

import logger from "../logger.js"

function fileFilter(req, file, cb) {
    logger.debug(`Received file: ${file.originalname} with mimetype: ${file.mimetype}`)
    if (file.mimetype !== "application/pdf") {
        return cb(new Error("Only PDF files are allowed"))
    }

    cb(null, true)
}

export const upload = multer({
    storage: multer.memoryStorage(),
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024
    }
})

/*
const storage = multer.diskStorage({
    destination: "uploads/",
    filename: (req, file, cb) => {
        const unique = Date.now() + "-" + Math.round(Math.random() * 1e9)
        cb(null, unique + path.extname(file.originalname))
    }
})

function fileFilter(req, file, cb) {
    if (file.mimetype !== "application/pdf") {
        return cb(new Error("Only PDF allowed"), false)
    }
    cb(null, true)
}

export const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    }
})
*/
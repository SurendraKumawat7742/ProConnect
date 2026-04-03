import axios from "axios"

export const BASE_URL = "https://linkedinclone-5gvz.onrender.com"

export const clientServer = axios.create({
    baseURL : BASE_URL,
})
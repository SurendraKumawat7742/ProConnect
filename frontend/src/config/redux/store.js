import {configureStore} from "@reduxjs/toolkit"
import authReducer from "./reducer/authReducer"
import postReducer from "./reducer/postReducer"

/*
Steps for state management
* submit action
* manage action in it's reducer
* register here -> reducer
*/

export const store = configureStore({
    reducer: {
        auth: authReducer,
        postReducer: postReducer
    }
})
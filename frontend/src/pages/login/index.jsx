import React, {useEffect, useState} from 'react'
import UserLayout from "@/layout/userLayout"
import {useSelector, useDispatch} from "react-redux"
import {useRouter} from "next/router"
import Styles from "./style.module.css"
import {registerUser, loginUser} from "../../config/redux/action/authAction"
import {emptyMessage, reset} from "../../config/redux/reducer/authReducer"

export default function loginComponent() {

  const authState = useSelector((state) => state.auth);

  const router = useRouter();

  const dispatch = useDispatch();

  const [userLoginMethod, setUserLoginMethod] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");

  useEffect(()=>{
    if(authState.loggedIn){
      router.push("/dashboard")
    }
  },[authState.loggedIn])

  useEffect(()=>{
    if(localStorage.getItem("token")){
      router.push("/dashboard")
    }
  }, [])

  useEffect(()=>{
    dispatch(emptyMessage())
  },[userLoginMethod])

  const handleRegister = ()=>{
    console.log("Registering..");
    dispatch(registerUser({username, email, password, name}));
  }

  const handleLogin = ()=>{
    console.log("Login..");
    dispatch(loginUser({email, password}));
  }

  return (
    <UserLayout>
    <div className={Styles.container}>
     <div className={Styles.cardContainer}>
       <div className={Styles.cardContainer_left}>
         <p className={Styles.cardleft_heading}>{userLoginMethod ? "Sign in" : "Sign up"}</p>
         <p style={{color: authState.isError ? "red" : "green"}}>{authState.message.message}</p>

         <div className={Styles.inputContainers}>
          
          {!userLoginMethod && <div className={Styles.inputRow}>
            <input onChange={(e)=>setUsername(e.target.value)} className={Styles.inputField} type="text" placeholder="Username"></input>
            <input onChange={(e)=>setName(e.target.value)} className={Styles.inputField} type="text" placeholder="Name"></input>
          </div>}

          <input onChange={(e)=>setEmail(e.target.value)} className={Styles.inputField} type="text" placeholder="Email"></input>

          <input onChange={(e)=>setPassword(e.target.value)} className={Styles.inputField} type="text" placeholder="Password"></input>

          <div onClick={()=>{
            if(userLoginMethod){
              handleLogin();
            }else{
              handleRegister();
            }
          }} className={Styles.buttonWithOutline}>
            <p>{userLoginMethod ? "Sign in" : "Sign up"}</p>
          </div>

         </div>
         
       </div>

       <div className={Styles.cardContainer_right}>
        <div>
          {userLoginMethod ? <p>Don't have an account</p> : <p>Already have an account</p>}
          <div onClick={()=>{
            setUserLoginMethod(!userLoginMethod)
          }} style={{color: "black", textAlign: "center"}} className={Styles.buttonWithOutline}>
            <p>{userLoginMethod ? "Sign up" : "Sign in"}</p>
          </div>
        </div>
          
       </div>
     </div>
    </div>

    </UserLayout>
  )
}

import React, { useEffect } from 'react'
import UserLayout from "@/layout/userLayout";
import DashboardLayout from "@/layout/dashboardLayout";
import { useDispatch, useSelector } from 'react-redux';
import { acceptConnection, getMyConnectionRequest } from '@/config/redux/action/authAction';
import styles from './index.module.css'
import { BASE_URL } from '@/config';
import { Router, useRouter } from 'next/router';

export default function MyConnectionsPage() {

    const dispatch = useDispatch();
    const authState = useSelector((state) => state.auth);

    useEffect(() => {
        dispatch(getMyConnectionRequest({ token: localStorage.getItem("token") }));
    }, []);

    useEffect(()=>{
        console.log("auth", authState.connectionRequest);
        console.log("conn", authState.connections);
    })

    useEffect(() => {

        if (authState.connectionRequest.length != 0) {
            console.log(authState.connectionRequest);
        }

    }, [authState.connectionRequest]);

    const router = useRouter();

    return (
        <UserLayout>
            <DashboardLayout>
                <div style={{display:"flex", flexDirection:"column", gap:"1.5rem"}}>
                    <h3>My Connections</h3>

                    {authState.connectionRequest.length === 0 && <h4>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;No connection request pending</h4>}
                    {authState.connectionRequest.length != 0 &&
                        authState.connectionRequest.filter((connection) => connection.status_accepted === null).map((user, index) => {
                            return (
                                <div onClick={()=>{
                                    router.push(`/view_profile/${user.userId.username}`)
                                }}
                                className={styles.userCard} key={index}>
                                    <div style={{display:"flex", alignItems:"center", gap:"1.2rem", justifyContent:"space-between"}}>
                                        <div className={styles.profilePicture}>
                                            <img src={`${BASE_URL}/uploads/${user.userId?.profilePic}`} alt="" />
                                        </div>
                                        <div className={styles.userInfo}>
                                            <h3>{user.userId?.name}</h3>
                                            <p>{user.userId?.username}</p>
                                        </div>

                                        <button onClick={(e)=>{
                                            e.stopPropagation();

                                            dispatch(acceptConnection({
                                                connectionId: user._id,
                                                token: localStorage.getItem("token"),
                                                action: "accept",
                                            }))
                                        }}      
                                        className={styles.connectedButton}>Accept</button>
                                    </div>
                                </div>
                            )
                        })}

                        <h3>My Network</h3>
                        {authState.connectionRequest.filter((connection) => connection.status_accepted !== null).map((user,index) => {
                            return (
                                <div onClick={()=>{
                                    router.push(`/view_profile/${user.userId.username}`)
                                }}
                                className={styles.userCard} key={index}>
                                    <div style={{display:"flex", alignItems:"center", gap:"1.2rem", justifyContent:"space-between"}}>
                                        <div className={styles.profilePicture}>
                                            <img src={`${BASE_URL}/uploads/${user.userId?.profilePic}`} alt="" />
                                        </div>
                                        <div className={styles.userInfo}>
                                            <h3>{user.userId?.name}</h3>
                                            <p>{user.userId?.username}</p>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                </div>
            </DashboardLayout>
        </UserLayout>
    )
}

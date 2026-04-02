import { BASE_URL } from '@/config';
import { getAllUsers } from '@/config/redux/action/authAction';
import DashboardLayout from '@/layout/dashboardLayout'
import UserLayout from '@/layout/userLayout'
import { Router, useRouter } from 'next/router'
import React, { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux';
import styles from "./index.module.css"

export default function DiscoverPage() {

    const router = useRouter();
    const authState = useSelector((state) => state.auth);
    const dispatch = useDispatch();

    useEffect(()=>{
        if(!authState.all_profiles_fetched){
            dispatch(getAllUsers())
        }
    }, [])


  return (
    <UserLayout>
        <DashboardLayout>
            <div>
                <h1>Discover</h1>
                <div className={styles.allUsersProfile}>
                    {authState.all_profiles_fetched && authState.all_users.map((user) => {
                        return (
                            <div
                            onClick={()=>{
                                router.push(`/view_profile/${user.userId.username}`);
                            }}
                            key={user._id} className={styles.userCard}>
                                <img className={styles.userCard_image} src={`${BASE_URL}/uploads/${user?.userId?.profilePic}`} alt="profile" />
                                
                                <div>
                                    <h1>{user?.userId?.name}</h1>
                                    <p>@{user?.userId?.username}</p>
                                </div>
                    
                            </div>
                        )
                    })}
                </div>
            </div>
        </DashboardLayout>
    </UserLayout>
  )
}

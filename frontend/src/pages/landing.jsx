import React from 'react'
import "../App.css"
import { Link, useNavigate } from 'react-router-dom'
import VideoCallIcon from '@mui/icons-material/VideoCall';
export default function LandingPage() {


    const router = useNavigate();

    return (
        <div className='landingPageContainer'>
            <nav>
                <div className='navHeader'>
                    <h2>BaatChIIT</h2>
                </div>
                <div className='navlist'>
                    <p onClick={() => {
                        router(`/guest-${Date.now().toString(36)}`)
                    }}>Join as Guest</p>
                    <p onClick={() => {
                        router("/auth")

                    }}>Register</p>
                    <div onClick={() => {
                        router("/auth")

                    }} role='button'>
                        <p>Login</p>
                    </div>
                </div>
            </nav>


            <div className="landingMainContainer">
                <div>
                    <h1>BaatChIIT</h1>

                    <p>Fast video rooms for classes, standups, and catch-ups with chat and screen sharing built in.</p>
                    <div role='button'>
                        <VideoCallIcon />
                        <Link to={"/auth"}>Get Started</Link>
                    </div>
                </div>
                <div>

                    <img src="/mobile.png" alt="" />

                </div>
            </div>



        </div>
    )
}

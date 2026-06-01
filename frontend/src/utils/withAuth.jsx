import { useEffect } from "react";
import { useNavigate } from "react-router-dom"
import { AuthContext } from "../contexts/AuthContext";
import { useContext } from "react";

const withAuth = (WrappedComponent ) => {
    const AuthComponent = (props) => {
        const router = useNavigate();
        const { authLoading, userData, verifySession } = useContext(AuthContext);

        useEffect(() => {
            const checkAuth = async () => {
                const ok = await verifySession();
                if (!ok) {
                    router("/auth", { replace: true })
                }
            }

            checkAuth();
        }, [router, verifySession])

        if (authLoading) {
            return <div className="appLoading">Checking your session...</div>
        }

        if (!userData) {
            return null;
        }

        return <WrappedComponent {...props} />
    }

    return AuthComponent;
}

export default withAuth;

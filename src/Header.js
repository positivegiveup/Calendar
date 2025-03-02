import { Menu, Search, Button } from 'semantic-ui-react';
import { Link } from 'react-router-dom';
import { auth } from './firebase';
import { signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { useState, useEffect } from 'react';

function Header() {
    const [user, setUser] = useState(null);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            setUser(user);
        });
        return () => unsubscribe();
    }, []);

    const handleLogin = async () => {
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error("Error signing in with Google", error);
        }
    };

    const handleLogout = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error("Error signing out", error);
        }
    };

    return <Menu>
        <Menu.Item as={Link} to="/">
            Calendar
        </Menu.Item>
        <Menu.Item>
            <Search />
        </Menu.Item>
        <Menu.Menu position="right">
            {!user ? (
                <Menu.Item onClick={handleLogin}>
                    使用 Gmail 登入
                </Menu.Item>
            ) : (
                <>
                    <Menu.Item>
                        {user.email}
                    </Menu.Item>
                    <Menu.Item onClick={handleLogout}>
                        登出
                    </Menu.Item>
                </>
            )}
        </Menu.Menu>
    </Menu>;
}

export default Header;
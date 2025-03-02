// Header.js
import { Menu, Search, Button, Modal, Input } from 'semantic-ui-react';
import { Link } from 'react-router-dom';
import { auth, db } from './firebase';
import { signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useState, useEffect } from 'react';
import './Header.css';

function Header() {
    const [user, setUser] = useState(null);
    const [isNicknameModalOpen, setIsNicknameModalOpen] = useState(false);
    const [nickname, setNickname] = useState('');
    const [currentNickname, setCurrentNickname] = useState('');

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            setUser(user);
            if (user) {
                const userDocRef = doc(db, 'users', user.uid);
                const userDoc = await getDoc(userDocRef);
                if (!userDoc.exists() || !userDoc.data().nickname) {
                    setIsNicknameModalOpen(true); // 第一次登入時顯示模態框
                } else {
                    setCurrentNickname(userDoc.data().nickname); // 載入現有暱稱
                }
            }
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

    const saveNickname = async () => {
        if (!nickname.trim()) return;
        const userDocRef = doc(db, 'users', auth.currentUser.uid);
        await setDoc(userDocRef, { nickname: nickname.trim() }, { merge: true });
        setCurrentNickname(nickname.trim()); // 更新顯示的暱稱
        setIsNicknameModalOpen(false);
    };

    const openNicknameModal = () => {
        setNickname(currentNickname); // 預填當前暱稱
        setIsNicknameModalOpen(true);
    };

    return (
        <>
            <Menu>
                <Menu.Item as={Link} to="/">
                    Calendar
                </Menu.Item>
                <Menu.Item className="search-container">
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
                            <Menu.Item onClick={openNicknameModal} style={{ cursor: 'pointer' }}>
                                {currentNickname || '設置暱稱'}
                            </Menu.Item>
                            <Menu.Item onClick={handleLogout}>
                                登出
                            </Menu.Item>
                        </>
                    )}
                </Menu.Menu>
            </Menu>

            {/* 暱稱設置模態框 */}
            <Modal
                open={isNicknameModalOpen}
                size="tiny"
                closeOnDimmerClick={false}
                closeOnEscape={false}
            >
                <Modal.Header>設置您的暱稱</Modal.Header>
                <Modal.Content>
                    <Input
                        placeholder="輸入您的暱稱"
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value)}
                        fluid
                    />
                </Modal.Content>
                <Modal.Actions>
                    <Button positive onClick={saveNickname} disabled={!nickname.trim()}>
                        儲存
                    </Button>
                </Modal.Actions>
            </Modal>
        </>
    );
}

export default Header;
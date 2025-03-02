import { BrowserRouter } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Header from './Header';
import UserCalendar from './Calendar';
import GroupPanel from './GroupPanel';
import { auth } from './firebase';
import './App.css';

function App() {
    const [user, setUser] = useState(null);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            setUser(user);
        });
        return () => unsubscribe();
    }, []);

    return (
        <BrowserRouter>
            <Header />
            {user ? (
                <div className="main-content">
                    <GroupPanel />
                    <UserCalendar />
                </div>
            ) : (
                <div style={{ textAlign: 'center', marginTop: '50px' }}>
                    請先登入以查看您的月曆
                </div>
            )}
        </BrowserRouter>
    );
}

export default App;
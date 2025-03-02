import { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { auth, db } from './firebase';
import { doc, setDoc, getDoc, getDocs, collection } from 'firebase/firestore';
import './Calendar.css';

function UserCalendar() {
    const [date, setDate] = useState(new Date());
    const [markedDates, setMarkedDates] = useState({});
    const [lastClickTime, setLastClickTime] = useState(null);
    const [selectedRange, setSelectedRange] = useState(null);
    const [statistics, setStatistics] = useState(null);
    const [isRangeSelectionMode, setIsRangeSelectionMode] = useState(false);
    const [selectedMember, setSelectedMember] = useState(null);

    useEffect(() => {
        loadMarkedDates();
    }, []);

    const loadMarkedDates = async () => {
        if (!auth.currentUser) return;
        
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (userDoc.exists()) {
            setMarkedDates(userDoc.data().markedDates || {});
        }
    };

    const loadMemberMarkedDates = async (member) => {
        const memberDoc = await getDoc(doc(db, 'users', member));
        if (memberDoc.exists() && memberDoc.data().markedDates) {
            setMarkedDates(memberDoc.data().markedDates);
        }
    };

    const handleMemberClick = (member) => {
        setSelectedMember(member);
        // loadMemberMarkedDates(member); // Commented out to disable loading member marked dates
    };

    const handleDateClick = async (value) => {
        if (isRangeSelectionMode) return;

        const currentTime = new Date().getTime();
        
        if (lastClickTime && currentTime - lastClickTime < 300) {
            const dateStr = value.toLocaleDateString();

            const newMarkedDates = {
                ...markedDates,
                [dateStr]: !markedDates[dateStr]
            };

            const userDoc = doc(db, 'users', auth.currentUser.uid);
            await setDoc(userDoc, { markedDates: newMarkedDates }, { merge: true });
            
            setMarkedDates(newMarkedDates);
            setLastClickTime(null);
        } else {
            setLastClickTime(currentTime);
        }
    };

    const calculateStatistics = (range) => {
        if (!range || !range[0] || !range[1]) return;

        const startDate = range[0];
        const endDate = range[1];
        let count = 0;
        let totalDays = 0;

        const currentDate = new Date(startDate);
        while (currentDate <= endDate) {
            const dateStr = currentDate.toLocaleDateString();
            if (markedDates[dateStr]) {
                count++;
            }
            totalDays++;
            currentDate.setDate(currentDate.getDate() + 1);
        }

        setStatistics({
            markedCount: count,
            totalDays: totalDays,
            percentage: ((count / totalDays) * 100).toFixed(1)
        });
    };

    const handleRangeChange = (value) => {
        if (!isRangeSelectionMode) return;
        setDate(value);
        setSelectedRange(value);
        calculateStatistics(value);
    };

    const toggleRangeSelectionMode = () => {
        setIsRangeSelectionMode(!isRangeSelectionMode);
        if (!isRangeSelectionMode) {
            setSelectedRange(null);
            setStatistics(null);
        }
    };

    const exitRangeSelectionMode = () => {
        setIsRangeSelectionMode(false);
        setSelectedRange(null);
        setStatistics(null);
        setDate(new Date());
    };

    const tileClassName = ({ date }) => {
        const dateStr = date.toLocaleDateString();
        const isMarkedByUser = markedDates[dateStr];

        if (isMarkedByUser) {
            return 'marked-date'; // 用戶的標記
        }
        return '';
    };

    return (
        <div className="calendar-container">
            <div className="calendar-controls">
                <button 
                    className={`control-button ${isRangeSelectionMode ? 'active' : ''}`}
                    onClick={toggleRangeSelectionMode}
                >
                    {isRangeSelectionMode ? '退出區間選擇' : '開始區間選擇'}
                </button>
                {isRangeSelectionMode && statistics && (
                    <button className="control-button" onClick={exitRangeSelectionMode}>
                        清除選擇
                    </button>
                )}
            </div>
            
            <Calendar
                onChange={handleRangeChange}
                value={date}
                onClickDay={handleDateClick}
                tileClassName={tileClassName}
                selectRange={isRangeSelectionMode}
            />
            
            {statistics && (
                <div className="statistics-panel">
                    <h3>區間統計</h3>
                    <p>選擇區間: {selectedRange[0].toLocaleDateString()} - {selectedRange[1].toLocaleDateString()}</p>
                    <p>標記天數: {statistics.markedCount} 天</p>
                    <p>總天數: {statistics.totalDays} 天</p>
                    <p>標記比例: {statistics.percentage}%</p>
                </div>
            )}
        </div>
    );
}

export default UserCalendar;
// UserCalendar.js
import { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { auth, db } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import './Calendar.css';

function UserCalendar({ selectedMember }) {
    const [date, setDate] = useState(new Date());
    const [markedDates, setMarkedDates] = useState({});
    const [lastClickTime, setLastClickTime] = useState(null);
    const [selectedRange, setSelectedRange] = useState(null);
    const [statistics, setStatistics] = useState(null);
    const [isRangeSelectionMode, setIsRangeSelectionMode] = useState(false);
    const [error, setError] = useState('');
    const [currentNickname, setCurrentNickname] = useState('');

    // 是否為自己的月曆
    const isOwnCalendar = !selectedMember || selectedMember === auth.currentUser?.uid;

    useEffect(() => {
        loadMarkedDates();
    }, [selectedMember]);

    const loadMarkedDates = async () => {
        if (!auth.currentUser) {
            setError('請先登錄');
            return;
        }

        const userId = selectedMember || auth.currentUser.uid;
        try {
            const userDoc = await getDoc(doc(db, 'users', userId));
            if (userDoc.exists()) {
                setMarkedDates(userDoc.data().markedDates || {});
                setCurrentNickname(userDoc.data().nickname || userId);
                setError('');
            } 
        } catch (error) {
            console.error('Error loading marked dates:', error);
            if (error.code === 'permission-denied') {
                setError('權限不足，無法查看此成員的月曆。請確認你與該成員在同一群組。');
            } else {
                setError('加載數據時發生錯誤: ' + error.message);
            }
        }
    };

    const handleDateClick = async (value) => {
        if (!isOwnCalendar || isRangeSelectionMode) return; // 其他成員月曆禁用標記

        const currentTime = new Date().getTime();
        if (lastClickTime && currentTime - lastClickTime < 300) {
            const dateStr = value.toLocaleDateString();
            const newMarkedDates = {
                ...markedDates,
                [dateStr]: !markedDates[dateStr],
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
            if (markedDates[dateStr]) count++;
            totalDays++;
            currentDate.setDate(currentDate.getDate() + 1);
        }
        setStatistics({
            markedCount: count,
            totalDays: totalDays,
            percentage: ((count / totalDays) * 100).toFixed(1),
        });
    };

    const handleRangeChange = (value) => {
        if (isRangeSelectionMode) {
            if (Array.isArray(value)) {
                // 當完成區間選擇時
                setSelectedRange(value);
                calculateStatistics(value);
                // 確保使用新的 Date 物件來觸發更新
                const endDate = new Date(value[1]);
                setDate(endDate);
            } else {
                // 第一次點擊時
                const newDate = new Date(value);
                setDate(newDate);
            }
        } else {
            setDate(value);
        }
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
        return markedDates[dateStr] ? 'marked-date' : '';
    };

    const returnToMyCalendar = () => {
        window.dispatchEvent(new CustomEvent('returnToMyCalendar'));
    };

    // 添加自定義日期格式化函數
    const formatDay = (locale, date) => {
        return date.getDate().toString();
    };

    return (
        <div className="calendar-container">
            {error && <div className="error-message">{error}</div>}
            <div className="calendar-header">
                <h2>正在觀看 {currentNickname} 的月曆</h2>
            </div>
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
                {selectedMember && selectedMember !== auth.currentUser?.uid && (
                    <button className="control-button" onClick={returnToMyCalendar}>
                        回到我的月曆
                    </button>
                )}
            </div>

            <Calendar
                onChange={handleRangeChange}
                value={date}
                onClickDay={handleDateClick}
                tileClassName={tileClassName}
                selectRange={isRangeSelectionMode}
                formatDay={formatDay}
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
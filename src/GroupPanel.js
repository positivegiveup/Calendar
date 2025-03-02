import { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import './GroupPanel.css';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

function GroupPanel() {
    const [newGroupCode, setNewGroupCode] = useState('');
    const [joinGroupCode, setJoinGroupCode] = useState('');
    const [userGroups, setUserGroups] = useState([]);
    const [groupMembersCount, setGroupMembersCount] = useState({});
    const [expandedGroup, setExpandedGroup] = useState(null);
    const [groupMembers, setGroupMembers] = useState({});
    const [markedDates, setMarkedDates] = useState({});
    const [date, setDate] = useState(new Date());
    const [isRangeSelectionMode, setIsRangeSelectionMode] = useState(false);
    const [selectedRange, setSelectedRange] = useState(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isJoinGroupExpanded, setIsJoinGroupExpanded] = useState(false);
    const [isCreateGroupExpanded, setIsCreateGroupExpanded] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');

    useEffect(() => {
        if (auth.currentUser) {
            loadUserGroups();
        }
    }, []);

    const loadUserGroups = async () => {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (userDoc.exists() && userDoc.data().groups) {
            const groups = userDoc.data().groups;
            setUserGroups(groups);
            const membersCount = {};
            const membersData = {};
            for (const group of groups) {
                const groupDoc = await getDoc(doc(db, 'groups', group));
                if (groupDoc.exists()) {
                    const members = groupDoc.data().members || [];
                    membersCount[group] = members.length;
                    membersData[group] = members;
                }
            }
            setGroupMembersCount(membersCount);
            setGroupMembers(membersData);
        }
    };

    const createGroup = async (e) => {
        e.preventDefault();
        if (!newGroupName.trim()) {
            setError('請輸入群組名稱');
            return;
        }

        try {
            const groupDoc = await getDoc(doc(db, 'groups', newGroupName));
            if (groupDoc.exists()) {
                setError('此群組名稱已被使用');
                return;
            }

            await setDoc(doc(db, 'groups', newGroupName), {
                createdBy: auth.currentUser.uid,
                members: [auth.currentUser.uid],
                createdAt: new Date().toISOString()
            });

            await updateDoc(doc(db, 'users', auth.currentUser.uid), {
                groups: arrayUnion(newGroupName)
            });

            setSuccess('群組創建成功！');
            setNewGroupName('');
            loadUserGroups();
        } catch (error) {
            setError('創建群組時發生錯誤');
            console.error(error);
        }
    };

    const joinGroup = async (e) => {
        e.preventDefault();
        if (!joinGroupCode.trim()) {
            setError('請輸入群組代碼');
            return;
        }

        try {
            const groupDoc = await getDoc(doc(db, 'groups', joinGroupCode));
            if (!groupDoc.exists()) {
                setError('找不到此群組');
                return;
            }

            if (groupDoc.data().members.includes(auth.currentUser.uid)) {
                setError('您已經是此群組的成員');
                return;
            }

            await updateDoc(doc(db, 'groups', joinGroupCode), {
                members: arrayUnion(auth.currentUser.uid)
            });

            await updateDoc(doc(db, 'users', auth.currentUser.uid), {
                groups: arrayUnion(joinGroupCode)
            });

            setSuccess('成功加入群組！');
            setJoinGroupCode('');
            loadUserGroups();
        } catch (error) {
            setError('加入群組時發生錯誤');
            console.error(error);
        }
    };

    const toggleGroupExpand = (groupCode) => {
        setExpandedGroup(expandedGroup === groupCode ? null : groupCode);
    };

    const tileClassName = ({ date }) => {
        const dateStr = date.toLocaleDateString();
        return markedDates[dateStr] ? 'marked-date' : '';
    };

    const handleRangeChange = (value) => {
        if (!isRangeSelectionMode) return;
        setSelectedRange(value);
    };

    const toggleRangeSelectionMode = () => {
        setIsRangeSelectionMode(!isRangeSelectionMode);
        if (!isRangeSelectionMode) {
            setSelectedRange(null);
        }
    };

    const handleMemberClick = (member) => {
        // Call the function to handle member click
        // This function should be passed down to UserCalendar or handled via context
        // For example, you can use a callback prop to notify UserCalendar
    };

    const toggleJoinGroupExpansion = () => {
        setIsJoinGroupExpanded(!isJoinGroupExpanded);
    };

    const toggleCreateGroupExpansion = () => {
        setIsCreateGroupExpanded(!isCreateGroupExpanded);
    };

    return (
        <div className="group-panel">
            <h2>群組管理</h2>
            
            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            <div className="group-section">
                <h3 onClick={toggleJoinGroupExpansion} style={{ cursor: 'pointer' }}>
                    加入群組 {isJoinGroupExpanded ? ' ▲' : ' ▼'}
                </h3>
                {isJoinGroupExpanded && (
                    <form onSubmit={joinGroup}>
                        <input
                            type="text"
                            value={joinGroupCode}
                            onChange={(e) => setJoinGroupCode(e.target.value)}
                            placeholder="輸入群組代碼"
                        />
                        <button type="submit">加入群組</button>
                    </form>
                )}
            </div>

            <div className="group-section">
                <h3 onClick={toggleCreateGroupExpansion} style={{ cursor: 'pointer' }}>
                    創建新群組 {isCreateGroupExpanded ? ' ▲' : ' ▼'}
                </h3>
                {isCreateGroupExpanded && (
                    <form onSubmit={createGroup}>
                        <input
                            type="text"
                            value={newGroupName}
                            onChange={(e) => setNewGroupName(e.target.value)}
                            placeholder="輸入新群組名稱"
                        />
                        <button type="submit">創建群組</button>
                    </form>
                )}
            </div>

            <div className="group-section">
                <h3>我的群組</h3>
                <div className="group-list">
                    {userGroups.length > 0 ? (
                        userGroups.map(group => (
                            <div key={group} className="group-item">
                                <div onClick={() => toggleGroupExpand(group)} style={{ cursor: 'pointer' }}>
                                    {group} ({groupMembersCount[group] || 0} 人)
                                    {expandedGroup === group ? ' ▲' : ' ▼'}
                                </div>
                                {expandedGroup === group && (
                                    <div className="group-members">
                                        {groupMembers[group].map(member => (
                                            <div key={member} className="group-member">
                                                {member}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))
                    ) : (
                        <p>尚未加入任何群組</p>
                    )}
                </div>
            </div>
        </div>
    );
}

export default GroupPanel;
// GroupPanel.js
import { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { doc, getDoc, setDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import './GroupPanel.css';

function GroupPanel({ onMemberSelect }) {
    const [newGroupCode, setNewGroupCode] = useState('');
    const [joinGroupCode, setJoinGroupCode] = useState('');
    const [userGroups, setUserGroups] = useState([]);
    const [groupMembersCount, setGroupMembersCount] = useState({});
    const [expandedGroup, setExpandedGroup] = useState(null);
    const [groupMembersData, setGroupMembersData] = useState({}); // 改為儲存完整數據
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isJoinGroupExpanded, setIsJoinGroupExpanded] = useState(false);
    const [isCreateGroupExpanded, setIsCreateGroupExpanded] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isPanelExpanded, setIsPanelExpanded] = useState(false);

    useEffect(() => {
        if (auth.currentUser) {
            initializeUserIfNeeded();
            loadUserGroups();
        }
    }, [auth.currentUser]);

    const initializeUserIfNeeded = async () => {
        if (!auth.currentUser) return;
        const userDocRef = doc(db, 'users', auth.currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (!userDoc.exists()) {
            await setDoc(userDocRef, {
                groups: [],
                createdAt: new Date().toISOString(),
            }, { merge: true });
        }
    };

    const loadUserGroups = async () => {
        if (!auth.currentUser) return;

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
                    // 獲取每個成員的暱稱
                    const memberDetails = {};
                    for (const memberId of members) {
                        const memberDoc = await getDoc(doc(db, 'users', memberId));
                        memberDetails[memberId] = memberDoc.exists() ? 
                            (memberDoc.data().nickname || memberId) : memberId;
                    }
                    membersData[group] = memberDetails;
                }
            }
            setGroupMembersCount(membersCount);
            setGroupMembersData(membersData);
        }
    };

    const handleMemberClick = (memberId) => {
        if (onMemberSelect) {
            onMemberSelect(memberId);
        }
    };

    const toggleGroupExpand = (groupCode) => {
        setExpandedGroup(expandedGroup === groupCode ? null : groupCode);
    };

    const createGroup = async (e) => {
        e.preventDefault();
        if (!newGroupName.trim()) {
            setError('請輸入群組名稱');
            return;
        }
        setIsLoading(true);
        try {
            await initializeUserIfNeeded();
            const groupDoc = await getDoc(doc(db, 'groups', newGroupName));
            if (groupDoc.exists()) {
                setError('此群組名稱已被使用');
                return;
            }
            await setDoc(doc(db, 'groups', newGroupName), {
                createdBy: auth.currentUser.uid,
                members: [auth.currentUser.uid],
                createdAt: new Date().toISOString(),
            });
            await updateDoc(doc(db, 'users', auth.currentUser.uid), {
                groups: arrayUnion(newGroupName),
            });
            setSuccess('群組創建成功！');
            setNewGroupName('');
            loadUserGroups();
        } catch (error) {
            setError('創建群組時發生錯誤: ' + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const joinGroup = async (e) => {
        e.preventDefault();
        if (!joinGroupCode.trim()) {
            setError('請輸入群組代碼');
            return;
        }
        setIsLoading(true);
        try {
            await initializeUserIfNeeded();
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
                members: arrayUnion(auth.currentUser.uid),
            });
            await updateDoc(doc(db, 'users', auth.currentUser.uid), {
                groups: arrayUnion(joinGroupCode),
            });
            setSuccess('成功加入群組！');
            setJoinGroupCode('');
            loadUserGroups();
        } catch (error) {
            setError('加入群組時發生錯誤: ' + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleJoinGroupExpansion = () => setIsJoinGroupExpanded(!isJoinGroupExpanded);
    const toggleCreateGroupExpansion = () => setIsCreateGroupExpanded(!isCreateGroupExpanded);

    return (
        <div className="group-panel">
            <div 
                className="group-panel-header" 
                onClick={() => setIsPanelExpanded(!isPanelExpanded)}
            >
                <h2>群組管理 {isPanelExpanded ? '▲' : '▼'}</h2>
            </div>

            <div className={`group-panel-content ${isPanelExpanded ? 'expanded' : ''}`}>
                {isLoading && <div className="loading">加載中...</div>}
                {error && <div className="error-message">{error}</div>}
                {success && <div className="success-message">{success}</div>}

                <div className="group-section">
                    <h3 onClick={toggleJoinGroupExpansion} style={{ cursor: 'pointer' }}>
                        加入群組 {isJoinGroupExpanded ? '▲' : '▼'}
                    </h3>
                    {isJoinGroupExpanded && (
                        <form onSubmit={joinGroup}>
                            <input
                                type="text"
                                value={joinGroupCode}
                                onChange={(e) => setJoinGroupCode(e.target.value)}
                                placeholder="輸入群組代碼"
                            />
                            <button type="submit" disabled={isLoading}>加入群組</button>
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
                                        {expandedGroup === group ? '▲' : '▼'}
                                    </div>
                                    {expandedGroup === group && (
                                        <div className="group-members">
                                            {Object.entries(groupMembersData[group] || {}).map(([memberId, nickname]) => (
                                                <div
                                                    key={memberId}
                                                    className="group-member"
                                                    onClick={() => handleMemberClick(memberId)}
                                                >
                                                    {nickname}
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
        </div>
    );
}

export default GroupPanel;
import { Modal } from "react-responsive-modal";
import { useState, useEffect, useRef } from "react";
import { useTranslation } from '@/components/useTranslations';

export default function FriendsModal({ shown, onClose, session, ws, canSendInvite, sendInvite, accountModalPage, setAccountModalPage, friends, setFriends, sentRequests, setSentRequests, receivedRequests, setReceivedRequests }) {

    const [friendReqSendingState, setFriendReqSendingState] = useState(0);

    const [friendReqProgress, setFriendReqProgress] = useState(false);
    const [allowFriendReq, setAllowFriendReq] = useState(false);

    const [newFriend, setNewFriend] = useState('');
    //const [accountModalPage, setAccountModalPage] = useState('list');
    const { t: text } = useTranslation("common");
    const messageTimeoutRef = useRef(null);

    useEffect(() => {
        if (!ws) return;
        function onMessage(event) {
            const data = JSON.parse(event.data);
            if (data.type === 'friends') {
                setFriends(data.friends);
                setSentRequests(data.sentRequests);
                setReceivedRequests(data.receivedRequests);
                setAllowFriendReq(data.allowFriendReq);
            }
            if (data.type === 'friendReqState') {
                setFriendReqSendingState(data.state);
                setFriendReqProgress(false);
                setNewFriend('');
            }
        }

        ws.addEventListener('message', onMessage);

        return () => {
            ws.removeEventListener('message', onMessage);
        }

    }, [ws]);

    useEffect(() => {
        if (friendReqSendingState > 0) {
            // Clear any existing timeout
            if (messageTimeoutRef.current) {
                clearTimeout(messageTimeoutRef.current);
            }

            // Set new timeout
            messageTimeoutRef.current = setTimeout(() => {
                setFriendReqSendingState(0);
                messageTimeoutRef.current = null;
            }, 5000);
        }

        // Cleanup function to clear timeout on unmount
        return () => {
            if (messageTimeoutRef.current) {
                clearTimeout(messageTimeoutRef.current);
                messageTimeoutRef.current = null;
            }
        };
    }, [friendReqSendingState]);

    useEffect(() => {
        let int;
        if (!ws) return;
        if (shown) {
            ws.send(JSON.stringify({ type: 'getFriends' }));
            int = setInterval(() => {
                ws.send(JSON.stringify({ type: 'getFriends' }));
            }, 5000);
        }

        return () => {
            clearInterval(int);
        }
    }, [shown, ws])

    const handleSendRequest = () => {
        if (!ws) return;
        setFriendReqProgress(true);
        ws.send(JSON.stringify({ type: 'sendFriendRequest', name: newFriend }));
    };

    const handleAccept = (id) => {
        if (!ws) return;
        ws.send(JSON.stringify({ type: 'acceptFriend', id }));
    };

    const handleDecline = (id) => {
        if (!ws) return;
        ws.send(JSON.stringify({ type: 'declineFriend', id }));
    };

    const handleCancel = (id) => {
        if (!ws) return;
        ws.send(JSON.stringify({ type: 'cancelRequest', id }));
    };

    const handleRemove = (id) => {
        if (!ws) return;
        ws.send(JSON.stringify({ type: 'removeFriend', id }));
    }


    return (
        <div id="friendsModal" style={{
            zIndex: 100,
            background: 'var(--background)',
            color: 'var(--text)',
            padding: '15px',
            borderRadius: '10px',
            fontFamily: '"Kode Mono", monospace',
            textAlign: 'center',
            width: '90%',
            maxWidth: '500px',
            maxHeight: '80vh',
            overflow: 'auto',
            border: '2px solid var(--border)',
        }} className="friendsModal" open={shown} center onClose={onClose}>

            {ws && ws.readyState !== 1 && (
                <div>{text("disconnected")}</div>
            )}

            <div className="friendsContent">



                <div className="friendsSection">
                    {/* Consolidated Friends View */}
                    <div style={{ width: '100%' }}>

                        {/* Add Friend Section */}
                        <div style={{ 
                            marginBottom: '20px', 
                            padding: '15px', 
                            background: 'var(--surface)', 
                            borderRadius: '8px',
                            border: '1px solid var(--border)'
                        }}>
                            <h3 style={{ 
                                color: 'var(--text)', 
                                marginBottom: '10px',
                                fontFamily: '"Kode Mono", monospace',
                                fontSize: '1rem'
                            }}>{text("addFriend")}</h3>
                            <p style={{ 
                                fontSize: '0.8rem', 
                                color: 'var(--textSecondary)', 
                                marginBottom: '10px' 
                            }}>
                                {text("addFriendDescription")}
                            </p>
                            <div className="input-group" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                <input
                                    type="text"
                                    value={newFriend}
                                    onChange={(e) => setNewFriend(e.target.value)}
                                    placeholder={text("addFriendPlaceholder")}
                                    style={{
                                        flex: 1,
                                        padding: '10px',
                                        background: 'var(--surfaceLight)',
                                        border: '1px solid var(--border)',
                                        borderRadius: '5px',
                                        color: 'var(--text)',
                                        fontFamily: '"Kode Mono", monospace'
                                    }}
                                />
                                <button 
                                    onClick={handleSendRequest} 
                                    disabled={friendReqProgress}
                                    style={{
                                        padding: '10px 20px',
                                        background: 'var(--gradButton)',
                                        border: '1px solid var(--border)',
                                        borderRadius: '5px',
                                        color: 'var(--text)',
                                        fontFamily: '"Kode Mono", monospace',
                                        cursor: friendReqProgress ? 'not-allowed' : 'pointer',
                                        opacity: friendReqProgress ? 0.6 : 1
                                    }}
                                >
                                    {friendReqProgress ? text("loading") : text("sendRequest")}
                                </button>
                            </div>
                            <span className="friend-request-sent">
                                {friendReqSendingState === 1 && text("friendReqSent")}
                                {friendReqSendingState === 2 && text("friendReqNotAccepting")}
                                {friendReqSendingState === 3 && text("friendReqNotFound")}
                                {friendReqSendingState === 4 && text("friendReqAlreadySent")}
                                {friendReqSendingState === 5 && text("friendReqAlreadyReceived")}
                                {friendReqSendingState === 6 && text("alreadyFriends")}
                                {friendReqSendingState > 6 && text("friendReqError")}
                            </span>
                        </div>

                        {/* Friend Request Settings */}
                        <div style={{ 
                            marginBottom: '20px', 
                            padding: '10px', 
                            background: 'var(--surface)', 
                            borderRadius: '8px',
                            border: '1px solid var(--border)'
                        }}>
                            <div style={{ marginBottom: '15px' }}>
                                <span style={{ 
                                    color: 'var(--text)',
                                    fontFamily: '"Kode Mono", monospace',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px'
                                }}>
                                    {text("allowFriendRequests")}
                                    <input 
                                        type="checkbox" 
                                        checked={allowFriendReq} 
                                        onChange={(e) => ws?.send(JSON.stringify({ type: 'setAllowFriendReq', allow: e.target.checked }))}
                                        style={{
                                            width: '18px',
                                            height: '18px',
                                            accentColor: 'var(--text)'
                                        }}
                                    />
                                </span>
                            </div>
                        </div>

                        {/* Received Requests Section */}
                        {receivedRequests.length > 0 && (
                            <div style={{ marginBottom: '30px' }}>
                                <h3 style={{ 
                                    color: 'var(--text)', 
                                    marginBottom: '15px',
                                    fontFamily: '"Kode Mono", monospace',
                                    fontSize: '1.1rem'
                                }}>{text("viewReceivedRequests", { cnt: receivedRequests.length })}</h3>
                                <div className="friends-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {receivedRequests.map(friend => (
                                        <div key={friend.id} style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            padding: '15px',
                                            background: 'var(--surface)',
                                            border: '1px solid var(--border)',
                                            borderRadius: '8px'
                                        }}>
                                            <div>
                                                <span style={{ 
                                                    color: 'var(--text)',
                                                    fontFamily: '"Kode Mono", monospace',
                                                    fontSize: '1rem'
                                                }}>
                                                    {friend?.name}
                                                    {friend?.supporter && <span style={{ 
                                                        marginLeft: '8px',
                                                        padding: '2px 6px',
                                                        background: 'var(--accent)',
                                                        borderRadius: '3px',
                                                        fontSize: '0.8rem'
                                                    }}>{text("supporter")}</span>}
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <button 
                                                    onClick={() => handleAccept(friend.id)} 
                                                    style={{
                                                        padding: '8px 12px',
                                                        background: 'var(--gradButton)',
                                                        border: '1px solid var(--border)',
                                                        borderRadius: '5px',
                                                        color: 'var(--text)',
                                                        cursor: 'pointer',
                                                        fontFamily: '"Kode Mono", monospace'
                                                    }}
                                                >✔</button>
                                                <button 
                                                    onClick={() => handleDecline(friend.id)} 
                                                    style={{
                                                        padding: '8px 12px',
                                                        background: 'var(--gradButton)',
                                                        border: '1px solid var(--border)',
                                                        borderRadius: '5px',
                                                        color: 'var(--text)',
                                                        cursor: 'pointer',
                                                        fontFamily: '"Kode Mono", monospace'
                                                    }}
                                                >✖</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Sent Requests Section */}
                        {sentRequests.length > 0 && (
                            <div style={{ marginBottom: '30px' }}>
                                <h3 style={{ 
                                    color: 'var(--text)', 
                                    marginBottom: '15px',
                                    fontFamily: '"Kode Mono", monospace',
                                    fontSize: '1.1rem'
                                }}>{text("viewSentRequests", { cnt: sentRequests.length })}</h3>
                                <div className="friends-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {sentRequests.map(friend => (
                                        <div key={friend.id} style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            padding: '15px',
                                            background: 'var(--surface)',
                                            border: '1px solid var(--border)',
                                            borderRadius: '8px'
                                        }}>
                                            <div>
                                                <span style={{ 
                                                    color: 'var(--text)',
                                                    fontFamily: '"Kode Mono", monospace',
                                                    fontSize: '1rem'
                                                }}>
                                                    {friend?.name}
                                                    {friend?.supporter && <span style={{ 
                                                        marginLeft: '8px',
                                                        padding: '2px 6px',
                                                        background: 'var(--accent)',
                                                        borderRadius: '3px',
                                                        fontSize: '0.8rem'
                                                    }}>{text("supporter")}</span>}
                                                </span>
                                            </div>
                                            <button 
                                                onClick={() => handleCancel(friend.id)} 
                                                style={{
                                                    padding: '8px 12px',
                                                    background: 'var(--gradButton)',
                                                    border: '1px solid var(--border)',
                                                    borderRadius: '5px',
                                                    color: 'var(--text)',
                                                    cursor: 'pointer',
                                                    fontFamily: '"Kode Mono", monospace'
                                                }}
                                            >✖</button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Friends List Section */}
                        <div>
                            <h3 style={{ 
                                color: 'var(--text)', 
                                marginBottom: '15px',
                                fontFamily: '"Kode Mono", monospace',
                                fontSize: '1.1rem'
                            }}>{text("friends", { cnt: friends.length })}</h3>
                            {friends.length === 0 && (
                                <div style={{ 
                                    color: 'var(--textSecondary)',
                                    fontFamily: '"Kode Mono", monospace',
                                    padding: '20px'
                                }}>{text("noFriends")}</div>
                            )}
                            <div className="friends-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {friends.sort((a, b) => b.online - a.online).map(friend => (
                                    <div key={friend.id} style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '15px',
                                        background: 'var(--surface)',
                                        border: '1px solid var(--border)',
                                        borderRadius: '8px'
                                    }}>
                                        <div>
                                            <div style={{ 
                                                color: 'var(--text)',
                                                fontFamily: '"Kode Mono", monospace',
                                                fontSize: '1rem',
                                                marginBottom: '5px'
                                            }}>
                                                {friend?.name}
                                                {friend?.supporter && <span style={{ 
                                                    marginLeft: '8px',
                                                    padding: '2px 6px',
                                                    background: 'var(--accent)',
                                                    borderRadius: '3px',
                                                    fontSize: '0.8rem'
                                                }}>{text("supporter")}</span>}
                                            </div>
                                            <span style={{ 
                                                color: friend?.online ? 'var(--text)' : 'var(--textMuted)',
                                                fontSize: '0.9rem',
                                                fontFamily: '"Kode Mono", monospace'
                                            }}>
                                                {friend?.online ? text("online") : text("offline")}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            {canSendInvite && friend.online && friend.socketId && (
                                                <button 
                                                    onClick={() => sendInvite(friend.socketId)} 
                                                    style={{
                                                        padding: '8px 12px',
                                                        background: 'var(--gradButton)',
                                                        border: '1px solid var(--border)',
                                                        borderRadius: '5px',
                                                        color: 'var(--text)',
                                                        cursor: 'pointer',
                                                        fontFamily: '"Kode Mono", monospace',
                                                        fontSize: '0.9rem'
                                                    }}
                                                >{text("invite")}</button>
                                            )}
                                            <button 
                                                onClick={() => handleRemove(friend.id)} 
                                                style={{
                                                    padding: '8px 12px',
                                                    background: 'var(--gradButton)',
                                                    border: '1px solid var(--border)',
                                                    borderRadius: '5px',
                                                    color: 'var(--text)',
                                                    cursor: 'pointer',
                                                    fontFamily: '"Kode Mono", monospace'
                                                }}
                                            >✖</button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

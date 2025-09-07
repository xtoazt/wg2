import { useSession } from "@/components/auth/auth";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import HeadContent from "@/components/headContent";
import { useTranslation } from '@/components/useTranslations';
import Navbar from "@/components/ui/navbar";
import FriendsModal from "@/components/friendModal";
import { FaUsers, FaArrowLeft } from "react-icons/fa6";
import Link from "next/link";
import initWebsocket from "@/components/utils/initWebsocket";
import retryManager from "@/components/utils/retryFetch";
import clientConfig from "@/clientConfig";

export default function FriendsPage() {
    const { session, loading } = useSession();
    const router = useRouter();
    const { text } = useTranslation();
    
    // Friend system state
    const [friends, setFriends] = useState([]);
    const [sentRequests, setSentRequests] = useState([]);
    const [receivedRequests, setReceivedRequests] = useState([]);
    const [ws, setWs] = useState(null);
    const [multiplayerState, setMultiplayerState] = useState(null);

    // Redirect if not logged in
    useEffect(() => {
        if (!loading && !session) {
            router.push('/');
        }
    }, [session, loading, router]);

    // Load friends data from MongoDB
    useEffect(() => {
        if (session?.token?.accountId) {
            loadFriendsData();
        }
    }, [session]);

    const loadFriendsData = async () => {
        try {
            const apiUrl = clientConfig().apiUrl;
            const response = await retryManager.fetchWithRetry(
                apiUrl + "/api/friends",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        action: 'getFriends',
                        accountId: session.token.accountId
                    }),
                },
                'friends'
            );

            const data = await response.json();
            if (data.error) {
                console.error('Failed to load friends data:', data.error);
            } else {
                setFriends(data.friends);
                setSentRequests(data.sentRequests);
                setReceivedRequests(data.receivedRequests);
            }
        } catch (error) {
            console.error('Failed to load friends data:', error);
        }
    };

    // Initialize WebSocket
    useEffect(() => {
        if (session) {
            const websocket = initWebsocket(session, setMultiplayerState);
            setWs(websocket);
            
            return () => {
                if (websocket) {
                    websocket.close();
                }
            };
        }
    }, [session]);

    // Determine if user can send invites (in a private multiplayer game)
    const canSendInvite = multiplayerState?.inGame && !multiplayerState?.gameData?.public;

    function sendInvite(id) {
        if (!ws || !multiplayerState?.connected) return;
        ws.send(JSON.stringify({ type: 'inviteFriend', friendId: id }))
    }

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
            </div>
        );
    }

    if (!session) {
        return null; // Will redirect
    }

    return (
        <>
            <HeadContent text={text} />
            
            <Navbar
                accountModalOpen={false}
                inCoolMathGames={false}
                maintenance={false}
                inCrazyGames={false}
                loading={loading}
                loginQueued={false}
                setLoginQueued={() => {}}
                inGame={false}
                openAccountModal={() => {}}
                session={session}
                reloadBtnPressed={false}
                setReloadBtnPressed={() => {}}
                setAccountModalOpen={() => {}}
                setAccountModalPage={() => {}}
                accountModalPage="profile"
                setScreen={() => {}}
                screen="friends"
                setShowLoginModal={() => {}}
                showLoginModal={false}
                setShowSuggestLoginModal={() => {}}
                showSuggestLoginModal={false}
            />

            <div className="friends-page">
                <div className="friends-page-header">
                    <Link href="/" className="back-button">
                        <FaArrowLeft />
                        <span>Back to Home</span>
                    </Link>
                    
                    <div className="friends-page-title">
                        <FaUsers />
                        <h1>Friends</h1>
                    </div>
                </div>

                <div className="friends-page-content">
                    <FriendsModal 
                        shown={true} 
                        onClose={() => router.push('/')} 
                        session={session}
                        ws={ws}
                        canSendInvite={canSendInvite}
                        sendInvite={sendInvite}
                        accountModalPage="profile"
                        setAccountModalPage={() => {}}
                        friends={friends}
                        setFriends={setFriends}
                        sentRequests={sentRequests}
                        setSentRequests={setSentRequests}
                        receivedRequests={receivedRequests}
                        setReceivedRequests={setReceivedRequests}
                    />
                </div>
            </div>

            <style jsx>{`
                .friends-page {
                    min-height: 100vh;
                    background: var(--background);
                    color: var(--text);
                    padding: 20px;
                }

                .friends-page-header {
                    display: flex;
                    align-items: center;
                    gap: 20px;
                    margin-bottom: 30px;
                    flex-wrap: wrap;
                }

                .back-button {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 10px 15px;
                    background: var(--surface);
                    border: 2px solid var(--border);
                    border-radius: 8px;
                    color: var(--text);
                    text-decoration: none;
                    font-family: "Kode Mono", monospace;
                    transition: all 0.3s ease;
                }

                .back-button:hover {
                    background: var(--primary);
                    color: var(--background);
                    transform: translateY(-2px);
                }

                .friends-page-title {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }

                .friends-page-title h1 {
                    margin: 0;
                    font-family: "Kode Mono", monospace;
                    font-size: 2rem;
                    color: var(--text);
                }

                .friends-page-title svg {
                    font-size: 2rem;
                    color: var(--primary);
                }

                .friends-page-content {
                    max-width: 800px;
                    margin: 0 auto;
                }

                .loading-container {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 100vh;
                    background: var(--background);
                }

                .loading-spinner {
                    width: 40px;
                    height: 40px;
                    border: 4px solid var(--border);
                    border-top: 4px solid var(--primary);
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }

                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }

                @media (max-width: 768px) {
                    .friends-page {
                        padding: 15px;
                    }

                    .friends-page-header {
                        flex-direction: column;
                        align-items: flex-start;
                        gap: 15px;
                    }

                    .friends-page-title h1 {
                        font-size: 1.5rem;
                    }
                }
            `}</style>
        </>
    );
}

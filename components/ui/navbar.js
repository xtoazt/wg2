import { FaArrowLeft, FaUser, FaUserFriends } from "react-icons/fa";
import nameFromCode from "../utils/nameFromCode";
import AccountBtn from "./accountBtn";
import { FaArrowRotateRight, FaPencil } from "react-icons/fa6";
import { useTranslation } from '@/components/useTranslations'
import WsIcon from "../wsIcon";
import { useState, useEffect } from "react";

export default function Navbar({ maintenance, joinCodePress, inCrazyGames, inCoolMathGames, inGame, openAccountModal, shown, backBtnPressed, reloadBtnPressed, setGameOptionsModalShown, onNavbarPress, onFriendsPress, gameOptions, session, screen, multiplayerState, loading, gameOptionsModalShown, accountModalOpen, selectCountryModalShown, mapModalOpen, onConnectionError }) {
    const { t: text } = useTranslation("common");

    const reloadBtn = (((multiplayerState?.inGame) || (screen === 'singleplayer'))) && (!loading) && !(multiplayerState?.inGame && multiplayerState?.gameData?.state === "waiting");

    const [showAccBtn, setShowAccBtn] = useState(true);
    useEffect(() => {
        if (window.location.search.includes("app=true")) {
            setShowAccBtn(false);
        }
    }, []);


    return (
        <>
            <div className={`navbar ${shown ? "" : "hidden"} ${screen == "home" ? "": "navbarColor"} ${screen === "onboarding" ? "onboarding" : ""}`}>
                <div className={`nonHome ${screen === 'home' ? '' : 'shown'}`}>
                    {!mapModalOpen && <h1 className="navbar__title desktop" onClick={onNavbarPress}>Atlas</h1>}
                    {!mapModalOpen && <h1 className="navbar__title mobile" onClick={onNavbarPress}>Atlas</h1>}
                    {!gameOptionsModalShown && !accountModalOpen && !selectCountryModalShown &&  <>
                        <button className="gameBtn navBtn backBtn g2_red_button desktop" onClick={backBtnPressed}>{text("back")}</button>
                        <button className="gameBtn navBtn backBtn g2_red_button mobile" onClick={backBtnPressed}><FaArrowLeft /></button>
                    </>
                    }
                </div>
                {reloadBtn && !accountModalOpen && !gameOptionsModalShown && (
                    <button className="gameBtn navBtn backBtn reloadBtn g2_blue_button" onClick={reloadBtnPressed}><FaArrowRotateRight /></button>
                )}



                <WsIcon
                    connected={multiplayerState?.connected}
                    connecting={multiplayerState?.connecting}
                    shown={true}
                    onClick={!multiplayerState?.connected ? onConnectionError : undefined}
                />


                {screen === 'multiplayer' && multiplayerState?.inGame && multiplayerState?.gameData?.players.length > 0 && (
                    <span id="playerCnt" className="bigSpan">
                        &nbsp; <FaUser /> {multiplayerState.gameData.players.length}
                    </span>
                )}
                <div className="navbar__right">

                    {screen === 'singleplayer' && !accountModalOpen && (
                        <button className="gameBtn navBtn g2_green_button g2_lexend" disabled={loading} onClick={() => setGameOptionsModalShown(true)}>
                            {((gameOptions.location === "all") || !gameOptions.location) ? text("allCountries") : gameOptions?.countryMap ? nameFromCode(gameOptions.location) : gameOptions?.communityMapName}
                            {gameOptions.nm && gameOptions.npz ?
                                ', NMPZ' :
                                gameOptions.nm ? ', NM' :
                                    gameOptions.npz ? ', NPZ' :
                                        ''}

                            &nbsp;

                            <FaPencil size={20} />
                        </button>
                    )}

                    {screen === "onboarding" && (
                        <button className="gameBtn navBtn"
                            style={{ backgroundColor: 'blue' }}
                            onClick={joinCodePress}>{text("joinGame")}</button>
                    )}

                    {!inGame && showAccBtn && !inCoolMathGames && !accountModalOpen && !mapModalOpen && (<AccountBtn inCrazyGames={inCrazyGames} session={session} navbarMode={screen !== "home"} openAccountModal={openAccountModal} />)}

                    {session?.token?.secret && !accountModalOpen && !gameOptionsModalShown && !mapModalOpen && !["getready", "guess"].includes(multiplayerState?.gameData?.state) && (
                        <button className={`gameBtn friendBtn ${screen === "home" ? "friendBtnFixed" : ""}`} onClick={onFriendsPress} disabled={!multiplayerState?.connected}>
                            <FaUserFriends size={40} className={`friendBtnIcon ${screen === "home" ? "friendBtnIconFixed" : ""}`} />
                        </button>
                    )}
                </div>
            </div>
        </>
    )
}